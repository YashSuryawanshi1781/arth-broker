import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { clearError, login, register } from '../features/auth/authSlice'
import { api } from '../lib/api'
import { IconLock } from '../components/Icons'
import { BrandLockup } from '../components/Brand'

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
          <label className="label">Email</label>
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        <div>
          <label className="label">Password</label>
          <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-down">{error}</p>}
        <button className="btn btn-primary w-full" disabled={status === 'loading'}>
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
          ['name', 'Full name', 'text'],
          ['email', 'Email', 'email'],
          ['phone', 'Mobile', 'tel'],
          ['password', 'Password', 'password'],
        ].map(([key, label, type]) => (
          <div key={key}>
            <label className="label">{label}</label>
            <input
              className="field"
              type={type}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required
            />
          </div>
        ))}
        {error && <p className="text-sm text-down">{error}</p>}
        <button className="btn btn-primary w-full" disabled={status === 'loading'}>
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
          <label className="label">Email</label>
          <input className="field" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-down">{error}</p>}
        <button className="btn btn-primary w-full">Send reset link</button>
      </form>
      {result && (
        <div className="mt-4 rounded-xl bg-up-bg p-3 text-sm">
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
          <label className="label">Token</label>
          <input className="field" value={token} onChange={(e) => setToken(e.target.value)} required />
        </div>
        <div>
          <label className="label">New password</label>
          <input className="field" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </div>
        {error && <p className="text-sm text-down">{error}</p>}
        {message && <p className="text-sm text-up">{message}</p>}
        <button className="btn btn-primary w-full">Update password</button>
      </form>
    </AuthCard>
  )
}

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="grid min-h-full place-items-center px-4 py-10">
      <div className="card w-full max-w-md p-7 shadow-[0_20px_50px_rgb(11_27_51_/_0.08)]">
        <Link to="/" className="mb-5 inline-block">
          <BrandLockup size="sm" />
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">{title}</h1>
        <p className="mb-5 text-sm text-muted">{subtitle}</p>
        {children}
        <p className="mt-6 flex items-center justify-center gap-1.5 border-t border-line pt-4 text-[11px] font-semibold text-muted">
          <IconLock size={13} className="text-accent" />
          Paper-trading demo · your data never leaves this device
        </p>
      </div>
    </div>
  )
}
