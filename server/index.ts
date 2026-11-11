import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { WebSocketServer, type WebSocket } from 'ws'
import { normalizeRoomCode } from '../src/game/onlineProtocol.ts'
import type { ServerToClientMessage } from '../src/game/onlineProtocol.ts'
import {
  AuthError,
  loginUser,
  registerUser,
  verifyAuthToken,
  verifyBearerToken,
} from './auth.ts'
import { initDb } from './db.ts'
import { loadServerEnv } from './loadEnv.ts'

loadServerEnv()
import {
  applyCors,
  HttpError,
  pathnameOf,
  readJsonBody,
  sendError,
  sendJson,
} from './http.ts'
import {
  FriendsError,
  listFriends,
  listInvitations,
  removeFriend,
  requestFriend,
  respondToFriendRequest,
  respondToPlayInvite,
  sendPlayInvite,
} from './friends.ts'
import { craftRecipe, getInventory, InventoryError } from './inventory.ts'
import { CRAFT_RECIPES } from './recipes.ts'
import { DiceRoom } from './room.ts'

const PORT = Number(process.env.PORT || 8787)
/** Keep empty rooms alive so brief disconnects can reclaim the same seat/match. */
const ROOM_EMPTY_GRACE_MS = Number(process.env.ROOM_EMPTY_GRACE_MS || 90_000)
const rooms = new Map<string, DiceRoom>()
const emptyRoomTimers = new Map<string, ReturnType<typeof setTimeout>>()

initDb()

function clearEmptyRoomTimer(roomCode: string) {
  const timer = emptyRoomTimers.get(roomCode)
  if (!timer) return
  clearTimeout(timer)
  emptyRoomTimers.delete(roomCode)
}

function getOrCreateRoom(roomCode: string): DiceRoom {
  const code = normalizeRoomCode(roomCode)
  clearEmptyRoomTimer(code)
  let room = rooms.get(code)
  if (!room) {
    room = new DiceRoom(code)
    rooms.set(code, room)
  }
  return room
}

function scheduleRoomCleanup(room: DiceRoom) {
  if (!room.isEmpty) {
    clearEmptyRoomTimer(room.roomCode)
    return
  }
  clearEmptyRoomTimer(room.roomCode)
  emptyRoomTimers.set(
    room.roomCode,
    setTimeout(() => {
      emptyRoomTimers.delete(room.roomCode)
      const current = rooms.get(room.roomCode)
      if (current?.isEmpty) {
        rooms.delete(room.roomCode)
      }
    }, ROOM_EMPTY_GRACE_MS),
  )
}

async function handleApi(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<boolean> {
  const path = pathnameOf(req)
  const method = req.method || 'GET'

  if (path === '/health') {
    sendJson(res, 200, { ok: true, rooms: rooms.size })
    return true
  }

  if (path === '/auth/register' && method === 'POST') {
    const body = await readJsonBody<{ username?: string; password?: string }>(
      req,
    )
    const result = await registerUser(
      String(body.username ?? ''),
      String(body.password ?? ''),
    )
    sendJson(res, 201, result)
    return true
  }

  if (path === '/auth/login' && method === 'POST') {
    const body = await readJsonBody<{ username?: string; password?: string }>(
      req,
    )
    const result = await loginUser(
      String(body.username ?? ''),
      String(body.password ?? ''),
    )
    sendJson(res, 200, result)
    return true
  }

  if (path === '/me/inventory' && method === 'GET') {
    const user = await verifyBearerToken(req.headers.authorization)
    sendJson(res, 200, getInventory(user.id))
    return true
  }

  if (path === '/me/recipes' && method === 'GET') {
    await verifyBearerToken(req.headers.authorization)
    sendJson(res, 200, { recipes: CRAFT_RECIPES })
    return true
  }

  if (path === '/me/craft' && method === 'POST') {
    const user = await verifyBearerToken(req.headers.authorization)
    const body = await readJsonBody<{ recipeId?: string }>(req)
    const recipeId = String(body.recipeId ?? '').trim()
    if (!recipeId) {
      sendError(res, 400, 'recipeId is required.')
      return true
    }
    sendJson(res, 200, craftRecipe(user.id, recipeId))
    return true
  }

  if (path === '/me' && method === 'GET') {
    const user = await verifyBearerToken(req.headers.authorization)
    sendJson(res, 200, { user })
    return true
  }

  if (path === '/me/friends' && method === 'GET') {
    const user = await verifyBearerToken(req.headers.authorization)
    sendJson(res, 200, listFriends(user.id))
    return true
  }

  if (path === '/me/friends/request' && method === 'POST') {
    const user = await verifyBearerToken(req.headers.authorization)
    const body = await readJsonBody<{ username?: string }>(req)
    const username = String(body.username ?? '').trim()
    if (!username) {
      sendError(res, 400, 'username is required.')
      return true
    }
    sendJson(res, 201, {
      request: requestFriend(user.id, username),
      ...listFriends(user.id),
    })
    return true
  }

  if (path === '/me/friends/respond' && method === 'POST') {
    const user = await verifyBearerToken(req.headers.authorization)
    const body = await readJsonBody<{
      friendshipId?: string
      accept?: boolean
    }>(req)
    const friendshipId = String(body.friendshipId ?? '').trim()
    if (!friendshipId || typeof body.accept !== 'boolean') {
      sendError(res, 400, 'friendshipId and accept are required.')
      return true
    }
    sendJson(
      res,
      200,
      respondToFriendRequest(user.id, friendshipId, body.accept),
    )
    return true
  }

  if (path === '/me/friends/remove' && method === 'POST') {
    const user = await verifyBearerToken(req.headers.authorization)
    const body = await readJsonBody<{ friendshipId?: string }>(req)
    const friendshipId = String(body.friendshipId ?? '').trim()
    if (!friendshipId) {
      sendError(res, 400, 'friendshipId is required.')
      return true
    }
    sendJson(res, 200, removeFriend(user.id, friendshipId))
    return true
  }

  if (path === '/me/invitations' && method === 'GET') {
    const user = await verifyBearerToken(req.headers.authorization)
    sendJson(res, 200, listInvitations(user.id))
    return true
  }

  if (path === '/me/invitations' && method === 'POST') {
    const user = await verifyBearerToken(req.headers.authorization)
    const body = await readJsonBody<{ userId?: string }>(req)
    const friendUserId = String(body.userId ?? '').trim()
    if (!friendUserId) {
      sendError(res, 400, 'userId is required.')
      return true
    }
    const invitation = sendPlayInvite(user.id, friendUserId)
    sendJson(res, 201, {
      invitation,
      invitations: listInvitations(user.id),
    })
    return true
  }

  if (path === '/me/invitations/respond' && method === 'POST') {
    const user = await verifyBearerToken(req.headers.authorization)
    const body = await readJsonBody<{
      invitationId?: string
      accept?: boolean
    }>(req)
    const invitationId = String(body.invitationId ?? '').trim()
    if (!invitationId || typeof body.accept !== 'boolean') {
      sendError(res, 400, 'invitationId and accept are required.')
      return true
    }
    sendJson(
      res,
      200,
      respondToPlayInvite(user.id, invitationId, body.accept),
    )
    return true
  }

  return false
}

const server = createServer((req, res) => {
  if (applyCors(req, res)) return

  void (async () => {
    try {
      const handled = await handleApi(req, res)
      if (handled) return
      res.writeHead(200, { 'Content-Type': 'text/plain' })
      res.end(
        'Nicer Dicer match server. Connect via WebSocket /ws?room=CODE&seatToken=TOKEN',
      )
    } catch (error) {
      if (
        error instanceof AuthError ||
        error instanceof InventoryError ||
        error instanceof FriendsError ||
        error instanceof HttpError
      ) {
        sendError(res, error.status, error.message)
        return
      }
      console.error(error)
      sendError(res, 500, 'Internal server error.')
    }
  })()
})

const wss = new WebSocketServer({ server, path: '/ws' })

wss.on('connection', (socket: WebSocket, req) => {
  void (async () => {
    const url = new URL(req.url || '/ws', 'http://localhost')
    const roomCode = normalizeRoomCode(url.searchParams.get('room') || '')
    const seatToken = url.searchParams.get('seatToken') || randomUUID()
    const authToken = url.searchParams.get('authToken')

    if (roomCode.length < 4) {
      socket.send(
        JSON.stringify({
          type: 'error',
          message: 'Missing or invalid room code.',
        } satisfies ServerToClientMessage),
      )
      socket.close(1008, 'Invalid room')
      return
    }

    let user = null
    if (authToken) {
      try {
        user = await verifyAuthToken(authToken)
      } catch {
        socket.send(
          JSON.stringify({
            type: 'error',
            message: 'Invalid login — connecting as guest (fair dice only).',
          } satisfies ServerToClientMessage),
        )
      }
    }

    const room = getOrCreateRoom(roomCode)
    const connectionId = randomUUID()

    const send = (message: ServerToClientMessage) => {
      if (socket.readyState === socket.OPEN) {
        socket.send(JSON.stringify(message))
      }
    }

    const seat = room.connect({ id: connectionId, send }, seatToken, user)
    if (!seat) {
      socket.close(1013, 'Room full')
      scheduleRoomCleanup(room)
      return
    }

    socket.on('message', (data) => {
      room.handleMessage(connectionId, String(data))
    })

    socket.on('close', () => {
      room.disconnect(connectionId)
      scheduleRoomCleanup(room)
    })
  })()
})

server.listen(PORT, () => {
  console.log(`Nicer Dicer match server on http://0.0.0.0:${PORT}`)
  console.log(`WebSocket path: ws://0.0.0.0:${PORT}/ws?room=CODE&seatToken=TOKEN`)
  console.log(`Auth/inventory API: http://0.0.0.0:${PORT}/auth/* and /me/*`)
})
