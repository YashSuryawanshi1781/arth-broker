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
      <Screen theme="stock" className="stack gap-md">
        <BreadcrumbBar
          fallback="/app/explore"
          items={[
            { label: 'Explore', to: '/app/explore' },
            { label: sym || '…' },
          ]}
        />
        <div className="card grid p-8 center">
          <EmptySearchArt accent="#0f766e" width={170} height={128} className={feedReady ? '' : 'animate-pulse'} />
          <p className="bold">{feedReady ? `${sym} not found` : `Loading ${sym}…`}</p>
          <p className="mt-sm text-sm muted">
            {feedReady ? 'This symbol is not in the Arth universe.' : 'Waiting for live market feed'}
          </p>
          {feedReady && (
            <Link to="/app/explore" className="btn btn-primary mt-lg">Back to Explore</Link>
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
    <Screen theme="stock" className="stack gap-md">
      <BreadcrumbBar
        fallback={sectorHref}
        items={[
          { label: 'Explore', to: '/app/explore' },
          { label: live.sector || 'Market', to: sectorHref },
          { label: live.symbol },
        ]}
      />

      {news.length > 0 && (
        <section className="card px-lg py-md">
          <div className="row gap-sm mb-sm">
            <IconDocument size={14} />
            <span className="text-xs bold uppercase muted">News · demo feed</span>
          </div>
          <div className="stack gap-sm">
            {news.slice(0, 3).map((item) => (
              <div key={item.id || item.title} className="text-xs">
                <span className="bold ink">{item.title}</span>
                {item.source && <span className="muted"> — {item.source}</span>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Instrument header */}
      <section className="card overflow-hidden">
        <div className="row flex-wrap gap-lg p-lg">
          <div className="row gap-md">
            <span className="grid shrink-0 rounded text-md extrabold">
              {live.symbol.slice(0, 2)}
            </span>
            <div>
              <div className="row flex-wrap gap-sm">
                <h1 className="mono text-2xl extrabold">{live.symbol}</h1>
                <span className="rounded border text-[10px] bold muted">NSE</span>
                <Link
                  to={sectorHref}
                  className="rounded px-lg text-[11px] bold muted"
                >
                  {live.sector}
                </Link>
              </div>
              <p className="mt-sm text-sm muted">{live.name}</p>
              <p className="mt-sm text-[11px] muted">{live.industry || live.sector}</p>
            </div>
          </div>

          <div className="right">
            <div className="mb-sm row-end gap-sm flex-wrap">
              <WatchlistButton
                symbol={live.symbol}
                watched={watchlist.has(live.symbol)}
                busy={watchlist.busy === live.symbol}
                onToggle={watchlist.toggle}
              />
              <PriceAlertButton symbol={live.symbol} ltp={live.price} />
              <span className="live-dot" />
              <span className="text-xs bold accent uppercase">
                {marketStatus?.source === 'yahoo' ? 'Yahoo Finance' : marketStatus?.source === 'yahoo-stale' ? 'Yahoo stale' : 'Demo'}
              </span>
            </div>
            <div className="mono text-3xl bold">₹{formatINR(live.price)}</div>
            <div className={`row-end gap-xs text-sm bold ${up ? 'text-up' : 'text-down'}`}>
              {up ? <IconTrendingUp size={15} /> : <IconTrendingDown size={15} />}
              {up ? '+' : ''}{formatINR(live.change)} ({up ? '+' : ''}{live.changePct}%)
            </div>
            <div className="mt-sm text-[10px] muted">
              Updated {new Date(live.lastUpdate || Date.now()).toLocaleTimeString('en-IN', { hour12: false })}
            </div>
          </div>
        </div>

        <div className="grid-2 border-t border">
          <Quote label="Open" value={`₹${formatINR(live.open)}`} />
          <Quote label="High" value={`₹${formatINR(live.high)}`} tone="up" />
          <Quote label="Low" value={`₹${formatINR(live.low)}`} tone="down" />
          <Quote label="Prev close" value={`₹${formatINR(live.prevClose)}`} />
          <Quote label="Volume" value={formatINRShort(live.volume)} />
          <Quote label="Bid" value={bestBid ? `₹${formatINR(bestBid)}` : '—'} tone="up" />
          <Quote label="Ask" value={bestAsk ? `₹${formatINR(bestAsk)}` : '—'} tone="down" />
        </div>

        <div className="grid gap-lg border-t border p-lg">
          <RangeBar label="Day range" low={live.low} high={live.high} pct={dayRangePct} />
          <RangeBar label="52 week range" low={week52Low} high={week52High} pct={week52Pct} />
        </div>
      </section>

      <div className="grid gap-lg">
        <div className="stack gap-md">
          <AdvancedChart symbol={live.symbol} live={live} />

          <div className="card overflow-hidden">
            <div className="flex gap-1 overflow-x-auto border-b border-line px-2 pt-2">
              {[
                ['overview', 'Overview', IconCandles],
                ['fundamentals', 'Fundamentals', IconPieChart],
                ['depth', 'Market depth', IconList],
                ['about', 'About company', IconDocument],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pt-1 pb-2.5 text-sm font-bold transition ${
                    tab === id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-lg">
              {tab === 'overview' && (
                <div className="stack gap-md">
                  <div className="grid gap-x-6 gap-y-0">
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
                    <div className="mb-sm row-between text-xs bold">
                      <span className="up">Buyers {buyPressure.toFixed(0)}%</span>
                      <span className="muted uppercase">Order book pressure</span>
                      <span className="down">Sellers {(100 - buyPressure).toFixed(0)}%</span>
                    </div>
                    <div className="row overflow-hidden rounded">
                      <div className="bg-up" style={{ width: `${buyPressure}%` }} />
                      <div className="grow" />
                    </div>
                  </div>
                </div>
              )}

              {tab === 'fundamentals' && (
                <div className="stack gap-md">
                  <div className="grid gap-md">
                    <FundamentalCard label="Market cap" value={live.mcap ? `₹${Number(live.mcap).toLocaleString('en-IN')} Cr` : '—'} />
                    <FundamentalCard label="P/E ratio" value={live.pe ? live.pe.toFixed(2) : 'N/A'} />
                    <FundamentalCard label="P/B ratio" value={live.pb ? live.pb.toFixed(2) : '—'} />
                  </div>
                  <div className="grid gap-x-6 gap-y-0">
                    <DetailRow label="Earnings per share (EPS)" value={live.eps != null ? `₹${live.eps.toFixed(2)}` : '—'} />
                    <DetailRow label="Return on equity (ROE)" value={live.roe != null ? `${live.roe}%` : '—'} />
                    <DetailRow label="Dividend yield" value={live.divYield != null ? `${live.divYield}%` : '—'} />
                    <DetailRow label="Book value" value={live.pb ? `₹${formatINR(live.price / live.pb)}` : '—'} />
                    <DetailRow label="52 week high" value={`₹${formatINR(week52High)}`} />
                    <DetailRow label="52 week low" value={`₹${formatINR(week52Low)}`} />
                    <DetailRow label="Industry" value={live.industry || live.sector} />
                    <DetailRow label="Face value" value={live.faceValue ? `₹${live.faceValue}` : '—'} />
                  </div>
                  <p className="rounded px-lg py-md text-xs muted">
                    Fundamental figures are indicative and provided for demonstration of the platform only.
                  </p>
                </div>
              )}

              {tab === 'depth' && (
                <div>
                  <div className="grid-2 gap-xl">
                    <div>
                      <div className="mb-sm row text-[10px] bold muted uppercase">
                        <span className="up">Bid price</span>
                        <span>Quantity</span>
                      </div>
                      {depth.bids?.slice(0, 10).map((b, i) => (
                        <div key={`b-${b.price}-${i}`} className="relative mb-px grid-2 py-md mono text-xs">
                          <div className="absolute inset-y-0 rounded" style={{ width: `${Math.min(100, (b.size / (totalBidQty || 1)) * 400)}%` }} />
                          <span className="relative bold up">{formatINR(b.price)}</span>
                          <span className="relative right muted">{b.size.toLocaleString('en-IN')}</span>
                        </div>
                      ))}
                      <div className="mt-sm row border-t border text-xs bold">
                        <span className="muted">Total</span>
                        <span className="mono up">{totalBidQty.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                    <div>
                      <div className="mb-sm row text-[10px] bold muted uppercase">
                        <span>Quantity</span>
                        <span className="down">Ask price</span>
                      </div>
                      {depth.asks?.slice(0, 10).map((a, i) => (
                        <div key={`a-${a.price}-${i}`} className="relative mb-px grid-2 py-md mono text-xs">
                          <div className="absolute inset-y-0 rounded" style={{ width: `${Math.min(100, (a.size / (totalAskQty || 1)) * 400)}%` }} />
                          <span className="relative muted">{a.size.toLocaleString('en-IN')}</span>
                          <span className="relative right bold down">{formatINR(a.price)}</span>
                        </div>
                      ))}
                      <div className="mt-sm row border-t border text-xs bold">
                        <span className="mono down">{totalAskQty.toLocaleString('en-IN')}</span>
                        <span className="muted">Total</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'about' && (
                <div className="stack gap-md">
                  <p className="text-sm leading-relaxed muted">
                    {live.about || `${live.name} is listed on the National Stock Exchange under the ${live.sector} sector.`}
                  </p>
                  <div className="grid gap-x-6 gap-y-0">
                    <DetailRow label="Company" value={live.name} />
                    <DetailRow label="Ticker" value={`${live.symbol} · NSE`} />
                    <DetailRow label="Sector" value={live.sector} />
                    <DetailRow label="Industry" value={live.industry || live.sector} />
                  </div>
                  <p className="rounded border px-lg py-md text-xs muted">
                    Prices on Arth are simulated and stream over Server-Sent Events. They do not represent real
                    exchange data and no real money is involved.
                  </p>
                </div>
              )}
            </div>
          </div>

          {peers.length > 0 && (
            <section className="card overflow-hidden">
              <div className="row-between border-b border px-lg py-md">
                <h3 className="row gap-sm extrabold">
                  <span className="icon-chip icon-chip-sm">
                    <IconStar size={15} />
                  </span>
                  More from {live.sector}
                </h3>
                <Link to={sectorHref} className="text-sm bold accent">
                  View all
                </Link>
              </div>
              <div className="">
                {peers.map((p) => {
                  const pUp = p.changePct >= 0
                  return (
                    <button
                      key={p.symbol}
                      type="button"
                      className="row w-full px-lg py-md"
                      onClick={() => navigate(`/app/stocks/${p.symbol}`)}
                    >
                      <div className="min-w-0">
                        <div className="mono text-sm bold">{p.symbol}</div>
                        <div className="truncate text-xs muted">{p.name}</div>
                      </div>
                      <div className="right">
                        <div className="mono text-sm bold">₹{formatINR(p.price)}</div>
                        <div className={`text-xs bold ${pUp ? '' : ''}`}>
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

        {/* Order ticket */}
        <div className="stack gap-md">
          {position && (
            <section className="card p-lg">
              <div className="row-between">
                <h3 className="text-sm extrabold">Your position</h3>
                <span className="rounded px-lg text-[10px] bold muted">HOLDING</span>
              </div>
              <div className="mt-md grid-2 gap-md">
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
            <div className="grid-2">
              <button
                type="button"
                className={`py-md text-sm extrabold ${ side === 'buy' ? 'bg-up text-white' : ' text-muted hover:text-ink' }`}
                onClick={() => setSide('buy')}
              >
                BUY
              </button>
              <button
                type="button"
                className={`py-md text-sm extrabold ${ side === 'sell' ? ' text-white' : ' text-muted hover:text-ink' }`}
                onClick={() => setSide('sell')}
              >
                SELL
              </button>
            </div>

            <div className="stack gap-1.5 p-lg">
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
                <details className="rounded border p-md text-xs">
                  <summary className="bold pointer">Learning tip · Product & order type</summary>
                  <p className="mt-sm muted">
                    CNC delivery keeps shares overnight and blocks full cash. MIS intraday uses leverage and should be squared off the same day.
                    Market fills immediately near LTP; Limit waits for your price (buys fill at or below).
                  </p>
                </details>
              )}

              <div>
                <label className="label" htmlFor="order-qty">Quantity</label>
                <div className="row gap-sm">
                  <button type="button" className="btn btn-ghost shrink-0 px-lg" onClick={() => setQty(Math.max(1, Number(qty) - 1))}>−</button>
                  <input
                    id="order-qty"
                    className="field center mono bold"
                    type="number"
                    min={1}
                    step={1}
                    value={qty}
                    onChange={(e) => setQty(e.target.value)}
                  />
                  <button type="button" className="btn btn-ghost shrink-0 px-lg" onClick={() => setQty(Number(qty) + 1)}>+</button>
                </div>
                <div className="mt-sm grid grid-cols-5 gap-xs">
                  {[1, 5, 10, 25, 50].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`rounded border py-md text-[11px] bold ${ Number(qty) === n ? 'border-accent text-accent' : 'border-line text-muted hover:bg-surface-2' }`}
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
                  <div className="row gap-sm">
                    <input
                      id="limit-price"
                      className="field mono"
                      type="number"
                      step="0.05"
                      value={limitPrice}
                      onChange={(e) => setLimitPrice(e.target.value)}
                      placeholder={String(live.price)}
                    />
                    <button
                      type="button"
                      className="btn btn-ghost shrink-0 px-lg text-xs"
                      onClick={() => setLimitPrice(String(live.price))}
                    >
                      LTP
                    </button>
                  </div>
                </div>
              )}

              <div className="rounded border">
                <SummaryRow label="Order value" value={`₹${formatINR(orderValue)}`} />
                <SummaryRow
                  label={product === 'intraday' ? 'Margin required' : 'Amount required'}
                  value={`₹${formatINR(marginRequired)}`}
                  strong
                />
                <button
                  type="button"
                  className="row w-full border-t border px-lg py-md text-xs"
                  onClick={() => setShowCharges((v) => !v)}
                >
                  <span className="bold muted">
                    Estimated charges {showCharges ? '▲' : '▼'}
                  </span>
                  <span className="mono bold">₹{formatINR(charges.total)}</span>
                </button>
                {showCharges && (
                  <div className="stack gap-md border-t border px-lg py-md text-xs">
                    <ChargeLine label="Brokerage" value={charges.brokerage} />
                    <ChargeLine label="STT / CTT" value={charges.stt} />
                    <ChargeLine label="Exchange txn" value={charges.exchange} />
                    <ChargeLine label="SEBI charges" value={charges.sebi} />
                    <ChargeLine label="Stamp duty" value={charges.stamp} />
                    <ChargeLine label="GST (18%)" value={charges.gst} />
                    {user?.learningMode && (
                      <p className="muted">
                        STT is a government tax on securities. GST applies on brokerage + exchange fees. These are paper stubs matching demo settlement.
                      </p>
                    )}
                  </div>
                )}
                <div className="row border-t border px-lg py-md text-xs">
                  <span className="muted">Available cash</span>
                  <span className="mono">₹{formatINR(user?.cash)}</span>
                </div>
              </div>

              {side === 'buy' && shortfall > 0 && (
                <div className="row-start gap-sm rounded border px-lg py-md text-xs">
                  <IconAlertTriangle size={15} className="mt-px shrink-0 down" />
                  <span>
                    <span className="bold down">Insufficient funds. </span>
                    <span className="muted">Add ₹{formatINR(shortfall)} to place this order.</span>
                  </span>
                </div>
              )}

              {sellShort && (
                <div className="row-start gap-sm rounded border px-lg py-md text-xs">
                  <IconAlertTriangle size={15} className="mt-px shrink-0 down" />
                  <span>
                    <span className="bold down">Not enough shares. </span>
                    <span className="muted">
                      {product === 'intraday' ? 'MIS position' : 'You hold'} {availableSellQty} {live.symbol}.
                    </span>
                  </span>
                </div>
              )}

              {riskPrompt && (
                <div className="stack gap-sm rounded border px-lg py-md text-xs">
                  <div className="row-start gap-sm">
                    <IconAlertTriangle size={15} className="shrink-0" />
                    <span className="bold">Learning sandbox check</span>
                  </div>
                  <ul className="stack gap-xs muted" style={{ paddingLeft: '1.1rem', margin: 0 }}>
                    {riskPrompt.map((w) => <li key={w}>{w}</li>)}
                  </ul>
                  <div className="row gap-sm">
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
                className={`btn w-full py-md ${side === 'buy' ? 'btn-up' : 'btn-down'}`}
                onClick={placeOrder}
              >
                {busy ? 'Placing…' : `${side === 'buy' ? 'BUY' : 'SELL'} ${qty} ${live.symbol}`}
              </button>

              <p className="row-center gap-sm center text-[10px] muted">
                <IconShield size={13} className="text-page-accent" />
                Simulated order routing · No real money involved
              </p>
            </div>
          </section>
        </div>
      </div>

      {/* Mobile sticky trade CTA — industry pattern so the ticket isn't buried under the chart */}
      <div className="trade-dock">
        <div className="page row gap-md px-lg py-md">
          <div className="min-w-0 grow">
            <div className="mono text-sm extrabold">₹{formatINR(live.price)}</div>
            <div className={`text-[11px] bold ${up ? 'text-up' : 'text-down'}`}>
              {up ? '+' : ''}{live.changePct}%
            </div>
          </div>
          <button
            type="button"
            className="btn btn-down grow py-md"
            onClick={() => {
              setSide('sell')
              document.getElementById('order-ticket')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
            }}
          >
            Sell
          </button>
          <button
            type="button"
            className="btn btn-up grow py-md"
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
  const color = tone === 'up' ? 'up' : tone === 'down' ? 'down' : 'text-ink'
  return (
    <div className="px-lg py-md">
      <div className="text-[10px] bold muted uppercase">{label}</div>
      <div className={`mt-sm mono text-sm bold ${color}`}>{value}</div>
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
    <div className="row-between border-b border py-md text-sm last:border-0">
      <span className="muted">{label}</span>
      <span className="mono bold">{value}</span>
    </div>
  )
}

function FundamentalCard({ label, value }) {
  return (
    <div className="rounded px-lg py-md">
      <div className="text-[10px] bold muted uppercase">{label}</div>
      <div className="mt-sm mono text-lg bold">{value}</div>
    </div>
  )
}

function PositionStat({ label, value, tone }) {
  const color = tone === 'up' ? 'up' : tone === 'down' ? 'down' : 'text-ink'
  return (
    <div>
      <div className="text-[10px] bold muted uppercase">{label}</div>
      <div className={`mt-sm mono text-sm bold ${color}`}>{value}</div>
    </div>
  )
}

function Segmented({ label, options, value, onChange }) {
  return (
    <div>
      <span className="label">{label}</span>
      <div className="grid-2 gap-xs rounded p-1">
        {options.map(([id, title, sub]) => (
          <button
            key={id}
            type="button"
            onClick={() => onChange(id)}
            className={`rounded px-lg center ${ value === id ? 'bg-white shadow-sm' : 'hover:bg-white' }`}
          >
            <span className={`block text-xs bold ${value === id ? 'text-ink' : 'text-muted'}`}>{title}</span>
            <span className="block text-[9px] muted">{sub}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

function SummaryRow({ label, value, strong }) {
  return (
    <div className="row border-b border px-lg py-md text-xs last:border-0">
      <span className="muted">{label}</span>
      <span className={`mono ${strong ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}

function ChargeLine({ label, value }) {
  return (
    <div className="row">
      <span className="muted">{label}</span>
      <span className="mono">₹{value.toFixed(2)}</span>
    </div>
  )
}
