import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, MenuItem, TextField } from '@mui/material'
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
          <Button variant="contained" startIcon={<IconFilter size={16} />} onClick={load} disabled={loading}>
            Run screen
          </Button>
        }
      />

      <div className="card grid-3 gap-md p-lg">
        <TextField
          size="small"
          label="Min change %"
          type="number"
          value={filters.minChange}
          onChange={(e) => setFilters({ ...filters, minChange: e.target.value })}
        />
        <TextField
          size="small"
          label="Max change %"
          type="number"
          value={filters.maxChange}
          onChange={(e) => setFilters({ ...filters, maxChange: e.target.value })}
        />
        <TextField
          size="small"
          label="Min volume"
          type="number"
          value={filters.minVolume}
          onChange={(e) => setFilters({ ...filters, minVolume: e.target.value })}
        />
        <TextField
          select
          size="small"
          label="Near 52w"
          value={filters.near52w}
          onChange={(e) => setFilters({ ...filters, near52w: e.target.value })}
        >
          <MenuItem value="">Any</MenuItem>
          <MenuItem value="high">Near 52w high</MenuItem>
          <MenuItem value="low">Near 52w low</MenuItem>
        </TextField>
        <TextField
          size="small"
          label="Sector"
          value={filters.sector}
          onChange={(e) => setFilters({ ...filters, sector: e.target.value })}
          placeholder="e.g. IT"
        />
        <TextField
          select
          size="small"
          label="Sort by"
          value={filters.sort}
          onChange={(e) => setFilters({ ...filters, sort: e.target.value })}
        >
          <MenuItem value="changePct">Change %</MenuItem>
          <MenuItem value="volume">Volume</MenuItem>
          <MenuItem value="price">Price</MenuItem>
          <MenuItem value="nearHighPct">Distance to high</MenuItem>
        </TextField>
      </div>

      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] bold muted uppercase">
              <th className="px-lg py-md">Symbol</th>
              <th>Sector</th>
              <th className="right">LTP</th>
              <th className="right">Change</th>
              <th className="right">Volume</th>
              <th className="right">52w high</th>
              <th className="right">52w low</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => (
              <tr key={r.symbol} className="border-t border">
                <td className="px-lg py-md">
                  <Link to={`/app/stocks/${r.symbol}`} className="mono bold">{r.symbol}</Link>
                  <div className="text-xs muted">{r.name}</div>
                </td>
                <td className="muted">{r.sector}</td>
                <td className="right mono">₹{formatINR(r.price)}</td>
                <td className={`right mono bold ${r.changePct >= 0 ? 'up' : 'down'}`}>
                  {r.changePct >= 0 ? '+' : ''}{r.changePct?.toFixed(2)}%
                </td>
                <td className="right mono">{(r.volume || 0).toLocaleString('en-IN')}</td>
                <td className="right mono">₹{formatINR(r.week52High || 0)}</td>
                <td className="right mono">₹{formatINR(r.week52Low || 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading && <div className="px-lg py-md center muted text-sm">Scanning…</div>}
        {!loading && results.length === 0 && (
          <div className="px-lg py-md center muted text-sm">No matches — loosen filters and run again.</div>
        )}
      </div>
    </Screen>
  )
}
