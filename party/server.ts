import type * as Party from 'partykit/server'
import {
  bank,
  chooseReroll,
  confirmHold,
  resolveBust,
  roll,
  setSelection,
  startMatch,
  toggleSelect,
} from '../src/game/engine'
import type {
  ClientToServerMessage,
  OnlineLobbyStatus,
  OnlineRoomSnapshot,
  ServerToClientMessage,
} from '../src/game/onlineProtocol'
import { normalizeRoomCode } from '../src/game/onlineProtocol'
import type { MatchState, PlayerId, TargetScore } from '../src/game/types'
import { defaultHumanLoadout } from '../src/game/weightedRoll'

const BUST_REVEAL_MS = 2200

type SeatToken = string

interface SeatBinding {
  token: SeatToken
  connectionId: string | null
}

export default class DiceRoom implements Party.Server {
  targetScore: TargetScore = 4000
  status: OnlineLobbyStatus = 'lobby'
  match: MatchState | null = null
  seats: Record<PlayerId, SeatBinding | null> = { p1: null, p2: null }
  bustTimer: ReturnType<typeof setTimeout> | null = null

  constructor(readonly room: Party.Room) {}

  onConnect(connection: Party.Connection, ctx: Party.ConnectionContext) {
    const roomCode = normalizeRoomCode(this.room.id)
    const url = new URL(ctx.request.url)
    const seatToken = url.searchParams.get('seatToken') || connection.id

    let seat = this.findSeatByToken(seatToken)
    if (!seat) {
      seat = this.assignSeat(seatToken, connection.id)
    } else {
      this.seats[seat] = { token: seatToken, connectionId: connection.id }
    }

    if (!seat) {
      this.send(connection, {
        type: 'error',
        message: 'Room is full.',
      })
      connection.close(1013, 'Room full')
      return
    }

    connection.setState({ seat, seatToken })
    this.broadcastSnapshots()
  }

  onClose(connection: Party.Connection) {
    const state = connection.state as { seat?: PlayerId; seatToken?: string } | null
    if (state?.seat && this.seats[state.seat]?.connectionId === connection.id) {
      this.seats[state.seat] = {
        token: state.seatToken || this.seats[state.seat]!.token,
        connectionId: null,
      }
    }
    this.broadcastSnapshots()
  }

  onMessage(message: string, sender: Party.Connection) {
    let data: ClientToServerMessage
    try {
      data = JSON.parse(message) as ClientToServerMessage
    } catch {
      this.send(sender, { type: 'error', message: 'Invalid message.' })
      return
    }

    const seat = (sender.state as { seat?: PlayerId } | null)?.seat
    if (!seat) {
      this.send(sender, { type: 'error', message: 'No seat assigned.' })
      return
    }

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
        this.handleStart(sender, seat)
        break
      case 'restart':
        this.handleRestart(sender, seat)
        break
      case 'roll':
      case 'toggle':
      case 'select':
      case 'confirm':
      case 'bank':
      case 'reroll':
      case 'resolve_bust':
        this.handleGameAction(sender, seat, data)
        break
      default:
        this.send(sender, { type: 'error', message: 'Unknown action.' })
        return
    }

    this.broadcastSnapshots()
  }

  private handleStart(sender: Party.Connection, seat: PlayerId) {
    if (this.status !== 'lobby' && this.status !== 'finished') {
      this.send(sender, { type: 'error', message: 'Match already in progress.' })
      return
    }
    if (!this.seats.p1 || !this.seats.p2) {
      this.send(sender, { type: 'error', message: 'Need two players to start.' })
      return
    }
    // Either seated player may start once both seats claimed.
    void seat
    this.clearBustTimer()
    this.match = startMatch(this.targetScore, defaultHumanLoadout(), 'online')
    this.status = 'playing'
    this.maybeScheduleBust()
  }

  private handleRestart(sender: Party.Connection, seat: PlayerId) {
    if (!this.seats.p1 || !this.seats.p2) {
      this.send(sender, { type: 'error', message: 'Need two players to restart.' })
      return
    }
    void seat
    this.clearBustTimer()
    this.match = startMatch(this.targetScore, defaultHumanLoadout(), 'online')
    this.status = 'playing'
    this.maybeScheduleBust()
  }

  private handleGameAction(
    sender: Party.Connection,
    seat: PlayerId,
    data: ClientToServerMessage,
  ) {
    if (!this.match || this.status !== 'playing') {
      this.send(sender, { type: 'error', message: 'No active match.' })
      return
    }

    if (data.type === 'resolve_bust') {
      // Server owns bust timing; ignore client resolve requests.
      return
    }

    if (this.match.turnPhase === 'showing_bust') {
      this.send(sender, { type: 'error', message: 'Wait for bust reveal.' })
      return
    }

    if (this.match.currentPlayer !== seat) {
      this.send(sender, { type: 'error', message: 'Not your turn.' })
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
      roomCode: normalizeRoomCode(this.room.id),
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

  private send(connection: Party.Connection, message: ServerToClientMessage) {
    connection.send(JSON.stringify(message))
  }

  private broadcastSnapshots() {
    for (const connection of this.room.getConnections()) {
      const seat =
        (connection.state as { seat?: PlayerId } | null)?.seat ?? null
      this.send(connection, {
        type: 'snapshot',
        snapshot: this.snapshotFor(seat),
      })
    }
  }
}

DiceRoom satisfies Party.Worker
