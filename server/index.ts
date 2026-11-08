import { createServer } from 'node:http'
import { randomUUID } from 'node:crypto'
import { WebSocketServer, type WebSocket } from 'ws'
import { normalizeRoomCode } from '../src/game/onlineProtocol.ts'
import type { ServerToClientMessage } from '../src/game/onlineProtocol.ts'
import { DiceRoom } from './room.ts'

const PORT = Number(process.env.PORT || 8787)
const rooms = new Map<string, DiceRoom>()

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

const server = createServer((req, res) => {
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ ok: true, rooms: rooms.size }))
    return
  }
  res.writeHead(200, { 'Content-Type': 'text/plain' })
  res.end('Nicer Dicer match server. Connect via WebSocket /ws?room=CODE&seatToken=TOKEN')
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
})
