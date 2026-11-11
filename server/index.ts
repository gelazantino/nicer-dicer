import { createServer, type IncomingMessage, type ServerResponse } from 'node:http'
import { randomUUID } from 'node:crypto'
import { WebSocketServer, type WebSocket } from 'ws'
import { normalizeRoomCode } from '../src/game/onlineProtocol.ts'
import type { ServerToClientMessage } from '../src/game/onlineProtocol.ts'
import {
  AuthError,
  loginUser,
  registerUser,
  verifyBearerToken,
} from './auth.ts'
import { initDb } from './db.ts'
import {
  applyCors,
  HttpError,
  pathnameOf,
  readJsonBody,
  sendError,
  sendJson,
} from './http.ts'
import { craftRecipe, getInventory, InventoryError } from './inventory.ts'
import { CRAFT_RECIPES } from './recipes.ts'
import { DiceRoom } from './room.ts'

const PORT = Number(process.env.PORT || 8787)
const rooms = new Map<string, DiceRoom>()

initDb()

function getOrCreateRoom(roomCode: string): DiceRoom {
  const code = normalizeRoomCode(roomCode)
  let room = rooms.get(code)
  if (!room) {
    room = new DiceRoom(code)
    rooms.set(code, room)
  }
  return room
}

function cleanupRoom(room: DiceRoom) {
  if (room.isEmpty) {
    rooms.delete(room.roomCode)
  }
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
  const url = new URL(req.url || '/ws', 'http://localhost')
  const roomCode = normalizeRoomCode(url.searchParams.get('room') || '')
  const seatToken = url.searchParams.get('seatToken') || randomUUID()

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

  const room = getOrCreateRoom(roomCode)
  const connectionId = randomUUID()

  const send = (message: ServerToClientMessage) => {
    if (socket.readyState === socket.OPEN) {
      socket.send(JSON.stringify(message))
    }
  }

  const seat = room.connect({ id: connectionId, send }, seatToken)
  if (!seat) {
    socket.close(1013, 'Room full')
    cleanupRoom(room)
    return
  }

  socket.on('message', (data) => {
    room.handleMessage(connectionId, String(data))
  })

  socket.on('close', () => {
    room.disconnect(connectionId)
    cleanupRoom(room)
  })

  socket.on('error', () => {
    room.disconnect(connectionId)
    cleanupRoom(room)
  })
})

server.listen(PORT, () => {
  console.log(`Nicer Dicer match server on http://0.0.0.0:${PORT}`)
  console.log(`WebSocket path: ws://0.0.0.0:${PORT}/ws?room=CODE&seatToken=TOKEN`)
  console.log(`Auth/inventory API: http://0.0.0.0:${PORT}/auth/* and /me/*`)
})
