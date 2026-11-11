import { randomUUID } from 'node:crypto'
import bcrypt from 'bcryptjs'
import { SignJWT, jwtVerify } from 'jose'
import { getDb, withTransaction } from './db.ts'
import { seedStarterInventory } from './inventory.ts'

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nicer-dicer-dev-secret-change-me',
)
const TOKEN_TTL = '30d'
const BCRYPT_ROUNDS = 10

export type AuthUser = {
  id: string
  username: string
}

export type AuthResult = {
  token: string
  user: AuthUser
}

function normalizeUsername(raw: string): string {
  return raw.trim()
}

export function validateCredentials(
  username: string,
  password: string,
): string | null {
  const name = normalizeUsername(username)
  if (name.length < 3 || name.length > 24) {
    return 'Username must be 3–24 characters.'
  }
  if (!/^[a-zA-Z0-9_]+$/.test(name)) {
    return 'Username may only use letters, numbers, and underscore.'
  }
  if (password.length < 6 || password.length > 128) {
    return 'Password must be 6–128 characters.'
  }
  return null
}

export async function registerUser(
  username: string,
  password: string,
): Promise<AuthResult> {
  const name = normalizeUsername(username)
  const error = validateCredentials(name, password)
  if (error) throw new AuthError(400, error)

  const db = getDb()
  const existing = db
    .prepare('SELECT id FROM users WHERE username = ? COLLATE NOCASE')
    .get(name) as { id: string } | undefined
  if (existing) throw new AuthError(409, 'Username is already taken.')

  const id = randomUUID()
  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS)
  const createdAt = new Date().toISOString()

  withTransaction(() => {
    db.prepare(
      'INSERT INTO users (id, username, password_hash, created_at) VALUES (?, ?, ?, ?)',
    ).run(id, name, passwordHash, createdAt)
    seedStarterInventory(id)
  })

  const user = { id, username: name }
  const token = await signToken(user)
  return { token, user }
}

export async function loginUser(
  username: string,
  password: string,
): Promise<AuthResult> {
  const name = normalizeUsername(username)
  if (!name || !password) {
    throw new AuthError(400, 'Username and password are required.')
  }

  const row = getDb()
    .prepare(
      'SELECT id, username, password_hash FROM users WHERE username = ? COLLATE NOCASE',
    )
    .get(name) as
    | { id: string; username: string; password_hash: string }
    | undefined

  if (!row) throw new AuthError(401, 'Invalid username or password.')

  const ok = await bcrypt.compare(password, row.password_hash)
  if (!ok) throw new AuthError(401, 'Invalid username or password.')

  const user = { id: row.id, username: row.username }
  const token = await signToken(user)
  return { token, user }
}

export async function signToken(user: AuthUser): Promise<string> {
  return new SignJWT({ sub: user.id, username: user.username })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(TOKEN_TTL)
    .sign(JWT_SECRET)
}

export async function verifyBearerToken(
  authorization: string | undefined,
): Promise<AuthUser> {
  if (!authorization?.startsWith('Bearer ')) {
    throw new AuthError(401, 'Missing auth token.')
  }
  const token = authorization.slice('Bearer '.length).trim()
  if (!token) throw new AuthError(401, 'Missing auth token.')

  try {
    const { payload } = await jwtVerify(token, JWT_SECRET)
    const id = typeof payload.sub === 'string' ? payload.sub : ''
    const username =
      typeof payload.username === 'string' ? payload.username : ''
    if (!id || !username) throw new AuthError(401, 'Invalid auth token.')

    const row = getDb()
      .prepare('SELECT id, username FROM users WHERE id = ?')
      .get(id) as AuthUser | undefined
    if (!row) throw new AuthError(401, 'Invalid auth token.')
    return row
  } catch (error) {
    if (error instanceof AuthError) throw error
    throw new AuthError(401, 'Invalid or expired auth token.')
  }
}

export class AuthError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'AuthError'
  }
}
