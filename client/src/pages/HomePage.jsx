import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, formatINR, formatINRShort } from '../lib/api'
import { useAppSelector } from '../app/hooks'
import { useLiveMarket } from '../hooks/useLiveMarket'
import { enrichHoldings, portfolioTotals } from '../lib/livePortfolio'
import { daysUntil, nseSession, sessionChip } from '../lib/marketSession'
import { EmptyState, Screen } from '../components/Screen'
import { Skeleton, SkeletonRows } from '../components/Skeleton'
import { WatchlistButton } from '../components/WatchlistButton'
import { PAGE_THEMES } from '../lib/theme'
import { useWatchlist } from '../hooks/useWatchlist'
import {
  EmptyOrdersArt,
  EmptyPortfolioArt,
  EmptyWatchlistArt,
} from '../components/Illustrations'
import {
  IconArrowRight,
  IconBriefcase,
  IconCandles,
  IconClock,
  IconCoins,
  IconGrid,
  IconList,
  IconPieChart,
  IconPlus,
  IconRocket,
  IconShield,
  IconSparkles,
  IconStar,
  IconTrendingDown,
  IconTrendingUp,
  IconWallet,
} from '../components/Icons'

const SECTOR_COLORS = [
  '#00a878',
  '#16325c',
  '#f59e0b',
  '#6366f1',
  '#06b6d4',
  '#ec4899',
  '#8b5cf6',
  '#64748b',
]

/** Cash sitting idle beyond this share of the portfolio is worth nudging about. */
const IDLE_CASH_MIN = 5000
const IDLE_CASH_SHARE = 0.25

export function HomePage() {
  const user = useAppSelector((s) => s.auth.user)
  const connected = useAppSelector((s) => s.market.connected)
  const navigate = useNavigate()

  const market = useLiveMarket(500)
  const watchlist = useWatchlist()
  const [summary, setSummary] = useState(null)
  const [orders, setOrders] = useState(null)
  const [ipos, setIpos] = useState([])
  const [sips, setSips] = useState([])
  const [mfHoldings, setMfHoldings] = useState([])
  const [moverTab, setMoverTab] = useState('gainers')
  const [intraday, setIntraday] = useState({ series: [], loading: true })
  const [session, setSession] = useState(() => sessionChip())
  const [updatedAt, setUpdatedAt] = useState(() => new Date())

  useEffect(() => {
    api('/portfolio/summary').then(setSummary).catch(() => setSummary({ holdings: [], cash: 0 }))
    api('/orders').then((d) => setOrders(d.orders || [])).catch(() => setOrders([]))
    api('/ipo').then((d) => setIpos((d.ipos || []).filter((i) => i.status === 'open'))).catch(() => {})
    api('/mf/sips').then((d) => setSips(d.sips || [])).catch(() => {})
    api('/mf/holdings').then((d) => setMfHoldings(d.holdings || [])).catch(() => {})
    setUpdatedAt(new Date())
  }, [user?.cash])

  // Re-evaluate the open/closed chip on the minute rather than only on mount.
  useEffect(() => {
    const t = setInterval(() => setSession(sessionChip()), 30000)
    return () => clearInterval(t)
  }, [])

  // Real intraday equity curve: 5-minute candles per holding, summed by qty.
  useEffect(() => {
    if (!summary) return undefined
    const holdings = summary.holdings || []
    if (!holdings.length) {
      setIntraday({ series: [], loading: false })
      return undefined
    }
    let cancelled = false
    setIntraday((s) => ({ ...s, loading: true }))
    Promise.all(
      holdings.map((h) =>
        api(`/market/${h.symbol}/candles?interval=300&count=78`)
          .then((d) => [h.symbol, d.candles || []])
          .catch(() => [h.symbol, []]),
      ),
    ).then((entries) => {
      if (cancelled) return
      setIntraday({ series: buildEquityCurve(holdings, new Map(entries), summary.cash || 0), loading: false })
    })
    return () => {
      cancelled = true
    }
  }, [summary])

  const instrumentList = useMemo(() => Object.values(market.instruments), [market.instruments])

  const movers = useMemo(() => {
    const list = instrumentList.slice()
    if (moverTab === 'gainers') return list.sort((a, b) => b.changePct - a.changePct).slice(0, 6)
    if (moverTab === 'losers') return list.sort((a, b) => a.changePct - b.changePct).slice(0, 6)
    return list.sort((a, b) => b.volume - a.volume).slice(0, 6)
  }, [instrumentList, moverTab])

  const maxMove = useMemo(
    () => Math.max(1, ...movers.map((m) => Math.abs(m.changePct))),
    [movers],
  )

  const breadth = useMemo(() => {
    let advancing = 0
    let declining = 0
    instrumentList.forEach((i) => {
      if (i.changePct > 0) advancing += 1
      else if (i.changePct < 0) declining += 1
    })
    const total = instrumentList.length
    return { advancing, declining, unchanged: total - advancing - declining, total }
  }, [instrumentList])

  const sectorHeat = useMemo(() => {
    const map = new Map()
    instrumentList.forEach((i) => {
      if (!i.sector) return
      const entry = map.get(i.sector) || { sector: i.sector, sum: 0, count: 0, advancing: 0 }
      entry.sum += i.changePct
      entry.count += 1
      if (i.changePct >= 0) entry.advancing += 1
      map.set(i.sector, entry)
    })
    return [...map.values()]
      .map((e) => ({ ...e, avg: e.sum / e.count }))
      .sort((a, b) => b.avg - a.avg)
  }, [instrumentList])

  const indexCards = useMemo(() => Object.entries(market.indices || {}), [market.indices])

  const mfSummary = useMemo(() => {
    const invested = mfHoldings.reduce((s, h) => s + (h.invested || 0), 0)
    const current = mfHoldings.reduce((s, h) => s + (h.value || 0), 0)
    const activeSips = sips.filter((s) => s.status === 'active')
    return {
      invested,
      current,
      pnl: current - invested,
      pnlPct: invested ? ((current - invested) / invested) * 100 : 0,
      funds: mfHoldings.length,
      monthlySip: activeSips.reduce((s, x) => s + x.amount, 0),
      activeSips: activeSips.length,
    }
  }, [mfHoldings, sips])

  const liveHoldings = useMemo(() => {
    if (!summary?.holdings) return []
    return enrichHoldings(summary.holdings, market.instruments).sort((a, b) => b.value - a.value)
  }, [summary, market.instruments])

  const totals = useMemo(
    () => portfolioTotals(liveHoldings, summary?.cash ?? user?.cash ?? 0),
    [liveHoldings, summary?.cash, user?.cash],
  )

  const allocation = useMemo(() => {
    const bySector = new Map()
    liveHoldings.forEach((h) => {
      bySector.set(h.sector, (bySector.get(h.sector) || 0) + h.value)
    })
    const total = [...bySector.values()].reduce((a, b) => a + b, 0)
    if (!total) return []
    return [...bySector.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([sector, value], i) => ({
        sector,
        value,
        pct: (value / total) * 100,
        color: SECTOR_COLORS[i % SECTOR_COLORS.length],
      }))
  }, [liveHoldings])

  const openOrders = useMemo(() => (orders || []).filter((o) => o.status === 'open'), [orders])

  const attention = useMemo(() => {
    const items = []
    if (!user?.kycComplete) {
      items.push({
        key: 'kyc',
        theme: 'kyc',
        icon: IconShield,
        title: 'Finish KYC verification',
        hint: 'Unlocks trading and ₹1,00,000 demo capital',
        cta: 'Continue',
        to: '/kyc',
      })
    }
    if (openOrders.length) {
      items.push({
        key: 'orders',
        theme: 'orders',
        icon: IconClock,
        title: `${openOrders.length} order${openOrders.length > 1 ? 's' : ''} pending`,
        hint: nseSession() === 'open' ? 'Waiting for a matching price' : 'Will queue until the market opens',
        cta: 'Review',
        to: '/app/orders',
      })
    }
    const dueSips = sips.filter((s) => {
      const d = daysUntil(s.nextInstallment)
      return s.status === 'active' && d !== null && d <= 7
    })
    if (dueSips.length) {
      const soonest = Math.min(...dueSips.map((s) => daysUntil(s.nextInstallment)))
      items.push({
        key: 'sip',
        theme: 'mf',
        icon: IconSparkles,
        title: `${dueSips.length} SIP${dueSips.length > 1 ? 's' : ''} due soon`,
        hint: soonest <= 0 ? 'Debits today' : `Next debit in ${soonest} day${soonest > 1 ? 's' : ''}`,
        cta: 'Manage',
        to: '/app/mf?tab=sips',
      })
    }
    if (
      user?.kycComplete &&
      totals.cash >= IDLE_CASH_MIN &&
      (totals.equity === 0 || totals.cash / totals.equity > IDLE_CASH_SHARE)
    ) {
      items.push({
        key: 'idle',
        theme: 'funds',
        icon: IconWallet,
        title: `₹${formatINRShort(totals.cash)} sitting idle`,
        hint: 'Deploy into stocks or start a SIP',
        cta: 'Invest',
        to: '/app/explore',
      })
    }
    return items
  }, [user?.kycComplete, openOrders.length, sips, totals.cash, totals.equity])

  const dayUp = totals.dayPnl >= 0
  const totalUp = totals.pnl >= 0
  const loadingSummary = summary === null
  const hasHoldings = liveHoldings.length > 0

  // Splice the live price tip onto the historical curve so it keeps moving.
  const curve = useMemo(
    () => (intraday.series.length ? [...intraday.series, totals.equity] : []),
    [intraday.series, totals.equity],
  )

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <Screen theme="home" className="stack gap-md">
      {/* Greeting row */}
      <div className="row wrap items-end gap-md">
        <div className="min-">
          <h1 className="text-2xl extrabold">
            {greeting}, {user?.name?.split(' ')[0] || 'Investor'}
          </h1>
          <div className="mt-sm.5 row wrap gap-sm text-sm muted">
            <span className="session-chip" data-tone={session.tone}>
              <span className="dot" />
              {session.label}
              <span className="sep">·</span>
              <span className="detail">{session.detail}</span>
            </span>
            <span className="text-xs">
              {connected ? feedLabel(market.status?.source) : 'Feed offline — showing last known prices'}
              {' · updated '}
              {updatedAt.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
        <div className="row gap-sm">
          <button type="button" className="btn btn-ghost text-sm" onClick={() => navigate('/app/funds')}>
            <IconPlus size={16} />
            Add money
          </button>
          <button type="button" className="btn btn-primary text-sm" onClick={() => navigate('/app/explore')}>
            <IconCandles size={16} />
            Trade now
          </button>
        </div>
      </div>

      {/* Action centre — only rendered when something actually needs the user */}
      {attention.length > 0 && (
        <section>
          <h2 className="mb-sm text-[11px] bold tracking-[0.14em] muted uppercase">Needs your attention</h2>
          <div className="grid gap-md">
            {attention.map((a) => (
              <Link key={a.key} to={a.to} className={`action-tile theme- ${a.theme}`}>
                <span className="icon-chip icon-chip-md">
                  <a.icon size={17} />
                </span>
                <span className="min- grow">
                  <span className="block truncate text-sm bold ink">{a.title}</span>
                  <span className="block truncate text-xs muted">{a.hint}</span>
                </span>
                <span className="row gap-xs text-xs bold text-page-accent">
                  {a.cta}
                  <IconArrowRight size={14} />
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Market pulse: live indices + breadth */}
      <section className="grid gap-md">
        {indexCards.length === 0
          ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-[86px] rounded" />)
          : indexCards.map(([key, idx]) => {
              const up = idx.changePct >= 0
              return (
                <button
                  key={key}
                  type="button"
                  className="index-card w-full"
                  data-tone={up ? 'up' : 'down'}
                  onClick={() => navigate(`/app/indices/${key}`)}
                >
                  <div className="row-between gap-sm">
                    <span className="text-[11px] bold muted uppercase">{idx.name}</span>
                    {up ? (
                      <IconTrendingUp size={15} className="up" />
                    ) : (
                      <IconTrendingDown size={15} className="down" />
                    )}
                  </div>
                  <div className="mt-sm.5 mono text-xl bold">
                    {Number(idx.value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div className={`mt-sm row-between gap-sm text-xs bold ${up ? '' : ''}`}>
                    <span>{up ? '+' : ''}{idx.changePct}% today</span>
                    <span className="bold muted">Chart · Options →</span>
                  </div>
                </button>
              )
            })}

        <div className="index-card" data-tone={breadth.advancing >= breadth.declining ? 'up' : 'down'}>
          <div className="row-between gap-sm">
            <span className="text-[11px] bold muted uppercase">Market breadth</span>
            <span className="text-[11px] bold muted">{breadth.total} stocks</span>
          </div>
          <div className="mt-sm.5 row gap-sm mono text-xl bold">
            <span className="up">{breadth.advancing}</span>
            <span className="text-sm muted">/</span>
            <span className="down">{breadth.declining}</span>
          </div>
          <div className="breadth-bar mt-sm">
            <span style={{ width: `${pctOf(breadth.advancing, breadth.total)}%`, background: 'var(--color-up)' }} />
            <span style={{ width: `${pctOf(breadth.unchanged, breadth.total)}%`, background: 'var(--color-line)' }} />
            <span style={{ width: `${pctOf(breadth.declining, breadth.total)}%`, background: 'var(--color-down)' }} />
          </div>
        </div>
      </section>

      {/* Portfolio hero */}
      <section className="card overflow-hidden">
        <div className="hero-mesh grid gap-xl px-lg page-pad ]">
          <div>
            <p className="text-[11px] bold tracking-[0.16em] uppercase">Portfolio value</p>
            {loadingSummary ? (
              <>
                <Skeleton className="mt-sm.5" />
                <Skeleton className="mt-md" />
              </>
            ) : (
              <>
                <h2 className="mt-sm mono text-4xl bold">₹{formatINR(totals.equity)}</h2>
                <div className="mt-md row wrap gap-sm">
                  <Pill
                    label="Today"
                    value={`${dayUp ? '+' : ''}₹${formatINR(totals.dayPnl)}`}
                    tone={dayUp ? 'up' : 'down'}
                  />
                  <Pill
                    label="Total"
                    value={`${totalUp ? '+' : ''}₹${formatINR(totals.pnl)} (${totals.pnlPct.toFixed(2)}%)`}
                    tone={totalUp ? 'up' : 'down'}
                  />
                </div>
                {hasHoldings && (
                  <p className="mt-md text-xs">
                    {dayUp ? 'Up' : 'Down'} today, driven by{' '}
                    <span className="bold">{topDriver(liveHoldings)}</span>
                  </p>
                )}
              </>
            )}
          </div>
          <div className="row items-end">
            <Sparkline data={curve} loading={intraday.loading && loadingSummary} empty={!hasHoldings} />
          </div>
        </div>

        <div className="grid-2 border-t border">
          <Metric label="Invested" value={`₹${formatINR(totals.invested)}`} loading={loadingSummary} />
          <Metric label="Current value" value={`₹${formatINR(totals.current)}`} loading={loadingSummary} />
          <Metric
            label="Unrealised P&L"
            value={`${totalUp ? '+' : ''}₹${formatINR(totals.pnl)}`}
            tone={totalUp ? 'up' : 'down'}
            loading={loadingSummary}
          />
          <Metric label="Available cash" value={`₹${formatINR(totals.cash)}`} accent loading={loadingSummary} />
        </div>
      </section>

      {/* Quick actions */}
      <section className="grid-2 gap-md">
        {[
          { title: 'Stocks', sub: 'Buy & sell equity', to: '/app/explore', icon: IconCandles, theme: 'explore' },
          { title: 'Mutual funds', sub: 'SIP & lumpsum', to: '/app/mf', icon: IconCoins, theme: 'mf' },
          {
            title: 'IPO',
            sub: ipos.length ? `${ipos.length} open now` : 'None open',
            to: '/app/ipo',
            icon: IconRocket,
            theme: 'ipo',
          },
          {
            title: 'Orders',
            sub: openOrders.length ? `${openOrders.length} pending` : `${(orders || []).length} placed`,
            to: '/app/orders',
            icon: IconList,
            theme: 'orders',
          },
        ].map((q) => (
          <Link
            key={q.to}
            to={q.to}
            className={`card card-hover tile-accent theme- ${q.theme} row gap-md p-md.5`}
          >
            <span className="icon-chip">
              <q.icon size={18} />
            </span>
            <span className="min-">
              <span className="block truncate text-sm bold ink">{q.title}</span>
              <span className="block truncate text-xs muted">{q.sub}</span>
            </span>
          </Link>
        ))}
      </section>

      <div className="grid gap-lg ]">
        <div className="stack gap-md">
          {/* Holdings */}
          <section className="card overflow-hidden">
            <div className="row-between border-b border px-lg py-md">
              <SectionTitle icon={IconBriefcase} theme="investments">Your holdings</SectionTitle>
              {hasHoldings && (
                <Link to="/app/investments" className="text-sm bold accent">
                  View all ({liveHoldings.length})
                </Link>
              )}
            </div>
            {loadingSummary ? (
              <SkeletonRows rows={4} />
            ) : !hasHoldings ? (
              <EmptyState
                art={EmptyPortfolioArt}
                accent={PAGE_THEMES.home.accent}
                title="No holdings yet"
                message="Buy your first stock to start tracking performance here."
                action={
                  <button type="button" className="btn btn-primary text-sm" onClick={() => navigate('/app/explore')}>
                    <IconCandles size={16} />
                    Explore stocks
                  </button>
                }
              />
            ) : (
              <div className="">
                {liveHoldings.slice(0, 5).map((h) => {
                  const up = h.pnl >= 0
                  return (
                    <button
                      key={h.symbol}
                      type="button"
                      className="grid w-full grid-cols-[1.4fr_1fr_1fr] px-lg py-md"
                      onClick={() => navigate(`/app/stocks/${h.symbol}`)}
                    >
                      <div className="min-">
                        <div className="mono text-sm bold">{h.symbol}</div>
                        <div className="truncate text-xs muted">
                          {h.qty} qty · avg ₹{formatINR(h.avgPrice)}
                        </div>
                      </div>
                      <div className="right">
                        <div className="mono text-sm bold">₹{formatINR(h.value)}</div>
                        <div className="text-xs muted">LTP ₹{formatINR(h.ltp)}</div>
                      </div>
                      <div className="right">
                        <div className={`mono text-sm bold ${up ? '' : ''}`}>
                          {up ? '+' : ''}₹{formatINR(h.pnl)}
                        </div>
                        <div className={`text-xs bold ${up ? '' : ''}`}>
                          {up ? '+' : ''}{h.pnlPct.toFixed(2)}%
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </section>

          {/* Market movers */}
          <section className="card overflow-hidden">
            <div className="row wrap gap-sm border-b border px-lg py-md">
              <SectionTitle icon={IconTrendingUp} theme="explore">Market movers</SectionTitle>
              <div className="row gap-xs rounded p-1">
                {[
                  ['gainers', 'Gainers'],
                  ['losers', 'Losers'],
                  ['active', 'Most active'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setMoverTab(id)}
                    className={`rounded py-md text-xs bold ${ moverTab === id ? 'bg-white text-ink shadow-sm' : 'text-muted' }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="">
              {movers.map((m) => {
                const up = m.changePct >= 0
                const Trend = up ? IconTrendingUp : IconTrendingDown
                return (
                  <button
                    key={m.symbol}
                    type="button"
                    className="grid w-full grid-cols-[1.6fr_1fr_0.9fr] px-lg py-md"
                    onClick={() => navigate(`/app/stocks/${m.symbol}`)}
                  >
                    <div className="min-">
                      <div className="mono text-sm bold">{m.symbol}</div>
                      <div className="truncate text-xs muted">{m.name}</div>
                      <div className="mt-sm.5 w-full overflow-hidden rounded">
                        <div
                          className={`h-full rounded ${up ? 'bg-up' : ''}`}
                          style={{ width: `${(Math.abs(m.changePct) / maxMove) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div className="right mono text-sm bold">₹{formatINR(m.price)}</div>
                    <div className="right">
                      <span
                        className={`gap-xs rounded px-lg py-md text-xs bold ${ up ? ' ' : '-bg ' }`}
                      >
                        <Trend size={12} />
                        {up ? '+' : ''}{m.changePct}%
                      </span>
                    </div>
                  </button>
                )
              })}
              {movers.length === 0 && <SkeletonRows rows={6} />}
            </div>
          </section>

          {/* Recent activity */}
          <section className="card overflow-hidden">
            <div className="row-between border-b border px-lg py-md">
              <SectionTitle icon={IconClock} theme="orders">Recent activity</SectionTitle>
              <Link to="/app/orders" className="text-sm bold accent">History</Link>
            </div>
            {orders === null ? (
              <SkeletonRows rows={4} />
            ) : (
              <div className="">
                {orders.slice(0, 5).map((o) => (
                  <div key={o.id} className="grid grid-cols-[1.4fr_1fr_1fr] px-lg py-md">
                    <div className="min-">
                      <div className="text-sm bold">
                        <span className={o.side === 'buy' ? 'up' : 'down'}>
                          {o.side.toUpperCase()}
                        </span>{' '}
                        <span className="mono">{o.symbol}</span>
                      </div>
                      <div className="text-xs muted">
                        {o.qty} qty · {new Date(o.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </div>
                    </div>
                    <div className="right">
                      <div className="mono text-sm">₹{formatINR(o.fillPrice || o.price || 0)}</div>
                      <div className="text-xs muted">
                        {new Date(o.createdAt).toLocaleTimeString('en-IN', { hour12: false })}
                      </div>
                    </div>
                    <div className="right">
                      <span
                        className={`inline-block rounded px-lg py-md text-[11px] bold capitalize ${ o.status === 'filled' ? ' ' : o.status === 'cancelled' || o.status === 'rejected' ? '-bg ' : ' text-muted' }`}
                      >
                        {o.status}
                      </span>
                    </div>
                  </div>
                ))}
                {orders.length === 0 && (
                  <EmptyState
                    compact
                    art={EmptyOrdersArt}
                    accent={PAGE_THEMES.orders.accent}
                    title="No orders yet"
                    message="Every buy and sell you place shows up here."
                  />
                )}
              </div>
            )}
          </section>
        </div>

        <div className="stack gap-md">
          {/* Allocation */}
          <section className="card p-lg">
            <div className="mb-md">
              <SectionTitle icon={IconPieChart} theme="investments">Asset allocation</SectionTitle>
            </div>
            {allocation.length === 0 ? (
              <p className="text-sm muted">Allocation appears once you hold stocks.</p>
            ) : (
              <>
                <div className="row gap-lg">
                  <Donut segments={allocation} />
                  <div className="min- grow stack gap-md.5">
                    {allocation.slice(0, 5).map((a) => (
                      <div key={a.sector} className="row gap-sm text-xs">
                        <span className=".5 shrink-0 rounded" style={{ background: a.color }} />
                        <span className="min- grow truncate bold">{a.sector}</span>
                        <span className="mono muted">{a.pct.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                {allocation[0]?.pct > 40 && (
                  <p className="mt-md rounded py-md text-xs muted">
                    <span className="bold ink">{allocation[0].pct.toFixed(0)}%</span> of your equity sits in{' '}
                    {allocation[0].sector}. Spreading across sectors lowers concentration risk.
                  </p>
                )}
              </>
            )}
          </section>

          {/* Mutual funds */}
          <section className="card p-lg theme-mf">
            <div className="mb-md row-between">
              <SectionTitle icon={IconCoins} theme="mf">Mutual funds</SectionTitle>
              <Link to="/app/mf" className="text-sm bold text-page-accent">
                {mfSummary.funds > 0 ? 'Manage' : 'Explore'}
              </Link>
            </div>
            {mfSummary.funds === 0 ? (
              <div className="rounded bg-page-tint px-lg py-md text-xs muted">
                Start a SIP from ₹100 a month and build wealth on autopilot.
              </div>
            ) : (
              <>
                <div className="row items-end gap-md">
                  <div>
                    <div className="text-[10px] bold muted uppercase">Current value</div>
                    <div className="mono text-xl bold">₹{formatINR(mfSummary.current)}</div>
                  </div>
                  <div
                    className={`right text-sm bold ${mfSummary.pnl >= 0 ? '' : ''}`}
                  >
                    {mfSummary.pnl >= 0 ? '+' : ''}₹{formatINR(mfSummary.pnl)}
                    <div className="text-xs">
                      {mfSummary.pnl >= 0 ? '+' : ''}{mfSummary.pnlPct.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="mt-md grid-3 gap-sm border-t border center">
                  <MiniStat label="Invested" value={`₹${formatINRShort(mfSummary.invested)}`} />
                  <MiniStat label="Funds" value={String(mfSummary.funds)} />
                  <MiniStat
                    label="Monthly SIP"
                    value={mfSummary.monthlySip ? `₹${formatINRShort(mfSummary.monthlySip)}` : '—'}
                  />
                </div>
              </>
            )}
          </section>

          {/* Watchlist */}
          <section className="card overflow-hidden">
            <div className="row-between border-b border px-lg py-md">
              <SectionTitle icon={IconStar} theme="explore">Watchlist</SectionTitle>
              <Link to="/app/explore" className="text-sm bold accent">Edit</Link>
            </div>
            {watchlist.ready === false ? (
              <SkeletonRows rows={4} />
            ) : (
              <div className="">
                {watchlist.symbols.slice(0, 8).map((sym) => {
                  const inst = market.instruments[sym]
                  if (!inst) {
                    return (
                      <div key={sym} className="row-between px-lg py-md">
                        <div className="mono text-sm bold muted">{sym}</div>
                        <WatchlistButton
                          compact
                          symbol={sym}
                          watched
                          busy={watchlist.busy === sym}
                          onToggle={watchlist.toggle}
                        />
                      </div>
                    )
                  }
                  const up = inst.changePct >= 0
                  return (
                    <div
                      key={sym}
                      className="row w-full gap-sm px-lg py-md"
                    >
                      <WatchlistButton
                        compact
                        symbol={sym}
                        watched
                        busy={watchlist.busy === sym}
                        onToggle={watchlist.toggle}
                      />
                      <button
                        type="button"
                        className="row min- grow"
                        onClick={() => navigate(`/app/stocks/${sym}`)}
                      >
                        <div className="min-">
                          <div className="mono text-sm bold">{inst.symbol}</div>
                          <div className="truncate text-xs muted">Vol {formatINRShort(inst.volume)}</div>
                        </div>
                        <div className="right">
                          <div className="mono text-sm bold">₹{formatINR(inst.price)}</div>
                          <div className={`text-xs bold ${up ? '' : ''}`}>
                            {up ? '+' : ''}{inst.changePct}%
                          </div>
                        </div>
                      </button>
                    </div>
                  )
                })}
                {watchlist.symbols.length === 0 && (
                  <EmptyState
                    compact
                    art={EmptyWatchlistArt}
                    accent={PAGE_THEMES.explore.accent}
                    title="Watchlist is empty"
                    message="Tap ★ on Explore or a stock page to pin symbols here."
                    action={
                      <button type="button" className="btn btn-primary text-sm" onClick={() => navigate('/app/explore')}>
                        Browse stocks
                      </button>
                    }
                  />
                )}
              </div>
            )}
          </section>

          {/* IPOs */}
          {ipos.length > 0 && (
            <section className="card p-lg">
              <div className="mb-md row-between">
                <SectionTitle icon={IconRocket} theme="ipo">IPOs open now</SectionTitle>
                <Link to="/app/ipo" className="text-sm bold accent">See all</Link>
              </div>
              <div className="stack gap-md">
                {ipos.slice(0, 2).map((ipo) => (
                  <Link
                    key={ipo.id}
                    to="/app/ipo"
                    className="row-between rounded border px-lg py-md"
                  >
                    <div className="min-">
                      <div className="truncate text-sm bold">{ipo.name}</div>
                      <div className="text-xs muted">
                        ₹{ipo.priceMin}–{ipo.priceMax} · Lot {ipo.lotSize}
                      </div>
                    </div>
                    <span className="rounded px-lg py-md text-xs bold up">
                      GMP ₹{ipo.gmp}
                    </span>
                  </Link>
                ))}
              </div>
            </section>
          )}

        </div>
      </div>

      {/* Sector heatmap */}
      <section className="card p-lg">
        <div className="mb-md row wrap gap-sm">
          <SectionTitle icon={IconGrid} theme="explore">Sector heatmap</SectionTitle>
          <span className="text-xs muted">Average move across {instrumentList.length} stocks · tap to filter</span>
        </div>
        {sectorHeat.length === 0 ? (
          <div className="heat-grid">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="h-[4.4rem] rounded" />
            ))}
          </div>
        ) : (
          <div className="heat-grid">
            {sectorHeat.map((s) => {
              const up = s.avg >= 0
              return (
                <Link
                  key={s.sector}
                  to={`/app/heatmap?sector=${encodeURIComponent(s.sector)}`}
                  className="heat-tile"
                  style={{ background: heatTint(s.avg) }}
                >
                  <span className="truncate text-xs bold ink">{s.sector}</span>
                  <span>
                    <span className={`block mono text-sm bold ${up ? '' : ''}`}>
                      {up ? '+' : ''}{s.avg.toFixed(2)}%
                    </span>
                    <span className="block text-[10px] bold muted">
                      {s.advancing}/{s.count} up
                    </span>
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </Screen>
  )
}

const pctOf = (part, total) => (total ? (part / total) * 100 : 0)

/** Red-to-green wash whose opacity scales with the size of the move. */
function heatTint(pct) {
  const intensity = Math.min(1, Math.abs(pct) / 2.5)
  const alpha = (0.08 + intensity * 0.42).toFixed(3)
  return pct >= 0 ? `rgba(0, 168, 120, ${alpha})` : `rgba(229, 72, 77, ${alpha})`
}

function feedLabel(source) {
  if (source === 'yahoo') return 'Live Yahoo feed'
  if (source === 'yahoo-stale') return 'Yahoo feed delayed'
  return 'Demo market feed'
}

/** Holding with the biggest absolute contribution to today's move. */
function topDriver(holdings) {
  const best = holdings.reduce(
    (acc, h) => (Math.abs(h.dayPnl ?? 0) > Math.abs(acc?.dayPnl ?? 0) ? h : acc),
    null,
  )
  return best?.symbol || holdings[0]?.symbol || '—'
}

/**
 * Sums qty × close across every holding, index-aligned from the end so symbols
 * with different candle counts still line up on the most recent bars.
 */
function buildEquityCurve(holdings, candlesBySymbol, cash) {
  const lengths = holdings.map((h) => candlesBySymbol.get(h.symbol)?.length || 0)
  const n = Math.min(...lengths)
  if (!n || !Number.isFinite(n)) return []
  const out = []
  for (let i = 0; i < n; i += 1) {
    let value = cash
    for (const h of holdings) {
      const candles = candlesBySymbol.get(h.symbol)
      value += (candles[candles.length - n + i]?.close ?? 0) * h.qty
    }
    out.push(value)
  }
  return out
}

function SectionTitle({ icon: Icon, theme, children }) {
  return (
    <h3 className={`flex items-center gap-2 font-extrabold tracking-tight ${theme ? `theme-${theme}` : ''}`}>
      <span className="icon-chip icon-chip-sm">
        <Icon size={15} />
      </span>
      {children}
    </h3>
  )
}

function MiniStat({ label, value }) {
  return (
    <div>
      <div className="text-[10px] bold muted uppercase">{label}</div>
      <div className="mt-sm mono text-sm bold">{value}</div>
    </div>
  )
}

function Pill({ label, value, tone }) {
  const color = tone === 'up' ? 'text-[#7dffc8]' : 'text-[#ff9d9d]'
  return (
    <span className="rounded border px-lg text-xs">
      <span className="">{label} </span>
      <span className={`mono bold ${color}`}>{value}</span>
    </span>
  )
}

function Metric({ label, value, tone, accent, loading }) {
  const color = tone === 'up' ? 'up' : tone === 'down' ? 'down' : accent ? 'text-accent' : ''
  return (
    <div className="border-b border px-lg py-md">
      <div className="text-[10px] bold muted uppercase">{label}</div>
      {loading ? (
        <Skeleton className="mt-sm.5 .5" />
      ) : (
        <div className={`mt-sm mono text-sm bold ${color}`}>{value}</div>
      )}
    </div>
  )
}

function Sparkline({ data, loading, empty }) {
  if (loading) {
    return <Skeleton className="w-full" />
  }
  if (empty || !data || data.length < 2) {
    return (
      <div className="grid w-full rounded border border-dashed px-lg center text-xs">
        {empty ? 'Your equity curve appears after your first buy' : 'Building curve…'}
      </div>
    )
  }

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const width = 260
  const height = 112
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * (height - 8) - 4
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })
  const up = data[data.length - 1] >= data[0]
  const stroke = up ? '#7dffc8' : '#ff9d9d'
  const [lastX, lastY] = points[points.length - 1].split(',')

  return (
    <div className="w-full">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" preserveAspectRatio="none">
        <polyline
          points={`0,${height} ${points.join(' ')} ${width},${height}`}
          fill={up ? 'rgba(125,255,200,0.14)' : 'rgba(255,157,157,0.14)'}
          stroke="none"
        />
        <polyline points={points.join(' ')} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
        <circle cx={lastX} cy={lastY} r="3" fill={stroke} />
      </svg>
      <div className="mt-sm row-between text-[10px] bold uppercase">
        <span>Intraday · 5 min</span>
        <span className="mono normal-case">
          ₹{formatINRShort(min)} – ₹{formatINRShort(max)}
        </span>
      </div>
    </div>
  )
}

function Donut({ segments }) {
  let acc = 0
  const stops = segments
    .map((s) => {
      const start = acc
      acc += s.pct
      return `${s.color} ${start.toFixed(2)}% ${acc.toFixed(2)}%`
    })
    .join(', ')

  return (
    <div
      className="relative shrink-0 rounded"
      style={{ background: `conic-gradient(${stops})` }}
    >
      <div className="absolute inset-[22%] grid rounded">
        <span className="text-[10px] bold muted">{segments.length}</span>
      </div>
    </div>
  )
}
