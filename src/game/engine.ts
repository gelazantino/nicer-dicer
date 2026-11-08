import { KCD_DICE_LEGEND } from './kcdDiceLegend'
import { hasScoringOption, scoreSelection } from './scoring'
import type { Face, DieSpec, MatchState, PlayerId, TableDie, TargetScore } from './types'
import {
  defaultHumanLoadout,
  isDevilHeadFace,
  ORDINARY_DIE_ID,
  rollWeightedFace,
} from './weightedRoll'

let dieSeq = 0

function createTableDie(spec: DieSpec): TableDie {
  const face = rollWeightedFace(spec.dieTypeId)
  return {
    id: `die-${++dieSeq}`,
    face,
    dieTypeId: spec.dieTypeId,
    loadoutSlot: spec.loadoutSlot,
    devilHead: isDevilHeadFace(spec.dieTypeId, face),
  }
}

function loadoutSpecs(loadout: string[]): DieSpec[] {
  return loadout.map((dieTypeId, loadoutSlot) => ({ dieTypeId, loadoutSlot }))
}

function aiFairSpecs(count: number): DieSpec[] {
  return Array.from({ length: count }, (_, loadoutSlot) => ({
    dieTypeId: ORDINARY_DIE_ID,
    loadoutSlot,
  }))
}

export function createDiceFromSpecs(specs: DieSpec[]): TableDie[] {
  return specs.map(createTableDie)
}

export function createSetupState(
  targetScore: TargetScore = 4000,
  humanLoadout: string[] = defaultHumanLoadout(),
): MatchState {
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
    pendingRollSpecs: null,
    throwId: 0,
    humanLoadout: normalizeLoadout(humanLoadout),
    message: null,
    winner: null,
    lastEvent: null,
  }
}

export function normalizeLoadout(loadout: string[]): string[] {
  const next = loadout.slice(0, 6)
  while (next.length < 6) next.push(ORDINARY_DIE_ID)
  return next.map((id) => id || ORDINARY_DIE_ID)
}

export function setLoadoutSlot(
  state: MatchState,
  slot: number,
  dieTypeId: string,
): MatchState {
  if (state.phase !== 'setup') return state
  if (slot < 0 || slot > 5) return state
  const humanLoadout = [...state.humanLoadout]
  humanLoadout[slot] = dieTypeId || ORDINARY_DIE_ID
  return { ...state, humanLoadout }
}

export function fillLoadout(
  state: MatchState,
  dieTypeId: string,
): MatchState {
  if (state.phase !== 'setup') return state
  return {
    ...state,
    humanLoadout: Array.from({ length: 6 }, () => dieTypeId || ORDINARY_DIE_ID),
  }
}

export function fillRandomLoadout(state: MatchState): MatchState {
  if (state.phase !== 'setup') return state
  const ids = KCD_DICE_LEGEND.map((die) => die.id)
  if (ids.length === 0) return state
  return {
    ...state,
    humanLoadout: Array.from({ length: 6 }, () => {
      const pick = ids[Math.floor(Math.random() * ids.length)]
      return pick ?? ORDINARY_DIE_ID
    }),
  }
}

export function startMatch(
  targetScore: TargetScore,
  humanLoadout: string[] = defaultHumanLoadout(),
): MatchState {
  return {
    ...createSetupState(targetScore, humanLoadout),
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
    pendingRollSpecs: null,
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

function specsForRoll(state: MatchState): DieSpec[] {
  if (state.pendingRollSpecs && state.pendingRollSpecs.length > 0) {
    return state.pendingRollSpecs
  }
  if (state.currentPlayer === 'human') {
    return loadoutSpecs(state.humanLoadout)
  }
  return aiFairSpecs(state.diceToRoll)
}

export function roll(state: MatchState): MatchState {
  if (!canRoll(state)) return state

  const specs = specsForRoll(state)
  const nextRoll = createDiceFromSpecs(specs)
  const faces = facesOf(nextRoll)
  const throwId = state.throwId + 1

  if (!hasScoringOption(faces)) {
    return {
      ...state,
      turnPhase: 'showing_bust',
      roll: nextRoll,
      selected: [],
      pendingRollSpecs: null,
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
    pendingRollSpecs: null,
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
      pendingRollSpecs: null,
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
    pendingRollSpecs: null,
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
      pendingRollSpecs: null,
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
    pendingRollSpecs: state.roll.map((die) => ({
      dieTypeId: die.dieTypeId,
      loadoutSlot: die.loadoutSlot,
    })),
    roll: [],
    selected: [],
    message:
      state.currentPlayer === 'human'
        ? `Roll ${state.diceToRoll} dice.`
        : 'AI will roll again…',
    lastEvent: null,
  }
}
