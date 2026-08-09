import { useState } from 'react'
import { Button, MenuItem, TextField } from '@mui/material'
import { api, formatINR } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { fetchMe } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { PageHeader, Screen } from '../components/Screen'
import { IconList } from '../components/Icons'

const emptyLeg = () => ({
  symbol: '',
  side: 'buy',
  type: 'market',
  product: 'delivery',
  qty: 1,
  price: '',
})

export function BasketPage() {
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)
  const [legs, setLegs] = useState([emptyLeg(), emptyLeg()])
  const [previews, setPreviews] = useState([])
  const [busy, setBusy] = useState(false)

  const updateLeg = (idx, patch) => {
    setLegs((prev) => prev.map((leg, i) => (i === idx ? { ...leg, ...patch } : leg)))
    setPreviews([])
  }

  const preview = async () => {
    setBusy(true)
    try {
      const results = []
      for (const leg of legs) {
        if (!leg.symbol.trim()) continue
        const data = await api('/orders/preview', {
          method: 'POST',
          body: {
            symbol: leg.symbol.trim().toUpperCase(),
            side: leg.side,
            type: leg.type,
            product: leg.product,
            qty: Number(leg.qty),
            price: leg.type === 'limit' ? Number(leg.price) : undefined,
          },
        })
        results.push({ ...leg, symbol: leg.symbol.trim().toUpperCase(), preview: data })
      }
      setPreviews(results)
      dispatch(showToast({ type: 'success', title: `Previewed ${results.length} legs` }))
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Preview failed', message: err.message }))
    } finally {
      setBusy(false)
    }
  }

  const place = async () => {
    if (!user?.kycComplete) {
      dispatch(showToast({ type: 'warning', title: 'KYC required' }))
      return
    }
    setBusy(true)
    const placed = []
    try {
      for (const leg of legs) {
        if (!leg.symbol.trim()) continue
        const data = await api('/orders', {
          method: 'POST',
          body: {
            symbol: leg.symbol.trim().toUpperCase(),
            side: leg.side,
            type: leg.type,
            product: leg.product,
            qty: Number(leg.qty),
            price: leg.type === 'limit' ? Number(leg.price) : undefined,
          },
        })
        placed.push(data.order)
      }
      dispatch(fetchMe())
      dispatch(showToast({
        type: 'success',
        title: 'Basket placed',
        message: `${placed.length} order${placed.length === 1 ? '' : 's'} submitted sequentially`,
      }))
      setPreviews([])
    } catch (err) {
      dispatch(showToast({
        type: 'error',
        title: 'Basket stopped',
        message: `${err.message}${placed.length ? ` · ${placed.length} already placed` : ''}`,
      }))
      dispatch(fetchMe())
    } finally {
      setBusy(false)
    }
  }

  const totalRequired = previews.reduce((s, p) => s + (p.preview?.required || 0), 0)

  return (
    <Screen theme="orders" className="stack gap-md">
      <PageHeader
        icon={IconList}
        eyebrow="Multi-leg"
        title="Basket orders"
        subtitle="Draft several legs, preview margins, then place sequentially"
      />

      <div className="stack gap-md">
        {legs.map((leg, idx) => (
          <div key={idx} className="card grid-3 gap-md p-lg">
            <TextField
              size="small"
              label="Symbol"
              value={leg.symbol}
              onChange={(e) => updateLeg(idx, { symbol: e.target.value.toUpperCase() })}
            />
            <TextField select size="small" label="Side" value={leg.side} onChange={(e) => updateLeg(idx, { side: e.target.value })}>
              <MenuItem value="buy">Buy</MenuItem>
              <MenuItem value="sell">Sell</MenuItem>
            </TextField>
            <TextField select size="small" label="Type" value={leg.type} onChange={(e) => updateLeg(idx, { type: e.target.value })}>
              <MenuItem value="market">Market</MenuItem>
              <MenuItem value="limit">Limit</MenuItem>
            </TextField>
            <TextField
              size="small"
              label="Qty"
              type="number"
              value={leg.qty}
              onChange={(e) => updateLeg(idx, { qty: e.target.value })}
            />
            <TextField
              size="small"
              label="Limit price"
              type="number"
              disabled={leg.type !== 'limit'}
              value={leg.price}
              onChange={(e) => updateLeg(idx, { price: e.target.value })}
            />
            <TextField select size="small" label="Product" value={leg.product} onChange={(e) => updateLeg(idx, { product: e.target.value })}>
              <MenuItem value="delivery">Delivery</MenuItem>
              <MenuItem value="intraday">Intraday</MenuItem>
            </TextField>
            {legs.length > 1 && (
              <Button color="inherit" onClick={() => setLegs((prev) => prev.filter((_, i) => i !== idx))}>
                Remove leg
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="row wrap gap-sm">
        <Button variant="outlined" onClick={() => setLegs((p) => [...p, emptyLeg()].slice(0, 8))} disabled={legs.length >= 8}>
          Add leg
        </Button>
        <Button variant="outlined" onClick={preview} disabled={busy}>Preview</Button>
        <Button variant="contained" onClick={place} disabled={busy}>Place basket</Button>
      </div>

      {previews.length > 0 && (
        <div className="card overflow-auto">
          <div className="px-lg py-md row-between">
            <span className="bold">Preview</span>
            <span className="mono muted">Est. required ₹{formatINR(totalRequired)}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] bold muted uppercase">
                <th className="px-lg py-md">Symbol</th>
                <th>Side</th>
                <th className="right">Price</th>
                <th className="right">Notional</th>
                <th className="right">Required</th>
              </tr>
            </thead>
            <tbody>
              {previews.map((p) => (
                <tr key={`${p.symbol}-${p.side}`} className="border-t border">
                  <td className="px-lg py-md mono bold">{p.symbol}</td>
                  <td>{p.side.toUpperCase()}</td>
                  <td className="right mono">₹{formatINR(p.preview.price)}</td>
                  <td className="right mono">₹{formatINR(p.preview.notional)}</td>
                  <td className="right mono bold">₹{formatINR(p.preview.required)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  )
}
