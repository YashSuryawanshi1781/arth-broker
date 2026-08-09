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
    <div className="page-header mb-5 flex flex-wrap items-center justify-between gap-4">
      <div className="flex items-center gap-3.5">
        {Icon ? (
          <span className="icon-chip icon-chip-lg">
            <Icon size={22} />
          </span>
        ) : null}
        <div>
          {eyebrow ? (
            <div className="text-[10px] font-bold tracking-[0.12em] text-page-accent uppercase">{eyebrow}</div>
          ) : null}
          <h1 className="text-xl font-extrabold tracking-tight sm:text-2xl">{title}</h1>
          {subtitle ? <p className="mt-0.5 text-sm text-muted">{subtitle}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
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
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-6' : 'py-10'}`}>
      {Art ? (
        <Art
          accent={accent}
          width={compact ? 150 : 200}
          height={compact ? 112 : 150}
          className="mb-1 opacity-95"
        />
      ) : null}
      <p className="text-sm font-extrabold">{title}</p>
      {message ? <p className="mt-1 max-w-xs text-xs leading-relaxed text-muted">{message}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
    </div>
  )
}
