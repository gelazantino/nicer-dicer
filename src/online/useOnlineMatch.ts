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

function isSecurePage(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:'
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

    let url: string | null = null
    try {
      url = buildMatchSocketUrl(session.roomCode, session.seatToken)
    } catch {
      setSnapshot(null)
      setConnectionState('error')
      setLastError('Invalid match server URL (VITE_WS_URL).')
      return
    }

    if (!url) {
      setSnapshot(null)
      setConnectionState('error')
      setLastError('Online play needs VITE_WS_URL (match server WebSocket URL).')
      return
    }

    if (isSecurePage() && url.startsWith('ws://')) {
      setSnapshot(null)
      setConnectionState('error')
      setLastError(
        `Blocked insecure URL on HTTPS: ${url}. In Vercel set VITE_WS_URL=wss://dice.lockersmoker.com and redeploy.`,
      )
      return
    }

    setConnectionState('connecting')
    setLastError(null)
    setSnapshot(null)

    let socket: WebSocket
    try {
      socket = new WebSocket(url)
    } catch (error) {
      setConnectionState('error')
      setLastError(
        error instanceof Error
          ? `${error.message} (tried ${url})`
          : `Failed to open WebSocket (tried ${url}).`,
      )
      return
    }

    socketRef.current = socket

    socket.addEventListener('open', () => setConnectionState('open'))
    socket.addEventListener('close', () => {
      setConnectionState((prev) => (prev === 'error' ? prev : 'closed'))
    })
    socket.addEventListener('error', () => {
      setConnectionState('error')
      setLastError(
        isSecurePage() && url.startsWith('ws://')
          ? `WebSocket failed for ${url}. HTTPS pages need wss://dice.lockersmoker.com — update Vercel env and redeploy.`
          : `WebSocket failed for ${url}.`,
      )
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
