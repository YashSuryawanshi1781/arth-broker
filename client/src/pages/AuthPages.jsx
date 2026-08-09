import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { clearError, login, register } from '../features/auth/authSlice'
import { api } from '../lib/api'
import {
  IconArrowRight,
  IconCandles,
  IconCheckCircle,
  IconLock,
  IconShield,
  IconSparkles,
  IconTrendingUp,
  IconWallet,
} from '../components/Icons'
import { BrandLockup } from '../components/Brand'
import { ApiStatusBanner } from '../components/ApiStatusBanner'
import { GrowthHeroArt } from '../components/Illustrations'

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

  const fillDemo = () => {
    setEmail('demo@arth.app')
    setPassword('Demo@1234')
  }

  return (
    <AuthShell
      eyebrow="Sign in"
      title="Welcome back"
      subtitle="Pick up where you left off — live prices, orders, and your paper portfolio."
      panelTone="login"
    >
      <form onSubmit={onSubmit} className="auth-form">
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
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <label className="label mb-0" htmlFor="login-password">Password</label>
            <Link to="/forgot" className="text-xs font-bold text-accent hover:underline">
              Forgot?
            </Link>
          </div>
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
        {error && (
          <p className="auth-alert auth-alert-error" role="alert">{error}</p>
        )}
        <button type="submit" className="btn btn-primary w-full auth-submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Signing in…' : (
            <>
              Continue to Arth
              <IconArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <button type="button" className="auth-demo" onClick={fillDemo}>
        <span className="auth-demo-dot" />
        Use demo account
        <span className="font-mono text-[11px] text-muted">demo@arth.app</span>
      </button>

      <p className="auth-switch">
        New here?{' '}
        <Link to="/register" className="font-bold text-accent">
          Open free demat
        </Link>
      </p>
    </AuthShell>
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
    <AuthShell
      eyebrow="Get started"
      title="Open your demat"
      subtitle="Paper brokerage in under two minutes — then trade with live NSE prices."
      panelTone="register"
    >
      <ul className="auth-steps" aria-label="Account steps">
        {['Create account', 'Quick KYC', 'Start trading'].map((step, i) => (
          <li key={step} className={i === 0 ? 'is-active' : ''}>
            <span>{i + 1}</span>
            {step}
          </li>
        ))}
      </ul>

      <form onSubmit={onSubmit} className="auth-form">
        {[
          ['name', 'Full name', 'text', 'name', 'Your legal name'],
          ['email', 'Email', 'email', 'email', 'you@email.com'],
          ['phone', 'Mobile', 'tel', 'tel', '10-digit mobile'],
          ['password', 'Password', 'password', 'new-password', 'Min. 8 characters'],
        ].map(([key, label, type, autoComplete, placeholder]) => (
          <div key={key}>
            <label className="label" htmlFor={`reg-${key}`}>{label}</label>
            <input
              id={`reg-${key}`}
              className="field"
              type={type}
              autoComplete={autoComplete}
              placeholder={placeholder}
              value={form[key]}
              onChange={(e) => setForm({ ...form, [key]: e.target.value })}
              required
            />
          </div>
        ))}
        {error && (
          <p className="auth-alert auth-alert-error" role="alert">{error}</p>
        )}
        <button type="submit" className="btn btn-primary w-full auth-submit" disabled={status === 'loading'}>
          {status === 'loading' ? 'Creating…' : (
            <>
              Create account
              <IconArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="auth-switch">
        Already investing?{' '}
        <Link to="/login" className="font-bold text-accent">
          Login
        </Link>
      </p>
    </AuthShell>
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
    <AuthShell
      eyebrow="Account recovery"
      title="Reset password"
      subtitle="We'll issue a demo reset token so you can get back into Arth."
      panelTone="recover"
    >
      <form onSubmit={onSubmit} className="auth-form">
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
        {error && (
          <p className="auth-alert auth-alert-error" role="alert">{error}</p>
        )}
        <button type="submit" className="btn btn-primary w-full auth-submit">
          Send reset link
          <IconArrowRight size={16} />
        </button>
      </form>
      {result && (
        <div className="auth-alert auth-alert-ok mt-4">
          <p>{result.message}</p>
          {result.demoResetToken && (
            <p className="mt-2 font-mono text-xs break-all">
              Token: {result.demoResetToken}
              <br />
              <Link className="font-sans font-bold text-accent" to={`/reset?token=${result.demoResetToken}`}>
                Continue to reset →
              </Link>
            </p>
          )}
        </div>
      )}
      <p className="auth-switch">
        <Link to="/login" className="font-bold text-accent">Back to login</Link>
      </p>
    </AuthShell>
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
    <AuthShell
      eyebrow="Account recovery"
      title="Choose a new password"
      subtitle="Paste the demo token, set a password, and you're back in."
      panelTone="recover"
    >
      <form onSubmit={onSubmit} className="auth-form">
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
        {error && (
          <p className="auth-alert auth-alert-error" role="alert">{error}</p>
        )}
        {message && (
          <p className="auth-alert auth-alert-ok" role="status">{message}</p>
        )}
        <button type="submit" className="btn btn-primary w-full auth-submit">
          Update password
          <IconArrowRight size={16} />
        </button>
      </form>
      <p className="auth-switch">
        <Link to="/login" className="font-bold text-accent">Back to login</Link>
      </p>
    </AuthShell>
  )
}

const PANEL_COPY = {
  login: {
    headline: (
      <>
        Markets feel real.
        <br />
        Risk stays paper.
      </>
    ),
    body: 'Live NSE ticks, order books, SIPs and IPOs — practice like a broker client without spending a rupee.',
  },
  register: {
    headline: (
      <>
        Your first demat,
        <br />
        without the downside.
      </>
    ),
    body: 'Open an Arth paper account, finish KYC in minutes, and learn the full investing surface.',
  },
  recover: {
    headline: (
      <>
        Get back to
        <br />
        the terminal.
      </>
    ),
    body: 'Reset access in a few steps. Demo tokens keep the paper brokerage friction-free.',
  },
}

function AuthShell({ eyebrow, title, subtitle, panelTone = 'login', children }) {
  const panel = PANEL_COPY[panelTone] || PANEL_COPY.login

  return (
    <div className="auth-screen">
      <div className="fixed inset-x-0 top-0 z-30">
        <ApiStatusBanner />
      </div>

      <aside className="auth-brand" aria-label="Arth">
        <div className="auth-brand-grid" />
        <div className="auth-brand-orb auth-brand-orb-a" />
        <div className="auth-brand-orb auth-brand-orb-b" />

        <div className="auth-brand-inner">
          <Link to="/" className="auth-brand-lockup">
            <BrandLockup size="lg" tone="light" />
          </Link>

          <div className="auth-brand-copy">
            <p className="auth-brand-eyebrow">India&apos;s paper brokerage</p>
            <h2 className="auth-brand-title">{panel.headline}</h2>
            <p className="auth-brand-body">{panel.body}</p>
          </div>

          <div className="auth-pulse">
            <div className="auth-pulse-head">
              <IconTrendingUp size={16} className="text-[#7dffc8]" />
              <span>Paper portfolio</span>
              <span className="auth-live">Live</span>
            </div>
            <div className="auth-pulse-value">₹4,82,450.20</div>
            <div className="auth-pulse-delta">+₹12,840.50 (2.74%) today</div>
            <GrowthHeroArt accent="#7dffc8" className="auth-pulse-chart" />
            <div className="auth-pulse-tiles">
              {[
                { label: 'Stocks', Icon: IconCandles },
                { label: 'Funds', Icon: IconWallet },
                { label: 'SIPs', Icon: IconSparkles },
                { label: 'Secure', Icon: IconShield },
              ].map(({ label, Icon }) => (
                <div key={label} className="auth-pulse-tile">
                  <Icon size={15} />
                  {label}
                </div>
              ))}
            </div>
          </div>

          <ul className="auth-trust">
            {[
              'Live NSE market feed',
              'Orders, holdings & wallet',
              'Session cookies only',
            ].map((item) => (
              <li key={item}>
                <IconCheckCircle size={15} className="text-[#7dffc8]" />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </aside>

      <main className="auth-main">
        <div className="auth-main-top">
          <Link to="/" className="auth-mobile-brand md:hidden">
            <BrandLockup size="sm" />
          </Link>
          <Link to="/" className="auth-back">
            ← Back to home
          </Link>
        </div>

        <div className="auth-panel auth-panel-enter">
          <p className="auth-eyebrow">{eyebrow}</p>
          <h1 className="auth-title">{title}</h1>
          <p className="auth-subtitle">{subtitle}</p>
          {children}
          <p className="auth-secure">
            <IconLock size={13} className="text-accent" />
            Paper-trading demo · encrypted session cookies
          </p>
        </div>
      </main>
    </div>
  )
}
