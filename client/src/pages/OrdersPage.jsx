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
    <Screen theme="orders" className="space-y-4">
      <PageHeader
        icon={IconList}
        eyebrow="Order book"
        title="Orders"
        subtitle={
          <>
            Open orders show live LTP and distance from trigger{' · '}
            <span className={market.connected && market.status?.source === 'yahoo' ? 'font-bold text-up' : 'font-bold text-down'}>
              {feedLabel}
            </span>
          </>
        }
        actions={
          <div className="field-wrap">
            <IconFilter size={16} className="field-icon" />
            <select
              className="field field-has-icon max-w-[180px]"
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

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <OrderMetric label="All orders" value={counts.all} icon={IconList} />
        <OrderMetric label="Open" value={counts.open} tone="gold" icon={IconClock} />
        <OrderMetric label="Filled" value={counts.filled} tone="up" icon={IconCheckCircle} />
        <OrderMetric label="Cancelled" value={counts.cancelled} tone="down" icon={IconXCircle} />
      </div>

      <div className="card overflow-auto">
        <table className="w-full min-w-[940px] text-left text-sm">
          <thead>
            <tr className="bg-surface-2 text-[10px] font-bold tracking-wide text-muted uppercase">
              <th className="px-4 py-3">Time</th>
              <th>Symbol</th>
              <th>Side</th>
              <th>Type</th>
              <th>Qty</th>
              <th className="text-right">Order price</th>
              <th className="text-right">Live LTP</th>
              <th className="text-right">Live value</th>
              <th>Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-line">
                <td className="px-4 py-2 text-muted">
                  {new Date(o.createdAt).toLocaleString('en-IN', { hour12: false })}
                </td>
                <td>
                  <Link to={`/app/stocks/${o.symbol}`} className="font-mono font-bold hover:text-accent">{o.symbol}</Link>
                </td>
                <td className={`font-mono font-bold ${o.side === 'buy' ? 'text-up' : 'text-down'}`}>{o.side.toUpperCase()}</td>
                <td className="capitalize text-muted">{o.type} · {o.product}</td>
                <td className="font-mono">{o.qty}</td>
                <td className="text-right font-mono">₹{formatINR(o.referencePrice || 0)}</td>
                <td className="text-right">
                  {o.ltp != null ? (
                    <>
                      <div className="font-mono font-bold">₹{formatINR(o.ltp)}</div>
                      {o.distance != null && (
                        <div className={`text-[10px] font-bold ${o.distance <= 0 ? 'text-up' : 'text-gold'}`}>
                          {Math.abs(o.distance).toFixed(2)}% {o.distance <= 0 ? 'through limit' : 'away'}
                        </div>
                      )}
                    </>
                  ) : '—'}
                </td>
                <td className="text-right font-mono">{o.marketValue != null ? `₹${formatINR(o.marketValue)}` : '—'}</td>
                <td><StatusBadge status={o.status} /></td>
                <td className="px-4">
                  {o.status === 'open' && (
                    <button
                      type="button"
                      className="flex items-center gap-1 font-sans text-xs font-semibold text-down"
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
          <div className="px-4 py-10 text-center text-sm text-muted">Loading orders…</div>
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
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : tone === 'gold' ? 'text-gold' : 'text-ink'
  const chip =
    tone === 'up'
      ? 'bg-up-bg text-up'
      : tone === 'down'
        ? 'bg-down-bg text-down'
        : tone === 'gold'
          ? 'bg-[#fff6e8] text-gold'
          : 'bg-surface-2 text-muted'
  return (
    <div className="card flex items-center gap-3 px-4 py-3">
      {Icon ? (
        <span className={`grid h-9 w-9 flex-none place-items-center rounded-xl ${chip}`}>
          <Icon size={18} />
        </span>
      ) : null}
      <div className="min-w-0">
        <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{label}</div>
        <div className={`font-mono text-xl font-bold ${color}`}>{value}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const tone = status === 'filled'
    ? 'bg-up-bg text-up'
    : status === 'open'
      ? 'bg-[#fff6e8] text-gold'
      : 'bg-surface-2 text-muted'
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${tone}`}>{status}</span>
}
