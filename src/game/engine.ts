import { KCD_DICE_LEGEND } from './kcdDiceLegend'
import { hasScoringOption, scoreSelection } from './scoring'
import type {
  Face,
  DieSpec,
  MatchMode,
  MatchState,
  PlayerId,
  TableDie,
  TargetScore,
} from './types'
import {
  defaultHumanLoadout,
  isDevilHeadFace,
  ORDINARY_DIE_ID,
  rollWeightedFace,
} from './weightedRoll'

function newDieId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `die-${crypto.randomUUID()}`
  }
  return `die-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function createTableDie(spec: DieSpec): TableDie {
  const face = rollWeightedFace(spec.dieTypeId)
  return {
    id: newDieId(),
    face,
    dieTypeId: spec.dieTypeId,
    loadoutSlot: spec.loadoutSlot,
    devilHead: isDevilHeadFace(spec.dieTypeId, face),
  }
}

function fairSpecs(count: number): DieSpec[] {
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
  mode: MatchMode = 'solo',
): MatchState {
  const p1 = normalizeLoadout(humanLoadout)
  return {
    phase: 'setup',
    turnPhase: 'need_roll',
    mode,
    targetScore,
    scores: { p1: 0, p2: 0 },
    currentPlayer: 'p1',
    turnScore: 0,
    roll: [],
    selected: [],
    diceToRoll: 6,
    pendingRollSpecs: null,
    throwId: 0,
    humanLoadout: p1,
    loadouts: { p1, p2: defaultHumanLoadout() },
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

function withP1Loadout(state: MatchState, p1: string[]): MatchState {
  const humanLoadout = normalizeLoadout(p1)
  return {
    ...state,
    humanLoadout,
    loadouts: { ...state.loadouts, p1: humanLoadout },
  }
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
  return withP1Loadout(state, humanLoadout)
}

export function fillLoadout(
  state: MatchState,
  dieTypeId: string,
): MatchState {
  if (state.phase !== 'setup') return state
  return withP1Loadout(
    state,
    Array.from({ length: 6 }, () => dieTypeId || ORDINARY_DIE_ID),
  )
}

export function fillRandomLoadout(state: MatchState): MatchState {
  if (state.phase !== 'setup') return state
  const ids = KCD_DICE_LEGEND.map((die) => die.id)
  if (ids.length === 0) return state
  return withP1Loadout(
    state,
    Array.from({ length: 6 }, () => {
      const pick = ids[Math.floor(Math.random() * ids.length)]
      return pick ?? ORDINARY_DIE_ID
    }),
  )
}

export function startMatch(
  targetScore: TargetScore,
  humanLoadout: string[] = defaultHumanLoadout(),
  mode: MatchMode = 'solo',
  opponentLoadout: string[] = defaultHumanLoadout(),
): MatchState {
  const p1 = normalizeLoadout(humanLoadout)
  const p2 =
    mode === 'online'
      ? normalizeLoadout(opponentLoadout)
      : defaultHumanLoadout()
  return {
    ...createSetupState(targetScore, p1, mode),
    phase: 'playing',
    turnPhase: 'need_roll',
    currentPlayer: 'p1',
    humanLoadout: p1,
    loadouts: { p1, p2 },
    message: turnStartMessage('p1', mode),
    lastEvent: null,
  }
}

export function otherPlayer(player: PlayerId): PlayerId {
  return player === 'p1' ? 'p2' : 'p1'
}

function actorLabel(player: PlayerId, mode: MatchMode): string {
  if (mode === 'solo') return player === 'p1' ? 'You' : 'AI'
  return player === 'p1' ? 'P1' : 'P2'
}

function turnStartMessage(player: PlayerId, mode: MatchMode): string {
  if (mode === 'solo') {
    return player === 'p1' ? 'Your turn — roll the dice.' : "AI's turn…"
  }
  return `${actorLabel(player, mode)}'s turn — roll the dice.`
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

function specsFromLoadout(loadout: string[], count: number): DieSpec[] {
  return normalizeLoadout(loadout)
    .slice(0, count)
    .map((dieTypeId, loadoutSlot) => ({ dieTypeId, loadoutSlot }))
}

function specsForRoll(state: MatchState): DieSpec[] {
  if (state.pendingRollSpecs && state.pendingRollSpecs.length > 0) {
    return state.pendingRollSpecs
  }
  if (state.mode === 'online') {
    return specsFromLoadout(
      state.loadouts[state.currentPlayer],
      state.diceToRoll,
    )
  }
  if (state.currentPlayer === 'p1') {
    return specsFromLoadout(state.loadouts.p1, state.diceToRoll)
  }
  return fairSpecs(state.diceToRoll)
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

  const selecting =
    state.mode === 'solo'
      ? state.currentPlayer === 'p1'
        ? 'Select scoring dice, then confirm.'
        : 'AI is choosing dice…'
      : `${actorLabel(state.currentPlayer, state.mode)}: select scoring dice.`

  return {
    ...state,
    turnPhase: 'need_select',
    roll: nextRoll,
    selected: [],
    pendingRollSpecs: null,
    throwId,
    message: selecting,
    lastEvent: null,
  }
}

function bustMessage(busted: PlayerId, next: PlayerId, mode: MatchMode): string {
  const who =
    mode === 'solo'
      ? busted === 'p1'
        ? 'You busted'
        : 'AI busted'
      : `${actorLabel(busted, mode)} busted`
  return `${who}! Turn points lost. ${turnStartMessage(next, mode)}`
}

export function resolveBust(state: MatchState): MatchState {
  if (state.phase !== 'playing' || state.turnPhase !== 'showing_bust') return state

  const nextPlayer = otherPlayer(state.currentPlayer)
  return {
    ...beginTurn(
      state,
      nextPlayer,
      bustMessage(state.currentPlayer, nextPlayer, state.mode),
    ),
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
    const hot =
      state.mode === 'solo'
        ? state.currentPlayer === 'p1'
          ? `Hot dice! +${score}. Roll all six again.`
          : `AI hot dice! +${score}.`
        : `${actorLabel(state.currentPlayer, state.mode)} hot dice! +${score}.`
    return {
      ...state,
      turnPhase: 'need_roll',
      turnScore,
      roll: [],
      selected: [],
      diceToRoll: 6,
      pendingRollSpecs: null,
      message: hot,
      lastEvent: 'hot_dice',
    }
  }

  const remainingDice = state.roll.filter((d) => !selected.has(d.id))
  const afterHold =
    state.mode === 'solo'
      ? state.currentPlayer === 'p1'
        ? `+${score}. Bank ${turnScore}, or roll ${remainingDice.length} dice.`
        : `AI scored +${score} (turn ${turnScore}).`
      : `${actorLabel(state.currentPlayer, state.mode)} scored +${score} (turn ${turnScore}).`

  return {
    ...state,
    turnPhase: 'need_decision',
    turnScore,
    roll: remainingDice,
    selected: [],
    diceToRoll: remainingDice.length,
    pendingRollSpecs: null,
    message: afterHold,
    lastEvent: null,
  }
}

export function bank(state: MatchState): MatchState {
  if (!canBank(state)) return state

  const player = state.currentPlayer
  const newScore = state.scores[player] + state.turnScore
  const scores = { ...state.scores, [player]: newScore }

  if (newScore >= state.targetScore) {
    const win =
      state.mode === 'solo'
        ? player === 'p1'
          ? 'You win!'
          : 'AI wins.'
        : `${actorLabel(player, state.mode)} wins!`
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
      message: win,
      lastEvent: 'win',
    }
  }

  const next = otherPlayer(player)
  return {
    ...beginTurn(
      { ...state, scores },
      next,
      bankMessage(player, state.turnScore, next, state.mode),
    ),
    scores,
    lastEvent: 'bank',
  }
}

function bankMessage(
  banked: PlayerId,
  points: number,
  next: PlayerId,
  mode: MatchMode,
): string {
  const who =
    mode === 'solo'
      ? banked === 'p1'
        ? 'You banked'
        : 'AI banked'
      : `${actorLabel(banked, mode)} banked`
  return `${who} ${points}. ${turnStartMessage(next, mode)}`
}

export function chooseReroll(state: MatchState): MatchState {
  if (!canReroll(state)) return state
  const msg =
    state.mode === 'solo'
      ? state.currentPlayer === 'p1'
        ? `Roll ${state.diceToRoll} dice.`
        : 'AI will roll again…'
      : `${actorLabel(state.currentPlayer, state.mode)} rolls ${state.diceToRoll} more.`
  return {
    ...state,
    turnPhase: 'need_roll',
    pendingRollSpecs: state.roll.map((die) => ({
      dieTypeId: die.dieTypeId,
      loadoutSlot: die.loadoutSlot,
    })),
    roll: [],
    selected: [],
    message: msg,
    lastEvent: null,
  }
}

/** Remap neutral P1/P2 copy to You/Opponent for the local seat. */
export function personalizeOnlineMessage(
  message: string | null,
  seat: PlayerId,
): string | null {
  if (!message) return null
  const me = seat === 'p1' ? 'P1' : 'P2'
  const them = seat === 'p1' ? 'P2' : 'P1'
  if (message === `${me} wins!`) return 'You win!'
  if (message === `${them} wins!`) return 'Opponent wins!'
  return message
    .replaceAll(`${me}'s`, 'Your')
    .replaceAll(`${me} `, 'You ')
    .replaceAll(`${me}:`, 'You:')
    .replaceAll(me, 'You')
    .replaceAll(`${them}'s`, "Opponent's")
    .replaceAll(`${them} `, 'Opponent ')
    .replaceAll(`${them}:`, 'Opponent:')
    .replaceAll(them, 'Opponent')
}
