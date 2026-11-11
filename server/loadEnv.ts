import { existsSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

/** Load KEY=VALUE pairs into process.env without overriding existing values. */
export function loadEnvFile(filePath: string): void {
  if (!existsSync(filePath)) return
  const text = readFileSync(filePath, 'utf8')
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
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
    if (process.env[key] === undefined) {
      process.env[key] = value
    }
  }
}

/** Default server env file next to package.json. */
export function loadServerEnv(): void {
  const root = join(dirname(fileURLToPath(import.meta.url)), '..')
  loadEnvFile(join(root, '.env.server'))
}
