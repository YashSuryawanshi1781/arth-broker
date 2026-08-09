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
          <div className="row gap-sm">
            <Button size="small" variant="outlined" onClick={() => setGttOpen(true)}>New GTT</Button>
            <div className="field-wrap">
              <IconFilter size={16} className="field-icon" />
              <select
                className="field field-has-icon"
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

      <div className="grid-2 gap-md">
        <OrderMetric label="All orders" value={counts.all} icon={IconList} />
        <OrderMetric label="Open" value={counts.open} tone="gold" icon={IconClock} />
        <OrderMetric label="Filled" value={counts.filled} tone="up" icon={IconCheckCircle} />
        <OrderMetric label="Cancelled" value={counts.cancelled} tone="down" icon={IconXCircle} />
      </div>

      <div className="card overflow-auto">
        <table className="w-full text-sm" style={{ minWidth: 940 }}>
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
                <td className="mono bold">{o.side.toUpperCase()}</td>
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
                    <div className="row gap-sm">
                      {o.type === 'limit' && (
                        <button type="button" className="text-xs bold accent" onClick={() => openModify(o)}>
                          Modify
                        </button>
                      )}
                      <button
                        type="button"
                        className="row gap-xs text-xs bold down"
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

      <section className="card stack gap-md p-lg">
        <div className="row-between">
          <h2 className="bold">Conditional / GTT</h2>
          <Button size="small" onClick={() => setGttOpen(true)}>Add</Button>
        </div>
        {conditional.length === 0 ? (
          <p className="text-sm muted">No open GTT / SL / target orders.</p>
        ) : (
          <div className="overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] bold muted uppercase">
                  <th className="px-lg py-md">Symbol</th>
                  <th>Side</th>
                  <th>Trigger</th>
                  <th className="right">Qty</th>
                  <th className="right">LTP</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {conditional.map((c) => (
                  <tr key={c.id} className="border-t border">
                    <td className="px-lg py-md mono bold">
                      <Link to={`/app/stocks/${c.symbol}`}>{c.symbol}</Link>
                    </td>
                    <td>{c.side.toUpperCase()}</td>
                    <td className="muted">{c.triggerType} ₹{formatINR(c.triggerPrice)}</td>
                    <td className="right mono">{c.qty}</td>
                    <td className="right mono">{c.ltp != null ? `₹${formatINR(c.ltp)}` : '—'}</td>
                    <td><StatusBadge status={c.status} /></td>
                    <td className="px-lg">
                      {c.status === 'open' && (
                        <button type="button" className="text-xs bold down" onClick={() => cancelGtt(c.id)}>
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
        <DialogContent className="stack gap-md" style={{ paddingTop: 8 }}>
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
        <DialogContent className="stack gap-md" style={{ paddingTop: 8 }}>
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
      <div>
        <div className="text-[10px] bold muted uppercase">{label}</div>
        <div className={`mono text-xl bold ${color}`}>{value}</div>
      </div>
    </div>
  )
}

function StatusBadge({ status }) {
  const tone = status === 'filled' || status === 'triggered'
    ? 'bg-up-bg up'
    : status === 'open'
      ? 'bg-[#fff6e8] text-gold'
      : 'bg-surface-2 text-muted'
  return <span className={`rounded px-lg py-md text-[10px] bold uppercase ${tone}`}>{status}</span>
}
