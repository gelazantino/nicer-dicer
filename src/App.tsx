import { useEffect, useReducer, useRef } from 'react'
import { chooseAiAction } from './game/ai'
import {
  bank,
  chooseReroll,
  confirmHold,
  createSetupState,
  fillLoadout,
  fillRandomLoadout,
  resolveBust,
  roll,
  setLoadoutSlot,
  setSelection,
  startMatch,
  toggleSelect,
} from './game/engine'
import type { MatchState, TargetScore } from './game/types'
import { DiceTray } from './components/DiceTray'
import { MatchSetup } from './components/MatchSetup'
import { LoadedDicePanel } from './components/LoadedDicePanel'
import { RulesPanel } from './components/RulesPanel'
import { ScoreBoard } from './components/ScoreBoard'
import { TurnControls } from './components/TurnControls'
import { DebugHud } from './debug/DebugHud'
import { debugLog } from './debug/debugMode'

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
      return startMatch(state.targetScore, state.humanLoadout)
    case 'new_match':
      return createSetupState(state.targetScore, state.humanLoadout)
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

export default function App() {
  const [state, dispatch] = useReducer(reducer, undefined, () => createSetupState(4000))
  const aiTimer = useRef<number | null>(null)

  const humanTurn =
    state.phase === 'playing' && state.currentPlayer === 'human'

  useEffect(() => {
    debugLog('state', {
      phase: state.phase,
      turnPhase: state.turnPhase,
      player: state.currentPlayer,
      turnScore: state.turnScore,
      throwId: state.throwId,
      lastEvent: state.lastEvent,
      loadout: state.humanLoadout,
    })
  }, [state])

  useEffect(() => {
    if (state.phase !== 'playing') return

    if (state.turnPhase === 'showing_bust') {
      aiTimer.current = window.setTimeout(() => {
        dispatch({ type: 'resolve_bust' })
      }, BUST_REVEAL_MS)
      return () => {
        if (aiTimer.current !== null) window.clearTimeout(aiTimer.current)
      }
    }

    if (state.currentPlayer !== 'ai') return

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
  }, [state])

  if (state.phase === 'setup') {
    return (
      <div className="app">
        <MatchSetup
          targetScore={state.targetScore}
          humanLoadout={state.humanLoadout}
          onTargetChange={(target) => dispatch({ type: 'set_target', target })}
          onLoadoutSlotChange={(slot, dieTypeId) =>
            dispatch({ type: 'set_loadout_slot', slot, dieTypeId })
          }
          onFillLoadout={(dieTypeId) => dispatch({ type: 'fill_loadout', dieTypeId })}
          onFillRandomLoadout={() => dispatch({ type: 'fill_random_loadout' })}
          onStart={() => dispatch({ type: 'start' })}
        />
        <RulesPanel />
        <LoadedDicePanel />
        <DebugHud state={state} />
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

      <RulesPanel />
      <LoadedDicePanel />
      <DebugHud state={state} />
    </div>
  )
}
