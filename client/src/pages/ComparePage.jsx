import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { Button, TextField } from '@mui/material'
import { api, formatINR } from '../lib/api'
import { useAppSelector } from '../app/hooks'
import { PageHeader, Screen } from '../components/Screen'
import { IconCandles } from '../components/Icons'

export function ComparePage() {
  const [params, setParams] = useSearchParams()
  const instruments = useAppSelector((s) => s.market.instruments)
  const initial = (params.get('symbols') || 'INFY,TCS').split(',').map((s) => s.trim().toUpperCase()).filter(Boolean)
  const [input, setInput] = useState(initial.join(','))
  const [symbols, setSymbols] = useState(initial.slice(0, 4))
  const [candles, setCandles] = useState({})

  useEffect(() => {
    setParams({ symbols: symbols.join(',') }, { replace: true })
  }, [symbols, setParams])

  useEffect(() => {
    let cancelled = false
    Promise.all(
      symbols.map(async (sym) => {
        try {
          const data = await api(`/market/${sym}/candles?interval=86400&count=30`)
          return [sym, data.candles || []]
        } catch {
          return [sym, []]
        }
      }),
    ).then((entries) => {
      if (!cancelled) setCandles(Object.fromEntries(entries))
    })
    return () => { cancelled = true }
  }, [symbols])

  const rows = useMemo(() => symbols.map((sym) => {
    const inst = instruments[sym]
    const series = candles[sym] || []
    const first = series[0]?.close
    const last = series[series.length - 1]?.close
    const monthReturn = first && last ? +(((last - first) / first) * 100).toFixed(2) : null
    return {
      symbol: sym,
      name: inst?.name || sym,
      price: inst?.price,
      changePct: inst?.changePct,
      volume: inst?.volume,
      high: inst?.high ?? inst?.week52High,
      low: inst?.low ?? inst?.week52Low,
      week52High: inst?.week52High,
      week52Low: inst?.week52Low,
      sector: inst?.sector,
      monthReturn,
    }
  }), [symbols, instruments, candles])

  const apply = () => {
    const next = input.split(',').map((s) => s.trim().toUpperCase()).filter(Boolean).slice(0, 4)
    if (next.length >= 2) setSymbols(next)
  }

  const metrics = [
    { key: 'price', label: 'LTP', fmt: (v) => (v != null ? `₹${formatINR(v)}` : '—') },
    { key: 'changePct', label: 'Day change', fmt: (v) => (v != null ? `${v >= 0 ? '+' : ''}${v.toFixed(2)}%` : '—'), tone: true },
    { key: 'monthReturn', label: '~30d return', fmt: (v) => (v != null ? `${v >= 0 ? '+' : ''}${v}%` : '—'), tone: true },
    { key: 'volume', label: 'Volume', fmt: (v) => (v != null ? v.toLocaleString('en-IN') : '—') },
    { key: 'week52High', label: '52w high', fmt: (v) => (v != null ? `₹${formatINR(v)}` : '—') },
    { key: 'week52Low', label: '52w low', fmt: (v) => (v != null ? `₹${formatINR(v)}` : '—') },
    { key: 'sector', label: 'Sector', fmt: (v) => v || '—' },
  ]

  return (
    <Screen theme="explore" className="stack gap-md">
      <PageHeader
        icon={IconCandles}
        eyebrow="Side by side"
        title="Compare"
        subtitle="Compare 2–4 symbols on price, momentum and range"
      />

      <div className="card row flex-wrap gap-md p-lg">
        <TextField
          size="small"
          label="Symbols (comma separated)"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          sx={{ minWidth: 280, flex: 1 }}
          helperText="2–4 NSE symbols, e.g. INFY,TCS,WIPRO"
        />
        <Button variant="contained" onClick={apply}>Compare</Button>
      </div>

      <div className="card overflow-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] bold muted uppercase">
              <th className="px-lg py-md left">Metric</th>
              {rows.map((r) => (
                <th key={r.symbol} className="px-lg py-md">
                  <Link to={`/app/stocks/${r.symbol}`} className="mono bold">{r.symbol}</Link>
                  <div className="text-xs muted normal-case">{r.name}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.key} className="border-t border">
                <td className="px-lg py-md muted">{m.label}</td>
                {rows.map((r) => {
                  const v = r[m.key]
                  const tone = m.tone && v != null ? (v >= 0 ? 'up' : 'down') : ''
                  return (
                    <td key={r.symbol} className={`px-lg py-md mono bold ${tone}`}>
                      {m.fmt(v)}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Screen>
  )
}
