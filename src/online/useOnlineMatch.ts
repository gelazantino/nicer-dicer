import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import PartySocket from 'partysocket'
import type {
  ClientToServerMessage,
  OnlineRoomSnapshot,
  ServerToClientMessage,
} from '../game/onlineProtocol'
import { getPartyKitHost } from './partyHost'
import { getOrCreateSeatToken } from './seatToken'

export interface OnlineSession {
  roomCode: string
  seatToken: string
}

export function useOnlineMatch(session: OnlineSession | null) {
  const host = useMemo(() => getPartyKitHost(), [])
  const [snapshot, setSnapshot] = useState<OnlineRoomSnapshot | null>(null)
  const [connectionState, setConnectionState] = useState<
    'idle' | 'connecting' | 'open' | 'closed' | 'error'
  >('idle')
  const [lastError, setLastError] = useState<string | null>(null)
  const socketRef = useRef<PartySocket | null>(null)

  useEffect(() => {
    if (!session || !host) {
      socketRef.current?.close()
      socketRef.current = null
      setSnapshot(null)
      setConnectionState(session && !host ? 'error' : 'idle')
      if (session && !host) {
        setLastError('Online play needs VITE_PARTYKIT_HOST (run partykit dev).')
      }
      return
    }

    setConnectionState('connecting')
    setLastError(null)

    const socket = new PartySocket({
      host,
      room: session.roomCode,
      query: { seatToken: session.seatToken },
    })
    socketRef.current = socket

    const onOpen = () => setConnectionState('open')
    const onClose = () => setConnectionState('closed')
    const onError = () => {
      setConnectionState('error')
      setLastError('Connection failed.')
    }
    const onMessage = (event: MessageEvent) => {
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
    }

    socket.addEventListener('open', onOpen)
    socket.addEventListener('close', onClose)
    socket.addEventListener('error', onError)
    socket.addEventListener('message', onMessage)

    return () => {
      socket.removeEventListener('open', onOpen)
      socket.removeEventListener('close', onClose)
      socket.removeEventListener('error', onError)
      socket.removeEventListener('message', onMessage)
      socket.close()
      if (socketRef.current === socket) socketRef.current = null
    }
  }, [host, session?.roomCode, session?.seatToken])

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
