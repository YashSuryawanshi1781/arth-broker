import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Alert, Box, Button, Paper, TextField, Typography } from '@mui/material'
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
      <Box component="form" onSubmit={onSubmit} className="stack gap-md">
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <TextField label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" fullWidth disabled={status === 'loading'}>
          {status === 'loading' ? 'Signing in…' : 'Login'}
        </Button>
      </Box>
      <Typography className="mt-lg center text-sm muted">
        <Link to="/forgot" className="bold accent">Forgot password?</Link>
      </Typography>
      <Typography className="mt-sm center text-sm muted">
        New here? <Link to="/register" className="bold accent">Create account</Link>
      </Typography>
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
      <Box component="form" onSubmit={onSubmit} className="stack gap-md">
        <TextField label="Full name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        <TextField label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required />
        <TextField label="Mobile" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} required />
        <TextField label="Password" type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" fullWidth disabled={status === 'loading'}>
          {status === 'loading' ? 'Creating…' : 'Register'}
        </Button>
      </Box>
      <Typography className="mt-lg center text-sm muted">
        Already have an account? <Link to="/login" className="bold accent">Login</Link>
      </Typography>
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
      <Box component="form" onSubmit={onSubmit} className="stack gap-md">
        <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        {error && <Alert severity="error">{error}</Alert>}
        <Button type="submit" variant="contained" fullWidth>Send reset link</Button>
      </Box>
      {result && (
        <Alert severity="info" sx={{ mt: 2 }}>
          {result.message}
          {result.demoResetToken && (
            <Typography className="mt-sm mono text-xs" component="div">
              Token: {result.demoResetToken}
              <br />
              <Link className="bold accent" to={`/reset?token=${result.demoResetToken}`}>
                Continue to reset →
              </Link>
            </Typography>
          )}
        </Alert>
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
      <Box component="form" onSubmit={onSubmit} className="stack gap-md">
        <TextField label="Token" value={token} onChange={(e) => setToken(e.target.value)} required />
        <TextField label="New password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        {error && <Alert severity="error">{error}</Alert>}
        {message && <Alert severity="success">{message}</Alert>}
        <Button type="submit" variant="contained" fullWidth>Update password</Button>
      </Box>
    </AuthCard>
  )
}

function AuthCard({ title, subtitle, children }) {
  return (
    <div className="stack screen">
      <ApiStatusBanner />
      <Box className="row-center grow px-lg" sx={{ py: 4 }}>
        <Paper className="card w-full p-xl" elevation={0} sx={{ maxWidth: 440, p: 3.5 }}>
          <Link to="/" className="mb-lg inline-flex">
            <BrandLockup size="sm" />
          </Link>
          <Typography variant="h5" fontWeight={800} sx={{ mt: 2 }}>{title}</Typography>
          <Typography color="text.secondary" className="mb-lg text-sm" sx={{ mb: 2.5 }}>{subtitle}</Typography>
          {children}
          <Typography className="mt-xl row-center gap-sm text-xs bold muted" sx={{ pt: 2, borderTop: 1, borderColor: 'divider' }}>
            <IconLock size={13} />
            Paper-trading demo · session cookies only
          </Typography>
        </Paper>
      </Box>
    </div>
  )
}
