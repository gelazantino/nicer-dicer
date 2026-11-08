import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { chooseAiAction } from './game/ai'
import {
  bank,
  chooseReroll,
  confirmHold,
  createSetupState,
  fillLoadout,
  fillRandomLoadout,
  personalizeOnlineMessage,
  resolveBust,
  roll,
  setLoadoutSlot,
  setSelection,
  startMatch,
  toggleSelect,
} from './game/engine'
import {
  generateRoomCode,
  normalizeRoomCode,
} from './game/onlineProtocol'
import type { MatchState, PlayerId, TargetScore } from './game/types'
import { DiceTray } from './components/DiceTray'
import { MatchSetup, type PlayModeChoice } from './components/MatchSetup'
import { OnlineLobby } from './components/OnlineLobby'
import { BadgesPanel } from './components/BadgesPanel'
import { LoadedDicePanel } from './components/LoadedDicePanel'
import { RulesPanel } from './components/RulesPanel'
import { ScoreBoard } from './components/ScoreBoard'
import { TurnControls } from './components/TurnControls'
import { DebugHud } from './debug/DebugHud'
import { debugLog } from './debug/debugMode'
import {
  createOnlineSession,
  useOnlineMatch,
  type OnlineSession,
} from './online/useOnlineMatch'
import { getMatchServerWsBase } from './online/wsUrl'

type Action =
  | { type: 'set_target'; target: TargetScore }
  | { type: 'set_loadout_slot'; slot: number; dieTypeId: string }
  | { type: 'fill_loadout'; dieTypeId: string }
  | { type: 'fill_random_loadout' }
  | { type: 'start' }
  | { type: 'restart' }
  | { type: 'new_match' }
  | { type: 'roll' }
  | { type: 'toggle'; dieId: string }
  | { type: 'select'; ids: string[] }
  | { type: 'confirm' }
  | { type: 'bank' }
  | { type: 'reroll' }
  | { type: 'resolve_bust' }

const AI_DELAY_MS = {
  roll: 1600,
  select: 1100,
  confirm: 2000,
  bank: 2200,
  reroll: 1800,
} as const

const BUST_REVEAL_MS = 2200

function reducer(state: MatchState, action: Action): MatchState {
  switch (action.type) {
    case 'set_target':
      return { ...state, targetScore: action.target }
    case 'set_loadout_slot':
      return setLoadoutSlot(state, action.slot, action.dieTypeId)
    case 'fill_loadout':
      return fillLoadout(state, action.dieTypeId)
    case 'fill_random_loadout':
      return fillRandomLoadout(state)
    case 'start':
    case 'restart':
      return startMatch(state.targetScore, state.humanLoadout, 'solo')
    case 'new_match':
      return createSetupState(state.targetScore, state.humanLoadout, 'solo')
    case 'roll':
      return roll(state)
    case 'toggle':
      return toggleSelect(state, action.dieId)
    case 'select':
      return setSelection(state, action.ids)
    case 'confirm':
      return confirmHold(state)
    case 'bank':
      return bank(state)
    case 'reroll':
      return roll(chooseReroll(state))
    case 'resolve_bust':
      return resolveBust(state)
    default:
      return state
  }
}

function LegendPanels({ state }: { state: MatchState }) {
  return (
    <>
      <RulesPanel />
      <LoadedDicePanel />
      <BadgesPanel />
      <DebugHud state={state} />
    </>
  )
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () =>
    createSetupState(4000),
  )
  const aiTimer = useRef<number | null>(null)

  const [playMode, setPlayMode] = useState<PlayModeChoice>('solo')
  const [joinCode, setJoinCode] = useState('')
  const [onlineSession, setOnlineSession] = useState<OnlineSession | null>(null)
  const onlineAvailable = Boolean(getMatchServerWsBase())

  const {
    snapshot,
    connectionState,
    lastError,
    send,
  } = useOnlineMatch(onlineSession)

  const onlineMatch = snapshot?.match ?? null
  const localSeat: PlayerId | undefined = snapshot?.seat ?? undefined

  const displayOnlineMatch = useMemo(() => {
    if (!onlineMatch || !localSeat) return onlineMatch
    return {
      ...onlineMatch,
      message: personalizeOnlineMessage(onlineMatch.message, localSeat),
    }
  }, [onlineMatch, localSeat])

  const humanTurn =
    state.phase === 'playing' && state.currentPlayer === 'p1'

  const onlineMyTurn =
    Boolean(displayOnlineMatch) &&
    displayOnlineMatch?.phase === 'playing' &&
    displayOnlineMatch.currentPlayer === localSeat

  useEffect(() => {
    debugLog('state', {
      phase: state.phase,
      turnPhase: state.turnPhase,
      player: state.currentPlayer,
      turnScore: state.turnScore,
      throwId: state.throwId,
      lastEvent: state.lastEvent,
      loadout: state.humanLoadout,
      online: Boolean(onlineSession),
    })
  }, [state, onlineSession])

  // Host pushes the setup target into the lobby once connected.
  useEffect(() => {
    if (!snapshot || snapshot.status !== 'lobby') return
    if (snapshot.seat !== 'p1') return
    if (snapshot.targetScore === state.targetScore) return
    send({ type: 'set_target', target: state.targetScore })
  }, [snapshot, state.targetScore, send])

  useEffect(() => {
    if (onlineSession) return
    if (state.phase !== 'playing') return

    if (state.turnPhase === 'showing_bust') {
      aiTimer.current = window.setTimeout(() => {
        dispatch({ type: 'resolve_bust' })
      }, BUST_REVEAL_MS)
      return () => {
        if (aiTimer.current !== null) window.clearTimeout(aiTimer.current)
      }
    }

    if (state.currentPlayer !== 'p2') return

    const action = chooseAiAction(state)
    if (!action) return

    const delay = AI_DELAY_MS[action.type]

    aiTimer.current = window.setTimeout(() => {
      switch (action.type) {
        case 'roll':
          dispatch({ type: 'roll' })
          break
        case 'select':
          dispatch({ type: 'select', ids: action.ids })
          break
        case 'confirm':
          dispatch({ type: 'confirm' })
          break
        case 'bank':
          dispatch({ type: 'bank' })
          break
        case 'reroll':
          dispatch({ type: 'reroll' })
          break
      }
    }, delay)

    return () => {
      if (aiTimer.current !== null) window.clearTimeout(aiTimer.current)
    }
  }, [state, onlineSession])

  const leaveOnline = () => {
    setOnlineSession(null)
  }

  // Online: lobby until match starts / after leave
  if (onlineSession && snapshot && snapshot.status === 'lobby') {
    return (
      <div className="app">
        <OnlineLobby
          snapshot={snapshot}
          connectionState={connectionState}
          lastError={lastError}
          onTargetChange={(target) => send({ type: 'set_target', target })}
          onStart={() => send({ type: 'start' })}
          onLeave={leaveOnline}
        />
        <LegendPanels state={state} />
      </div>
    )
  }

  // Online: connecting before first snapshot
  if (onlineSession && !snapshot) {
    return (
      <div className="app">
        <section className="panel setup">
          <h1 className="brand">Nicer Dicer</h1>
          <p className="lede">
            {connectionState === 'error'
              ? lastError || 'Could not connect to match server.'
              : `Connecting to room ${onlineSession.roomCode}…`}
          </p>
          <button type="button" className="btn" onClick={leaveOnline}>
            Cancel
          </button>
        </section>
        <LegendPanels state={state} />
      </div>
    )
  }

  // Online match in progress / finished
  if (onlineSession && displayOnlineMatch && snapshot) {
    const opponentSeat: PlayerId = localSeat === 'p1' ? 'p2' : 'p1'
    const opponentConnected = snapshot.connected[opponentSeat]
    const connectionHint =
      connectionState !== 'open'
        ? 'Reconnecting…'
        : !opponentConnected
          ? 'Opponent disconnected'
          : null

    const canAct =
      onlineMyTurn || displayOnlineMatch.phase === 'game_over'

    return (
      <div className="app">
        <ScoreBoard
          state={displayOnlineMatch}
          localSeat={localSeat}
          connectionHint={connectionHint}
          onRestart={() => send({ type: 'restart' })}
        />

        <main className="table">
          <p className="brand-inline">Nicer Dicer</p>
          <p className="online-room-inline">Room {snapshot.roomCode}</p>
          <DiceTray
            roll={displayOnlineMatch.roll}
            selected={displayOnlineMatch.selected}
            throwId={displayOnlineMatch.throwId}
            interactive={
              Boolean(onlineMyTurn) &&
              displayOnlineMatch.turnPhase === 'need_select'
            }
            onToggle={(dieId) => send({ type: 'toggle', dieId })}
          />
          <TurnControls
            state={displayOnlineMatch}
            humanTurn={canAct}
            onRoll={() => send({ type: 'roll' })}
            onConfirm={() => send({ type: 'confirm' })}
            onBank={() => send({ type: 'bank' })}
            onReroll={() => send({ type: 'reroll' })}
            onNewMatch={leaveOnline}
            onRestart={() => send({ type: 'restart' })}
          />
        </main>

        <LegendPanels state={displayOnlineMatch} />
      </div>
    )
  }

  if (state.phase === 'setup') {
    return (
      <div className="app">
        <MatchSetup
          targetScore={state.targetScore}
          humanLoadout={state.humanLoadout}
          playMode={playMode}
          onlineAvailable={onlineAvailable}
          joinCode={joinCode}
          onlineBusy={Boolean(onlineSession)}
          onlineError={lastError}
          onPlayModeChange={setPlayMode}
          onTargetChange={(target) => dispatch({ type: 'set_target', target })}
          onLoadoutSlotChange={(slot, dieTypeId) =>
            dispatch({ type: 'set_loadout_slot', slot, dieTypeId })
          }
          onFillLoadout={(dieTypeId) =>
            dispatch({ type: 'fill_loadout', dieTypeId })
          }
          onFillRandomLoadout={() => dispatch({ type: 'fill_random_loadout' })}
          onJoinCodeChange={(code) => setJoinCode(normalizeRoomCode(code))}
          onStartSolo={() => dispatch({ type: 'start' })}
          onCreateOnline={() => {
            const code = generateRoomCode()
            setOnlineSession(createOnlineSession(code))
          }}
          onJoinOnline={() => {
            const code = normalizeRoomCode(joinCode)
            if (code.length < 4) return
            setOnlineSession(createOnlineSession(code))
          }}
        />
        <LegendPanels state={state} />
      </div>
    )
  }

  return (
    <div className="app">
      <ScoreBoard
        state={state}
        onRestart={() => dispatch({ type: 'restart' })}
      />

      <main className="table">
        <p className="brand-inline">Nicer Dicer</p>
        <DiceTray
          roll={state.roll}
          selected={state.selected}
          throwId={state.throwId}
          interactive={humanTurn && state.turnPhase === 'need_select'}
          onToggle={(dieId) => dispatch({ type: 'toggle', dieId })}
        />
        <TurnControls
          state={state}
          humanTurn={humanTurn || state.phase === 'game_over'}
          onRoll={() => dispatch({ type: 'roll' })}
          onConfirm={() => dispatch({ type: 'confirm' })}
          onBank={() => dispatch({ type: 'bank' })}
          onReroll={() => dispatch({ type: 'reroll' })}
          onNewMatch={() => dispatch({ type: 'new_match' })}
          onRestart={() => dispatch({ type: 'restart' })}
        />
      </main>

      <LegendPanels state={state} />
    </div>
  )
}
