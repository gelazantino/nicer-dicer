/**
 * PM2 process file for the Nicer Dicer match / auth API server.
 * Env comes from `.env.server` (created by `scripts/vps-setup.sh`).
 */
const fs = require('node:fs')
const path = require('node:path')

function loadEnvFile(filePath) {
  const env = {}
  if (!fs.existsSync(filePath)) return env
  for (const raw of fs.readFileSync(filePath, 'utf8').split(/\r?\n/)) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    env[key] = value
  }
  return env
}

const root = __dirname
const fileEnv = loadEnvFile(path.join(root, '.env.server'))

module.exports = {
  apps: [
    {
      name: 'nicer-dicer',
      cwd: root,
      script: 'node_modules/tsx/dist/cli.mjs',
      args: 'server/index.ts',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '300M',
      env: {
        NODE_ENV: 'production',
        PORT: fileEnv.PORT || '8787',
        ...fileEnv,
      },
    },
  ],
}
