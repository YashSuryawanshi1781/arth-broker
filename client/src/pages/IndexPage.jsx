import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { api, formatINR, formatINRShort } from '../lib/api'
import { useAppSelector } from '../app/hooks'
import { useLiveMarket } from '../hooks/useLiveMarket'
import { AdvancedChart } from '../components/AdvancedChart'
import { BreadcrumbBar } from '../components/BreadcrumbBar'
import { PriceAlertButton } from '../components/PriceAlertButton'
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
      <Screen theme="explore" className="stack gap-md">
        <BreadcrumbBar
          fallback="/app"
          items={[
            { label: 'Home', to: '/app' },
            { label: indexKey || 'Index' },
          ]}
        />
        <div className="card grid p-8 center">
          <EmptySearchArt accent="#2563eb" width={170} height={128} className="" />
          <p className="bold">Loading {indexKey}…</p>
          <p className="mt-sm text-sm muted">Waiting for live index feed</p>
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
    <Screen theme="explore" className="stack gap-md">
      <BreadcrumbBar
        fallback="/app"
        items={[
          { label: 'Home', to: '/app' },
          { label: 'Indices', to: '/app' },
          { label: live.name || indexKey },
        ]}
      />

      <section className="card overflow-hidden">
        <div className="row wrap gap-lg p-lg">
          <div className="row gap-md">
            <span className="grid shrink-0 rounded text-xs extrabold">
              {indexKey.slice(0, 3)}
            </span>
            <div>
              <div className="row wrap gap-sm">
                <h1 className="text-2xl extrabold">{live.name}</h1>
                <span className="rounded border text-[10px] bold muted">
                  {live.exchange || 'NSE'}
                </span>
                <span className="rounded px-lg text-[11px] bold muted">Index</span>
              </div>
              <p className="mt-sm text-sm muted">
                Lot size {live.lotSize || '—'} · Strike step {live.strikeStep || '—'}
              </p>
            </div>
          </div>

          <div className="right">
            <div className="mb-sm row-end gap-sm wrap">
              <PriceAlertButton symbol={indexKey} ltp={live.value} />
              <span className="live-dot" />
              <span className="text-xs bold accent uppercase">
                {marketStatus?.source === 'yahoo' ? 'Yahoo Finance' : 'Demo'}
              </span>
            </div>
            <div className="mono text-3xl bold">
              {Number(live.value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
            </div>
            <div className={`row-end gap-xs text-sm bold ${up ? '' : ''}`}>
              {up ? <IconTrendingUp size={15} /> : <IconTrendingDown size={15} />}
              {up ? '+' : ''}{formatINR(live.change || 0)} ({up ? '+' : ''}{live.changePct}%)
            </div>
          </div>
        </div>

        <div className="grid-2 border-t border">
          <Quote label="Open" value={fmt(live.open)} />
          <Quote label="High" value={fmt(live.high)} tone="up" />
          <Quote label="Low" value={fmt(live.low)} tone="down" />
          <Quote label="Prev close" value={fmt(live.prevClose)} />
          <Quote label="Day change" value={`${up ? '+' : ''}${live.changePct}%`} tone={up ? 'up' : 'down'} />
          <Quote label="Volume" value={live.volume ? formatINRShort(live.volume) : '—'} />
        </div>

        <div className="border-t border p-lg">
          <RangeBar label="Day range" low={live.low} high={live.high} value={live.value} pct={dayRangePct} />
        </div>

        <div className="row wrap gap-sm border-t border /40 px-lg py-md">
          <button type="button" className="btn btn-primary text-sm" onClick={() => setTab('chart')}>
            <IconCandles size={16} />
            Open chart
          </button>
          <button type="button" className="btn btn-ghost text-sm" onClick={() => setTab('options')}>
            <IconList size={16} />
            Open option chain
          </button>
          {chain && (
            <span className="ml-auto text-xs muted">
              Expiry {chain.expiry} · PCR {chain.pcr} · Lot {chain.lotSize}
            </span>
          )}
        </div>
      </section>

      <nav className="row gap-xs overflow-auto rounded border p-1">
        {TABS.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={`row gap-sm rounded px-lg py-md text-sm bold ${ tab === id ? 'bg-brand text-white shadow-sm' : 'text-muted hover:' }`}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {tab === 'overview' && (
        <div className="grid gap-lg ]">
          <section className="card p-lg">
            <h3 className="mb-sm extrabold">About this index</h3>
            <p className="text-sm leading-relaxed muted">
              {live.about || `${live.name} is a major Indian market index.`}
            </p>
            <div className="mt-lg grid-2 gap-md">
              <Stat label="Exchange" value={live.exchange || '—'} />
              <Stat label="Lot size" value={String(live.lotSize || '—')} />
              <Stat label="Strike step" value={String(live.strikeStep || '—')} />
              <Stat label="ATM (approx)" value={chain ? String(chain.atm) : '—'} />
            </div>
            {chain && (
              <div className="mt-lg rounded border /60 px-lg py-md text-xs muted">
                Next weekly expiry <span className="bold ink">{chain.expiry}</span>
                {' · '}
                Put-call ratio <span className="bold ink">{chain.pcr}</span>
                {' · '}
                {chain.daysToExpiry} day{chain.daysToExpiry === 1 ? '' : 's'} left
              </div>
            )}
          </section>

          <section className="card overflow-hidden">
            <div className="row-between border-b border px-lg py-md">
              <h3 className="extrabold">
                {indexKey === 'BANKNIFTY' ? 'Banking movers' : 'Market movers'}
              </h3>
              <Link to="/app/explore" className="text-sm bold accent">Explore</Link>
            </div>
            <div className="">
              {constituents.map((m) => {
                const mUp = m.changePct >= 0
                return (
                  <button
                    key={m.symbol}
                    type="button"
                    className="row w-full px-lg py-md"
                    onClick={() => navigate(`/app/stocks/${m.symbol}`)}
                  >
                    <div className="min-">
                      <div className="mono text-sm bold">{m.symbol}</div>
                      <div className="truncate text-xs muted">{m.name}</div>
                    </div>
                    <div className="right">
                      <div className="mono text-sm bold">₹{formatINR(m.price)}</div>
                      <div className={`text-xs bold ${mUp ? '' : ''}`}>
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
      <section className="card p-xl center text-sm muted">{error}</section>
    )
  }
  if (!chain) {
    return (
      <section className="card grid p-10 text-sm muted">
        Building option chain…
      </section>
    )
  }

  return (
    <section className="card overflow-hidden">
      <div className="row wrap gap-sm border-b border px-lg py-md">
        <div>
          <h3 className="extrabold">Option chain · {chain.name}</h3>
          <p className="text-xs muted">{chain.note}</p>
        </div>
        <div className="row wrap gap-sm text-xs bold">
          <span className="rounded py-md up">PCR {chain.pcr}</span>
          <span className="rounded py-md muted">Expiry {chain.expiry}</span>
          <span className="rounded py-md muted">Spot {fmt(spot)}</span>
        </div>
      </div>

      <div className="overflow-auto">
        <table className="w-full w-[720px] text-xs">
          <thead>
            <tr className="border-b border /80 text-[10px] bold muted uppercase">
              <th className="px-lg py-md right" colSpan={4}>Calls (CE)</th>
              <th className="px-lg py-md center">Strike</th>
              <th className="px-lg py-md" colSpan={4}>Puts (PE)</th>
            </tr>
            <tr className="border-b border text-[10px] bold muted">
              <th className="px-lg right">OI</th>
              <th className="px-lg right">IV</th>
              <th className="px-lg right">Chg</th>
              <th className="px-lg right">LTP</th>
              <th className="px-lg center"> </th>
              <th className="px-lg">LTP</th>
              <th className="px-lg">Chg</th>
              <th className="px-lg">IV</th>
              <th className="px-lg">OI</th>
            </tr>
          </thead>
          <tbody>
            {chain.rows.map((row) => {
              const ceUp = row.call.change >= 0
              const peUp = row.put.change >= 0
              return (
                <tr
                  key={row.strike}
                  className={`border-b border ${row.atm ? 'bg-mint' : 'hover:'}`}
                >
                  <td className="px-lg right mono muted">{formatINRShort(row.call.oi)}</td>
                  <td className="px-lg right mono">{row.call.iv}%</td>
                  <td className={`px-lg right mono ${ceUp ? '' : ''}`}>
                    {ceUp ? '+' : ''}{row.call.change}
                  </td>
                  <td className="px-lg right mono bold">{formatINR(row.call.ltp)}</td>
                  <td className="px-lg center">
                    <span className={`inline-block rounded px-lg mono text-sm bold ${row.atm ? 'bg-brand text-white' : ''}`}>
                      {row.strike}
                    </span>
                  </td>
                  <td className="px-lg mono bold">{formatINR(row.put.ltp)}</td>
                  <td className={`px-lg mono ${peUp ? '' : ''}`}>
                    {peUp ? '+' : ''}{row.put.change}
                  </td>
                  <td className="px-lg mono">{row.put.iv}%</td>
                  <td className="px-lg mono muted">{formatINRShort(row.put.oi)}</td>
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
  const color = tone === 'up' ? 'up' : tone === 'down' ? 'down' : ''
  return (
    <div className="px-lg py-md">
      <div className="text-[10px] bold muted uppercase">{label}</div>
      <div className={`mt-sm mono text-sm bold ${color}`}>{value}</div>
    </div>
  )
}

function Stat({ label, value }) {
  return (
    <div className="rounded border px-lg py-md">
      <div className="text-[10px] bold muted uppercase">{label}</div>
      <div className="mt-sm text-sm bold">{value}</div>
    </div>
  )
}

function RangeBar({ label, low, high, value, pct }) {
  return (
    <div>
      <div className="mb-sm.5 row-between text-[11px] bold muted">
        <span>{label}</span>
        <span className="mono">
          {fmt(low)} — {fmt(high)}
        </span>
      </div>
      <div className="relative .5 rounded">
        <div
          className="absolute /2 -translate-y-1 rounded border-2 border-white shadow"
          style={{ left: `calc(${Math.min(100, Math.max(0, pct))}% - 6px)` }}
          title={fmt(value)}
        />
      </div>
    </div>
  )
}
