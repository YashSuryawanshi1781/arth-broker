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
import { formatINR, api } from '../lib/api'
import { useMarketStream } from '../hooks/useMarketStream'
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

  useMarketStream()

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
    <div className="flex min-h-full flex-col">
      <ApiStatusBanner />
      <header className="app-header">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-2.5">
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

            <Link to="/app/funds" className="wallet-chip hidden sm:flex" title="Available cash">
              <IconWallet size={17} className="text-[#7dffc8]" />
              <span className="text-right leading-none">
                <span className="block text-[9px] font-bold tracking-[0.12em] text-white/50 uppercase">
                  Cash
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
          <div className="mx-auto flex max-w-7xl items-center gap-5 overflow-x-auto px-4 py-1.5 font-mono text-xs">
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
                style={{ background: 'none', border: 0, color: 'inherit' }}
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
            {!user?.kycComplete && (
              <button
                type="button"
                className="ml-auto flex shrink-0 items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 font-sans text-[11px] font-bold whitespace-nowrap text-[#7dffc8] transition hover:bg-white/20"
                style={{ border: 0 }}
                onClick={() => navigate('/kyc')}
              >
                <IconShield size={13} />
                Complete KYC
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-5 pb-24 lg:pb-8">
        <Outlet />
      </main>

      <nav className="app-bottom-nav lg:hidden" aria-label="Primary">
        {PRIMARY_NAV.slice(0, 5).map((l) => (
          <NavLink
            key={l.to}
            to={l.to}
            end={l.end}
            className={({ isActive }) => `app-bottom-link ${isActive ? 'is-active' : ''}`}
          >
            <l.icon size={18} />
            <span>{l.label.replace(' · AI', '')}</span>
          </NavLink>
        ))}
      </nav>

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
