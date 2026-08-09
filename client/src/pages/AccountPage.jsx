import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, formatINR } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { setUser, signedOut } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { PageHeader, Screen } from '../components/Screen'
import {
  IconBank,
  IconBell,
  IconCheckCircle,
  IconClock,
  IconIdCard,
  IconInfo,
  IconLock,
  IconLogout,
  IconShield,
  IconUser,
  IconXCircle,
} from '../components/Icons'

export function AccountPage() {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [notifications, setNotifications] = useState([])
  const [alerts, setAlerts] = useState([])
  const [sessions, setSessions] = useState([])
  const [sessionsBusy, setSessionsBusy] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })

  useEffect(() => {
    api('/notifications').then((d) => setNotifications(d.notifications || [])).catch(() => {})
    api('/auth/sessions').then((d) => setSessions(d.sessions || [])).catch(() => {})
    api('/alerts').then((d) => setAlerts(d.alerts || [])).catch(() => {})
  }, [])

  const removeAlert = async (id) => {
    try {
      await api(`/alerts/${id}`, { method: 'DELETE' })
      setAlerts((items) => items.filter((a) => a.id !== id))
      dispatch(showToast({ type: 'success', title: 'Alert removed' }))
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Could not remove alert', message: err.message }))
    }
  }

  const saveProfile = async (e) => {
    e.preventDefault()
    try {
      const data = await api('/auth/profile', { method: 'PATCH', body: { name, phone } })
      dispatch(setUser(data.user))
      dispatch(showToast({ title: 'Profile updated' }))
    } catch (err) {
      dispatch(showToast({ title: 'Failed', message: err.message }))
    }
  }

  const changePassword = async (e) => {
    e.preventDefault()
    try {
      await api('/auth/password', { method: 'POST', body: passwords })
      dispatch(showToast({ type: 'success', title: 'Password changed', message: 'Other devices were signed out.' }))
      setPasswords({ currentPassword: '', newPassword: '' })
      const data = await api('/auth/sessions')
      setSessions(data.sessions || [])
    } catch (err) {
      dispatch(showToast({ title: 'Failed', message: err.message }))
    }
  }

  const markRead = async () => {
    await api('/notifications/read-all', { method: 'POST' })
    setNotifications((n) => n.map((x) => ({ ...x, read: true })))
  }

  const closeSession = async (session) => {
    setSessionsBusy(true)
    try {
      const data = await api(`/auth/sessions/${session.id}`, { method: 'DELETE' })
      if (data.current) {
        dispatch(signedOut())
        navigate('/login', { replace: true })
        return
      }
      setSessions((items) => items.filter((item) => item.id !== session.id))
      dispatch(showToast({ type: 'success', title: 'Device signed out' }))
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Could not close session', message: err.message }))
    } finally {
      setSessionsBusy(false)
    }
  }

  const closeOtherSessions = async () => {
    setSessionsBusy(true)
    try {
      const data = await api('/auth/sessions', { method: 'DELETE' })
      setSessions((items) => items.filter((item) => item.current))
      dispatch(showToast({
        type: 'success',
        title: 'Other devices signed out',
        message: `${data.revoked} session${data.revoked === 1 ? '' : 's'} closed.`,
      }))
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Could not close sessions', message: err.message }))
    } finally {
      setSessionsBusy(false)
    }
  }

  const closeAllSessions = async () => {
    setSessionsBusy(true)
    try {
      await api('/auth/logout-all', { method: 'POST', skipRefresh: true })
    } finally {
      dispatch(signedOut())
      navigate('/login', { replace: true })
    }
  }

  const initials = (user?.name || user?.email || 'U')
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')

  return (
    <Screen theme="account">
      <PageHeader icon={IconUser} eyebrow="Profile" title="Account" subtitle="Personal details, security and alerts" />
      <div className="grid gap-lg">
      <section className="card stack gap-md p-xl">
        <div className="row gap-md">
          <span className="grid shrink-0 rounded text-md extrabold text-mint">
            {initials}
          </span>
          <div className="min-">
            <div className="truncate extrabold">{user?.name || 'Investor'}</div>
            <div className="truncate text-sm muted">{user?.email}</div>
          </div>
          <span
            className={`ml-auto row gap-xs rounded py-md text-[10px] bold uppercase ${ user?.kycComplete ? ' ' : 'bg-[#fff6e8] text-gold' }`}
          >
            {user?.kycComplete ? <IconCheckCircle size={13} /> : <IconShield size={13} />}
            {user?.kycComplete ? 'KYC done' : 'KYC pending'}
          </span>
        </div>

        <div className="stack gap-md rounded /70 p-md text-sm">
          <DetailRow icon={IconIdCard} label="PAN" value={user?.pan || '—'} />
          <DetailRow
            icon={IconBank}
            label="Bank"
            value={`${user?.bankName || '—'} ${user?.bankAccount || ''}`.trim()}
          />
          {!user?.kycComplete && (
            <Link to="/kyc" className="gap-sm bold accent">
              <IconShield size={15} />
              Complete KYC →
            </Link>
          )}
        </div>

        <form onSubmit={saveProfile} className="stack gap-md">
          <h2 className="row gap-sm bold">
            <IconUser size={16} className="text-page-accent" />
            Profile
          </h2>
          <div>
            <label className="label">Name</label>
            <input className="field" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div>
            <label className="label">Phone</label>
            <input className="field" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          <button className="btn btn-primary" type="submit">Save</button>
        </form>

        <form onSubmit={changePassword} className="stack gap-md border-t border">
          <h2 className="row gap-sm bold">
            <IconLock size={16} className="text-page-accent" />
            Security
          </h2>
          <div>
            <label className="label">Current password</label>
            <input className="field" type="password" value={passwords.currentPassword} onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })} />
          </div>
          <div>
            <label className="label">New password</label>
            <input className="field" type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} />
          </div>
          <button className="btn btn-ghost" type="submit">Change password</button>
        </form>
      </section>

      <section className="card p-xl">
        <div className="mb-lg row wrap gap-md">
          <div>
            <h2 className="row gap-sm text-xl bold">
              <span className="icon-chip icon-chip-md">
                <IconLock size={16} />
              </span>
              Active sessions
            </h2>
            <p className="mt-sm text-xs muted">Devices currently signed in to your Arth account.</p>
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              className="btn btn-ghost px-lg py-md text-xs"
              onClick={closeOtherSessions}
              disabled={sessionsBusy}
            >
              Sign out other devices
            </button>
          )}
        </div>

        <div className="stack gap-md">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`row gap-md rounded border p-md ${ session.current ? 'border-accent bg-page-tint' : 'border-line' }`}
            >
              <span className={`grid shrink-0 rounded ${ session.current ? ' ' : ' text-muted' }`}>
                <IconShield size={17} />
              </span>
              <div className="min- grow">
                <div className="row wrap gap-sm">
                  <span className="truncate text-sm bold">{session.device}</span>
                  {session.current && (
                    <span className="rounded px-lg text-[9px] extrabold up uppercase">
                      This device
                    </span>
                  )}
                </div>
                <div className="mt-sm row wrap gap-x-3 gap-y-1 text-[11px] muted">
                  <span className="row gap-xs">
                    <IconClock size={11} />
                    Active {relativeTime(session.lastSeenAt)}
                  </span>
                  {session.ipAddress && <span>IP {cleanIp(session.ipAddress)}</span>}
                </div>
              </div>
              <button
                type="button"
                className="grid shrink-0 rounded muted disabled:"
                onClick={() => closeSession(session)}
                disabled={sessionsBusy}
                aria-label={`Sign out ${session.device}`}
                title={session.current ? 'Sign out this device' : 'Sign out device'}
              >
                <IconXCircle size={17} />
              </button>
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="rounded p-md text-sm muted">Loading active session…</p>
          )}
        </div>

        <button
          type="button"
          className="mt-md row gap-sm text-xs bold down disabled:"
          onClick={closeAllSessions}
          disabled={sessionsBusy}
        >
          <IconLogout size={14} />
          Sign out everywhere, including this device
        </button>

        <div className="border-t border" />

        <div className="mb-md row-between">
          <h2 className="row gap-sm text-xl bold">
            <span className="icon-chip icon-chip-md">
              <IconBell size={16} />
            </span>
            Price alerts
          </h2>
        </div>
        <div className="stack gap-sm mb-xl">
          {alerts.map((a) => (
            <div key={a.id} className="row-between gap-md rounded border p-md">
              <div>
                <div className="bold mono">{a.symbol}</div>
                <div className="text-xs muted">
                  {a.direction} ₹{formatINR(a.targetPrice)}
                  {a.triggeredAt ? ' · triggered' : ' · watching'}
                </div>
              </div>
              <button type="button" className="btn btn-ghost text-xs" onClick={() => removeAlert(a.id)}>
                Remove
              </button>
            </div>
          ))}
          {alerts.length === 0 && (
            <p className="text-sm muted">No alerts yet. Set one from any stock page.</p>
          )}
        </div>

        <div className="mb-md row-between">
          <h2 className="row gap-sm text-xl bold">
            <span className="icon-chip icon-chip-md">
              <IconBell size={16} />
            </span>
            Notifications
          </h2>
          <button type="button" className="text-sm bold accent" onClick={markRead}>Mark all read</button>
        </div>
        <div className="stack gap-md">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`row gap-md rounded border p-md ${n.read ? '' : ''}`}
            >
              <span
                className={`grid shrink-0 rounded ${ n.read ? ' text-muted' : ' ' }`}
              >
                <IconBell size={15} />
              </span>
              <div className="min-">
                <div className="bold">{n.title}</div>
                <div className="text-sm muted">{n.body}</div>
                <div className="mt-sm text-[11px] muted">{new Date(n.createdAt).toLocaleString('en-IN')}</div>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="stack gap-sm py-md center">
              <span className="icon-chip icon-chip-lg icon-chip-muted">
                <IconBell size={22} />
              </span>
              <p className="text-sm bold">You&apos;re all caught up</p>
              <p className="text-xs muted">Order fills and KYC updates will show up here.</p>
            </div>
          )}
        </div>

        <div className="mt-xl rounded /70 p-lg text-sm">
          <h3 className="row gap-sm bold">
            <IconInfo size={16} className="text-page-accent" />
            Help / FAQ
          </h3>
          <ul className="mt-sm stack gap-md muted">
            <li>This is a paper-trading demo — no real money.</li>
            <li>Demo login: demo@arth.app / Demo@1234</li>
            <li>Aadhaar OTP for KYC: 123456</li>
            <li>Market data and payments are simulated.</li>
          </ul>
        </div>
      </section>
      </div>
    </Screen>
  )
}

function DetailRow({ icon: Icon, label, value }) {
  return (
    <div className="row gap-sm">
      <Icon size={15} className="shrink-0 muted" />
      <span className="muted">{label}:</span>
      <span className="min- truncate bold">{value || '—'}</span>
    </div>
  )
}

function relativeTime(timestamp) {
  const elapsed = Math.max(0, Date.now() - Number(timestamp || 0))
  if (elapsed < 60_000) return 'just now'
  if (elapsed < 3_600_000) return `${Math.floor(elapsed / 60_000)}m ago`
  if (elapsed < 86_400_000) return `${Math.floor(elapsed / 3_600_000)}h ago`
  return `${Math.floor(elapsed / 86_400_000)}d ago`
}

function cleanIp(value) {
  return String(value || '').replace(/^::ffff:/, '')
}
