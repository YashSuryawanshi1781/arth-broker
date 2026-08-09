import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, formatINR, formatINRShort } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { setUser, fetchMe } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { AdvancedChart } from '../components/AdvancedChart'
import { BreadcrumbBar } from '../components/BreadcrumbBar'
import { WatchlistButton } from '../components/WatchlistButton'
import { PriceAlertButton } from '../components/PriceAlertButton'
import { Screen } from '../components/Screen'
import { EmptySearchArt } from '../components/Illustrations'
import { useWatchlist } from '../hooks/useWatchlist'
import {
  IconAlertTriangle,
  IconCandles,
  IconDocument,
  IconList,
  IconPieChart,
  IconShield,
  IconStar,
  IconTrendingDown,
  IconTrendingUp,
} from '../components/Icons'

import { INTRADAY_LEVERAGE } from '../lib/trading'

function computeCharges(value, side, product) {
  const brokerage = product === 'intraday' ? Math.min(20, value * 0.0003) : 0
  const stt = side === 'buy'
    ? (product === 'delivery' ? value * 0.001 : 0)
    : (product === 'delivery' ? value * 0.001 : value * 0.00025)
  const exchange = value * 0.0000297
  const sebi = value * 0.000001
  const stamp = side === 'buy' ? value * (product === 'delivery' ? 0.00015 : 0.00003) : 0
  const gst = (brokerage + exchange + sebi) * 0.18
  const total = brokerage + stt + exchange + sebi + stamp + gst
  return { brokerage, stt, exchange, sebi, stamp, gst, total }
}

export function StockPage() {
  const { symbol } = useParams()
  const sym = symbol?.toUpperCase()
  const live = useAppSelector((s) => s.market.instruments[sym])
  const allInstruments = useAppSelector((s) => s.market.instruments)
  const marketStatus = useAppSelector((s) => s.market.status)
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const watchlist = useWatchlist()

  const [depth, setDepth] = useState({ bids: [], asks: [] })
  const [position, setPosition] = useState(null)
  const [misPosition, setMisPosition] = useState(null)
  const [news, setNews] = useState([])
  const [side, setSide] = useState('buy')
  const [type, setType] = useState('market')
  const [product, setProduct] = useState('delivery')
  const [qty, setQty] = useState(1)
  const [limitPrice, setLimitPrice] = useState('')
  const [busy, setBusy] = useState(false)
  const [tab, setTab] = useState('overview')
  const [showCharges, setShowCharges] = useState(false)
  const [riskPrompt, setRiskPrompt] = useState(null)

  useEffect(() => {
    if (!sym) return undefined
    const tick = () => {
      api(`/market/${sym}/depth`).then(setDepth).catch(() => {})
    }
    tick()
    const t = setInterval(tick, 1500)
    return () => clearInterval(t)
  }, [sym])

  useEffect(() => {
    if (!sym) return
    api('/portfolio/holdings')
      .then((d) => setPosition((d.holdings || []).find((h) => h.symbol === sym) || null))
      .catch(() => {})
    api('/portfolio/positions')
      .then((d) => setMisPosition((d.positions || []).find((h) => h.symbol === sym) || null))
      .catch(() => {})
    api(`/market/news?symbol=${encodeURIComponent(sym)}`)
      .then((d) => setNews(d.news || []))
      .catch(() => {})
  }, [sym, user?.cash])

  useEffect(() => {
    const onKey = (e) => {
      const tag = (e.target?.tagName || '').toLowerCase()
      const editable = tag === 'input' || tag === 'textarea' || tag === 'select' || e.target?.isContentEditable
      if (editable) {
        if (e.key === 'Escape') e.target.blur()
        return
      }
      if (e.key === 'Escape') {
        document.activeElement?.blur?.()
        return
      }
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault()
        setSide('buy')
        document.getElementById('order-qty')?.focus()
      }
      if (e.key === 's' || e.key === 'S') {
        e.preventDefault()
        setSide('sell')
        document.getElementById('order-qty')?.focus()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const peers = useMemo(() => {
    if (!live) return []
    return Object.values(allInstruments)
      .filter((i) => i.sector === live.sector && i.symbol !== live.symbol)
      .sort((a, b) => Math.abs(b.changePct) - Math.abs(a.changePct))
      .slice(0, 5)
  }, [allInstruments, live])

  if (!live) {
    const feedReady = Object.keys(allInstruments).length > 0
    return (
      <Screen theme="stock" className="space-y-4">
        <BreadcrumbBar
          fallback="/app/explore"
          items={[
            { label: 'Explore', to: '/app/explore' },
            { label: sym || '…' },
          ]}
        />
        <div className="card grid place-items-center p-8 text-center">
          <EmptySearchArt accent="#0f766e" width={170} height={128} className={feedReady ? '' : 'animate-pulse'} />
          <p className="font-semibold">{feedReady ? `${sym} not found` : `Loading ${sym}…`}</p>
          <p className="mt-1 text-sm text-muted">
            {feedReady ? 'This symbol is not in the Arth universe.' : 'Waiting for live market feed'}
          </p>
          {feedReady && (
            <Link to="/app/explore" className="btn btn-primary mt-4">Back to Explore</Link>
          )}
        </div>
      </Screen>
    )
  }

  const availableSellQty = product === 'intraday' ? (misPosition?.qty || 0) : (position?.qty || 0)
  const orderPrice = type === 'limit' ? Number(limitPrice) || live.price : live.price
  const orderValue = orderPrice * Number(qty || 0)
  const charges = computeCharges(orderValue, side, product)
  const marginRequired = product === 'intraday' ? orderValue / INTRADAY_LEVERAGE : orderValue

  const learningRisks = () => {
    if (!user?.learningMode || side !== 'buy') return []
    const warnings = []
    const cash = user?.cash || 0
    const spend = marginRequired + charges.total
    if (cash > 0 && spend / cash >= 0.85) {
      warnings.push('This uses most of your practice cash (all-in risk).')
    }
    const holdingValue = (position?.value || 0) + orderValue
    const equity = cash + (position?.value || 0) + orderValue
    if (equity > 0 && holdingValue / equity >= 0.4) {
      warnings.push(`Heavy concentration in ${live.symbol} — diversify when you can.`)
    }
    if (product === 'intraday') {
      warnings.push('MIS positions auto square-off near 15:20 IST in this paper sandbox.')
    }
    return warnings
  }

  const submitOrder = async () => {
    const quantity = Number(qty)
    setBusy(true)
    try {
      const data = await api('/orders', {
        method: 'POST',
        body: {
          symbol: live.symbol,
          side,
          type,
          product,
          qty: quantity,
          price: type === 'limit' ? Number(limitPrice) : undefined,
        },
      })
      if (data.cash != null) dispatch(setUser({ ...user, cash: data.cash }))
      else dispatch(fetchMe())
      dispatch(showToast({
        type: 'success',
        title: data.order.status === 'open' ? 'Limit order placed' : 'Order filled',
        message: `${side.toUpperCase()} ${quantity} ${live.symbol} · ${product}`,
      }))
      api('/portfolio/holdings')
        .then((d) => setPosition((d.holdings || []).find((h) => h.symbol === sym) || null))
        .catch(() => {})
      api('/portfolio/positions')
        .then((d) => setMisPosition((d.positions || []).find((h) => h.symbol === sym) || null))
        .catch(() => {})
      api('/learn/sync', { method: 'POST' }).catch(() => {})
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Order failed', message: err.message || 'Something went wrong' }))
    } finally {
      setBusy(false)
      setRiskPrompt(null)
    }
  }

  const placeOrder = async () => {
    if (!user?.kycComplete) {
      dispatch(showToast({ type: 'warning', title: 'KYC required', message: 'Complete KYC before placing orders' }))
      navigate('/kyc')
      return
    }
    const quantity = Number(qty)
    if (!Number.isInteger(quantity) || quantity <= 0) {
      dispatch(showToast({ type: 'warning', title: 'Invalid quantity', message: 'Enter a whole number greater than 0' }))
      return
    }
    if (type === 'limit' && !(Number(limitPrice) > 0)) {
      dispatch(showToast({ type: 'warning', title: 'Limit price required', message: 'Enter a valid limit price' }))
      return
    }

    const risks = learningRisks()
    if (risks.length) {
      setRiskPrompt(risks)
      return
    }
    await submitOrder()
  }

  const up = live.changePct >= 0
  const shortfall = side === 'buy' ? marginRequired + charges.total - (user?.cash || 0) : 0
  const sellShort = side === 'sell' && Number(qty || 0) > availableSellQty
  const canSubmit = !busy
    && Number.isInteger(Number(qty))
    && Number(qty) > 0
    && (type !== 'limit' || Number(limitPrice) > 0)
    && shortfall <= 0
    && !sellShort

  const dayRangePct = live.high !== live.low
    ? ((live.price - live.low) / (live.high - live.low)) * 100
    : 50
  const week52High = live.week52High || live.high
  const week52Low = live.week52Low || live.low
  const week52Pct = week52High !== week52Low
    ? ((live.price - week52Low) / (week52High - week52Low)) * 100
    : 50

  const bestBid = depth.bids?.[0]?.price || 0
  const bestAsk = depth.asks?.[0]?.price || 0
  const totalBidQty = depth.bids?.reduce((s, b) => s + b.size, 0) || 0
  const totalAskQty = depth.asks?.reduce((s, a) => s + a.size, 0) || 0
  const buyPressure = totalBidQty + totalAskQty
    ? (totalBidQty / (totalBidQty + totalAskQty)) * 100
    : 50

  const sectorHref = live.sector
    ? `/app/explore?sector=${encodeURIComponent(live.sector)}`
    : '/app/explore'

  return (
    <Screen theme="stock" className="stock-workspace">
      <BreadcrumbBar
        fallback={sectorHref}
        items={[
          { label: 'Explore', to: '/app/explore' },
          { label: live.sector || 'Market', to: sectorHref },
          { label: live.symbol },
        ]}
      />

      {/* Groww-style product header: identity + LTP first */}
      <header className="stock-product-head">
        <div className="stock-product-id">
          <div>
            <div className="stock-product-title-row">
              <h1>{live.symbol}</h1>
              <span className="stock-chip">NSE</span>
              <Link to={sectorHref} className="stock-chip stock-chip-link">{live.sector}</Link>
            </div>
            <p className="stock-product-name">{live.name}</p>
          </div>
          <div className="stock-product-actions">
            <WatchlistButton
              symbol={live.symbol}
              watched={watchlist.has(live.symbol)}
              busy={watchlist.busy === live.symbol}
              onToggle={watchlist.toggle}
            />
            <PriceAlertButton symbol={live.symbol} ltp={live.price} />
          </div>
        </div>

        <div className="stock-product-ltp">
          <div className="stock-ltp-value">₹{formatINR(live.price)}</div>
          <div className={`stock-ltp-change ${up ? 'is-up' : 'is-down'}`}>
            {up ? <IconTrendingUp size={15} /> : <IconTrendingDown size={15} />}
            {up ? '+' : ''}{formatINR(live.change)} ({up ? '+' : ''}{live.changePct}%)
            <span className="stock-live-tag">
              <span className="live-dot" />
              {marketStatus?.source === 'yahoo' ? 'Live' : marketStatus?.source === 'yahoo-stale' ? 'Delayed' : 'Demo'}
            </span>
          </div>
        </div>

        <div className="stock-range-row">
          <RangeBar label="Day" low={live.low} high={live.high} pct={dayRangePct} />
          <RangeBar label="52W" low={week52Low} high={week52High} pct={week52Pct} />
        </div>
      </header>

      <div className="stock-layout">
        <div className="stock-main min-w-0">
          <AdvancedChart symbol={live.symbol} live={live} />

          <div className="stock-stats-strip">
            <Quote label="Open" value={`₹${formatINR(live.open)}`} />
            <Quote label="High" value={`₹${formatINR(live.high)}`} tone="up" />
            <Quote label="Low" value={`₹${formatINR(live.low)}`} tone="down" />
            <Quote label="Prev" value={`₹${formatINR(live.prevClose)}`} />
            <Quote label="Vol" value={formatINRShort(live.volume)} />
            <Quote label="Bid" value={bestBid ? `₹${formatINR(bestBid)}` : '—'} tone="up" />
            <Quote label="Ask" value={bestAsk ? `₹${formatINR(bestAsk)}` : '—'} tone="down" />
          </div>

          {news.length > 0 && (
            <div className="stock-news-line">
              <IconDocument size={13} />
              <span>{news[0].title}</span>
              {news[0].source && <em>{news[0].source}</em>}
            </div>
          )}

          <div className="card stock-tabs overflow-hidden">
            <div className="stock-tablist">
              {[
                ['overview', 'Overview', IconCandles],
                ['fundamentals', 'Fundamentals', IconPieChart],
                ['depth', 'Depth', IconList],
                ['about', 'About', IconDocument],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`stock-tab${tab === id ? ' is-active' : ''}`}
                >
                  <Icon size={14} />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-3.5">
              {tab === 'overview' && (
                <div className="space-y-4">
                  <div className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
                    <DetailRow label="Upper circuit" value={`₹${formatINR(live.prevClose * 1.2)}`} />
                    <DetailRow label="Lower circuit" value={`₹${formatINR(live.prevClose * 0.8)}`} />
                    <DetailRow label="Average traded price" value={`₹${formatINR((live.open + live.high + live.low + live.price) / 4)}`} />
                    <DetailRow label="Total traded volume" value={live.volume.toLocaleString('en-IN')} />
                    <DetailRow label="Bid–ask spread" value={bestAsk && bestBid ? `₹${formatINR(bestAsk - bestBid)}` : '—'} />
                    <DetailRow label="Turnover (approx)" value={`₹${formatINRShort(live.volume * live.price)}`} />
                    <DetailRow label="Face value" value={live.faceValue ? `₹${live.faceValue}` : '—'} />
                    <DetailRow label="Lot size" value="1 (equity)" />
                  </div>

                  <div>
                    <div className="mb-2 flex items-center justify-between text-xs font-bold">
                      <span className="text-up">Buyers {buyPressure.toFixed(0)}%</span>
                      <span className="text-muted uppercase">Order book pressure</span>
                      <span className="text-down">Sellers {(100 - buyPressure).toFixed(0)}%</span>
                    </div>
                    <div className="flex h-2 overflow-hidden rounded-full bg-surface-2">
                      <div className="bg-up" style={{ width: `${buyPressure}%` }} />
                    </div>
                  </div>
                </div>
              )}

              {tab === 'fundamentals' && (
                <div className="space-y-4">
                  <div className="grid gap-3 sm:grid-cols-3">
                    <FundamentalCard label="Market cap" value={live.mcap ? `₹${Number(live.mcap).toLocaleString('en-IN')} Cr` : '—'} />
                    <FundamentalCard label="P/E ratio" value={live.pe ? live.pe.toFixed(2) : 'N/A'} />
                    <FundamentalCard label="P/B ratio" value={live.pb ? live.pb.toFixed(2) : '—'} />
                  </div>
                  <div className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
                    <DetailRow label="Earnings per share (EPS)" value={live.eps != null ? `₹${live.eps.toFixed(2)}` : '—'} />
                    <DetailRow label="Return on equity (ROE)" value={live.roe != null ? `${live.roe}%` : '—'} />
                    <DetailRow label="Dividend yield" value={live.divYield != null ? `${live.divYield}%` : '—'} />
                    <DetailRow label="Book value" value={live.pb ? `₹${formatINR(live.price / live.pb)}` : '—'} />
                    <DetailRow label="52 week high" value={`₹${formatINR(week52High)}`} />
                    <DetailRow label="52 week low" value={`₹${formatINR(week52Low)}`} />
                    <DetailRow label="Industry" value={live.industry || live.sector} />
                    <DetailRow label="Face value" value={live.faceValue ? `₹${live.faceValue}` : '—'} />
                  </div>
                  <p className="rounded px-4 py-2.5 text-xs text-muted">
                    Fundamental figures are indicative and provided for demonstration of the platform only.
                  </p>
                </div>
              )}

              {tab === 'depth' && (
                <div>
                  <div className="grid gap-6 sm:grid-cols-2">
                    <div>
                      <div className="mb-2 flex justify-between text-[10px] font-bold tracking-wide text-muted uppercase">
                        <span className="text-up">Bid price</span>
                        <span>Quantity</span>
                      </div>
                      {depth.bids?.slice(0, 10).map((b, i) => (
                        <div key={`b-${b.price}-${i}`} className="relative mb-px grid grid-cols-2 py-1 font-mono text-xs">
                          <div className="absolute inset-y-0 left-0 rounded-sm bg-up/10" style={{ width: `${Math.min(100, (b.size / (totalBidQty || 1)) * 400)}%` }} />
                          <span className="relative font-semibold text-up">{formatINR(b.price)}</span>
                          <span className="relative text-right text-muted">{b.size.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div className="mt-2 flex justify-between border-t border-line pt-2 text-xs font-bold">
                        <span className="text-muted">Total</span>
                        <span className="font-mono text-up">{totalBidQty.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div>
                      <div className="mb-2 flex justify-between text-[10px] font-bold tracking-wide text-muted uppercase">
                        <span>Quantity</span>
                        <span className="text-down">Ask price</span>
                      </div>
                      {depth.asks?.slice(0, 10).map((a, i) => (
                        <div key={`a-${a.price}-${i}`} className="relative mb-px grid grid-cols-2 py-1 font-mono text-xs">
                          <div className="absolute inset-y-0 right-0 rounded-sm bg-down/10" style={{ width: `${Math.min(100, (a.size / (totalAskQty || 1)) * 400)}%` }} />
                          <span className="relative text-muted">{a.size.toLocaleString('en-IN')}</span>
                          <span className="relative text-right font-semibold text-down">{formatINR(a.price)}</span>
                        </div>
                      ))}
                      <div className="mt-2 flex justify-between border-t border-line pt-2 text-xs font-bold">
                        <span className="font-mono text-down">{totalAskQty.toLocaleString('en-IN')}</span>
                        <span className="text-muted">Total</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'about' && (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed text-muted">
                    {live.about || `${live.name} is listed on the National Stock Exchange under the ${live.sector} sector.`}
                  </p>
                  <div className="grid gap-x-6 gap-y-0 sm:grid-cols-2">
                    <DetailRow label="Company" value={live.name} />
                    <DetailRow label="Ticker" value={`${live.symbol} · NSE`} />
                    <DetailRow label="Sector" value={live.sector} />
                    <DetailRow label="Industry" value={live.industry || live.sector} />
                  </div>
                  <p className="rounded-xl border border-line px-3 py-2 text-xs text-muted">
                    Prices on Arth are simulated and stream over Server-Sent Events. They do not represent real
                    exchange data and no real money is involved.
                  </p>
                </div>
              )}
            </div>
          </div>

          {peers.length > 0 && (
            <section className="card overflow-hidden">
              <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
                <h3 className="flex items-center gap-2 font-extrabold">
                  <span className="icon-chip icon-chip-sm">
                    <IconStar size={15} />
                  </span>
                  More from {live.sector}
                </h3>
                <Link to={sectorHref} className="text-sm font-bold text-accent">
                  View all
                </Link>
              </div>
              <div className="divide-y divide-line">
                {peers.map((p) => {
                  const pUp = p.changePct >= 0
                  return (
                    <button
                      key={p.symbol}
                      type="button"
                      className="flex w-full items-center justify-between px-4 py-2.5 text-left transition hover:bg-surface-2/70"
                      onClick={() => navigate(`/app/stocks/${p.symbol}`)}
                    >
                      <div className="min-w-0">
                        <div className="font-mono text-sm font-bold">{p.symbol}</div>
                        <div className="truncate text-xs text-muted">{p.name}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono text-sm font-bold">₹{formatINR(p.price)}</div>
                        <div className={`text-xs font-bold ${pUp ? 'text-up' : 'text-down'}`}>
                          {pUp ? '+' : ''}{p.changePct}%
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </section>
          )}
        </div>

        <div className="stock-ticket">
          {position && (
            <section className="card p-3.5">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-extrabold tracking-tight">Your position</h3>
                <span className="rounded-lg bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">HOLDING</span>
              </div>
              <div className="mt-2.5 grid grid-cols-2 gap-2.5">
                <PositionStat label="Quantity" value={position.qty} />
                <PositionStat label="Avg price" value={`₹${formatINR(position.avgPrice)}`} />
                <PositionStat label="Current value" value={`₹${formatINR(position.qty * live.price)}`} />
                <PositionStat
                  label="P&L"
                  value={`${position.qty * live.price - position.qty * position.avgPrice >= 0 ? '+' : ''}₹${formatINR(position.qty * live.price - position.qty * position.avgPrice)}`}
                  tone={position.qty * live.price - position.qty * position.avgPrice >= 0 ? 'up' : 'down'}
                />
              </div>
            </section>
          )}

          <section id="order-ticket" className="card overflow-hidden">
            <div className="grid grid-cols-2">
              <button
                type="button"
                className={`py-2.5 text-sm font-extrabold tracking-wide transition ${side === 'buy' ? 'bg-up text-white' : 'bg-surface-2 text-muted hover:text-ink'}`}
                onClick={() => setSide('buy')}
              >
                BUY
              </button>
              <button
                type="button"
                className={`py-2.5 text-sm font-extrabold tracking-wide transition ${side === 'sell' ? 'bg-down text-white' : 'bg-surface-2 text-muted hover:text-ink'}`}
                onClick={() => setSide('sell')}
              >
                SELL
              </button>
            </div>

            <div className="space-y-3 p-3.5">
              <Segmented
                label="Product"
                options={[
                  ['delivery', 'Delivery', 'CNC'],
                  ['intraday', 'Intraday', `MIS ${INTRADAY_LEVERAGE}x`],
                ]}
                value={product}
                onChange={setProduct}
              />

              <Segmented
                label="Order type"
                options={[
                  ['market', 'Market', 'At LTP'],
                  ['limit', 'Limit', 'Set price'],
                ]}
                value={type}
                onChange={setType}
              />

              {user?.learningMode && (
                <details className="rounded-xl border border-line bg-surface-2/50 p-3 text-xs">
                  <summary className="cursor-pointer font-bold">Learning tip · Product & order type</summary>
                  <p className="mt-2 text-muted">
                    CNC delivery keeps shares overnight and blocks full cash. MIS intraday uses leverage and should be squared off the same day.
                    Market fills immediately near LTP; Limit waits for your price (buys fill at or below).
                  </p>
                </details>
              )}

              <div>
                <label className="label" htmlFor="order-qty">Quantity</label>
                <div className="flex gap-2">
                  <button type="button" className="btn btn-ghost w-11 shrink-0 px-0" onClick={() => setQty(Math.max(1, Number(qty) - 1))}>−</button>
                  <input
                    id="order-qty"
                    className="field text-center font-mono font-bold"
                    type="number"
                    min={1}
                    step={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                  <button type="button" className="btn btn-ghost w-11 shrink-0 px-0" onClick={() => setQty(Number(qty) + 1)}>+</button>
                </div>
                <div className="mt-2 grid grid-cols-5 gap-1">
                  {[1, 5, 10, 25, 50].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`rounded-lg border py-1 text-[11px] font-bold transition ${Number(qty) === n ? 'border-accent bg-up-bg text-accent' : 'border-line text-muted hover:bg-surface-2'}`}
                      onClick={() => setQty(n)}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>

              {type === 'limit' && (
                <div>
                  <label className="label" htmlFor="limit-price">Limit price</label>
                  <div className="flex items-center gap-2">
                    <input
                      id="limit-price"
                      className="field font-mono"
                      type="number"
                      step="0.05"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder={String(live.price)}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost shrink-0 px-4 text-xs"
                      onClick={() => setLimitPrice(String(live.price))}
                    >
                      LTP
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded-xl border border-line">
                <SummaryRow label="Order value" value={`₹${formatINR(orderValue)}`} />
                <SummaryRow
                  label={product === 'intraday' ? 'Margin required' : 'Amount required'}
                  value={`₹${formatINR(marginRequired)}`}
                  strong
                />
                <button
                  type="button"
                  className="flex w-full items-center justify-between border-t border-line px-3 py-2 text-xs"
                  onClick={() => setShowCharges((v) => !v)}
                >
                  <span className="font-bold text-muted">
                    Estimated charges {showCharges ? '▲' : '▼'}
                  </span>
                  <span className="font-mono font-bold">₹{formatINR(charges.total)}</span>
                </button>
                {showCharges && (
                  <div className="space-y-1.5 border-t border-line px-3 py-2 text-xs">
                    <ChargeLine label="Brokerage" value={charges.brokerage} />
                    <ChargeLine label="STT / CTT" value={charges.stt} />
                    <ChargeLine label="Exchange txn" value={charges.exchange} />
                    <ChargeLine label="SEBI charges" value={charges.sebi} />
                    <ChargeLine label="Stamp duty" value={charges.stamp} />
                    <ChargeLine label="GST (18%)" value={charges.gst} />
                    {user?.learningMode && (
                      <p className="text-muted">
                        STT is a government tax on securities. GST applies on brokerage + exchange fees. These are paper stubs matching demo settlement.
                      </p>
                    )}
                  </div>
                )}
                <div className="flex items-center justify-between border-t border-line px-3 py-2 text-xs">
                  <span className="text-muted">Paper cash</span>
                  <span className="font-mono">₹{formatINR(user?.cash)}</span>
                </div>
              </div>

              {side === 'buy' && shortfall > 0 && (
                <div className="flex items-start gap-2 rounded-xl border border-down/30 bg-down-bg px-3 py-2.5 text-xs">
                  <IconAlertTriangle size={15} className="mt-px shrink-0 text-down" />
                  <span>
                    <span className="font-bold text-down">Insufficient funds. </span>
                    <span className="text-muted">Add ₹{formatINR(shortfall)} to place this order.</span>
                  </span>
                </div>
              )}

              {sellShort && (
                <div className="flex items-start gap-2 rounded-xl border border-down/30 bg-down-bg px-3 py-2.5 text-xs">
                  <IconAlertTriangle size={15} className="mt-px shrink-0 text-down" />
                  <span>
                    <span className="font-bold text-down">Not enough shares. </span>
                    <span className="text-muted">
                      {product === 'intraday' ? 'MIS position' : 'You hold'} {availableSellQty} {live.symbol}.
                    </span>
                  </span>
                </div>
              )}

              {riskPrompt && (
                <div className="space-y-2 rounded-xl border border-gold/30 bg-[#fff6e8] px-3 py-2.5 text-xs">
                  <div className="flex items-start gap-2">
                    <IconAlertTriangle size={15} className="shrink-0 text-gold" />
                    <span className="font-bold">Learning sandbox check</span>
                  </div>
                  <ul className="space-y-1 text-muted" style={{ paddingLeft: '1.1rem', margin: 0 }}>
                    {riskPrompt.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                  <div className="flex items-center gap-2">
                    <button type="button" className="btn btn-ghost text-xs" onClick={() => setRiskPrompt(null)}>Back</button>
                    <button type="button" className="btn btn-primary text-xs" disabled={busy} onClick={submitOrder}>
                      Place anyway
                    </button>
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={!canSubmit}
                className={`btn w-full py-2.5 ${side === 'buy' ? 'btn-up' : 'btn-down'}`}
                onClick={placeOrder}
              >
                {busy ? 'Placing…' : `${side === 'buy' ? 'BUY' : 'SELL'} ${qty} ${live.symbol}`}
              </button>

              <p className="flex items-center justify-center gap-2 text-center text-[10px] text-muted">
                <IconShield size={13} className="text-page-accent" />
                Paper trade · uses practice cash · not real money
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile sticky trade CTA — industry pattern so the ticket isn't buried under the chart */}
      <div className="trade-dock">
        <div className="page flex items-center gap-3 px-4 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="font-mono text-sm font-extrabold">₹{formatINR(live.price)}</div>
            <div className={`text-[11px] font-bold ${up ? 'text-up' : 'text-down'}`}>
              {up ? '+' : ''}{live.changePct}%
            </div>
          </div>
          <button
            type="button"
            className="btn btn-down flex-1 py-2.5"
            onClick={() => {
              setSide('sell')
              document.getElementById('order-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            Sell
          </button>
          <button
            type="button"
            className="btn btn-up flex-1 py-2.5"
            onClick={() => {
              setSide('buy')
              document.getElementById('order-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            Buy
          </button>
        </div>
      </div>
    </Screen>
  )
}

function Quote({ label, value, tone }) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink'
  return (
    <div>
      <div className="text-[10px] font-bold text-muted uppercase">{label}</div>
      <div className={`mt-1 font-mono text-[0.82rem] font-bold ${color}`}>{value}</div>
    </div>
  )
}

function RangeBar({ label, low, high, pct }) {
  const clamped = Math.min(100, Math.max(0, pct))
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-[10px] font-bold tracking-wide text-muted uppercase">
        <span>{label}</span>
      </div>
      <div className="relative h-1.5 rounded-full bg-surface-2">
        <div className="h-full rounded-full bg-gradient-to-r from-down via-gold to-up" style={{ width: '100%' }} />
        <div
          className="absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-ink shadow"
          style={{ left: `${clamped}%` }}
        />
      </div>
      <div className="mt-1.5 flex justify-between font-mono text-[11px] text-muted">
        <span>₹{formatINR(low)}</span>
        <span>₹{formatINR(high)}</span>
      </div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="font-mono font-bold">{value}</span>
    </div>
  )
}

function FundamentalCard({ label, value }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-3">
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1 font-mono text-lg font-bold">{value}</div>
    </div>
  )
}

function PositionStat({ label, value, tone }) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink'
  return (
    <div>
      <div className="text-[10px] font-bold text-muted uppercase">{label}</div>
      <div className={`mt-2 font-mono text-sm font-bold ${color}`}>{value}</div>
    </div>
  )
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="grid grid-cols-2 gap-1 rounded-xl bg-surface-2 p-1">
        {options.map(([id, title, sub]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`rounded-lg px-2 py-1.5 text-center transition ${
              value === id ? 'bg-white shadow-sm' : 'hover:bg-white/60'
            }`}
          >
            <span className={`block text-xs font-bold ${value === id ? 'text-ink' : 'text-muted'}`}>{title}</span>
            <span className="block text-[9px] text-muted">{sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function SummaryRow({ label, value, strong }) {
  return (
    <div className="flex items-center justify-between border-b border-line px-3 py-2 text-xs last:border-0">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${strong ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}

function ChargeLine({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="font-mono">₹{value.toFixed(2)}</span>
    </div>
  )
}
