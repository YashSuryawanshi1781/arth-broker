import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatINR } from '../lib/api'
import { useAppDispatch } from '../app/hooks'
import { showToast } from '../features/ui/uiSlice'
import { PageHeader, Screen } from '../components/Screen'
import { IconFilter, IconSearch } from '../components/Icons'

export function ScreenerPage() {
  const dispatch = useAppDispatch()
  const [filters, setFilters] = useState({
    minChange: '',
    maxChange: '',
    minVolume: '',
    near52w: '',
    sector: '',
    sort: 'changePct',
  })
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(true)

  const load = () => {
    setLoading(true)
    const q = new URLSearchParams()
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== '' && v != null) q.set(k, String(v))
    })
    api(`/market/screener?${q}`)
      .then((d) => setResults(d.results || []))
      .catch((err) => dispatch(showToast({ type: 'error', title: 'Screener failed', message: err.message })))
      .finally(() => setLoading(false))
  }

  useEffect(load, []) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <Screen theme="explore" className="stack gap-md">
      <PageHeader
        icon={IconSearch}
        eyebrow="Universe scan"
        title="Screener"
        subtitle="Filter by day change, volume and proximity to 52-week extremes"
        actions={
          <button type="button" className="btn btn-primary text-sm" onClick={load} disabled={loading}>
            <IconFilter size={16} />
            {loading ? 'Scanning…' : 'Run screen'}
          </button>
        }
      />

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className="label" htmlFor="scr-min">Min change %</label>
          <input id="scr-min" className="field" type="number" value={filters.minChange} onChange={(e) => setFilters({ ...filters, minChange: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="scr-max">Max change %</label>
          <input id="scr-max" className="field" type="number" value={filters.maxChange} onChange={(e) => setFilters({ ...filters, maxChange: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="scr-vol">Min volume</label>
          <input id="scr-vol" className="field" type="number" value={filters.minVolume} onChange={(e) => setFilters({ ...filters, minVolume: e.target.value })} />
        </div>
        <div>
          <label className="label" htmlFor="scr-near">Near 52w</label>
          <select id="scr-near" className="field" value={filters.near52w} onChange={(e) => setFilters({ ...filters, near52w: e.target.value })}>
            <option value="">Any</option>
            <option value="high">Near 52w high</option>
            <option value="low">Near 52w low</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="scr-sector">Sector</label>
          <input id="scr-sector" className="field" value={filters.sector} onChange={(e) => setFilters({ ...filters, sector: e.target.value })} placeholder="e.g. IT" />
        </div>
        <div>
          <label className="label" htmlFor="scr-sort">Sort by</label>
          <select id="scr-sort" className="field" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}>
            <option value="changePct">Change %</option>
            <option value="volume">Volume</option>
            <option value="price">Price</option>
            <option value="nearHighPct">Distance to high</option>
          </select>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-surface-2/80 text-[10px] font-bold tracking-wide text-muted uppercase">
              <th className="px-4 py-2.5 text-left">Symbol</th>
              <th className="px-4 py-2.5 text-left">Sector</th>
              <th className="px-4 py-2.5 text-right">LTP</th>
              <th className="px-4 py-2.5 text-right">Change</th>
              <th className="px-4 py-2.5 text-right">Volume</th>
              <th className="px-4 py-2.5 text-right">52w high</th>
              <th className="px-4 py-2.5 text-right">52w low</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.symbol} className="border-t border-line transition hover:bg-surface-2/50">
                <td className="px-4 py-2.5">
                  <Link to={`/app/stocks/${r.symbol}`} className="font-mono font-bold">{r.symbol}</Link>
                  <div className="text-xs text-muted">{r.name}</div>
                </td>
                <td className="px-4 py-2.5 text-muted">{r.sector}</td>
                <td className="px-4 py-2.5 text-right font-mono">₹{formatINR(r.price)}</td>
                <td className={`px-4 py-2.5 text-right font-mono font-bold ${r.changePct >= 0 ? 'text-up' : 'text-down'}`}>
                  {r.changePct >= 0 ? '+' : ''}{r.changePct?.toFixed(2)}%
                </td>
                <td className="px-4 py-2.5 text-right font-mono">{(r.volume || 0).toLocaleString('en-IN')}</td>
                <td className="px-4 py-2.5 text-right font-mono">₹{formatINR(r.week52High || 0)}</td>
                <td className="px-4 py-2.5 text-right font-mono">₹{formatINR(r.week52Low || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="px-4 py-8 text-center text-sm text-muted">Scanning…</div>}
        {!loading && results.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-muted">No matches — loosen filters and run again.</div>
        )}
      </div>
    </Screen>
  )
}
