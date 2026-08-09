import { useState } from 'react'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { BrandLockup } from './Brand'
import { IconClose, IconMenu } from './Icons'

const NAV = [
  { to: '/pricing', label: 'Pricing' },
  { to: '/about', label: 'About' },
  { to: '/contact', label: 'Contact' },
]

export function SiteShell({ children }) {
  const [open, setOpen] = useState(false)
  const location = useLocation()
  const content = children ?? <Outlet />

  return (
    <div className="site-shell">
      <header className="site-nav">
        <div className="site-nav-inner">
          <Link to="/" className="site-nav-brand" onClick={() => setOpen(false)}>
            <BrandLockup size="md" tagline={false} />
          </Link>

          <nav className="site-nav-links" aria-label="Primary">
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `site-nav-link${isActive ? ' is-active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="site-nav-actions">
            <Link to="/login" className="btn btn-ghost site-nav-login">Login</Link>
            <Link to="/register" className="btn btn-primary">Open free demat</Link>
            <button
              type="button"
              className="site-nav-burger"
              aria-label={open ? 'Close menu' : 'Open menu'}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? <IconClose size={20} /> : <IconMenu size={20} />}
            </button>
          </div>
        </div>

        {open && (
          <div className="site-nav-drawer" key={location.pathname}>
            {NAV.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className="site-nav-drawer-link"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </NavLink>
            ))}
            <div className="site-nav-drawer-actions">
              <Link to="/login" className="btn btn-ghost w-full" onClick={() => setOpen(false)}>
                Login
              </Link>
              <Link to="/register" className="btn btn-primary w-full" onClick={() => setOpen(false)}>
                Open free demat
              </Link>
            </div>
          </div>
        )}
      </header>

      <main className="site-main">{content}</main>

      <footer className="site-footer">
        <div className="site-footer-inner">
          <div className="site-footer-brand">
            <BrandLockup size="md" />
            <p>
              India&apos;s paper brokerage — learn markets with live NSE prices,
              real order flow, and zero rupee risk.
            </p>
          </div>

          <div className="site-footer-cols">
            <FooterCol
              title="Product"
              links={[
                ['/pricing', 'Pricing'],
                ['/register', 'Open demat'],
                ['/login', 'Demo login'],
              ]}
            />
            <FooterCol
              title="Company"
              links={[
                ['/about', 'About us'],
                ['/contact', 'Contact us'],
              ]}
            />
            <FooterCol
              title="Legal"
              links={[
                ['/privacy', 'Privacy policy'],
                ['/terms', 'Terms of use'],
              ]}
            />
          </div>
        </div>

        <div className="site-footer-bar">
          <span>© {new Date().getFullYear()} Arth Broking · Paper trading demo</span>
          <span className="site-footer-note">Not a SEBI-registered broker · No real money</span>
        </div>
      </footer>
    </div>
  )
}

function FooterCol({ title, links }) {
  return (
    <div className="site-footer-col">
      <h3>{title}</h3>
      <ul>
        {links.map(([to, label]) => (
          <li key={to}>
            <Link to={to}>{label}</Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
