import type { OnlineRoomSnapshot } from '../game/onlineProtocol'
import type { TargetScore } from '../game/types'

interface OnlineLobbyProps {
  snapshot: OnlineRoomSnapshot
  connectionState: string
  lastError: string | null
  onTargetChange: (target: TargetScore) => void
  onStart: () => void
  onLeave: () => void
}

export function OnlineLobby({
  snapshot,
  connectionState,
  lastError,
  onTargetChange,
  onStart,
  onLeave,
}: OnlineLobbyProps) {
  const bothSeated = snapshot.seats.p1 && snapshot.seats.p2
  const opponentSeat = snapshot.seat === 'p1' ? 'p2' : 'p1'
  const opponentConnected = snapshot.connected[opponentSeat]
  const canStart =
    bothSeated &&
    snapshot.status === 'lobby' &&
    connectionState === 'open'

  return (
    <section className="panel setup online-lobby">
      <h1 className="brand">Nicer Dicer</h1>
      <p className="lede">Online lobby — share the code with your opponent.</p>

      <div className="online-room-card">
        <span className="online-room-label">Room code</span>
        <strong className="online-room-code">{snapshot.roomCode}</strong>
        <span className="online-seat">
          You are {snapshot.seat === 'p1' ? 'P1 (host)' : 'P2 (guest)'}
        </span>
      </div>

      <ul className="online-presence">
        <li className={snapshot.connected.p1 ? 'is-online' : 'is-offline'}>
          P1 {snapshot.connected.p1 ? 'connected' : snapshot.seats.p1 ? 'disconnected' : 'waiting…'}
        </li>
        <li className={snapshot.connected.p2 ? 'is-online' : 'is-offline'}>
          P2 {snapshot.connected.p2 ? 'connected' : snapshot.seats.p2 ? 'disconnected' : 'waiting…'}
        </li>
      </ul>

      {connectionState !== 'open' && (
        <p className="online-error">
          {connectionState === 'connecting'
            ? 'Connecting…'
            : 'Disconnected — trying to reconnect…'}
        </p>
      )}

      {bothSeated && !opponentConnected && (
        <p className="setup-hint">Opponent disconnected. Waiting for them to rejoin…</p>
      )}

      <fieldset className="target-picker">
        <legend>Target score</legend>
        <label className={snapshot.targetScore === 1500 ? 'active' : undefined}>
          <input
            type="radio"
            name="online-target"
            checked={snapshot.targetScore === 1500}
            disabled={snapshot.status !== 'lobby'}
            onChange={() => onTargetChange(1500)}
          />
          1500 — quick
        </label>
        <label className={snapshot.targetScore === 4000 ? 'active' : undefined}>
          <input
            type="radio"
            name="online-target"
            checked={snapshot.targetScore === 4000}
            disabled={snapshot.status !== 'lobby'}
            onChange={() => onTargetChange(4000)}
          />
          4000 — classic
        </label>
      </fieldset>

      <div className="online-lobby-actions">
        <button
          type="button"
          className="btn primary"
          disabled={!canStart}
          onClick={onStart}
        >
          {bothSeated ? 'Start match' : 'Waiting for opponent…'}
        </button>
        <button type="button" className="btn" onClick={onLeave}>
          Leave room
        </button>
      </div>

      {lastError && <p className="online-error">{lastError}</p>}
    </section>
  )
}
