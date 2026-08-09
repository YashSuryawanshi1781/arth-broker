import { useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAppSelector } from '../app/hooks'
import { formatINR } from '../lib/api'
import { EmptyState, PageHeader, Screen } from '../components/Screen'
import { WatchlistButton } from '../components/WatchlistButton'
import { EmptySearchArt } from '../components/Illustrations'
import { IconExplore, IconFilter, IconTrendingDown, IconTrendingUp } from '../components/Icons'
import { PAGE_THEMES } from '../lib/theme'
import { useWatchlist } from '../hooks/useWatchlist'

export function ExplorePage() {
  const symbols = useAppSelector((s) => s.market.symbols)
  const instruments = useAppSelector((s) => s.market.instruments)
  const connected = useAppSelector((s) => s.market.connected)
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const parentRef = useRef(null)
  const watchlist = useWatchlist()
  const bootstrapping = symbols.length === 0

  const q = searchParams.get('q') || ''
  const sectorParam = searchParams.get('sector') || 'All'

  const sectors = useMemo(() => {
    const set = new Set(Object.values(instruments).map((i) => i.sector).filter(Boolean))
    return ['All', ...[...set].sort()]
  }, [instruments])

  const sector =
    !sectorParam || sectorParam === 'All'
      ? 'All'
      : sectors.length > 1 && !sectors.includes(sectorParam)
        ? 'All'
        : sectorParam

  const setQuery = (value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (value.trim()) next.set('q', value)
        else next.delete('q')
        return next
      },
      { replace: true },
    )
  }

  const setSector = (value) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (!value || value === 'All') next.delete('sector')
        else next.set('sector', value)
        return next
      },
      { replace: true },
    )
  }

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return symbols.filter((sym) => {
      const row = instruments[sym]
      if (!row) return false
      if (sector !== 'All' && row.sector !== sector) return false
      if (!query) return true
      return row.symbol.toLowerCase().includes(query) || row.name.toLowerCase().includes(query)
    })
  }, [symbols, instruments, q, sector])

  const virtualizer = useVirtualizer({
    count: filtered.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 64,
    overscan: 10,
  })

  return (
    <Screen theme="explore" className="explore-shell stack">
      <PageHeader
        icon={IconExplore}
        eyebrow="Markets"
        title={sector === 'All' ? 'Explore' : sector}
        subtitle={
          sector === 'All'
            ? 'Search and trade from the live universe · tap ★ to watch'
            : `Showing ${sector} stocks · tap ★ to watch`
        }
        actions={
          <span className="hidden gap-sm rounded border px-lg text-xs bold muted sm-show">
            {filtered.length} instruments
            {watchlist.symbols.length > 0 ? ` · ${watchlist.symbols.length} watched` : ''}
          </span>
        }
      />
      <div className="mb-md row wrap gap-sm">
        <div className="field-wrap grow">
          <IconExplore size={18} className="field-icon" />
          <input
            className="field field-has-icon"
            placeholder="Search by symbol or company"
            value={q}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="field-wrap">
          <IconFilter size={16} className="field-icon" />
          <select
            className="field field-has-icon ]"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="card min- grow overflow-hidden">
        <div className="hidden grid-cols-[2rem_1.4fr_1fr_0.8fr] border-b border px-lg py-md text-[11px] bold muted uppercase">
          <span />
          <span>Instrument</span>
          <span className="right">LTP</span>
          <span className="right">Change</span>
        </div>
        <div ref={parentRef} className="h-full overflow-auto )]">
          <div style={{ height: virtualizer.getTotalSize(), position: 'relative' }}>
            {virtualizer.getVirtualItems().map((item) => {
              const sym = filtered[item.index]
              const row = instruments[sym]
              if (!row) return null
              const up = row.changePct >= 0
              return (
                <div
                  key={sym}
                  role="button"
                  tabIndex={0}
                  className="absolute grid w-full pointer grid-cols-[2rem_1fr_auto] gap-sm border-b border px-lg ]"
                  style={{ height: item.size, transform: `translateY(${item.start}px)` }}
                  onClick={() => navigate(`/app/stocks/${sym}`)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') navigate(`/app/stocks/${sym}`)
                  }}
                >
                  <WatchlistButton
                    compact
                    symbol={sym}
                    watched={watchlist.has(sym)}
                    busy={watchlist.busy === sym}
                    onToggle={watchlist.toggle}
                  />
                  <div className="min-">
                    <div className="mono text-sm bold">{row.symbol}</div>
                    <div className="truncate text-xs muted">{row.name} · {row.sector}</div>
                    <div className="mt-sm mono text-xs bold sm-hide">₹{formatINR(row.price)}</div>
                  </div>
                  <div className="hidden right mono text-sm bold">₹{formatINR(row.price)}</div>
                  <div className={`row-end gap-xs right text-sm bold ${up ? '' : ''}`}>
                    {up ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
                    {up ? '+' : ''}{row.changePct}%
                  </div>
                </div>
              )
            })}
          </div>
          {bootstrapping ? (
            <div className="grid py-md text-sm muted">
              {connected ? 'Loading market universe…' : 'Connecting to market feed…'}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              art={EmptySearchArt}
              accent={PAGE_THEMES.explore.accent}
              title="No matching instruments"
              message="Try a different symbol, company name or sector filter."
            />
          ) : null}
        </div>
      </div>
    </Screen>
  )
}
