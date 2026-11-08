export type Face = 1 | 2 | 3 | 4 | 5 | 6

/** Shared seats: solo maps p1=you, p2=AI; online maps p1=host, p2=guest. */
export type PlayerId = 'p1' | 'p2'

export type MatchMode = 'solo' | 'online'

export type TargetScore = 1500 | 4000

export type TurnPhase =
  | 'need_roll'
  | 'need_select'
  | 'need_decision'
  | 'showing_bust'

export type MatchPhase = 'setup' | 'playing' | 'game_over'

export interface DieSpec {
  dieTypeId: string
  loadoutSlot: number
}

export interface TableDie {
  id: string
  face: Face
  dieTypeId: string
  loadoutSlot: number
  /** True when this face is the dragon/devil head side. */
  devilHead: boolean
}

export interface MatchState {
  phase: MatchPhase
  turnPhase: TurnPhase
  mode: MatchMode
  targetScore: TargetScore
  scores: Record<PlayerId, number>
  currentPlayer: PlayerId
  turnScore: number
  /** Dice currently on the table for this throw. */
  roll: TableDie[]
  /** Selected die ids from `roll`. */
  selected: string[]
  /** How many dice to throw on the next roll. */
  diceToRoll: number
  /** Specs awaiting the next roll (preserves loaded types after a hold). */
  pendingRollSpecs: DieSpec[] | null
  /** Bumps on every physical throw so the UI can replay scatter animation. */
  throwId: number
  /** P1 die types (debug loadout in solo; ordinary fair dice online). */
  humanLoadout: string[]
  message: string | null
  winner: PlayerId | null
  lastEvent: 'bust' | 'hot_dice' | 'bank' | 'win' | null
}

export type AiAction =
  | { type: 'roll' }
  | { type: 'select'; ids: string[] }
  | { type: 'confirm' }
  | { type: 'bank' }
  | { type: 'reroll' }
