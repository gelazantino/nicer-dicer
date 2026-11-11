import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ApiError,
  loginAccount,
  registerAccount,
  type AuthUser,
} from './api'
import { getApiBase } from './apiUrl'
import {
  clearSession,
  loadStoredToken,
  loadStoredUser,
  storeSession,
} from './session'

type AuthContextValue = {
  apiAvailable: boolean
  user: AuthUser | null
  token: string | null
  busy: boolean
  error: string | null
  login: (username: string, password: string) => Promise<void>
  register: (username: string, password: string) => Promise<void>
  logout: () => void
  clearError: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(() => loadStoredUser())
  const [token, setToken] = useState<string | null>(() => loadStoredToken())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const apiAvailable = Boolean(getApiBase())

  const applySession = useCallback((nextToken: string, nextUser: AuthUser) => {
    storeSession(nextToken, nextUser)
    setToken(nextToken)
    setUser(nextUser)
  }, [])

  const login = useCallback(
    async (username: string, password: string) => {
      setBusy(true)
      setError(null)
      try {
        const result = await loginAccount(username, password)
        applySession(result.token, result.user)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Login failed.')
        throw err
      } finally {
        setBusy(false)
      }
    },
    [applySession],
  )

  const register = useCallback(
    async (username: string, password: string) => {
      setBusy(true)
      setError(null)
      try {
        const result = await registerAccount(username, password)
        applySession(result.token, result.user)
      } catch (err) {
        setError(err instanceof ApiError ? err.message : 'Registration failed.')
        throw err
      } finally {
        setBusy(false)
      }
    },
    [applySession],
  )

  const logout = useCallback(() => {
    clearSession()
    setToken(null)
    setUser(null)
    setError(null)
  }, [])

  const value = useMemo(
    () => ({
      apiAvailable,
      user,
      token,
      busy,
      error,
      login,
      register,
      logout,
      clearError: () => setError(null),
    }),
    [apiAvailable, user, token, busy, error, login, register, logout],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
