import { IconStar } from './Icons'

/**
 * Star control that adds / removes a symbol from the user's watchlist.
 * Pass `compact` for table rows; default is a labelled button for headers.
 */
export function WatchlistButton({
  symbol,
  watched,
  busy = false,
  onToggle,
  compact = false,
  className = '',
}) {
  const label = watched ? 'Remove from watchlist' : 'Add to watchlist'
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={busy || !symbol}
      onClick={(e) => {
        e.preventDefault()
        e.stopPropagation()
        onToggle?.(symbol)
      }}
      className={
        compact
          ? `inline-grid h-8 w-8 place-items-center rounded-lg border transition ${
              watched
                ? 'border-gold/40 bg-[#fdf6e7] text-gold'
                : 'border-line bg-surface text-muted hover:border-gold/40 hover:text-gold'
            } disabled:opacity-50 ${className}`
          : `btn text-sm ${watched ? 'btn-ghost border-gold/40 text-gold' : 'btn-ghost'} ${className}`
      }
    >
      <IconStar size={compact ? 15 : 16} filled={watched} />
      {!compact ? <span>{watched ? 'Watching' : 'Watchlist'}</span> : null}
    </button>
  )
}
