/** Base WebSocket URL for the VPS match server, e.g. ws://127.0.0.1:8787 or wss://dice.example.com */
export function getMatchServerWsBase(): string | null {
  const fromEnv = import.meta.env.VITE_WS_URL as string | undefined
  if (fromEnv && fromEnv.trim()) return fromEnv.trim().replace(/\/$/, '')
  return null
}

export function buildMatchSocketUrl(
  roomCode: string,
  seatToken: string,
  authToken?: string | null,
): string | null {
  const base = getMatchServerWsBase()
  if (!base) return null
  const url = new URL(`${base}/ws`)
  url.searchParams.set('room', roomCode)
  url.searchParams.set('seatToken', seatToken)
  if (authToken?.trim()) {
    url.searchParams.set('authToken', authToken.trim())
  }
  return url.toString()
}
