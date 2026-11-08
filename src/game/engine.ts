import { hasScoringOption, scoreSelection } from './scoring'
import type { Face, MatchState, PlayerId, TableDie, TargetScore } from './types'

let dieSeq = 0

function rollFace(): Face {
  return (Math.floor(Math.random() * 6) + 1) as Face
}

export function createDice(count: number): TableDie[] {
  return Array.from({ length: count }, () => ({
    id: `die-${++dieSeq}`,
    face: rollFace(),
  }))
}

export function createSetupState(targetScore: TargetScore = 4000): MatchState {
  return {
    phase: 'setup',
    turnPhase: 'need_roll',
    targetScore,
    scores: { human: 0, ai: 0 },
    currentPlayer: 'human',
    turnScore: 0,
    roll: [],
    selected: [],
    diceToRoll: 6,
    throwId: 0,
    message: null,
    winner: null,
    lastEvent: null,
  }
}

export function startMatch(targetScore: TargetScore): MatchState {
  return {
    ...createSetupState(targetScore),
    phase: 'playing',
    turnPhase: 'need_roll',
    currentPlayer: 'human',
    message: 'Your turn — roll the dice.',
    lastEvent: null,
  }
}

function otherPlayer(player: PlayerId): PlayerId {
  return player === 'human' ? 'ai' : 'human'
}

function beginTurn(state: MatchState, player: PlayerId, message: string): MatchState {
  return {
    ...state,
    phase: 'playing',
    turnPhase: 'need_roll',
    currentPlayer: player,
    turnScore: 0,
    roll: [],
    selected: [],
    diceToRoll: 6,
    message,
    lastEvent: null,
  }
}

export function facesOf(dice: TableDie[]): Face[] {
  return dice.map((d) => d.face)
}

export function selectedFaces(state: MatchState): Face[] {
  const selected = new Set(state.selected)
  return state.roll.filter((d) => selected.has(d.id)).map((d) => d.face)
}

export function selectionScore(state: MatchState): number | null {
  return scoreSelection(selectedFaces(state))
}

export function canConfirmHold(state: MatchState): boolean {
  return (
    state.phase === 'playing' &&
    state.turnPhase === 'need_select' &&
    selectionScore(state) !== null
  )
}

export function canBank(state: MatchState): boolean {
  return (
    state.phase === 'playing' &&
    state.turnPhase === 'need_decision' &&
    state.turnScore > 0
  )
}

export function canReroll(state: MatchState): boolean {
  return (
    state.phase === 'playing' &&
    state.turnPhase === 'need_decision' &&
    state.diceToRoll > 0
  )
}

export function canRoll(state: MatchState): boolean {
  return state.phase === 'playing' && state.turnPhase === 'need_roll'
}

export function toggleSelect(state: MatchState, dieId: string): MatchState {
  if (state.phase !== 'playing' || state.turnPhase !== 'need_select') return state
  if (!state.roll.some((d) => d.id === dieId)) return state

  const selected = state.selected.includes(dieId)
    ? state.selected.filter((id) => id !== dieId)
    : [...state.selected, dieId]

  return { ...state, selected, lastEvent: null }
}

export function setSelection(state: MatchState, ids: string[]): MatchState {
  if (state.phase !== 'playing' || state.turnPhase !== 'need_select') return state
  const validIds = new Set(state.roll.map((d) => d.id))
  const selected = [...new Set(ids)].filter((id) => validIds.has(id))
  return { ...state, selected, lastEvent: null }
}

export function roll(state: MatchState): MatchState {
  if (!canRoll(state)) return state

  const nextRoll = createDice(state.diceToRoll)
  const faces = facesOf(nextRoll)
  const throwId = state.throwId + 1

  if (!hasScoringOption(faces)) {
    return {
      ...state,
      turnPhase: 'showing_bust',
      roll: nextRoll,
      selected: [],
      throwId,
      message: null,
      lastEvent: null,
    }
  }

  return {
    ...state,
    turnPhase: 'need_select',
    roll: nextRoll,
    selected: [],
    throwId,
    message:
      state.currentPlayer === 'human'
        ? 'Select scoring dice, then confirm.'
        : 'AI is choosing dice…',
    lastEvent: null,
  }
}

function bustMessage(busted: PlayerId, next: PlayerId): string {
  const who = busted === 'human' ? 'You busted' : 'AI busted'
  const turn = next === 'human' ? 'Your turn — roll the dice.' : "AI's turn…"
  return `${who}! Turn points lost. ${turn}`
}

export function resolveBust(state: MatchState): MatchState {
  if (state.phase !== 'playing' || state.turnPhase !== 'showing_bust') return state

  const nextPlayer = otherPlayer(state.currentPlayer)
  return {
    ...beginTurn(state, nextPlayer, bustMessage(state.currentPlayer, nextPlayer)),
    lastEvent: 'bust',
  }
}

export function confirmHold(state: MatchState): MatchState {
  if (!canConfirmHold(state)) return state

  const score = selectionScore(state)
  if (score === null) return state

  const selected = new Set(state.selected)
  const usedAll = state.selected.length === state.roll.length
  const turnScore = state.turnScore + score

  if (usedAll) {
    return {
      ...state,
      turnPhase: 'need_roll',
      turnScore,
      roll: [],
      selected: [],
      diceToRoll: 6,
      message:
        state.currentPlayer === 'human'
          ? `Hot dice! +${score}. Roll all six again.`
          : `AI hot dice! +${score}.`,
      lastEvent: 'hot_dice',
    }
  }

  const remainingDice = state.roll.filter((d) => !selected.has(d.id))
  return {
    ...state,
    turnPhase: 'need_decision',
    turnScore,
    roll: remainingDice,
    selected: [],
    diceToRoll: remainingDice.length,
    message:
      state.currentPlayer === 'human'
        ? `+${score}. Bank ${turnScore}, or roll ${remainingDice.length} dice.`
        : `AI scored +${score} (turn ${turnScore}).`,
    lastEvent: null,
  }
}

export function bank(state: MatchState): MatchState {
  if (!canBank(state)) return state

  const player = state.currentPlayer
  const newScore = state.scores[player] + state.turnScore
  const scores = { ...state.scores, [player]: newScore }

  if (newScore >= state.targetScore) {
    return {
      ...state,
      phase: 'game_over',
      turnPhase: 'need_roll',
      scores,
      turnScore: 0,
      roll: [],
      selected: [],
      diceToRoll: 6,
      winner: player,
      message: player === 'human' ? 'You win!' : 'AI wins.',
      lastEvent: 'win',
    }
  }

  const next = otherPlayer(player)
  return {
    ...beginTurn({ ...state, scores }, next, bankMessage(player, state.turnScore, next)),
    scores,
    lastEvent: 'bank',
  }
}

function bankMessage(banked: PlayerId, points: number, next: PlayerId): string {
  const who = banked === 'human' ? 'You banked' : 'AI banked'
  const turn = next === 'human' ? 'Your turn — roll the dice.' : "AI's turn…"
  return `${who} ${points}. ${turn}`
}

export function chooseReroll(state: MatchState): MatchState {
  if (!canReroll(state)) return state
  return {
    ...state,
    turnPhase: 'need_roll',
    roll: [],
    selected: [],
    message:
      state.currentPlayer === 'human'
        ? `Roll ${state.diceToRoll} dice.`
        : 'AI will roll again…',
    lastEvent: null,
  }
}
