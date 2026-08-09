import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import { formatINR } from '../lib/api'
import { PageHeader, Screen } from '../components/Screen'
import { IconGrid } from '../components/Icons'

function heatTint(pct) {
  const intensity = Math.min(1, Math.abs(pct) / 2.5)
  const alpha = (0.08 + intensity * 0.42).toFixed(3)
  return pct >= 0 ? `rgba(0, 168, 120, ${alpha})` : `rgba(229, 72, 77, ${alpha})`
}

export function HeatmapPage() {
  const instruments = useAppSelector((s) => s.market.instruments)
  const list = useMemo(() => Object.values(instruments || {}), [instruments])
  const [params, setParams] = useSearchParams()
  const sector = params.get('sector') || ''
  const [q, setQ] = useState('')

  const sectors = useMemo(() => {
    const map = new Map()
    for (const inst of list) {
      const key = inst.sector || 'Other'
      const row = map.get(key) || { sector: key, count: 0, sum: 0, advancing: 0, items: [] }
      row.count += 1
      row.sum += Number(inst.changePct) || 0
      if ((inst.changePct || 0) >= 0) row.advancing += 1
      row.items.push(inst)
      map.set(key, row)
    }
    return [...map.values()]
      .map((s) => ({ ...s, avg: s.count ? s.sum / s.count : 0 }))
      .sort((a, b) => b.avg - a.avg)
  }, [list])

  const active = sectors.find((s) => s.sector === sector)
  const stocks = (active?.items || list)
    .filter((s) => !q || s.symbol.includes(q.toUpperCase()) || (s.name || '').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (b.changePct || 0) - (a.changePct || 0))

  return (
    <Screen theme="explore" className="stack gap-md">
      <PageHeader
        icon={IconGrid}
        eyebrow="Research"
        title="Sector heatmap"
        subtitle="Drill into sectors, then open any stock — live from the Arth universe"
      />

      <section className="card p-4">
        <div className="heat-grid">
          {sectors.map((s) => {
            const up = s.avg >= 0
            const selected = s.sector === sector
            return (
              <button
                key={s.sector}
                type="button"
                className={`heat-tile ${selected ? 'border-accent' : ''}`}
                style={{ background: heatTint(s.avg), textAlign: 'left' }}
                onClick={() => setParams(s.sector === sector ? {} : { sector: s.sector })}
              >
                <span className="truncate text-xs font-bold text-ink">{s.sector}</span>
                <span>
                  <span className={`block font-mono text-sm font-bold ${up ? 'text-up' : 'text-down'}`}>
                    {up ? '+' : ''}{s.avg.toFixed(2)}%
                  </span>
                  <span className="block text-[10px] font-bold text-muted">
                    {s.advancing}/{s.count} up
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h3 className="font-extrabold">{sector || 'All sectors'}</h3>
            <p className="text-xs text-muted">{stocks.length} stocks · tap a tile to filter</p>
          </div>
          <input
            className="field max-w-[220px]"
            placeholder="Filter symbol"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div>
          {stocks.slice(0, 80).map((s) => {
            const up = (s.changePct || 0) >= 0
            return (
              <Link
                key={s.symbol}
                to={`/app/stocks/${s.symbol}`}
                className="flex w-full items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-0 transition hover:bg-surface-2/50"
              >
                <div className="min-w-0">
                  <div className="font-mono text-sm font-bold">{s.symbol}</div>
                  <div className="truncate text-xs text-muted">{s.name}</div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="font-mono text-sm font-bold">₹{formatINR(s.price)}</div>
                  <div className={`text-xs font-bold ${up ? 'text-up' : 'text-down'}`}>
                    {up ? '+' : ''}{s.changePct}%
                  </div>
                </div>
              </Link>
            )
          })}
          {stocks.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted">No stocks match this filter.</div>
          )}
        </div>
      </section>
    </Screen>
  )
}
