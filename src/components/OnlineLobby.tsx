import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { ApiError, fetchInventory } from '../auth/api'
import type { OnlineRoomSnapshot } from '../game/onlineProtocol'
import type { PlayerId, TargetScore } from '../game/types'
import { ORDINARY_DIE_ID } from '../game/weightedRoll'
import {
  OnlineLoadoutPicker,
  type OwnedDie,
} from './OnlineLoadoutPicker'

interface OnlineLobbyProps {
  snapshot: OnlineRoomSnapshot
  connectionState: string
  lastError: string | null
  onTargetChange: (target: TargetScore) => void
  onLoadoutChange: (dieTypeIds: string[]) => void
  onStart: () => void
  onLeave: () => void
}

export function OnlineLobby({
  snapshot,
  connectionState,
  lastError,
  onTargetChange,
  onLoadoutChange,
  onStart,
  onLeave,
}: OnlineLobbyProps) {
  const { user, token } = useAuth()
  const [ownedDice, setOwnedDice] = useState<OwnedDie[]>([])
  const [inventoryError, setInventoryError] = useState<string | null>(null)

  const bothSeated = snapshot.seats.p1 && snapshot.seats.p2
  const mySeat = snapshot.seat
  const opponentSeat: PlayerId = mySeat === 'p1' ? 'p2' : 'p1'
  const opponentConnected = snapshot.connected[opponentSeat]
  const myLoadout = mySeat ? snapshot.loadouts[mySeat] : null
  const opponentLoadout = snapshot.loadouts[opponentSeat]
  const canEditLoadout =
    Boolean(user && token && mySeat) &&
    snapshot.status === 'lobby' &&
    connectionState === 'open'
  const canStart =
    bothSeated &&
    snapshot.status === 'lobby' &&
    connectionState === 'open'

  useEffect(() => {
    if (!token || !user) {
      setOwnedDice([])
      return
    }
    let cancelled = false
    void (async () => {
      try {
        const inv = await fetchInventory(token)
        if (!cancelled) {
          setOwnedDice(inv.dice)
          setInventoryError(null)
        }
      } catch (err) {
        if (!cancelled) {
          setInventoryError(
            err instanceof ApiError
              ? err.message
              : 'Could not load inventory dice.',
          )
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, user])

  const updateSlot = useCallback(
    (slot: number, dieTypeId: string) => {
      if (!myLoadout) return
      const next = [...myLoadout]
      next[slot] = dieTypeId
      onLoadoutChange(next)
    },
    [myLoadout, onLoadoutChange],
  )

  const fillOrdinary = useCallback(() => {
    onLoadoutChange(Array.from({ length: 6 }, () => ORDINARY_DIE_ID))
  }, [onLoadoutChange])

  return (
    <section className="panel setup online-lobby">
      <h1 className="brand">Nicer Dicer</h1>
      <p className="lede">Online lobby — share the code with your opponent.</p>

      <div className="online-room-card">
        <span className="online-room-label">Room code</span>
        <strong className="online-room-code">{snapshot.roomCode}</strong>
        <span className="online-seat">
          You are {snapshot.seat === 'p1' ? 'P1 (host)' : 'P2 (guest)'}
          {mySeat && snapshot.usernames[mySeat]
            ? ` · ${snapshot.usernames[mySeat]}`
            : ''}
        </span>
      </div>

      <ul className="online-presence">
        <li className={snapshot.connected.p1 ? 'is-online' : 'is-offline'}>
          P1{' '}
          {snapshot.usernames.p1 ? `(${snapshot.usernames.p1}) ` : ''}
          {snapshot.connected.p1
            ? 'connected'
            : snapshot.seats.p1
              ? 'disconnected'
              : 'waiting…'}
        </li>
        <li className={snapshot.connected.p2 ? 'is-online' : 'is-offline'}>
          P2{' '}
          {snapshot.usernames.p2 ? `(${snapshot.usernames.p2}) ` : ''}
          {snapshot.connected.p2
            ? 'connected'
            : snapshot.seats.p2
              ? 'disconnected'
              : 'waiting…'}
        </li>
      </ul>

      {connectionState !== 'open' && (
        <p className="online-error">
          {connectionState === 'connecting'
            ? lastError?.startsWith('Connection lost') ||
              lastError?.includes('reconnecting')
              ? lastError
              : 'Connecting…'
            : lastError || 'Disconnected — reconnecting…'}
        </p>
      )}

      {bothSeated && !opponentConnected && (
        <p className="setup-hint">
          Opponent disconnected. Waiting for them to rejoin…
        </p>
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

      {!user ? (
        <p className="setup-hint">
          Log in on the setup screen before creating/joining if you want to
          bring inventory dice. Guests play with ordinary dice.
        </p>
      ) : null}

      {inventoryError ? <p className="online-error">{inventoryError}</p> : null}

      {myLoadout ? (
        <OnlineLoadoutPicker
          title="Your dice"
          loadout={myLoadout}
          ownedDice={ownedDice}
          editable={canEditLoadout}
          disabled={!canEditLoadout}
          onSlotChange={updateSlot}
          onFillOrdinary={fillOrdinary}
        />
      ) : null}

      <OnlineLoadoutPicker
        title={`Opponent dice${
          snapshot.usernames[opponentSeat]
            ? ` (${snapshot.usernames[opponentSeat]})`
            : ''
        }`}
        loadout={opponentLoadout}
        ownedDice={opponentLoadout.map((dieTypeId) => ({
          dieTypeId,
          qty: 6,
        }))}
        editable={false}
      />

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
