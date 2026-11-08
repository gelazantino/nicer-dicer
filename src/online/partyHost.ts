export function getPartyKitHost(): string | null {
  const fromEnv = import.meta.env.VITE_PARTYKIT_HOST as string | undefined
  if (fromEnv && fromEnv.trim()) return fromEnv.trim()
  return null
}
