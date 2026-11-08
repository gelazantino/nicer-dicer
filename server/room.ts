import {
  bank,
  chooseReroll,
  confirmHold,
  resolveBust,
  roll,
  setSelection,
  startMatch,
  toggleSelect,
} from '../src/game/engine.ts'
import type {
  ClientToServerMessage,
  OnlineLobbyStatus,
  OnlineRoomSnapshot,
  ServerToClientMessage,
} from '../src/game/onlineProtocol.ts'
import { normalizeRoomCode } from '../src/game/onlineProtocol.ts'
import type { MatchState, PlayerId, TargetScore } from '../src/game/types.ts'
import { defaultHumanLoadout } from '../src/game/weightedRoll.ts'

const BUST_REVEAL_MS = 2200

type SeatToken = string

export interface RoomConnection {
  id: string
  send: (message: ServerToClientMessage) => void
}

interface SeatBinding {
  token: SeatToken
  connectionId: string | null
}

/** Authoritative 1v1 room — used by the VPS WebSocket server. */
export class DiceRoom {
  readonly roomCode: string
  targetScore: TargetScore = 4000
  status: OnlineLobbyStatus = 'lobby'
  match: MatchState | null = null
  seats: Record<PlayerId, SeatBinding | null> = { p1: null, p2: null }
  private connections = new Map<string, RoomConnection>()
  private connectionMeta = new Map<
    string,
    { seat: PlayerId; seatToken: string }
  >()
  private bustTimer: ReturnType<typeof setTimeout> | null = null

  constructor(roomCode: string) {
    this.roomCode = normalizeRoomCode(roomCode)
  }

  get isEmpty(): boolean {
    return this.connections.size === 0
  }

  connect(connection: RoomConnection, seatToken: string): PlayerId | null {
    let seat = this.findSeatByToken(seatToken)
    if (!seat) {
      seat = this.assignSeat(seatToken, connection.id)
    } else {
      this.seats[seat] = { token: seatToken, connectionId: connection.id }
    }

    if (!seat) {
      connection.send({ type: 'error', message: 'Room is full.' })
      return null
    }

    this.connections.set(connection.id, connection)
    this.connectionMeta.set(connection.id, { seat, seatToken })
    this.broadcastSnapshots()
    return seat
  }

  disconnect(connectionId: string) {
    const meta = this.connectionMeta.get(connectionId)
    if (meta?.seat && this.seats[meta.seat]?.connectionId === connectionId) {
      this.seats[meta.seat] = {
        token: meta.seatToken,
        connectionId: null,
      }
    }
    this.connections.delete(connectionId)
    this.connectionMeta.delete(connectionId)
    this.broadcastSnapshots()
  }

  handleMessage(connectionId: string, raw: string) {
    const connection = this.connections.get(connectionId)
    const meta = this.connectionMeta.get(connectionId)
    if (!connection || !meta) return

    let data: ClientToServerMessage
    try {
      data = JSON.parse(raw) as ClientToServerMessage
    } catch {
      connection.send({ type: 'error', message: 'Invalid message.' })
      return
    }

    const { seat } = meta

    switch (data.type) {
      case 'hello':
        break
      case 'set_target':
        if (this.status !== 'lobby') break
        if (data.target === 1500 || data.target === 4000) {
          this.targetScore = data.target
        }
        break
      case 'start':
        this.handleStart(connection, seat)
        break
      case 'restart':
        this.handleRestart(connection, seat)
        break
      case 'roll':
      case 'toggle':
      case 'select':
      case 'confirm':
      case 'bank':
      case 'reroll':
      case 'resolve_bust':
        this.handleGameAction(connection, seat, data)
        break
      default:
        connection.send({ type: 'error', message: 'Unknown action.' })
        return
    }

    this.broadcastSnapshots()
  }

  private handleStart(connection: RoomConnection, seat: PlayerId) {
    if (this.status !== 'lobby' && this.status !== 'finished') {
      connection.send({ type: 'error', message: 'Match already in progress.' })
      return
    }
    if (!this.seats.p1 || !this.seats.p2) {
      connection.send({ type: 'error', message: 'Need two players to start.' })
      return
    }
    void seat
    this.clearBustTimer()
    this.match = startMatch(this.targetScore, defaultHumanLoadout(), 'online')
    this.status = 'playing'
    this.maybeScheduleBust()
  }

  private handleRestart(connection: RoomConnection, seat: PlayerId) {
    if (!this.seats.p1 || !this.seats.p2) {
      connection.send({ type: 'error', message: 'Need two players to restart.' })
      return
    }
    void seat
    this.clearBustTimer()
    this.match = startMatch(this.targetScore, defaultHumanLoadout(), 'online')
    this.status = 'playing'
    this.maybeScheduleBust()
  }

  private handleGameAction(
    connection: RoomConnection,
    seat: PlayerId,
    data: ClientToServerMessage,
  ) {
    if (!this.match || this.status !== 'playing') {
      connection.send({ type: 'error', message: 'No active match.' })
      return
    }

    if (data.type === 'resolve_bust') return

    if (this.match.turnPhase === 'showing_bust') {
      connection.send({ type: 'error', message: 'Wait for bust reveal.' })
      return
    }

    if (this.match.currentPlayer !== seat) {
      connection.send({ type: 'error', message: 'Not your turn.' })
      return
    }

    const before = this.match
    switch (data.type) {
      case 'roll':
        this.match = roll(before)
        break
      case 'toggle':
        this.match = toggleSelect(before, data.dieId)
        break
      case 'select':
        this.match = setSelection(before, data.ids)
        break
      case 'confirm':
        this.match = confirmHold(before)
        break
      case 'bank':
        this.match = bank(before)
        break
      case 'reroll':
        this.match = roll(chooseReroll(before))
        break
      default:
        return
    }

    if (this.match.phase === 'game_over') {
      this.status = 'finished'
      this.clearBustTimer()
    } else {
      this.maybeScheduleBust()
    }
  }

  private maybeScheduleBust() {
    this.clearBustTimer()
    if (!this.match || this.match.turnPhase !== 'showing_bust') return
    this.bustTimer = setTimeout(() => {
      if (!this.match || this.match.turnPhase !== 'showing_bust') return
      this.match = resolveBust(this.match)
      this.broadcastSnapshots()
    }, BUST_REVEAL_MS)
  }

  private clearBustTimer() {
    if (this.bustTimer !== null) {
      clearTimeout(this.bustTimer)
      this.bustTimer = null
    }
  }

  private findSeatByToken(token: SeatToken): PlayerId | null {
    if (this.seats.p1?.token === token) return 'p1'
    if (this.seats.p2?.token === token) return 'p2'
    return null
  }

  private assignSeat(token: SeatToken, connectionId: string): PlayerId | null {
    if (!this.seats.p1) {
      this.seats.p1 = { token, connectionId }
      return 'p1'
    }
    if (!this.seats.p2) {
      this.seats.p2 = { token, connectionId }
      return 'p2'
    }
    return null
  }

  private snapshotFor(seat: PlayerId | null): OnlineRoomSnapshot {
    return {
      roomCode: this.roomCode,
      status: this.status,
      targetScore: this.targetScore,
      seat,
      seats: {
        p1: Boolean(this.seats.p1),
        p2: Boolean(this.seats.p2),
      },
      connected: {
        p1: Boolean(this.seats.p1?.connectionId),
        p2: Boolean(this.seats.p2?.connectionId),
      },
      match: this.match,
      error: null,
    }
  }

  private broadcastSnapshots() {
    for (const [id, connection] of this.connections) {
      const seat = this.connectionMeta.get(id)?.seat ?? null
      connection.send({
        type: 'snapshot',
        snapshot: this.snapshotFor(seat),
      })
    }
  }
}
