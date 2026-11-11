import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { useAuth } from '../auth/AuthContext'
import {
  ApiError,
  fetchFriends,
  fetchInvitations,
  removeFriend,
  requestFriend,
  respondToFriendRequest,
  respondToPlayInvite,
  sendPlayInvite,
  type FriendsList,
  type InvitationsList,
} from '../auth/api'

interface FriendsPanelProps {
  onJoinRoom: (roomCode: string) => void
}

export function FriendsPanel({ onJoinRoom }: FriendsPanelProps) {
  const { user, token, apiAvailable } = useAuth()
  const [friends, setFriends] = useState<FriendsList | null>(null)
  const [invites, setInvites] = useState<InvitationsList | null>(null)
  const [username, setUsername] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!token) return
    setBusy(true)
    setError(null)
    try {
      const [friendsList, invitations] = await Promise.all([
        fetchFriends(token),
        fetchInvitations(token),
      ])
      setFriends(friendsList)
      setInvites(invitations)
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Could not load friends.',
      )
    } finally {
      setBusy(false)
    }
  }, [token])

  useEffect(() => {
    if (!user || !token) {
      setFriends(null)
      setInvites(null)
      return
    }
    void refresh()
    const timer = window.setInterval(() => void refresh(), 12_000)
    return () => window.clearInterval(timer)
  }, [user, token, refresh])

  if (!apiAvailable) return null
  if (!user || !token) {
    return (
      <section className="panel friends-panel">
        <h2 className="panel-title">Friends</h2>
        <p className="setup-hint">Log in to add friends and send play invites.</p>
      </section>
    )
  }

  const onRequest = async (event: FormEvent) => {
    event.preventDefault()
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await requestFriend(token, username)
      setFriends(result)
      setUsername('')
      setMessage(`Friend request sent to ${result.request.user.username}.`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Request failed.')
    } finally {
      setBusy(false)
    }
  }

  const onRespondFriend = async (friendshipId: string, accept: boolean) => {
    setBusy(true)
    setError(null)
    try {
      setFriends(await respondToFriendRequest(token, friendshipId, accept))
      setMessage(accept ? 'Friend request accepted.' : 'Request declined.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not respond.')
    } finally {
      setBusy(false)
    }
  }

  const onRemove = async (friendshipId: string) => {
    setBusy(true)
    setError(null)
    try {
      setFriends(await removeFriend(token, friendshipId))
      setMessage('Removed from friends.')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not remove.')
    } finally {
      setBusy(false)
    }
  }

  const onInvite = async (friendUserId: string, friendName: string) => {
    setBusy(true)
    setError(null)
    setMessage(null)
    try {
      const result = await sendPlayInvite(token, friendUserId)
      setInvites(result.invitations)
      setMessage(
        `Invite sent to ${friendName}. Joining room ${result.invitation.roomCode}…`,
      )
      onJoinRoom(result.invitation.roomCode)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Invite failed.')
      setBusy(false)
    }
  }

  const onRespondInvite = async (invitationId: string, accept: boolean) => {
    setBusy(true)
    setError(null)
    try {
      const result = await respondToPlayInvite(token, invitationId, accept)
      setInvites(result.invitations)
      if (accept && result.roomCode) {
        setMessage(`Joining room ${result.roomCode}…`)
        onJoinRoom(result.roomCode)
      } else {
        setMessage(accept ? 'Invite accepted.' : 'Invite declined.')
        setBusy(false)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Could not respond.')
      setBusy(false)
    }
  }

  return (
    <section className="panel friends-panel">
      <div className="inventory-header">
        <h2 className="panel-title">Friends</h2>
        <button
          type="button"
          className="btn btn-ghost"
          disabled={busy}
          onClick={() => void refresh()}
        >
          Refresh
        </button>
      </div>

      <form className="auth-form friends-add" onSubmit={onRequest}>
        <label className="auth-field">
          <span>Add by username</span>
          <input
            className="online-code-input"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={24}
            placeholder="friend_name"
            required
          />
        </label>
        <button type="submit" className="btn" disabled={busy}>
          Send request
        </button>
      </form>

      {error ? <p className="online-error">{error}</p> : null}
      {message ? <p className="inventory-ok">{message}</p> : null}

      {invites && invites.incoming.length > 0 ? (
        <div className="inventory-block">
          <h3 className="inventory-subtitle">Play invites</h3>
          <ul className="friends-list">
            {invites.incoming.map((invite) => (
              <li key={invite.id} className="friends-row">
                <div>
                  <strong>{invite.from.username}</strong>
                  <span className="friends-meta">
                    Room {invite.roomCode}
                  </span>
                </div>
                <div className="friends-actions">
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={() => void onRespondInvite(invite.id, true)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => void onRespondInvite(invite.id, false)}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {friends && friends.incoming.length > 0 ? (
        <div className="inventory-block">
          <h3 className="inventory-subtitle">Friend requests</h3>
          <ul className="friends-list">
            {friends.incoming.map((row) => (
              <li key={row.id} className="friends-row">
                <strong>{row.user.username}</strong>
                <div className="friends-actions">
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={() => void onRespondFriend(row.id, true)}
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => void onRespondFriend(row.id, false)}
                  >
                    Decline
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {friends && friends.outgoing.length > 0 ? (
        <div className="inventory-block">
          <h3 className="inventory-subtitle">Outgoing requests</h3>
          <ul className="friends-list">
            {friends.outgoing.map((row) => (
              <li key={row.id} className="friends-row">
                <span>
                  Waiting on <strong>{row.user.username}</strong>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => void onRemove(row.id)}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      <div className="inventory-block">
        <h3 className="inventory-subtitle">Your friends</h3>
        {!friends || friends.friends.length === 0 ? (
          <p className="setup-hint">No friends yet — send a request above.</p>
        ) : (
          <ul className="friends-list">
            {friends.friends.map((row) => (
              <li key={row.id} className="friends-row">
                <strong>{row.user.username}</strong>
                <div className="friends-actions">
                  <button
                    type="button"
                    className="btn primary"
                    disabled={busy}
                    onClick={() => void onInvite(row.user.id, row.user.username)}
                  >
                    Invite to play
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost"
                    disabled={busy}
                    onClick={() => void onRemove(row.id)}
                  >
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {invites && invites.outgoing.length > 0 ? (
        <div className="inventory-block">
          <h3 className="inventory-subtitle">Sent invites</h3>
          <ul className="friends-list">
            {invites.outgoing.map((invite) => (
              <li key={invite.id} className="friends-row">
                <div>
                  <strong>{invite.to.username}</strong>
                  <span className="friends-meta">
                    Room {invite.roomCode} · waiting
                  </span>
                </div>
                <button
                  type="button"
                  className="btn btn-ghost"
                  disabled={busy}
                  onClick={() => void onRespondInvite(invite.id, false)}
                >
                  Cancel
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  )
}
