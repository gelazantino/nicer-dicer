import { mkdirSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DatabaseSync } from 'node:sqlite'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const defaultPath = join(__dirname, '..', 'data', 'nicer-dicer.sqlite')

export type MaterialTier = 'wood' | 'tin' | 'silver' | 'gold'

export const MATERIAL_TIERS: MaterialTier[] = [
  'wood',
  'tin',
  'silver',
  'gold',
]

let db: DatabaseSync | null = null

export function getDb(): DatabaseSync {
  if (!db) throw new Error('Database not initialized')
  return db
}

/** Run fn inside BEGIN/COMMIT; ROLLBACK on throw. */
export function withTransaction<T>(fn: () => T): T {
  const database = getDb()
  database.exec('BEGIN')
  try {
    const result = fn()
    database.exec('COMMIT')
    return result
  } catch (error) {
    try {
      database.exec('ROLLBACK')
    } catch {
      // ignore rollback errors
    }
    throw error
  }
}

export function initDb(dbPath = process.env.SQLITE_PATH || defaultPath): DatabaseSync {
  mkdirSync(dirname(dbPath), { recursive: true })
  db = new DatabaseSync(dbPath)
  db.exec('PRAGMA journal_mode = WAL;')
  db.exec('PRAGMA foreign_keys = ON;')
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY NOT NULL,
      username TEXT NOT NULL UNIQUE COLLATE NOCASE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS inventory_materials (
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      tier TEXT NOT NULL CHECK (tier IN ('wood', 'tin', 'silver', 'gold')),
      qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
      PRIMARY KEY (user_id, tier)
    );

    CREATE TABLE IF NOT EXISTS inventory_dice (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      die_type_id TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
      UNIQUE (user_id, die_type_id)
    );

    CREATE TABLE IF NOT EXISTS inventory_badges (
      id TEXT PRIMARY KEY NOT NULL,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      badge_id TEXT NOT NULL,
      qty INTEGER NOT NULL DEFAULT 0 CHECK (qty >= 0),
      UNIQUE (user_id, badge_id)
    );
  `)
  return db
}
