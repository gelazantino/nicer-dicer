import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'

const DEFAULT_WS_URL = 'ws://31.210.171.38:8787'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const wsUrl = env.VITE_WS_URL?.trim() || DEFAULT_WS_URL

  return {
    plugins: [react()],
    define: {
      'import.meta.env.VITE_WS_URL': JSON.stringify(wsUrl),
    },
  }
})
