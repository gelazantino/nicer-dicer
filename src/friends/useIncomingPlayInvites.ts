import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '../auth/AuthContext'
import { fetchInvitations } from '../auth/api'

const POLL_MS = 12_000

/** Polls incoming play invites for hub-tab badges. */
export function useIncomingPlayInvites() {
  const { apiAvailable, token, user } = useAuth()
  const [count, setCount] = useState(0)

  const refresh = useCallback(async () => {
    if (!apiAvailable || !token || !user) {
      setCount(0)
      return
    }
    try {
      const list = await fetchInvitations(token)
      setCount(list.incoming.length)
    } catch {
      // Keep last known count on transient errors.
    }
  }, [apiAvailable, token, user])

  useEffect(() => {
    void refresh()
    if (!apiAvailable || !token || !user) return
    const timer = window.setInterval(() => void refresh(), POLL_MS)
    return () => window.clearInterval(timer)
  }, [apiAvailable, token, user, refresh])

  const setIncomingCount = useCallback((next: number) => {
    setCount(Math.max(0, next))
  }, [])

  return { count, refresh, setIncomingCount }
}
