import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_WS_URL = 'wss://dice.lockersmoker.com'
const DEFAULT_API_URL = 'https://dice.lockersmoker.com'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  // Vercel injects env as process.env.*; loadEnv only reads .env files.
  const wsUrl =
    process.env.VITE_WS_URL?.trim() ||
    env.VITE_WS_URL?.trim() ||
    DEFAULT_WS_URL
  const apiUrl =
    process.env.VITE_API_URL?.trim() ||
    env.VITE_API_URL?.trim() ||
    DEFAULT_API_URL

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_WS_URL': JSON.stringify(wsUrl),
      'import.meta.env.VITE_API_URL': JSON.stringify(apiUrl),
    },
  }
})
