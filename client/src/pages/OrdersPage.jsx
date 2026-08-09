import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material'
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
  const [conditional, setConditional] = useState([])
  const [summary, setSummary] = useState({ all: 0, open: 0, filled: 0, cancelled: 0 })
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('')
  const [modifyOrder, setModifyOrder] = useState(null)
  const [modQty, setModQty] = useState('')
  const [modPrice, setModPrice] = useState('')
  const [gttOpen, setGttOpen] = useState(false)
  const [gtt, setGtt] = useState({
    symbol: '',
    side: 'buy',
    product: 'delivery',
    qty: 1,
    triggerType: 'above',
    triggerPrice: '',
    limitPrice: '',
  })
  const dispatch = useAppDispatch()
  const market = useLiveMarket(500)

  const load = () => {
    const q = filter ? `?status=${filter}` : ''
    setLoading(true)
    Promise.all([
      api(`/orders${q}`),
      api('/conditional'),
    ])
      .then(([d, c]) => {
        setOrders(d.orders || [])
        if (d.summary) setSummary(d.summary)
        setConditional(c.orders || [])
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

  const openModify = (order) => {
    setModifyOrder(order)
    setModQty(String(order.qty))
    setModPrice(String(order.price))
  }

  const saveModify = async () => {
    if (!modifyOrder) return
    try {
      await api(`/orders/${modifyOrder.id}`, {
        method: 'PATCH',
        body: { qty: Number(modQty), price: Number(modPrice) },
      })
      dispatch(showToast({ type: 'success', title: 'Order updated' }))
      setModifyOrder(null)
      load()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Modify failed', message: err.message }))
    }
  }

  const cancelGtt = async (id) => {
    try {
      await api(`/conditional/${id}`, { method: 'DELETE' })
      dispatch(showToast({ title: 'Conditional order cancelled' }))
      load()
    } catch (err) {
      dispatch(showToast({ title: 'Failed', message: err.message }))
    }
  }

  const createGtt = async () => {
    try {
      await api('/conditional', {
        method: 'POST',
        body: {
          ...gtt,
          symbol: gtt.symbol.toUpperCase(),
          qty: Number(gtt.qty),
          triggerPrice: Number(gtt.triggerPrice),
          limitPrice: gtt.limitPrice ? Number(gtt.limitPrice) : undefined,
        },
      })
      dispatch(showToast({ type: 'success', title: 'Conditional order created' }))
      setGttOpen(false)
      load()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Failed', message: err.message }))
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
          <div className="flex flex-wrap items-center gap-2">
            <Button size="small" variant="outlined" onClick={() => setGttOpen(true)}>New GTT</Button>
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
            <tr className="bg-surface-2/80 text-[10px] font-bold tracking-wide text-muted uppercase">
              <th className="px-4 py-2.5">Time</th>
              <th className="px-3 py-2.5">Symbol</th>
              <th className="px-3 py-2.5">Side</th>
              <th className="px-3 py-2.5">Type</th>
              <th className="px-3 py-2.5">Qty</th>
              <th className="px-3 py-2.5 text-right">Order price</th>
              <th className="px-3 py-2.5 text-right">Live LTP</th>
              <th className="px-3 py-2.5 text-right">Live value</th>
              <th className="px-3 py-2.5">Status</th>
              <th className="px-4 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {rows.map((o) => (
              <tr key={o.id} className="border-t border-line transition hover:bg-surface-2/70">
                <td className="px-4 py-2.5 text-muted">
                  {new Date(o.createdAt).toLocaleString('en-IN', { hour12: false })}
                </td>
                <td className="px-3 py-2.5">
                  <Link to={`/app/stocks/${o.symbol}`} className="font-mono font-bold hover:text-accent">{o.symbol}</Link>
                </td>
                <td className={`px-3 py-2.5 font-mono font-bold ${o.side === 'buy' ? 'text-up' : 'text-down'}`}>
                  {o.side.toUpperCase()}
                </td>
                <td className="px-3 py-2.5 capitalize text-muted">{o.type} · {o.product}</td>
                <td className="px-3 py-2.5 font-mono">{o.qty}</td>
                <td className="px-3 py-2.5 text-right font-mono">₹{formatINR(o.referencePrice || 0)}</td>
                <td className="px-3 py-2.5 text-right">
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
                <td className="px-3 py-2.5 text-right font-mono">{o.marketValue != null ? `₹${formatINR(o.marketValue)}` : '—'}</td>
                <td className="px-3 py-2.5"><StatusBadge status={o.status} /></td>
                <td className="px-4 py-2.5">
                  {o.status === 'open' && (
                    <div className="flex items-center gap-2">
                      {o.type === 'limit' && (
                        <button type="button" className="text-xs font-bold text-accent" onClick={() => openModify(o)}>
                          Modify
                        </button>
                      )}
                      <button
                        type="button"
                        className="flex items-center gap-1 text-xs font-bold text-down"
                        onClick={() => cancel(o.id)}
                      >
                        <IconXCircle size={14} />
                        Cancel
                      </button>
                    </div>
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

      <section className="card space-y-3 p-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-extrabold tracking-tight">Conditional / GTT</h2>
          <Button size="small" onClick={() => setGttOpen(true)}>Add</Button>
        </div>
        {conditional.length === 0 ? (
          <p className="text-sm text-muted">No open GTT / SL / target orders.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="bg-surface-2/80 text-[10px] font-bold tracking-wide text-muted uppercase">
                  <th className="px-4 py-2.5">Symbol</th>
                  <th className="px-3 py-2.5">Side</th>
                  <th className="px-3 py-2.5">Trigger</th>
                  <th className="px-3 py-2.5 text-right">Qty</th>
                  <th className="px-3 py-2.5 text-right">LTP</th>
                  <th className="px-3 py-2.5">Status</th>
                  <th className="px-4 py-2.5" />
                </tr>
              </thead>
              <tbody>
                {conditional.map((c) => (
                  <tr key={c.id} className="border-t border-line transition hover:bg-surface-2/70">
                    <td className="px-4 py-2.5 font-mono font-bold">
                      <Link to={`/app/stocks/${c.symbol}`} className="hover:text-accent">{c.symbol}</Link>
                    </td>
                    <td className={`px-3 py-2.5 font-mono font-bold ${c.side === 'buy' ? 'text-up' : 'text-down'}`}>
                      {c.side.toUpperCase()}
                    </td>
                    <td className="px-3 py-2.5 text-muted">{c.triggerType} ₹{formatINR(c.triggerPrice)}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{c.qty}</td>
                    <td className="px-3 py-2.5 text-right font-mono">{c.ltp != null ? `₹${formatINR(c.ltp)}` : '—'}</td>
                    <td className="px-3 py-2.5"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-2.5">
                      {c.status === 'open' && (
                        <button type="button" className="text-xs font-bold text-down" onClick={() => cancelGtt(c.id)}>
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Dialog open={!!modifyOrder} onClose={() => setModifyOrder(null)} fullWidth maxWidth="xs">
        <DialogTitle>Modify limit order</DialogTitle>
        <DialogContent className="space-y-3" style={{ paddingTop: 8 }}>
          <TextField
            label="Quantity"
            type="number"
            size="small"
            fullWidth
            value={modQty}
            onChange={(e) => setModQty(e.target.value)}
          />
          <TextField
            label="Limit price"
            type="number"
            size="small"
            fullWidth
            value={modPrice}
            onChange={(e) => setModPrice(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModifyOrder(null)}>Close</Button>
          <Button variant="contained" onClick={saveModify}>Save</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={gttOpen} onClose={() => setGttOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>New conditional order</DialogTitle>
        <DialogContent className="space-y-3" style={{ paddingTop: 8 }}>
          <TextField size="small" label="Symbol" value={gtt.symbol} onChange={(e) => setGtt({ ...gtt, symbol: e.target.value.toUpperCase() })} fullWidth />
          <TextField select size="small" label="Side" value={gtt.side} onChange={(e) => setGtt({ ...gtt, side: e.target.value })} fullWidth>
            <MenuItem value="buy">Buy</MenuItem>
            <MenuItem value="sell">Sell</MenuItem>
          </TextField>
          <TextField select size="small" label="Trigger" value={gtt.triggerType} onChange={(e) => setGtt({ ...gtt, triggerType: e.target.value })} fullWidth>
            <MenuItem value="above">Above</MenuItem>
            <MenuItem value="below">Below</MenuItem>
          </TextField>
          <TextField size="small" label="Trigger price" type="number" value={gtt.triggerPrice} onChange={(e) => setGtt({ ...gtt, triggerPrice: e.target.value })} fullWidth />
          <TextField size="small" label="Qty" type="number" value={gtt.qty} onChange={(e) => setGtt({ ...gtt, qty: e.target.value })} fullWidth />
          <TextField size="small" label="Limit price (optional)" type="number" value={gtt.limitPrice} onChange={(e) => setGtt({ ...gtt, limitPrice: e.target.value })} fullWidth />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setGttOpen(false)}>Close</Button>
          <Button variant="contained" onClick={createGtt}>Create</Button>
        </DialogActions>
      </Dialog>
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
    <div className="card flex items-center gap-3 px-4 py-3 shadow-sm">
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
  const tone = status === 'filled' || status === 'triggered'
    ? 'bg-up-bg text-up'
    : status === 'open'
      ? 'bg-[#fff6e8] text-gold'
      : 'bg-surface-2 text-muted'
  return <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${tone}`}>{status}</span>
}
