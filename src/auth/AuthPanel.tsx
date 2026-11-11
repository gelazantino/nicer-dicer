import { useState, type FormEvent } from 'react'
import { useAuth } from './AuthContext'

export function AuthPanel() {
  const { apiAvailable, user, busy, error, login, register, logout } = useAuth()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  if (!apiAvailable) {
    return (
      <section className="hub-section auth-panel">
        <h2 className="panel-title">Account</h2>
        <p className="setup-hint">
          Set <code>VITE_API_URL</code> (same host as the match server) to enable
          registration and inventory.
        </p>
      </section>
    )
  }

  if (user) {
    return (
      <section className="hub-section auth-panel">
        <h2 className="panel-title">Account</h2>
        <p className="auth-user">
          Playing as <strong>{user.username}</strong>
        </p>
        <button type="button" className="btn btn-ghost" onClick={logout}>
          Log out
        </button>
      </section>
    )
  }

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    try {
      if (mode === 'login') await login(username, password)
      else await register(username, password)
    } catch {
      // error shown via context
    }
  }

  return (
    <section className="hub-section auth-panel">
      <h2 className="panel-title">
        {mode === 'login' ? 'Log in' : 'Create account'}
      </h2>
      <p className="setup-hint">
        Save dice, badges, and crafting materials to your account.
      </p>
      <form className="auth-form" onSubmit={onSubmit}>
        <label className="auth-field">
          <span>Username</span>
          <input
            className="online-code-input"
            autoComplete="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            minLength={3}
            maxLength={24}
            required
          />
        </label>
        <label className="auth-field">
          <span>Password</span>
          <input
            className="online-code-input"
            type="password"
            autoComplete={
              mode === 'login' ? 'current-password' : 'new-password'
            }
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            maxLength={128}
            required
          />
        </label>
        {error ? <p className="online-error">{error}</p> : null}
        <button type="submit" className="btn" disabled={busy}>
          {busy
            ? 'Please wait…'
            : mode === 'login'
              ? 'Log in'
              : 'Register'}
        </button>
      </form>
      <button
        type="button"
        className="btn btn-ghost"
        disabled={busy}
        onClick={() =>
          setMode((prev) => (prev === 'login' ? 'register' : 'login'))
        }
      >
        {mode === 'login'
          ? 'Need an account? Register'
          : 'Have an account? Log in'}
      </button>
    </section>
  )
}
