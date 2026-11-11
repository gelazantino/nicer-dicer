import { randomUUID } from 'node:crypto'
import { generateRoomCode } from '../src/game/onlineProtocol.ts'
import { getDb, withTransaction } from './db.ts'

const INVITE_TTL_MS = Number(process.env.INVITE_TTL_MS || 30 * 60 * 1000)

export class FriendsError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'FriendsError'
  }
}

export type FriendUser = {
  id: string
  username: string
}

export type FriendshipRow = {
  id: string
  status: 'pending' | 'accepted'
  createdAt: string
  user: FriendUser
  direction: 'incoming' | 'outgoing' | 'friend'
}

export type InvitationRow = {
  id: string
  roomCode: string
  status: string
  createdAt: string
  from: FriendUser
  to: FriendUser
}

type UserRow = { id: string; username: string }

function findUserByUsername(username: string): UserRow | undefined {
  return getDb()
    .prepare(
      'SELECT id, username FROM users WHERE username = ? COLLATE NOCASE',
    )
    .get(username.trim()) as UserRow | undefined
}

function findUserById(id: string): UserRow | undefined {
  return getDb()
    .prepare('SELECT id, username FROM users WHERE id = ?')
    .get(id) as UserRow | undefined
}

function existingFriendship(a: string, b: string) {
  return getDb()
    .prepare(
      `SELECT id, requester_id, addressee_id, status, created_at
       FROM friendships
       WHERE (requester_id = ? AND addressee_id = ?)
          OR (requester_id = ? AND addressee_id = ?)`,
    )
    .get(a, b, b, a) as
    | {
        id: string
        requester_id: string
        addressee_id: string
        status: 'pending' | 'accepted'
        created_at: string
      }
    | undefined
}

function areFriends(a: string, b: string): boolean {
  const row = existingFriendship(a, b)
  return row?.status === 'accepted'
}

export function listFriends(userId: string): {
  friends: FriendshipRow[]
  incoming: FriendshipRow[]
  outgoing: FriendshipRow[]
} {
  const rows = getDb()
    .prepare(
      `SELECT f.id, f.requester_id, f.addressee_id, f.status, f.created_at,
              u.id AS other_id, u.username AS other_username
       FROM friendships f
       JOIN users u
         ON u.id = CASE
           WHEN f.requester_id = ? THEN f.addressee_id
           ELSE f.requester_id
         END
       WHERE f.requester_id = ? OR f.addressee_id = ?
       ORDER BY u.username COLLATE NOCASE`,
    )
    .all(userId, userId, userId) as Array<{
    id: string
    requester_id: string
    addressee_id: string
    status: 'pending' | 'accepted'
    created_at: string
    other_id: string
    other_username: string
  }>

  const friends: FriendshipRow[] = []
  const incoming: FriendshipRow[] = []
  const outgoing: FriendshipRow[] = []

  for (const row of rows) {
    const entry: FriendshipRow = {
      id: row.id,
      status: row.status,
      createdAt: row.created_at,
      user: { id: row.other_id, username: row.other_username },
      direction:
        row.status === 'accepted'
          ? 'friend'
          : row.addressee_id === userId
            ? 'incoming'
            : 'outgoing',
    }
    if (row.status === 'accepted') friends.push(entry)
    else if (entry.direction === 'incoming') incoming.push(entry)
    else outgoing.push(entry)
  }

  return { friends, incoming, outgoing }
}

export function requestFriend(
  userId: string,
  username: string,
): FriendshipRow {
  const target = findUserByUsername(username)
  if (!target) throw new FriendsError(404, 'User not found.')
  if (target.id === userId) {
    throw new FriendsError(400, 'You cannot friend yourself.')
  }

  const existing = existingFriendship(userId, target.id)
  if (existing?.status === 'accepted') {
    throw new FriendsError(409, 'You are already friends.')
  }
  if (existing?.status === 'pending') {
    if (existing.addressee_id === userId) {
      throw new FriendsError(
        409,
        'They already sent you a request — accept it instead.',
      )
    }
    throw new FriendsError(409, 'Friend request already pending.')
  }

  const id = randomUUID()
  const createdAt = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO friendships (id, requester_id, addressee_id, status, created_at)
       VALUES (?, ?, ?, 'pending', ?)`,
    )
    .run(id, userId, target.id, createdAt)

  return {
    id,
    status: 'pending',
    createdAt,
    user: { id: target.id, username: target.username },
    direction: 'outgoing',
  }
}

export function respondToFriendRequest(
  userId: string,
  friendshipId: string,
  accept: boolean,
): { friends: FriendshipRow[]; incoming: FriendshipRow[]; outgoing: FriendshipRow[] } {
  const row = getDb()
    .prepare(
      `SELECT id, requester_id, addressee_id, status
       FROM friendships WHERE id = ?`,
    )
    .get(friendshipId) as
    | {
        id: string
        requester_id: string
        addressee_id: string
        status: string
      }
    | undefined

  if (!row || row.addressee_id !== userId || row.status !== 'pending') {
    throw new FriendsError(404, 'Friend request not found.')
  }

  if (accept) {
    getDb()
      .prepare(`UPDATE friendships SET status = 'accepted' WHERE id = ?`)
      .run(friendshipId)
  } else {
    getDb().prepare(`DELETE FROM friendships WHERE id = ?`).run(friendshipId)
  }

  return listFriends(userId)
}

export function removeFriend(
  userId: string,
  friendshipId: string,
): { friends: FriendshipRow[]; incoming: FriendshipRow[]; outgoing: FriendshipRow[] } {
  const row = getDb()
    .prepare(
      `SELECT id, requester_id, addressee_id FROM friendships WHERE id = ?`,
    )
    .get(friendshipId) as
    | { id: string; requester_id: string; addressee_id: string }
    | undefined

  if (
    !row ||
    (row.requester_id !== userId && row.addressee_id !== userId)
  ) {
    throw new FriendsError(404, 'Friendship not found.')
  }

  getDb().prepare(`DELETE FROM friendships WHERE id = ?`).run(friendshipId)
  return listFriends(userId)
}

function expireOldInvites(userId: string) {
  const cutoff = new Date(Date.now() - INVITE_TTL_MS).toISOString()
  getDb()
    .prepare(
      `UPDATE play_invitations
       SET status = 'expired'
       WHERE status = 'pending'
         AND (to_user_id = ? OR from_user_id = ?)
         AND created_at < ?`,
    )
    .run(userId, userId, cutoff)
}

export function listInvitations(userId: string): {
  incoming: InvitationRow[]
  outgoing: InvitationRow[]
} {
  expireOldInvites(userId)
  const rows = getDb()
    .prepare(
      `SELECT i.id, i.room_code, i.status, i.created_at,
              i.from_user_id, i.to_user_id,
              fu.username AS from_username,
              tu.username AS to_username
       FROM play_invitations i
       JOIN users fu ON fu.id = i.from_user_id
       JOIN users tu ON tu.id = i.to_user_id
       WHERE (i.to_user_id = ? OR i.from_user_id = ?)
         AND i.status = 'pending'
       ORDER BY i.created_at DESC`,
    )
    .all(userId, userId) as Array<{
    id: string
    room_code: string
    status: string
    created_at: string
    from_user_id: string
    to_user_id: string
    from_username: string
    to_username: string
  }>

  const incoming: InvitationRow[] = []
  const outgoing: InvitationRow[] = []
  for (const row of rows) {
    const entry: InvitationRow = {
      id: row.id,
      roomCode: row.room_code,
      status: row.status,
      createdAt: row.created_at,
      from: { id: row.from_user_id, username: row.from_username },
      to: { id: row.to_user_id, username: row.to_username },
    }
    if (row.to_user_id === userId) incoming.push(entry)
    else outgoing.push(entry)
  }
  return { incoming, outgoing }
}

export function sendPlayInvite(
  userId: string,
  friendUserId: string,
): InvitationRow {
  const friend = findUserById(friendUserId)
  if (!friend) throw new FriendsError(404, 'User not found.')
  if (!areFriends(userId, friendUserId)) {
    throw new FriendsError(403, 'You can only invite accepted friends.')
  }

  const me = findUserById(userId)
  if (!me) throw new FriendsError(401, 'Not signed in.')

  // Cancel older pending invites between this pair (either direction).
  getDb()
    .prepare(
      `UPDATE play_invitations
       SET status = 'cancelled'
       WHERE status = 'pending'
         AND (
           (from_user_id = ? AND to_user_id = ?)
           OR (from_user_id = ? AND to_user_id = ?)
         )`,
    )
    .run(userId, friendUserId, friendUserId, userId)

  const id = randomUUID()
  const roomCode = generateRoomCode()
  const createdAt = new Date().toISOString()
  getDb()
    .prepare(
      `INSERT INTO play_invitations
         (id, from_user_id, to_user_id, room_code, status, created_at)
       VALUES (?, ?, ?, ?, 'pending', ?)`,
    )
    .run(id, userId, friendUserId, roomCode, createdAt)

  return {
    id,
    roomCode,
    status: 'pending',
    createdAt,
    from: { id: me.id, username: me.username },
    to: { id: friend.id, username: friend.username },
  }
}

export function respondToPlayInvite(
  userId: string,
  invitationId: string,
  accept: boolean,
): { roomCode: string | null; invitations: ReturnType<typeof listInvitations> } {
  expireOldInvites(userId)

  const result = withTransaction(() => {
    const row = getDb()
      .prepare(
        `SELECT id, from_user_id, to_user_id, room_code, status, created_at
         FROM play_invitations WHERE id = ?`,
      )
      .get(invitationId) as
      | {
          id: string
          from_user_id: string
          to_user_id: string
          room_code: string
          status: string
          created_at: string
        }
      | undefined

    if (!row || row.status !== 'pending') {
      throw new FriendsError(404, 'Invitation not found.')
    }

    const ageMs = Date.now() - Date.parse(row.created_at)
    if (Number.isFinite(ageMs) && ageMs > INVITE_TTL_MS) {
      getDb()
        .prepare(
          `UPDATE play_invitations SET status = 'expired' WHERE id = ?`,
        )
        .run(invitationId)
      throw new FriendsError(410, 'Invitation expired.')
    }

    if (accept) {
      if (row.to_user_id !== userId) {
        throw new FriendsError(403, 'Only the invitee can accept.')
      }
      getDb()
        .prepare(
          `UPDATE play_invitations SET status = 'accepted' WHERE id = ?`,
        )
        .run(invitationId)
      return row.room_code
    }

    // Decline (invitee) or cancel (sender)
    if (row.to_user_id !== userId && row.from_user_id !== userId) {
      throw new FriendsError(403, 'Not your invitation.')
    }
    getDb()
      .prepare(
        `UPDATE play_invitations
         SET status = ?
         WHERE id = ?`,
      )
      .run(row.to_user_id === userId ? 'declined' : 'cancelled', invitationId)
    return null
  })

  return { roomCode: result, invitations: listInvitations(userId) }
}
