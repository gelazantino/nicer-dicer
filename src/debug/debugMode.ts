/**
 * App debug mode — enabled via `npm run dev:debug` (Vite mode `debug`).
 * Use `isDebugMode` to gate test/debug-only UI and helpers.
 */
export const isDebugMode: boolean = import.meta.env.VITE_DEBUG === 'true'

export function debugLog(...args: unknown[]): void {
  if (!isDebugMode) return
  console.log('[nicer-dicer:debug]', ...args)
}
