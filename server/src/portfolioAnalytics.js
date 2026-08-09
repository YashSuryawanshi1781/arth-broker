import { db } from './db.js'
import { market } from './market.js'

/** Newton-style XIRR for cashflow [{amount, when}] in ms epoch. */
export function xirr(cashflows, guess = 0.12) {
  if (!cashflows?.length) return null
  const t0 = Math.min(...cashflows.map((c) => c.when))
  const years = (t) => (t - t0) / (365.25 * 24 * 3600 * 1000)

  let rate = guess
  for (let i = 0; i < 40; i += 1) {
    let f = 0
    let df = 0
    for (const cf of cashflows) {
      const y = years(cf.when)
      const denom = (1 + rate) ** y
      f += cf.amount / denom
      df += (-y * cf.amount) / ((1 + rate) ** (y + 1))
    }
    if (Math.abs(df) < 1e-12) break
    const next = rate - f / df
    if (!Number.isFinite(next)) break
    if (Math.abs(next - rate) < 1e-7) {
      rate = next
      break
    }
    rate = next
  }
  return Number.isFinite(rate) ? +((rate * 100).toFixed(2)) : null
}

export function analyticsForUser(userId) {
  const holdings = db.prepare('SELECT * FROM holdings WHERE user_id = ?').all(userId)
  const orders = db
    .prepare(`SELECT * FROM orders WHERE user_id = ? AND status = 'filled' ORDER BY created_at ASC`)
    .all(userId)

  let invested = 0
  let current = 0
  const bySector = {}
  const performance = []

  for (const h of holdings) {
    const inst = market.get(h.symbol) || {}
    const ltp = market.price(h.symbol) || h.avg_price
    const cost = h.avg_price * h.qty
    const value = ltp * h.qty
    invested += cost
    current += value
    const sector = inst.sector || 'Other'
    bySector[sector] = (bySector[sector] || 0) + value
    performance.push({
      symbol: h.symbol,
      name: inst.name || h.symbol,
      sector,
      qty: h.qty,
      avgPrice: h.avg_price,
      ltp,
      invested: +cost.toFixed(2),
      current: +value.toFixed(2),
      pnl: +(value - cost).toFixed(2),
      pnlPct: cost ? +(((value - cost) / cost) * 100).toFixed(2) : 0,
      weightPct: 0,
    })
  }

  performance.sort((a, b) => b.pnl - a.pnl)
  for (const row of performance) {
    row.weightPct = current ? +((row.current / current) * 100).toFixed(2) : 0
  }

  const sectorExposure = Object.entries(bySector)
    .map(([sector, value]) => ({
      sector,
      value: +value.toFixed(2),
      weightPct: current ? +((value / current) * 100).toFixed(2) : 0,
    }))
    .sort((a, b) => b.value - a.value)

  const cashflows = []
  for (const o of orders) {
    const notional = (o.fill_price || o.price || 0) * (o.filled_qty || o.qty || 0)
    if (!notional) continue
    cashflows.push({
      amount: o.side === 'buy' ? -notional : notional,
      when: o.updated_at || o.created_at,
    })
  }
  if (current > 0) cashflows.push({ amount: current, when: Date.now() })

  const peak = performance.reduce((m, r) => Math.max(m, r.current), 0)
  const drawdownPct = peak && current < peak ? +(((peak - current) / peak) * 100).toFixed(2) : 0

  // Tax stub: treat closed sells in last 365d as STCG, older as LTCG (paper demo).
  const yearAgo = Date.now() - 365 * 24 * 3600 * 1000
  let stcg = 0
  let ltcg = 0
  const sells = orders.filter((o) => o.side === 'sell')
  for (const s of sells) {
    const proceeds = (s.fill_price || s.price) * (s.filled_qty || s.qty)
    // Approximate cost using avg of buys for symbol (demo-grade).
    const buys = orders.filter((o) => o.side === 'buy' && o.symbol === s.symbol)
    const buyQty = buys.reduce((a, o) => a + (o.filled_qty || o.qty), 0) || 1
    const buyCost = buys.reduce((a, o) => a + (o.fill_price || o.price) * (o.filled_qty || o.qty), 0)
    const avg = buyCost / buyQty
    const pnl = proceeds - avg * (s.filled_qty || s.qty)
    if ((s.updated_at || s.created_at) >= yearAgo) stcg += pnl
    else ltcg += pnl
  }

  return {
    invested: +invested.toFixed(2),
    current: +current.toFixed(2),
    totalPnl: +(current - invested).toFixed(2),
    totalPnlPct: invested ? +(((current - invested) / invested) * 100).toFixed(2) : 0,
    xirrPct: xirr(cashflows),
    drawdownPct,
    sectorExposure,
    performance,
    tax: {
      stcg: +stcg.toFixed(2),
      ltcg: +ltcg.toFixed(2),
      stcgTaxStub: +(Math.max(0, stcg) * 0.15).toFixed(2),
      ltcgTaxStub: +(Math.max(0, ltcg) * 0.125).toFixed(2),
      note: 'Paper demo rates (15% STCG / 12.5% LTCG). Not tax advice.',
    },
  }
}
