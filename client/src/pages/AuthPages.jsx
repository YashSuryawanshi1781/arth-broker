import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { clearError, login, register } from '../features/auth/authSlice'
import { api } from '../lib/api'
import { IconLock } from '../components/Icons'
import { BrandLockup } from '../components/Brand'
import { ApiStatusBanner } from '../components/ApiStatusBanner'

export function LoginPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()
  const error = useAppSelector((s) => s.auth.error)
  const status = useAppSelector((s) => s.auth.status)
  const [email, setEmail] = useState('demo@arth.app')
  const [password, setPassword] = useState('Demo@1234')

  const onSubmit = async (e) => {
    e.preventDefault()
    dispatch(clearError())
    const result = await dispatch(login({ email, password }))
    if (login.fulfilled.match(result)) {
      navigate(location.state?.from?.pathname || '/app', { replace: true })
    }
  }

  return (
    <AuthCard title="Welcome back" subtitle="Login to your Arth account">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="login-email">Email</label>
          <input
            id="login-email"
            className="field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="login-password">Password</label>
          <input
            id="login-password"
            className="field"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-down">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={status === 'loading'}>
          {status === 'loading' ? 'Signing in…' : 'Login'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        <Link to="/forgot" className="font-semibold text-accent">Forgot password?</Link>
      </p>
      <p className="mt-2 text-center text-sm text-muted">
        New here? <Link to="/register" className="font-semibold text-accent">Create account</Link>
      </p>
    </AuthCard>
  )
}

export function RegisterPage() {
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const error = useAppSelector((s) => s.auth.error)
  const status = useAppSelector((s) => s.auth.status)
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' })

  const onSubmit = async (e) => {
    e.preventDefault()
    dispatch(clearError())
    const result = await dispatch(register(form))
    if (register.fulfilled.match(result)) navigate('/kyc')
  }

  return (
    <AuthCard title="Open your account" subtitle="Takes under 2 minutes">
      <form onSubmit={onSubmit} className="space-y-3">
        {[
          ['name', 'Full name', 'text', 'name'],
          ['email', 'Email', 'email', 'email'],
          ['phone', 'Mobile', 'tel', 'tel'],
          ['password', 'Password', 'password', 'new-password'],
        ].map(([key, label, type, autoComplete]) => (
          <div key={key}>
            <label className="label" htmlFor={`reg-${key}`}>{label}</label>
            <input
              id={`reg-${key}`}
              className="field"
              type={type}
              autoComplete={autoComplete}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required
            />
          </div>
        ))}
        {error && <p className="text-sm text-down">{error}</p>}
        <button type="submit" className="btn btn-primary w-full" disabled={status === 'loading'}>
          {status === 'loading' ? 'Creating…' : 'Register'}
        </button>
      </form>
      <p className="mt-4 text-center text-sm text-muted">
        Already have an account? <Link to="/login" className="font-semibold text-accent">Login</Link>
      </p>
    </AuthCard>
  )
}

export function ForgotPage() {
  const [email, setEmail] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  const onSubmit = async (e) => {
    e.preventDefault()
    setError('')
    try {
      const data = await api('/auth/forgot', { method: 'POST', body: { email } })
      setResult(data)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthCard title="Reset password" subtitle="We'll generate a demo reset token">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="forgot-email">Email</label>
          <input
            id="forgot-email"
            className="field"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-down">{error}</p>}
        <button type="submit" className="btn btn-primary w-full">Send reset link</button>
      </form>
      {result && (
        <div className="mt-4 rounded-xl bg-up-bg p-3 text-sm text-ink">
          <p>{result.message}</p>
          {result.demoResetToken && (
            <p className="mt-2 font-mono text-xs break-all">
              Token: {result.demoResetToken}
              <br />
              <Link className="font-sans font-semibold text-accent" to={`/reset?token=${result.demoResetToken}`}>
                Continue to reset →
              </Link>
            </p>
          )}
        </div>
      )}
    </AuthCard>
  )
}

export function ResetPage() {
  const [password, setPassword] = useState('')
  const [token, setToken] = useState(() => new URLSearchParams(window.location.search).get('token') || '')
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const navigate = useNavigate()

  const onSubmit = async (e) => {
    e.preventDefault()
    try {
      await api('/auth/reset', { method: 'POST', body: { token, password } })
      setMessage('Password updated')
      setTimeout(() => navigate('/login'), 1000)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <AuthCard title="Choose new password" subtitle="Use the demo reset token">
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="label" htmlFor="reset-token">Token</label>
          <input
            id="reset-token"
            className="field font-mono text-sm"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label" htmlFor="reset-password">New password</label>
          <input
            id="reset-password"
            className="field"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>
        {error && <p className="text-sm text-down">{error}</p>}
        {message && <p className="text-sm text-up">{message}</p>}
        <button type="submit" className="btn btn-primary w-full">Update password</button>
      </form>
    </AuthCard>
  )
}

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <div className="fixed inset-x-0 top-0 z-20">
        <ApiStatusBanner />
      </div>
      <div className="card w-full max-w-md p-7 shadow-[0_20px_50px_rgb(11_27_51_/_0.08)]">
        <Link to="/" className="mb-5 inline-block">
          <BrandLockup size="sm" />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mb-5 text-sm text-muted">{subtitle}</p>
        {children}
        <p className="mt-6 flex items-center justify-center gap-1.5 border-t border-line pt-4 text-[11px] font-semibold text-muted">
          <IconLock size={13} className="text-accent" />
          Paper-trading demo · session cookies only
        </p>
      </div>
    </div>
  )
}
