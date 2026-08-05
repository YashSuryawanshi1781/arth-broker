import { useEffect } from 'react'
import { NavLink, useLocation, useNavigate } from 'react-router-dom'
import { createPortal } from 'react-dom'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { logout } from '../features/auth/authSlice'
import { formatINR } from '../lib/api'
import { BrandLockup } from './Brand'
import { DRAWER_SECTIONS, KYC_LINK } from './navConfig'
import { IconArrowRight, IconCheckCircle, IconClose, IconLogout, IconPlus, IconShield } from './Icons'

export function NavDrawer({ open, onClose }) {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const location = useLocation()

  // Close whenever the route changes so tapping a link dismisses the drawer.
  useEffect(() => {
    onClose()
  }, [location.pathname])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') onClose()
    }
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = previousOverflow
      window.removeEventListener('keydown', onKey)
    }
  }, [open, onClose])

  if (!open) return null

  const initials = initialsOf(user)

  return createPortal(
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />
      <aside className="drawer-panel" role="dialog" aria-modal="true" aria-label="Main navigation">
        <div className="drawer-head">
          <div className="flex items-start justify-between gap-3">
            <BrandLockup size="sm" tone="light" />
            <button type="button" className="drawer-close" onClick={onClose} aria-label="Close navigation">
              <IconClose size={18} />
            </button>
          </div>

          <div className="mt-5 flex items-center gap-3">
            <span className="drawer-avatar">{initials}</span>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-extrabold">{user?.name || 'Investor'}</div>
              <div className="truncate text-[11px] text-white/55">{user?.email}</div>
            </div>
            <span className={`drawer-kyc ${user?.kycComplete ? 'is-done' : ''}`}>
              {user?.kycComplete ? <IconCheckCircle size={12} /> : <IconShield size={12} />}
              {user?.kycComplete ? 'Verified' : 'Pending'}
            </span>
          </div>

          <div className="mt-4 flex items-center justify-between rounded-2xl border border-white/15 bg-white/10 px-3.5 py-2.5">
            <div>
              <div className="text-[9px] font-bold tracking-[0.16em] text-white/50 uppercase">Available cash</div>
              <div className="font-mono text-lg font-bold">₹{formatINR(user?.cash)}</div>
            </div>
            <button type="button" className="drawer-add" onClick={() => navigate('/app/funds')}>
              <IconPlus size={15} />
              Add
            </button>
          </div>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto pb-3">
          {!user?.kycComplete && (
            <>
              <div className="drawer-section-label">Get started</div>
              <DrawerLink item={KYC_LINK} />
            </>
          )}
          {DRAWER_SECTIONS.map((section) => (
            <div key={section.label}>
              <div className="drawer-section-label">{section.label}</div>
              {section.items.map((item) => (
                <DrawerLink key={item.to} item={item} />
              ))}
            </div>
          ))}
        </nav>

        <div className="drawer-foot">
          <button
            type="button"
            className="drawer-logout"
            onClick={() => dispatch(logout()).then(() => navigate('/login'))}
          >
            <IconLogout size={17} />
            Log out
          </button>
          <p className="mt-2.5 text-center text-[10px] text-muted">
            Paper-trading demo · no real money involved
          </p>
        </div>
      </aside>
    </>,
    document.body,
  )
}

function DrawerLink({ item }) {
  const Icon = item.icon
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) => `drawer-link theme-${item.theme} ${isActive ? 'drawer-link-active' : ''}`}
    >
      <span className="icon-chip icon-chip-md">
        <Icon size={17} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate">{item.label}</span>
        {item.hint ? <span className="block truncate text-[11px] font-medium text-muted">{item.hint}</span> : null}
      </span>
      <IconArrowRight size={15} className="drawer-link-arrow" />
    </NavLink>
  )
}

export function initialsOf(user) {
  return (user?.name || user?.email || 'U')
    .split(/[\s@.]/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('')
}
