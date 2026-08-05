import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, formatINR, formatINRShort } from '../lib/api'
import { useAppSelector } from '../app/hooks'
import { useLiveMarket } from '../hooks/useLiveMarket'
import { AdvancedChart } from '../components/AdvancedChart'
import { BreadcrumbBar } from '../components/BreadcrumbBar'
import { Screen } from '../components/Screen'
import { EmptySearchArt } from '../components/Illustrations'
import {
  IconCandles,
  IconList,
  IconTrendingDown,
  IconTrendingUp,
} from '../components/Icons'

const TABS = [
  ['overview', 'Overview', IconList],
  ['chart', 'Chart', IconCandles],
  ['options', 'Option chain', IconList],
]

export function IndexPage() {
  const { key } = useParams()
  const indexKey = String(key || '').toUpperCase()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const market = useLiveMarket(500)
  const marketStatus = useAppSelector((s) => s.market.status)

  const live = market.indices?.[indexKey]
  const [chain, setChain] = useState(null)
  const [chainError, setChainError] = useState('')
  const tabParam = searchParams.get('tab')
  const tab = TABS.some(([id]) => id === tabParam) ? tabParam : 'overview'

  const setTab = (id) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev)
        if (id === 'overview') next.delete('tab')
        else next.set('tab', id)
        return next
      },
      { replace: true },
    )
  }

  useEffect(() => {
    if (!indexKey) return undefined
    let cancelled = false
    setChain(null)
    setChainError('')
    api(`/market/indices/${indexKey}/options`)
      .then((d) => {
        if (!cancelled) setChain(d.chain)
      })
      .catch((err) => {
        if (!cancelled) setChainError(err.message || 'Could not load option chain')
      })
    return () => {
      cancelled = true
    }
  }, [indexKey])

  const constituents = useMemo(() => {
    const list = Object.values(market.instruments || {})
    if (indexKey === 'BANKNIFTY') {
      return list
        .filter((i) => i.sector === 'Banking' || i.sector === 'Finance')
        .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
        .slice(0, 8)
    }
    return list
      .slice()
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 8)
  }, [market.instruments, indexKey])

  if (!live) {
    return (
      <Screen theme="explore" className="space-y-4">
        <BreadcrumbBar
          fallback="/app"
          items={[
            { label: 'Home', to: '/app' },
            { label: indexKey || 'Index' },
          ]}
        />
        <div className="card grid place-items-center p-8 text-center">
          <EmptySearchArt accent="#2563eb" width={170} height={128} className="animate-pulse" />
          <p className="font-semibold">Loading {indexKey}…</p>
          <p className="mt-1 text-sm text-muted">Waiting for live index feed</p>
        </div>
      </Screen>
    )
  }

  const up = live.changePct >= 0
  const dayRangePct =
    live.high !== live.low
      ? ((live.value - live.low) / (live.high - live.low)) * 100
      : 50

  return (
    <Screen theme="explore" className="space-y-4">
      <BreadcrumbBar
        fallback="/app"
        items={[
          { label: 'Home', to: '/app' },
          { label: 'Indices', to: '/app' },
          { label: live.name || indexKey },
        ]}
      />

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-4">
          <div className="flex gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-brand text-xs font-extrabold text-white">
              {indexKey.slice(0, 3)}
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">{live.name}</h1>
                <span className="rounded border border-line px-1.5 py-0.5 text-[10px] font-bold text-muted">
                  {live.exchange || 'NSE'}
                </span>
                <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[11px] font-bold text-muted">Index</span>
              </div>
              <p className="mt-0.5 text-sm text-muted">
                Lot size {live.lotSize || '—'} · Strike step {live.strikeStep || '—'}
              </p>
            </div>
          </div>

          <div className="text-right">
            <div className="mb-1 flex items-center justify-end gap-2">
              <span className="live-dot" />
              <span className="text-[10px] font-bold tracking-wide text-accent uppercase">
                {marketStatus?.source === 'yahoo' ? 'Yahoo Finance' : 'Demo'}
              </span>
            </div>
            <div className="font-mono text-3xl font-bold">
              {Number(live.value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center justify-end gap-1 text-sm font-bold ${up ? 'text-up' : 'text-down'}`}>
              {up ? <IconTrendingUp size={15} /> : <IconTrendingDown size={15} />}
              {up ? '+' : ''}{formatINR(live.change || 0)} ({up ? '+' : ''}{live.changePct}%)
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-line border-t border-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          <Quote label="Open" value={fmt(live.open)} />
          <Quote label="High" value={fmt(live.high)} tone="up" />
          <Quote label="Low" value={fmt(live.low)} tone="down" />
          <Quote label="Prev close" value={fmt(live.prevClose)} />
          <Quote label="Day change" value={`${up ? '+' : ''}${live.changePct}%`} tone={up ? 'up' : 'down'} />
          <Quote label="Volume" value={live.volume ? formatINRShort(live.volume) : '—'} />
        </div>

        <div className="border-t border-line p-4">
          <RangeBar label="Day range" low={live.low} high={live.high} value={live.value} pct={dayRangePct} />
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line bg-surface-2/40 px-4 py-3">
          <button type="button" className="btn btn-primary text-sm" onClick={() => setTab('chart')}>
            <IconCandles size={16} />
            Open chart
          </button>
          <button type="button" className="btn btn-ghost text-sm" onClick={() => setTab('options')}>
            <IconList size={16} />
            Open option chain
          </button>
          {chain && (
            <span className="ml-auto self-center text-xs text-muted">
              Expiry {chain.expiry} · PCR {chain.pcr} · Lot {chain.lotSize}
            </span>
          )}
        </div>
      </section>

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition ${
              tab === id ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-surface-2'
            }`}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <section className="card p-4">
            <h3 className="mb-2 font-extrabold">About this index</h3>
            <p className="text-sm leading-relaxed text-muted">
              {live.about || `${live.name} is a major Indian market index.`}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <Stat label="Exchange" value={live.exchange || '—'} />
              <Stat label="Lot size" value={String(live.lotSize || '—')} />
              <Stat label="Strike step" value={String(live.strikeStep || '—')} />
              <Stat label="ATM (approx)" value={chain ? String(chain.atm) : '—'} />
            </div>
            {chain && (
              <div className="mt-4 rounded-xl border border-line bg-surface-2/60 px-3 py-3 text-xs text-muted">
                Next weekly expiry <span className="font-bold text-ink">{chain.expiry}</span>
                {' · '}
                Put-call ratio <span className="font-bold text-ink">{chain.pcr}</span>
                {' · '}
                {chain.daysToExpiry} day{chain.daysToExpiry === 1 ? '' : 's'} left
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h3 className="font-extrabold">
                {indexKey === 'BANKNIFTY' ? 'Banking movers' : 'Market movers'}
              </h3>
              <Link to="/app/explore" className="text-sm font-bold text-accent">Explore</Link>
            </div>
            <div className="divide-y divide-line">
              {constituents.map((m) => {
                const mUp = m.changePct >= 0
                return (
                  <button
                    key={m.symbol}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-surface-2/70"
                    onClick={() => navigate(`/app/stocks/${m.symbol}`)}
                  >
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-bold">{m.symbol}</div>
                      <div className="truncate text-xs text-muted">{m.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-sm font-semibold">₹{formatINR(m.price)}</div>
                      <div className={`text-xs font-bold ${mUp ? 'text-up' : 'text-down'}`}>
                        {mUp ? '+' : ''}{m.changePct}%
                      </div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>
        </div>
      )}

      {tab === 'chart' && (
        <AdvancedChart
          symbol={indexKey}
          candlesPath={`/market/indices/${indexKey}/candles`}
          live={{ price: live.value, symbol: indexKey }}
        />
      )}

      {tab === 'options' && (
        <OptionChainPanel chain={chain} error={chainError} spot={live.value} />
      )}
    </Screen>
  )
}

function OptionChainPanel({ chain, error, spot }) {
  if (error) {
    return (
      <section className="card p-6 text-center text-sm text-muted">{error}</section>
    )
  }
  if (!chain) {
    return (
      <section className="card grid place-items-center p-10 text-sm text-muted">
        Building option chain…
      </section>
    )
  }

  return (
    <section className="card overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <div>
          <h3 className="font-extrabold">Option chain · {chain.name}</h3>
          <p className="text-xs text-muted">{chain.note}</p>
        </div>
        <div className="flex flex-wrap gap-2 text-xs font-bold">
          <span className="rounded-lg bg-up-bg px-2.5 py-1 text-up">PCR {chain.pcr}</span>
          <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-muted">Expiry {chain.expiry}</span>
          <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-muted">Spot {fmt(spot)}</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-line bg-surface-2/80 text-[10px] font-bold tracking-wide text-muted uppercase">
              <th className="px-3 py-2 text-right" colSpan={4}>Calls (CE)</th>
              <th className="px-3 py-2 text-center">Strike</th>
              <th className="px-3 py-2 text-left" colSpan={4}>Puts (PE)</th>
            </tr>
            <tr className="border-b border-line text-[10px] font-bold text-muted">
              <th className="px-2 py-1.5 text-right">OI</th>
              <th className="px-2 py-1.5 text-right">IV</th>
              <th className="px-2 py-1.5 text-right">Chg</th>
              <th className="px-2 py-1.5 text-right">LTP</th>
              <th className="px-2 py-1.5 text-center"> </th>
              <th className="px-2 py-1.5 text-left">LTP</th>
              <th className="px-2 py-1.5 text-left">Chg</th>
              <th className="px-2 py-1.5 text-left">IV</th>
              <th className="px-2 py-1.5 text-left">OI</th>
            </tr>
          </thead>
          <tbody>
            {chain.rows.map((row) => {
              const ceUp = row.call.change >= 0
              const peUp = row.put.change >= 0
              return (
                <tr
                  key={row.strike}
                  className={`border-b border-line ${row.atm ? 'bg-mint/50' : 'hover:bg-surface-2/50'}`}
                >
                  <td className="px-2 py-1.5 text-right font-mono text-muted">{formatINRShort(row.call.oi)}</td>
                  <td className="px-2 py-1.5 text-right font-mono">{row.call.iv}%</td>
                  <td className={`px-2 py-1.5 text-right font-mono ${ceUp ? 'text-up' : 'text-down'}`}>
                    {ceUp ? '+' : ''}{row.call.change}
                  </td>
                  <td className="px-2 py-1.5 text-right font-mono font-bold">{formatINR(row.call.ltp)}</td>
                  <td className="px-2 py-1.5 text-center">
                    <span className={`inline-block rounded-md px-2 py-0.5 font-mono text-sm font-bold ${row.atm ? 'bg-brand text-white' : 'bg-surface-2'}`}>
                      {row.strike}
                    </span>
                  </td>
                  <td className="px-2 py-1.5 text-left font-mono font-bold">{formatINR(row.put.ltp)}</td>
                  <td className={`px-2 py-1.5 text-left font-mono ${peUp ? 'text-up' : 'text-down'}`}>
                    {peUp ? '+' : ''}{row.put.change}
                  </td>
                  <td className="px-2 py-1.5 text-left font-mono">{row.put.iv}%</td>
                  <td className="px-2 py-1.5 text-left font-mono text-muted">{formatINRShort(row.put.oi)}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function fmt(value) {
  if (value == null || !Number.isFinite(Number(value))) return '—'
  return Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })
}

function Quote({ label, value, tone }) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : ''
  return (
    <div className="px-3 py-2.5">
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${color}`}>{value}</div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded-xl border border-line px-3 py-2.5">
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-0.5 text-sm font-bold">{value}</div>
    </div>
  )
}

function RangeBar({ label, low, high, value, pct }) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[11px] font-bold text-muted">
        <span>{label}</span>
        <span className="font-mono">
          {fmt(low)} — {fmt(high)}
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-2">
        <div
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 rounded-full border-2 border-white bg-brand shadow"
          style={{ left: `calc(${Math.min(100, Math.max(0, pct))}% - 6px)` }}
          title={fmt(value)}
        />
      </div>
    </div>
  )
}
