import { getApiBase } from './apiUrl'

export type AuthUser = {
  id: string
  username: string
}

export type AuthResponse = {
  token: string
  user: AuthUser
}

export type MaterialTier = 'wood' | 'tin' | 'silver' | 'gold'

export type InventorySnapshot = {
  materials: Record<MaterialTier, number>
  dice: Array<{ dieTypeId: string; qty: number }>
  badges: Array<{ badgeId: string; qty: number }>
}

export type CraftOutput =
  | { kind: 'die'; dieTypeId: string; qty: number }
  | { kind: 'badge'; badgeId: string; qty: number }
  | { kind: 'material'; tier: MaterialTier; qty: number }

export type CraftRecipe = {
  id: string
  name: string
  description: string
  cost: Partial<Record<MaterialTier, number>>
  output: CraftOutput
}

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
    this.name = 'ApiError'
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit & { token?: string | null } = {},
): Promise<T> {
  const base = getApiBase()
  if (!base) {
    throw new ApiError(503, 'API URL is not configured (VITE_API_URL).')
  }

  const { token, ...init } = options
  const headers = new Headers(init.headers)
  if (!headers.has('Content-Type') && init.body) {
    headers.set('Content-Type', 'application/json')
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`)
  }

  const res = await fetch(`${base}${path}`, { ...init, headers })
  const text = await res.text()
  let data: unknown = null
  if (text) {
    try {
      data = JSON.parse(text)
    } catch {
      data = { error: text }
    }
  }

  if (!res.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'error' in data &&
      typeof (data as { error: unknown }).error === 'string'
        ? (data as { error: string }).error
        : `Request failed (${res.status})`
    throw new ApiError(res.status, message)
  }

  return data as T
}

export function registerAccount(
  username: string,
  password: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function loginAccount(
  username: string,
  password: string,
): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ username, password }),
  })
}

export function fetchInventory(token: string): Promise<InventorySnapshot> {
  return apiFetch<InventorySnapshot>('/me/inventory', { token })
}

export function fetchRecipes(
  token: string,
): Promise<{ recipes: CraftRecipe[] }> {
  return apiFetch<{ recipes: CraftRecipe[] }>('/me/recipes', { token })
}

export function craftItem(
  token: string,
  recipeId: string,
): Promise<InventorySnapshot> {
  return apiFetch<InventorySnapshot>('/me/craft', {
    method: 'POST',
    token,
    body: JSON.stringify({ recipeId }),
  })
}
