import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api } from '../lib/api'
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
  const [sessions, setSessions] = useState([])
  const [sessionsBusy, setSessionsBusy] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [phone, setPhone] = useState(user?.phone || '')
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '' })

  useEffect(() => {
    api('/notifications').then((d) => setNotifications(d.notifications || [])).catch(() => {})
    api('/auth/sessions').then((d) => setSessions(d.sessions || [])).catch(() => {})
  }, [])

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
      <div className="grid gap-4 lg:grid-cols-2">
      <section className="card space-y-4 p-5">
        <div className="flex items-center gap-3">
          <span className="grid h-12 w-12 flex-none place-items-center rounded-2xl bg-brand text-base font-extrabold text-mint">
            {initials}
          </span>
          <div className="min-w-0">
            <div className="truncate font-extrabold">{user?.name || 'Investor'}</div>
            <div className="truncate text-sm text-muted">{user?.email}</div>
          </div>
          <span
            className={`ml-auto flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
              user?.kycComplete ? 'bg-up-bg text-up' : 'bg-[#fff6e8] text-gold'
            }`}
          >
            {user?.kycComplete ? <IconCheckCircle size={13} /> : <IconShield size={13} />}
            {user?.kycComplete ? 'KYC done' : 'KYC pending'}
          </span>
        </div>

        <div className="space-y-2 rounded-xl bg-surface-2/70 p-3 text-sm">
          <DetailRow icon={IconIdCard} label="PAN" value={user?.pan || '—'} />
          <DetailRow
            icon={IconBank}
            label="Bank"
            value={`${user?.bankName || '—'} ${user?.bankAccount || ''}`.trim()}
          />
          {!user?.kycComplete && (
            <Link to="/kyc" className="inline-flex items-center gap-1.5 font-semibold text-accent">
              <IconShield size={15} />
              Complete KYC →
            </Link>
          )}
        </div>

        <form onSubmit={saveProfile} className="space-y-3">
          <h2 className="flex items-center gap-2 font-semibold">
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

        <form onSubmit={changePassword} className="space-y-3 border-t border-line pt-4">
          <h2 className="flex items-center gap-2 font-semibold">
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

      <section className="card p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold">
              <span className="icon-chip icon-chip-md">
                <IconLock size={16} />
              </span>
              Active sessions
            </h2>
            <p className="mt-1 text-xs text-muted">Devices currently signed in to your Arth account.</p>
          </div>
          {sessions.length > 1 && (
            <button
              type="button"
              className="btn btn-ghost px-3 py-2 text-xs"
              onClick={closeOtherSessions}
              disabled={sessionsBusy}
            >
              Sign out other devices
            </button>
          )}
        </div>

        <div className="space-y-2">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`flex items-center gap-3 rounded-xl border p-3 ${
                session.current ? 'border-accent/30 bg-page-tint' : 'border-line'
              }`}
            >
              <span className={`grid h-9 w-9 flex-none place-items-center rounded-xl ${
                session.current ? 'bg-up-bg text-up' : 'bg-surface-2 text-muted'
              }`}>
                <IconShield size={17} />
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="truncate text-sm font-bold">{session.device}</span>
                  {session.current && (
                    <span className="rounded-full bg-up-bg px-2 py-0.5 text-[9px] font-extrabold tracking-wide text-up uppercase">
                      This device
                    </span>
                  )}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted">
                  <span className="flex items-center gap-1">
                    <IconClock size={11} />
                    Active {relativeTime(session.lastSeenAt)}
                  </span>
                  {session.ipAddress && <span>IP {cleanIp(session.ipAddress)}</span>}
                </div>
              </div>
              <button
                type="button"
                className="grid h-8 w-8 flex-none place-items-center rounded-lg text-muted transition hover:bg-down-bg hover:text-down disabled:opacity-40"
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
            <p className="rounded-xl bg-surface-2 p-3 text-sm text-muted">Loading active session…</p>
          )}
        </div>

        <button
          type="button"
          className="mt-3 flex items-center gap-1.5 text-xs font-bold text-down disabled:opacity-50"
          onClick={closeAllSessions}
          disabled={sessionsBusy}
        >
          <IconLogout size={14} />
          Sign out everywhere, including this device
        </button>

        <div className="my-6 border-t border-line" />

        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-xl font-bold">
            <span className="icon-chip icon-chip-md">
              <IconBell size={16} />
            </span>
            Notifications
          </h2>
          <button type="button" className="text-sm font-semibold text-accent" onClick={markRead}>Mark all read</button>
        </div>
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`flex gap-3 rounded-xl border border-line p-3 ${n.read ? 'opacity-60' : 'bg-mint/10'}`}
            >
              <span
                className={`grid h-8 w-8 flex-none place-items-center rounded-xl ${
                  n.read ? 'bg-surface-2 text-muted' : 'bg-up-bg text-up'
                }`}
              >
                <IconBell size={15} />
              </span>
              <div className="min-w-0">
                <div className="font-semibold">{n.title}</div>
                <div className="text-sm text-muted">{n.body}</div>
                <div className="mt-1 text-[11px] text-muted">{new Date(n.createdAt).toLocaleString('en-IN')}</div>
              </div>
            </div>
          ))}
          {notifications.length === 0 && (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="icon-chip icon-chip-lg icon-chip-muted">
                <IconBell size={22} />
              </span>
              <p className="text-sm font-bold">You&apos;re all caught up</p>
              <p className="text-xs text-muted">Order fills and KYC updates will show up here.</p>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-xl bg-surface-2/70 p-4 text-sm">
          <h3 className="flex items-center gap-2 font-semibold">
            <IconInfo size={16} className="text-page-accent" />
            Help / FAQ
          </h3>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-muted">
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
    <div className="flex items-center gap-2">
      <Icon size={15} className="flex-none text-muted" />
      <span className="text-muted">{label}:</span>
      <span className="min-w-0 truncate font-semibold">{value || '—'}</span>
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
