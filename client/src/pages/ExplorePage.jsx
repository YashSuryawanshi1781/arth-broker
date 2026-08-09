import { useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useVirtualizer } from '@tanstack/react-virtual'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { api, formatINR } from '../lib/api'
import { showToast } from '../features/ui/uiSlice'
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
  const dispatch = useAppDispatch()
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
    <Screen theme="explore" className="explore-shell flex flex-col">
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
          <span className="hidden items-center gap-1.5 rounded-xl border border-line bg-surface px-3 py-1.5 text-xs font-bold text-muted sm:flex">
            {filtered.length} instruments
            {watchlist.symbols.length > 0 ? ` · ${watchlist.symbols.length} watched` : ''}
          </span>
        }
      />
      <div className="mb-3 flex flex-wrap gap-2">
        <div className="field-wrap max-w-md flex-1">
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
            className="field field-has-icon max-w-[200px]"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
          >
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </div>
        {watchlist.lists?.length > 0 && (
          <div className="field-wrap">
            <select
              className="field max-w-[160px]"
              value={watchlist.listId || ''}
              onChange={(e) => watchlist.selectList(e.target.value)}
              title="Active watchlist"
            >
              {watchlist.lists.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.pinned ? '* ' : ''}{l.name}
                </option>
              ))}
            </select>
          </div>
        )}
        <button
          type="button"
          className="btn btn-ghost text-xs"
          onClick={async () => {
            const name = window.prompt('New watchlist name')
            if (!name?.trim()) return
            try {
              const created = await api('/watchlists', { method: 'POST', body: { name: name.trim() } })
              await watchlist.reload()
              if (created.watchlist?.id) watchlist.selectList(created.watchlist.id)
            } catch (err) {
              dispatch(showToast({ type: 'error', title: 'Watchlist', message: err.message }))
            }
          }}
        >
          + List
        </button>
        {watchlist.listId && (
          <button
            type="button"
            className="btn btn-ghost text-xs"
            onClick={async () => {
              const current = watchlist.lists.find((l) => l.id === watchlist.listId)
              const name = window.prompt('Rename watchlist', current?.name || '')
              if (!name?.trim()) return
              try {
                await watchlist.renameList(watchlist.listId, name.trim())
              } catch (err) {
                dispatch(showToast({ type: 'error', title: 'Rename failed', message: err.message }))
              }
            }}
          >
            Rename
          </button>
        )}
      </div>
      <div className="card min-h-0 flex-1 overflow-hidden">
        <div className="hidden grid-cols-[2rem_1.4fr_1fr_0.8fr] border-b border-line px-4 py-2 text-[11px] font-bold tracking-wide text-muted uppercase sm:grid">
          <span />
          <span>Instrument</span>
          <span className="text-right">LTP</span>
          <span className="text-right">Change</span>
        </div>
        <div ref={parentRef} className="h-full overflow-auto sm:h-[calc(100%-36px)]">
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
                  className="absolute top-0 left-0 grid w-full cursor-pointer grid-cols-[2rem_1fr_auto] items-center gap-2 border-b border-line px-4 text-left transition hover:bg-surface-2/70 sm:grid-cols-[2rem_1.4fr_1fr_0.8fr]"
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
                  <div className="min-w-0">
                    <div className="font-mono text-sm font-bold">{row.symbol}</div>
                    <div className="truncate text-xs text-muted">{row.name} · {row.sector}</div>
                    <div className="mt-0.5 font-mono text-xs font-semibold sm:hidden">₹{formatINR(row.price)}</div>
                  </div>
                  <div className="hidden text-right font-mono text-sm font-semibold sm:block">₹{formatINR(row.price)}</div>
                  <div className={`flex items-center justify-end gap-1 text-right text-sm font-bold ${up ? 'text-up' : 'text-down'}`}>
                    {up ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
                    {up ? '+' : ''}{row.changePct}%
                  </div>
                </div>
              )
            })}
          </div>
          {bootstrapping ? (
            <div className="grid place-items-center py-16 text-sm text-muted">
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
