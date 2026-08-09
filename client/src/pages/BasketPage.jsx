import { useState } from 'react'
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
          <div key={idx} className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            <div>
              <label className="label">Symbol</label>
              <input
                className="field font-mono"
                value={leg.symbol}
                onChange={(e) => updateLeg(idx, { symbol: e.target.value.toUpperCase() })}
              />
            </div>
            <div>
              <label className="label">Side</label>
              <select className="field" value={leg.side} onChange={(e) => updateLeg(idx, { side: e.target.value })}>
                <option value="buy">Buy</option>
                <option value="sell">Sell</option>
              </select>
            </div>
            <div>
              <label className="label">Type</label>
              <select className="field" value={leg.type} onChange={(e) => updateLeg(idx, { type: e.target.value })}>
                <option value="market">Market</option>
                <option value="limit">Limit</option>
              </select>
            </div>
            <div>
              <label className="label">Qty</label>
              <input
                className="field"
                type="number"
                value={leg.qty}
                onChange={(e) => updateLeg(idx, { qty: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Limit price</label>
              <input
                className="field"
                type="number"
                disabled={leg.type !== 'limit'}
                value={leg.price}
                onChange={(e) => updateLeg(idx, { price: e.target.value })}
              />
            </div>
            <div>
              <label className="label">Product</label>
              <select className="field" value={leg.product} onChange={(e) => updateLeg(idx, { product: e.target.value })}>
                <option value="delivery">Delivery</option>
                <option value="intraday">Intraday</option>
              </select>
            </div>
            {legs.length > 1 && (
              <button
                type="button"
                className="btn btn-ghost text-sm text-down sm:col-span-2 lg:col-span-3"
                onClick={() => setLegs((prev) => prev.filter((_, i) => i !== idx))}
              >
                Remove leg
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          className="btn btn-ghost"
          onClick={() => setLegs((p) => [...p, emptyLeg()].slice(0, 8))}
          disabled={legs.length >= 8}
        >
          Add leg
        </button>
        <button type="button" className="btn btn-ghost" onClick={preview} disabled={busy}>Preview</button>
        <button type="button" className="btn btn-primary" onClick={place} disabled={busy}>Place basket</button>
      </div>

      {previews.length > 0 && (
        <div className="card overflow-x-auto">
          <div className="flex items-center justify-between border-b border-line px-4 py-3">
            <span className="font-bold">Preview</span>
            <span className="font-mono text-sm text-muted">Est. required ₹{formatINR(totalRequired)}</span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-2/80 text-[10px] font-bold tracking-wide text-muted uppercase">
                <th className="px-4 py-2.5 text-left">Symbol</th>
                <th className="px-4 py-2.5 text-left">Side</th>
                <th className="px-4 py-2.5 text-right">Price</th>
                <th className="px-4 py-2.5 text-right">Notional</th>
                <th className="px-4 py-2.5 text-right">Required</th>
              </tr>
            </thead>
            <tbody>
              {previews.map((p) => (
                <tr key={`${p.symbol}-${p.side}`} className="border-t border-line transition hover:bg-surface-2/50">
                  <td className="px-4 py-2.5 font-mono font-bold">{p.symbol}</td>
                  <td className="px-4 py-2.5">{p.side.toUpperCase()}</td>
                  <td className="px-4 py-2.5 text-right font-mono">₹{formatINR(p.preview.price)}</td>
                  <td className="px-4 py-2.5 text-right font-mono">₹{formatINR(p.preview.notional)}</td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold">₹{formatINR(p.preview.required)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Screen>
  )
}
