/** HTTP API base for auth/inventory (same host as match server in prod). */
export function getApiBase(): string | null {
  const fromEnv = import.meta.env.VITE_API_URL as string | undefined
  if (fromEnv && fromEnv.trim()) return fromEnv.trim().replace(/\/$/, '')
  return null
}
