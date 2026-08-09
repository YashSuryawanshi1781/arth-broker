import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatINR } from '../lib/api'
import { useAppDispatch } from '../app/hooks'
import { showToast } from '../features/ui/uiSlice'
import { useLiveMarket } from '../hooks/useLiveMarket'
import { EmptyState, PageHeader, Screen } from '../components/Screen'
import { EmptyOrdersArt } from '../components/Illustrations'
import {
  IconCandles,
  IconCheckCircle,
  IconClock,
  IconFilter,
  IconList,
  IconXCircle,
} from '../components/Icons'
import { PAGE_THEMES } from '../lib/theme'

export function OrdersPage() {
  const [orders, setOrders] = useState([])
  const [summary, setSummary] = useState({ all: 0, open: 0, filled: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const dispatch = useAppDispatch()
  const market = useLiveMarket(500)

  const load = () => {
    const q = filter ? `?status=${filter}` : ''
    setLoading(true)
    api(`/orders${q}`)
      .then((d) => {
        setOrders(d.orders || [])
        if (d.summary) setSummary(d.summary)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(load, [filter])

  const rows = useMemo(() => orders.map((order) => {
    const instrument = market.instruments[order.symbol]
    const ltp = instrument?.price
    const referencePrice = order.fillPrice || order.price
    const marketValue = ltp != null ? ltp * order.qty : null
    const distance = order.status === 'open' && ltp != null && order.price != null
      ? order.side === 'buy'
        ? ((ltp - order.price) / order.price) * 100
        : ((order.price - ltp) / order.price) * 100
      : null
    return { ...order, ltp, referencePrice, marketValue, distance }
  }), [orders, market.instruments])

  const counts = summary

  const cancel = async (id) => {
    try {
      await api(`/orders/${id}`, { method: 'DELETE' })
      dispatch(showToast({ title: 'Order cancelled' }))
      load()
    } catch (err) {
      dispatch(showToast({ title: 'Failed', message: err.message }))
    }
  }

  const feedLabel = !market.connected
    ? 'Feed offline'
    : market.status?.source === 'yahoo'
      ? 'Yahoo Finance'
      : market.status?.source === 'yahoo-stale'
        ? 'Yahoo data stale'
        : 'Demo fallback'

  return (
    <Screen theme="orders" className="stack gap-md">
      <PageHeader
        icon={IconList}
        eyebrow="Order book"
        title="Orders"
        subtitle={
          <>
            Open orders show live LTP and distance from trigger{' · '}
            <span className={market.connected && market.status?.source === 'yahoo' ? 'font-bold up' : 'font-bold down'}>
              {feedLabel}
            </span>
          </>
        }
        actions={
          <div className="field-wrap">
            <IconFilter size={16} className="field-icon" />
            <select
              className="field field-has-icon ]"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            >
              <option value="">All orders</option>
              <option value="filled">Filled</option>
              <option value="open">Open</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        }
      />

      <div className="grid-2 gap-md">
        <OrderMetric label="All orders" value={counts.all} icon={IconList} />
        <OrderMetric label="Open" value={counts.open} tone="gold" icon={IconClock} />
        <OrderMetric label="Filled" value={counts.filled} tone="up" icon={IconCheckCircle} />
        <OrderMetric label="Cancelled" value={counts.cancelled} tone="down" icon={IconXCircle} />
      </div>

      <div className="card overflow-auto">
        <table className="w-full w-[940px] text-sm">
          <thead>
            <tr className="text-[10px] bold muted uppercase">
              <th className="px-lg py-md">Time</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Type</th>
              <th>Qty</th>
              <th className="right">Order price</th>
              <th className="right">Live LTP</th>
              <th className="right">Live value</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border">
                <td className="px-lg py-md muted">
                  {new Date(o.createdAt).toLocaleString('en-IN', { hour12: false })}
                </td>
                <td>
                  <Link to={`/app/stocks/${o.symbol}`} className="mono bold">{o.symbol}</Link>
                </td>
                <td className={`mono bold ${o.side === 'buy' ? '' : ''}`}>{o.side.toUpperCase()}</td>
                <td className="capitalize muted">{o.type} · {o.product}</td>
                <td className="mono">{o.qty}</td>
                <td className="right mono">₹{formatINR(o.referencePrice || 0)}</td>
                <td className="right">
                  {o.ltp != null ? (
                    <>
                      <div className="mono bold">₹{formatINR(o.ltp)}</div>
                      {o.distance != null && (
                        <div className={`text-[10px] bold ${o.distance <= 0 ? '' : 'text-gold'}`}>
                          {Math.abs(o.distance).toFixed(2)}% {o.distance <= 0 ? 'through limit' : 'away'}
                        </div>
                      )}
                    </>
                  ) : '—'}
                </td>
                <td className="right mono">{o.marketValue != null ? `₹${formatINR(o.marketValue)}` : '—'}</td>
                <td><StatusBadge status={o.status} /></td>
                <td className="px-lg">
                  {o.status === 'open' && (
                    <button
                      type="button"
                      className="row gap-xs text-xs bold down"
                      onClick={() => cancel(o.id)}
                    >
                      <IconXCircle size={14} />
                      Cancel
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {loading ? (
          <div className="px-lg py-md center text-sm muted">Loading orders…</div>
        ) : orders.length === 0 ? (
          <EmptyState
            art={EmptyOrdersArt}
            accent={PAGE_THEMES.orders.accent}
            title="No orders here"
            message="Placed, filled and cancelled trades all land on this page."
            action={
              <Link to="/app/explore" className="btn btn-primary text-sm">
                <IconCandles size={16} />
                Place your first trade
              </Link>
            }
          />
        ) : null}
      </div>
    </Screen>
  )
}

function OrderMetric({ label, value, tone, icon: Icon }) {
  const color = tone === 'up' ? 'up' : tone === 'down' ? 'down' : tone === 'gold' ? 'text-gold' : 'text-ink'
  const chip =
    tone === 'up'
      ? 'bg-up-bg up'
      : tone === 'down'
        ? 'bg-down-bg down'
        : tone === 'gold'
          ? 'bg-[#fff6e8] text-gold'
          : 'bg-surface-2 text-muted'
  return (
    <div className="card row gap-md px-lg py-md">
      {Icon ? (
        <span className={`grid shrink-0 rounded ${chip}`}>
          <Icon size={18} />
        </span>
      ) : null}
      <div className="min-">
        <div className="text-[10px] bold muted uppercase">{label}</div>
        <div className={`mono text-xl bold ${color}`}>{value}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const tone = status === 'filled'
    ? 'bg-up-bg up'
    : status === 'open'
      ? 'bg-[#fff6e8] text-gold'
      : 'bg-surface-2 text-muted'
  return <span className={`rounded px-lg py-md text-[10px] bold uppercase ${tone}`}>{status}</span>
}
