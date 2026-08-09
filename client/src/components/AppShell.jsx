import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useCallback, useEffect, useState } from 'react'
import {
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Switch,
  Typography,
} from '@mui/material'
import DarkModeOutlinedIcon from '@mui/icons-material/DarkModeOutlined'
import LightModeOutlinedIcon from '@mui/icons-material/LightModeOutlined'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout } from '../features/auth/authSlice'
import { applyTicks, setConnected, setMarketStatus, setSnapshot } from '../features/market/marketSlice'
import { formatINR, api } from '../lib/api'
import { streamUrl } from '../lib/config'
import { useThemeMode } from '../theme/ThemeModeProvider'
import { BrandLockup } from './Brand'
import { NavDrawer, initialsOf } from './NavDrawer'
import { PRIMARY_NAV } from './navConfig'
import { CommandPalette } from './CommandPalette'
import { ApiStatusBanner } from './ApiStatusBanner'
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
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [unread, setUnread] = useState(0)

  const closeDrawer = useCallback(() => setDrawerOpen(false), [])

  useEffect(() => {
    let es
    let retryTimer
    let closed = false

    const connect = () => {
      if (closed) return
      es = new EventSource(streamUrl('/api/market/stream'), { withCredentials: true })
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
        setPaletteOpen(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  return (
    <div className="stack full">
      <ApiStatusBanner />
      <header className="app-header">
        <div className="page row gap-md px-lg" style={{ paddingTop: '0.65rem', paddingBottom: '0.65rem' }}>
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

          <nav className="nav-rail page hidden lg-show" style={{ display: undefined }}>
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

          <div className="ml-auto row shrink-0 gap-sm">
            <button
              type="button"
              className="nav-search"
              onClick={() => setPaletteOpen(true)}
              aria-label="Search"
              title="Search (⌘K)"
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

            <Link to="/app/funds" className="wallet-chip hidden sm-show">
              <IconWallet size={17} />
              <span className="right">
                <span className="block text-xs bold uppercase muted" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Wallet
                </span>
                <span className="mt-sm block mono text-sm bold" style={{ color: '#7dffc8' }}>
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
          <div className="page row gap-lg overflow-auto px-lg mono text-xs" style={{ paddingTop: 6, paddingBottom: 6 }}>
            <span className="row shrink-0 gap-sm text-xs bold uppercase">
              <span className={`live-dot ${connected && marketStatus?.source === 'yahoo' ? '' : ''}`} />
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
                className="pointer"
                style={{ background: 'none', border: 0, color: 'inherit' }}
                onClick={() => navigate(`/app/indices/${key}`)}
              >
                <span style={{ opacity: 0.55 }}>{idx.name}</span>{' '}
                <span className="bold">{Number(idx.value).toLocaleString('en-IN')}</span>{' '}
                <span style={{ color: idx.changePct >= 0 ? '#7dffc8' : '#ff8f8f' }}>
                  {idx.changePct >= 0 ? '+' : ''}
                  {idx.changePct}%
                </span>
              </button>
            ))}
            {!user?.kycComplete && (
              <button
                type="button"
                className="ml-auto row shrink-0 gap-sm pointer bold text-xs"
                style={{ background: 'rgba(255,255,255,0.1)', border: 0, color: '#7dffc8', borderRadius: 8, padding: '4px 10px' }}
                onClick={() => navigate('/kyc')}
              >
                <IconShield size={13} />
                Complete KYC
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="page w-full grow px-lg page-pad">
        <Outlet />
      </main>

      <NavDrawer open={drawerOpen} onClose={closeDrawer} />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </div>
  )
}

function AccountMenu({ user, onLogout }) {
  const [anchor, setAnchor] = useState(null)
  const { mode, toggleMode } = useThemeMode()
  const open = Boolean(anchor)

  return (
    <>
      <button
        type="button"
        className="avatar-btn"
        onClick={(e) => setAnchor(e.currentTarget)}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <span className="avatar">{initialsOf(user)}</span>
        <IconChevronDown size={14} style={{ color: 'rgba(255,255,255,0.55)' }} />
      </button>

      <Menu
        anchorEl={anchor}
        open={open}
        onClose={() => setAnchor(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'right' }}
        PaperProps={{ sx: { width: 260, mt: 1, borderRadius: 3 } }}
      >
        <div className="stack gap-xs" style={{ padding: '8px 16px 12px' }}>
          <Typography fontWeight={800}>{user?.name || 'Investor'}</Typography>
          <Typography variant="caption" color="text.secondary">{user?.email}</Typography>
          <span className={`menu-kyc ${user?.kycComplete ? 'is-done' : ''}`}>
            <IconShield size={11} />
            {user?.kycComplete ? 'KYC verified' : 'KYC pending'}
          </span>
        </div>
        <Divider />
        <MenuItem onClick={toggleMode}>
          <ListItemIcon>
            {mode === 'dark' ? <LightModeOutlinedIcon fontSize="small" /> : <DarkModeOutlinedIcon fontSize="small" />}
          </ListItemIcon>
          <ListItemText primary={mode === 'dark' ? 'Light mode' : 'Dark mode'} />
          <Switch edge="end" checked={mode === 'dark'} size="small" />
        </MenuItem>
        <MenuItem component={Link} to="/app/account" onClick={() => setAnchor(null)}>
          <ListItemIcon><IconUser size={18} /></ListItemIcon>
          <ListItemText>Profile & alerts</ListItemText>
        </MenuItem>
        <MenuItem component={Link} to="/app/investments" onClick={() => setAnchor(null)}>
          <ListItemIcon><IconBriefcase size={18} /></ListItemIcon>
          <ListItemText>My investments</ListItemText>
        </MenuItem>
        <MenuItem component={Link} to="/app/orders" onClick={() => setAnchor(null)}>
          <ListItemIcon><IconList size={18} /></ListItemIcon>
          <ListItemText>Order book</ListItemText>
        </MenuItem>
        <MenuItem component={Link} to="/app/funds" onClick={() => setAnchor(null)}>
          <ListItemIcon><IconWallet size={18} /></ListItemIcon>
          <ListItemText>Funds & ledger</ListItemText>
        </MenuItem>
        <Divider />
        <MenuItem
          onClick={() => {
            setAnchor(null)
            onLogout()
          }}
          sx={{ color: 'error.main' }}
        >
          <ListItemIcon><IconLogout size={18} /></ListItemIcon>
          <ListItemText>Log out</ListItemText>
        </MenuItem>
      </Menu>
    </>
  )
}
