/** Paper strategy playbook — educational signals only, not SEBI advice. */

export const STRATEGIES = [
  {
    id: 'momentum_breakout',
    name: 'Momentum breakout',
    tagline: 'Ride today’s strongest movers',
    vibe: 'Baba Nifty momentum — top gainers with volume, tight stop, quick target.',
    indicators: ['Day % change', 'Volume', 'Near day high'],
    product: 'intraday',
    stopPct: 0.012,
    targetPct: 0.024,
    maxPositions: 1,
    session: 'open',
  },
  {
    id: 'mean_reversion',
    name: 'Mean reversion dip',
    tagline: 'Buy the oversold bounce',
    vibe: 'Baba dip buy — beaten-down names with a bounce setup, SL below low.',
    indicators: ['Day % change (negative)', 'RSI-ish bounce', 'Sector not collapsing'],
    product: 'intraday',
    stopPct: 0.01,
    targetPct: 0.02,
    maxPositions: 1,
    session: 'open',
  },
  {
    id: 'bank_nifty_leaders',
    name: 'Bank / finance leaders',
    tagline: 'Trade heavy banks when money is flowing',
    vibe: 'Baba banking book — HDFC, ICICI, SBI-class names when sector is green.',
    indicators: ['Banking/Finance sector', 'Positive day change', 'Liquidity'],
    product: 'intraday',
    stopPct: 0.01,
    targetPct: 0.018,
    maxPositions: 1,
    session: 'open',
    sectors: ['Banking', 'Finance'],
  },
  {
    id: 'delivery_swing',
    name: 'Delivery swing',
    tagline: 'Hold overnight with wider levels',
    vibe: 'Baba swing — CNC hold, wider SL/TP, no same-day square-off rush.',
    indicators: ['Steady uptrend', 'Above prev close', 'Quality large-cap'],
    product: 'delivery',
    stopPct: 0.02,
    targetPct: 0.04,
    maxPositions: 1,
    session: 'any',
  },
]

export function getStrategy(id) {
  return STRATEGIES.find((s) => s.id === id) || STRATEGIES[0]
}

/**
 * Score instruments for a strategy. Higher = better candidate.
 * Uses live LTP fields from market.list().
 */
export function scorePicks(strategy, instruments, limit = 5) {
  const list = (instruments || []).filter((i) => i && i.symbol && Number(i.price) > 0)
  const scored = []

  for (const row of list) {
    const changePct = Number(row.changePct) || 0
    const volume = Number(row.volume) || 0
    const price = Number(row.price)
    const high = Number(row.high) || price
    const low = Number(row.low) || price
    const nearHigh = high > 0 ? price / high : 0
    const nearLow = low > 0 ? low / price : 0
    let score = 0
    let reason = ''

    if (strategy.id === 'momentum_breakout') {
      if (changePct <= 0.4) continue
      score = changePct * 10 + Math.log10(volume + 10) + nearHigh * 5
      reason = `Up ${changePct.toFixed(2)}% · near day high · volume ${formatVol(volume)}`
    } else if (strategy.id === 'mean_reversion') {
      if (changePct >= -0.6) continue
      score = Math.abs(changePct) * 8 + nearLow * 4 + Math.log10(volume + 10)
      reason = `Down ${changePct.toFixed(2)}% · dip-buy setup · volume ${formatVol(volume)}`
    } else if (strategy.id === 'bank_nifty_leaders') {
      if (!strategy.sectors.includes(row.sector)) continue
      if (changePct < 0) continue
      score = changePct * 12 + Math.log10(volume + 10) + 3
      reason = `${row.sector} leader · +${changePct.toFixed(2)}% today`
    } else if (strategy.id === 'delivery_swing') {
      if (changePct < 0.2) continue
      score = changePct * 6 + Math.log10(volume + 10) + (row.mcap ? Math.log10(row.mcap) : 0)
      reason = `Swing candidate · +${changePct.toFixed(2)}% · CNC friendly`
    }

    if (score > 0) {
      scored.push({
        symbol: row.symbol,
        name: row.name,
        sector: row.sector,
        price,
        changePct,
        volume,
        score: +score.toFixed(2),
        reason,
      })
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

function formatVol(v) {
  if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`
  return String(v)
}

/** Size qty so stop distance ≈ risk budget, and target can approach daily goal. */
export function sizeQuantity({ cash, entry, stopPct, targetPct, dailyGoal, riskFraction = 0.35 }) {
  const price = Number(entry)
  const stop = Number(stopPct)
  const target = Number(targetPct)
  if (!(price > 0) || !(stop > 0)) return 0

  const riskBudget = Math.max(200, Math.min(Number(cash) * 0.08, Number(dailyGoal) * riskFraction || 500))
  const lossPerShare = price * stop
  let qty = Math.floor(riskBudget / lossPerShare)

  // Cap by cash (with buffer for charges)
  const maxByCash = Math.floor((Number(cash) * 0.92) / price)
  qty = Math.max(0, Math.min(qty, maxByCash))

  // If target profit for 1 share already exceeds goal, keep qty small
  if (qty > 0 && target > 0) {
    const profitPerShare = price * target
    const goalQty = Math.max(1, Math.ceil((Number(dailyGoal) || 500) / profitPerShare))
    qty = Math.min(qty, goalQty + 1)
  }

  return qty
}
