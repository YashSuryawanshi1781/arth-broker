import { themeClass } from '../lib/theme'

/**
 * Wraps a route so every child can read the screen's accent from
 * `var(--page-accent)`.
 */
export function Screen({ theme = 'home', className = '', children }) {
  return <div className={`${themeClass(theme)} ${className}`}>{children}</div>
}

export function PageHeader({ icon: Icon, eyebrow, title, subtitle, actions }) {
  return (
    <div className="page-header mb-5 row wrap gap-lg">
      <div className="row gap-md.5">
        {Icon ? (
          <span className="icon-chip icon-chip-lg">
            <Icon size={22} />
          </span>
        ) : null}
        <div>
          {eyebrow ? (
            <div className="text-[10px] bold tracking-[0.12em] text-page-accent uppercase">{eyebrow}</div>
          ) : null}
          <h1 className="text-xl extrabold">{title}</h1>
          {subtitle ? <p className="mt-sm text-sm muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="row wrap gap-sm">{actions}</div> : null}
    </div>
  )
}

export function IconChip({ icon: Icon, size = 18, tone = 'accent', className = '' }) {
  return (
    <span className={`icon-chip ${tone === 'muted' ? 'icon-chip-muted' : ''} ${className}`}>
      <Icon size={size} />
    </span>
  )
}

export function EmptyState({ art: Art, accent, title, message, action, compact = false }) {
  return (
    <div className={`stack center ${compact ? 'py-6' : 'py-10'}`}>
      {Art ? (
        <Art
          accent={accent}
          width={compact ? 150 : 200}
          height={compact ? 112 : 150}
          className="mb-sm"
        />
      ) : null}
      <p className="text-sm extrabold">{title}</p>
      {message ? <p className="mt-sm text-xs leading-relaxed muted">{message}</p> : null}
      {action ? <div className="mt-lg">{action}</div> : null}
    </div>
  )
}
