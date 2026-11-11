import type { MatchState, PlayerId, TargetScore } from './types'

export type OnlineLobbyStatus = 'lobby' | 'playing' | 'finished'

export interface OnlineRoomSnapshot {
  roomCode: string
  status: OnlineLobbyStatus
  targetScore: TargetScore
  seat: PlayerId | null
  seats: { p1: boolean; p2: boolean }
  connected: { p1: boolean; p2: boolean }
  /** Display names when the seat is linked to an account. */
  usernames: { p1: string | null; p2: string | null }
  /** Chosen 6-die loadouts for each seat (visible to both players). */
  loadouts: { p1: string[]; p2: string[] }
  match: MatchState | null
  error: string | null
}

export type ClientToServerMessage =
  | { type: 'hello'; seatToken: string }
  | { type: 'auth'; token: string }
  | { type: 'set_target'; target: TargetScore }
  | { type: 'set_loadout'; dieTypeIds: string[] }
  | { type: 'start' }
  | { type: 'restart' }
  | { type: 'roll' }
  | { type: 'toggle'; dieId: string }
  | { type: 'select'; ids: string[] }
  | { type: 'confirm' }
  | { type: 'bank' }
  | { type: 'reroll' }
  | { type: 'resolve_bust' }

export type ServerToClientMessage =
  | { type: 'snapshot'; snapshot: OnlineRoomSnapshot }
  | { type: 'error'; message: string }

export function otherSeat(seat: PlayerId): PlayerId {
  return seat === 'p1' ? 'p2' : 'p1'
}

export function generateRoomCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += alphabet[Math.floor(Math.random() * alphabet.length)]!
  }
  return code
}

export function normalizeRoomCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6)
}
