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
          <div className="row-start gap-md">
            <BrandLockup size="sm" tone="light" />
            <button type="button" className="drawer-close" onClick={onClose} aria-label="Close navigation">
              <IconClose size={18} />
            </button>
          </div>

          <div className="mt-5 row gap-md">
            <span className="drawer-avatar">{initials}</span>
            <div className="min- grow">
              <div className="truncate text-sm extrabold">{user?.name || 'Investor'}</div>
              <div className="truncate text-[11px]">{user?.email}</div>
            </div>
            <span className={`drawer-kyc ${user?.kycComplete ? 'is-done' : ''}`}>
              {user?.kycComplete ? <IconCheckCircle size={12} /> : <IconShield size={12} />}
              {user?.kycComplete ? 'Verified' : 'Pending'}
            </span>
          </div>

          <div className="mt-lg row-between rounded border py-md">
            <div>
              <div className="text-[9px] bold tracking-[0.16em] uppercase">Available cash</div>
              <div className="mono text-lg bold">₹{formatINR(user?.cash)}</div>
            </div>
            <button type="button" className="drawer-add" onClick={() => navigate('/app/funds')}>
              <IconPlus size={15} />
              Add
            </button>
          </div>
        </div>

        <nav className="min- grow overflow-y-auto">
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
          <p className="mt-sm.5 center text-[10px] muted">
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
      <span className="min- grow">
        <span className="block truncate">{item.label}</span>
        {item.hint ? <span className="block truncate text-[11px] bold muted">{item.hint}</span> : null}
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
