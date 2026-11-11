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
  authToken: string | null
}

function isSecurePage(): boolean {
  return typeof window !== 'undefined' && window.location.protocol === 'https:'
}

function reconnectDelayMs(attempt: number): number {
  return Math.min(10_000, 400 * 2 ** Math.min(attempt, 5))
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
      setLastError(null)
      return
    }

    let url: string | null = null
    try {
      url = buildMatchSocketUrl(
        session.roomCode,
        session.seatToken,
        session.authToken,
      )
    } catch {
      setConnectionState('error')
      setLastError('Invalid match server URL (VITE_WS_URL).')
      return
    }

    if (!url) {
      setConnectionState('error')
      setLastError('Online play needs VITE_WS_URL (match server WebSocket URL).')
      return
    }

    if (isSecurePage() && url.startsWith('ws://')) {
      setConnectionState('error')
      setLastError(
        `Blocked insecure URL on HTTPS: ${url}. In Vercel set VITE_WS_URL=wss://dice.lockersmoker.com and redeploy.`,
      )
      return
    }

    let cancelled = false
    let attempt = 0
    let retryTimer: number | null = null
    let activeSocket: WebSocket | null = null

    const clearRetry = () => {
      if (retryTimer !== null) {
        window.clearTimeout(retryTimer)
        retryTimer = null
      }
    }

    const scheduleReconnect = () => {
      if (cancelled) return
      clearRetry()
      const delay = reconnectDelayMs(attempt)
      attempt += 1
      setConnectionState('connecting')
      setLastError(
        attempt <= 1
          ? 'Connection lost — reconnecting…'
          : `Connection lost — reconnecting (try ${attempt})…`,
      )
      retryTimer = window.setTimeout(connect, delay)
    }

    const connect = () => {
      if (cancelled || !url) return
      clearRetry()

      setConnectionState('connecting')

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
        scheduleReconnect()
        return
      }

      activeSocket = socket
      socketRef.current = socket

      socket.addEventListener('open', () => {
        if (cancelled || socketRef.current !== socket) return
        attempt = 0
        setConnectionState('open')
        setLastError(null)
      })

      socket.addEventListener('close', () => {
        if (socketRef.current === socket) socketRef.current = null
        if (activeSocket === socket) activeSocket = null
        if (cancelled) return
        scheduleReconnect()
      })

      socket.addEventListener('error', () => {
        if (cancelled || socketRef.current !== socket) return
        // `close` follows and schedules reconnect; keep a soft message.
        setLastError(`WebSocket interrupted — reconnecting…`)
      })

      socket.addEventListener('message', (event) => {
        if (cancelled || socketRef.current !== socket) return
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
    }

    connect()

    return () => {
      cancelled = true
      clearRetry()
      const socket = activeSocket ?? socketRef.current
      activeSocket = null
      socketRef.current = null
      socket?.close()
    }
  }, [session?.roomCode, session?.seatToken, session?.authToken])

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

export function createOnlineSession(
  roomCode: string,
  authToken: string | null = null,
): OnlineSession {
  return {
    roomCode,
    seatToken: getOrCreateSeatToken(roomCode),
    authToken,
  }
}
