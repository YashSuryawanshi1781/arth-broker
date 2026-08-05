import { Link, useNavigate } from 'react-router-dom'
import { IconArrowLeft } from './Icons'

/**
 * Top-left back control + clickable trail.
 * Back goes to the nearest ancestor crumb with a `to`, then `fallback`.
 *
 * items: [{ label, to? }] — omit `to` on the current page (last crumb).
 */
export function BreadcrumbBar({ items = [], fallback = '/app' }) {
  const navigate = useNavigate()
  const parent = [...items].reverse().find((item) => item.to)?.to || fallback

  return (
    <div className="crumb-bar">
      <button
        type="button"
        className="crumb-back"
        aria-label="Go back"
        title="Go back"
        onClick={() => navigate(parent)}
      >
        <IconArrowLeft size={18} />
      </button>
      <nav className="crumb-trail" aria-label="Breadcrumb">
        {items.map((item, index) => {
          const isLast = index === items.length - 1
          return (
            <span key={`${item.label}-${index}`} className="crumb-item">
              {index > 0 ? <span className="crumb-sep" aria-hidden>/</span> : null}
              {item.to && !isLast ? (
                <Link to={item.to} className="crumb-link">
                  {item.label}
                </Link>
              ) : (
                <span className={isLast ? 'crumb-current' : 'crumb-plain'}>{item.label}</span>
              )}
            </span>
          )
        })}
      </nav>
    </div>
  )
}
