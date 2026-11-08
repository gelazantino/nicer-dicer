import { useCallback, useEffect, useRef, useState } from 'react'
import type {
  ClientToServerMessage,
  OnlineRoomSnapshot,
  ServerToClientMessage,
} from '../game/onlineProtocol'
import { getOrCreateSeatToken } from './seatToken'
import { buildMatchSocketUrl, getMatchServerWsBase } from './wsUrl'

export interface OnlineSession {
  roomCode: string
  seatToken: string
}

export function useOnlineMatch(session: OnlineSession | null) {
  const host = getMatchServerWsBase()
  const [snapshot, setSnapshot] = useState<OnlineRoomSnapshot | null>(null)
  const [connectionState, setConnectionState] = useState<
    'idle' | 'connecting' | 'open' | 'closed' | 'error'
  >('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const socketRef = useRef<WebSocket | null>(null)

  useEffect(() => {
    if (!session) {
      socketRef.current?.close()
      socketRef.current = null
      setSnapshot(null)
      setConnectionState('idle')
      return
    }

    const url = buildMatchSocketUrl(session.roomCode, session.seatToken)
    if (!url) {
      setSnapshot(null)
      setConnectionState('error')
      setLastError('Online play needs VITE_WS_URL (run npm run dev:server).')
      return
    }

    setConnectionState('connecting')
    setLastError(null)

    const socket = new WebSocket(url)
    socketRef.current = socket

    socket.addEventListener('open', () => setConnectionState('open'))
    socket.addEventListener('close', () => setConnectionState('closed'))
    socket.addEventListener('error', () => {
      setConnectionState('error')
      setLastError('Connection failed.')
    })
    socket.addEventListener('message', (event) => {
      try {
        const data = JSON.parse(String(event.data)) as ServerToClientMessage
        if (data.type === 'snapshot') {
          setSnapshot(data.snapshot)
          if (data.snapshot.error) setLastError(data.snapshot.error)
        } else if (data.type === 'error') {
          setLastError(data.message)
        }
      } catch {
        setLastError('Bad server message.')
      }
    })

    return () => {
      socket.close()
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [session?.roomCode, session?.seatToken])

  const send = useCallback((message: ClientToServerMessage) => {
    const socket = socketRef.current
    if (!socket || socket.readyState !== WebSocket.OPEN) return
    socket.send(JSON.stringify(message))
  }, [])

  return {
    host,
    snapshot,
    connectionState,
    lastError,
    send,
  }
}

export function createOnlineSession(roomCode: string): OnlineSession {
  return {
    roomCode,
    seatToken: getOrCreateSeatToken(roomCode),
  }
}
