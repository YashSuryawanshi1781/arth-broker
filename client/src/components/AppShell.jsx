import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout } from '../features/auth/authSlice'
import { applyTicks, setConnected, setMarketStatus, setSnapshot } from '../features/market/marketSlice'
import { formatINR, api } from '../lib/api'
import { apiUrl } from '../lib/config'
import { BrandLockup } from './Brand'
import { NavDrawer, initialsOf } from './NavDrawer'
import { PRIMARY_NAV } from './navConfig'
import {
  IconBell,
  IconBriefcase,
  IconChevronDown,
  IconList,
  IconLogout,
  IconMenu,
  IconSearch,
  IconShield,
  IconUser,
  IconWallet,
} from './Icons'

export function AppShell() {
  const user = useAppSelector((s) => s.auth.user)
  const indices = useAppSelector((s) => s.market.indices)
  const connected = useAppSelector((s) => s.market.connected)
  const marketStatus = useAppSelector((s) => s.market.status)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const [drawerOpen, setDrawerOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    let es
    let retryTimer
    let closed = false

    const connect = () => {
      if (closed) return
      es = new EventSource(apiUrl('/api/market/stream'), { withCredentials: true })
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          if (data.type === 'snapshot') dispatch(setSnapshot(data))
          if (data.type === 'ticks') dispatch(applyTicks(data))
          if (data.type === 'status' && data.marketStatus) dispatch(setMarketStatus(data.marketStatus))
        } catch {
          /* ignore bad frames */
        }
      }
      es.onopen = () => dispatch(setConnected(true))
      es.onerror = () => {
        dispatch(setConnected(false))
        es.close()
        retryTimer = setTimeout(connect, 2000)
      }
    }

    // Fallback snapshot if SSE is slow/blocked
    api('/market/instruments')
      .then((data) => {
        if (data.instruments?.length) {
          dispatch(setSnapshot({
            instruments: data.instruments,
            indices: data.indices || {},
            marketStatus: data.marketStatus,
          }))
        }
      })
      .catch(() => {})

    connect()
    return () => {
      closed = true
      clearTimeout(retryTimer)
      es?.close()
    }
  }, [dispatch])

  useEffect(() => {
    api('/notifications')
      .then((d) => setUnread((d.notifications || []).filter((n) => !n.read).length))
      .catch(() => {})
  }, [])

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        navigate('/app/explore')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate])

  return (
    <div className="flex min-h-full flex-col">
      <header className="app-header">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-2.5">
          <button
            type="button"
            className="nav-icon-btn"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <IconMenu size={18} />
          </button>

          <Link to="/app" className="shrink-0" aria-label="Arth home">
            <BrandLockup size="sm" tone="light" />
          </Link>

          <nav className="nav-rail mx-auto hidden lg:flex">
            {PRIMARY_NAV.map((l) => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.end}
                title={l.label}
                aria-label={l.label}
                className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}
              >
                <l.icon size={16} />
                <span className="nav-link-label">{l.label}</span>
              </NavLink>
            ))}
          </nav>

          <div className="ml-auto flex shrink-0 items-center gap-2 lg:ml-0">
            <button
              type="button"
              className="nav-search"
              onClick={() => navigate('/app/explore')}
              aria-label="Search stocks"
              title="Search stocks (⌘K)"
            >
              <IconSearch size={16} />
            </button>

            <button
              type="button"
              className="nav-icon-btn"
              onClick={() => navigate('/app/account')}
              aria-label={unread ? `${unread} unread notifications` : 'Notifications'}
            >
              <IconBell size={18} />
              {unread > 0 && <span className="nav-badge">{unread > 9 ? '9+' : unread}</span>}
            </button>

            <Link to="/app/funds" className="wallet-chip hidden sm:flex">
              <IconWallet size={17} className="text-[#7dffc8]" />
              <span className="text-right leading-none">
                <span className="block text-[9px] font-bold tracking-[0.12em] text-white/50 uppercase">
                  Wallet
                </span>
                <span className="mt-0.5 block font-mono text-[13px] font-bold text-[#7dffc8]">
                  ₹{formatINR(user?.cash)}
                </span>
              </span>
            </Link>

            <AccountMenu
              user={user}
              onLogout={() => dispatch(logout()).then(() => navigate('/login'))}
            />
          </div>
        </div>

        <div className="ticker-bar">
          <div className="mx-auto flex max-w-6xl items-center gap-5 overflow-x-auto px-4 py-1.5 font-mono text-xs">
            <span className="flex shrink-0 items-center gap-1.5 font-sans text-[10px] font-bold tracking-[0.1em]">
              <span className={`live-dot ${connected && marketStatus?.source === 'yahoo' ? '' : 'bg-down'}`} />
              {!connected
                ? 'OFFLINE'
                : marketStatus?.source === 'yahoo'
                  ? 'LIVE'
                  : marketStatus?.source === 'yahoo-stale'
                    ? 'DELAYED'
                    : 'DEMO'}
            </span>
            {Object.entries(indices || {}).map(([key, idx]) => (
              <button
                key={key}
                type="button"
                className="whitespace-nowrap transition hover:text-white"
                onClick={() => navigate(`/app/indices/${key}`)}
              >
                <span className="text-white/55">{idx.name}</span>{' '}
                <span className="font-semibold">{Number(idx.value).toLocaleString('en-IN')}</span>{' '}
                <span className={idx.changePct >= 0 ? 'text-[#7dffc8]' : 'text-[#ff8f8f]'}>
                  {idx.changePct >= 0 ? '+' : ''}
                  {idx.changePct}%
                </span>
              </button>
            ))}
            {marketStatus?.source === 'yahoo' && (
              <span className="hidden shrink-0 font-sans text-[10px] whitespace-nowrap text-white/40 md:inline">
                Yahoo Finance · may be delayed
              </span>
            )}
            {!user?.kycComplete && (
              <button
                type="button"
                className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 font-sans text-[11px] font-bold whitespace-nowrap text-[#7dffc8] transition hover:bg-white/20"
                onClick={() => navigate('/kyc')}
              >
                <IconShield size={13} />
                Complete KYC
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 pb-10">
        <Outlet />
      </main>

      <NavDrawer open={drawerOpen} onClose={closeDrawer} />
    </div>
  )
}

function AccountMenu({ user, onLogout }) {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef(null)

  useEffect(() => {
    if (!open) return undefined
    const onPointer = (e) => {
      if (!wrapRef.current?.contains(e.target)) setOpen(false)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointer)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onPointer)
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <div className="relative" ref={wrapRef}>
      <button
        type="button"
        className="avatar-btn"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="avatar">{initialsOf(user)}</span>
        <IconChevronDown
          size={14}
          className={`hidden text-white/55 transition sm:block ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div className="menu-pop" role="menu">
          <div className="border-b border-line px-2.5 pt-1.5 pb-2.5">
            <div className="truncate text-sm font-extrabold">{user?.name || 'Investor'}</div>
            <div className="truncate text-[11px] text-muted">{user?.email}</div>
            <span className={`menu-kyc ${user?.kycComplete ? 'is-done' : ''}`}>
              <IconShield size={11} />
              {user?.kycComplete ? 'KYC verified' : 'KYC pending'}
            </span>
          </div>

          <div className="py-1">
            <Link to="/app/account" className="menu-item" onClick={() => setOpen(false)}>
              <IconUser size={16} className="text-muted" />
              Profile & alerts
            </Link>
            <Link to="/app/investments" className="menu-item" onClick={() => setOpen(false)}>
              <IconBriefcase size={16} className="text-muted" />
              My investments
            </Link>
            <Link to="/app/orders" className="menu-item" onClick={() => setOpen(false)}>
              <IconList size={16} className="text-muted" />
              Order book
            </Link>
            <Link to="/app/funds" className="menu-item" onClick={() => setOpen(false)}>
              <IconWallet size={16} className="text-muted" />
              Funds & ledger
            </Link>
          </div>

          <div className="border-t border-line pt-1">
            <button type="button" className="menu-item menu-item-danger" onClick={onLogout}>
              <IconLogout size={16} />
              Log out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
