function storageKey(roomCode: string): string {
  return `nicer-dicer-seat:${roomCode}`
}

export function getOrCreateSeatToken(roomCode: string): string {
  const key = storageKey(roomCode)
  try {
    const existing = localStorage.getItem(key)
    if (existing) return existing
    const token =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : `seat-${Date.now()}-${Math.random().toString(36).slice(2)}`
    localStorage.setItem(key, token)
    return token
  } catch {
    return `seat-${Date.now()}-${Math.random().toString(36).slice(2)}`
  }
}
