/** Paper strategy playbook — educational signals only, not SEBI advice. */

export const TRADING_DAYS_PER_MONTH = 22

export const STRATEGIES = [
  {
    id: 'momentum_breakout',
    name: 'Momentum breakout',
    tagline: 'Ride today’s strongest movers',
    vibe: 'Baba Nifty momentum — top gainers with volume, tight stop, quick target.',
    indicators: ['Day % change', 'Volume', 'Near day high'],
    product: 'intraday',
    assetClass: 'stocks',
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
    assetClass: 'stocks',
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
    assetClass: 'stocks',
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
    assetClass: 'stocks',
    stopPct: 0.02,
    targetPct: 0.04,
    maxPositions: 1,
    session: 'any',
  },
  {
    id: 'index_options_pulse',
    name: 'Index options pulse',
    tagline: 'ATM Nifty / BankNifty CE·PE on index direction',
    vibe: 'Baba options — paper ATM call if index green, put if red. Hands-free SL/TP on premium.',
    indicators: ['Index day %', 'ATM strike', 'PCR / OI context'],
    product: 'intraday',
    assetClass: 'options',
    stopPct: 0.25,
    targetPct: 0.45,
    maxPositions: 1,
    session: 'open',
    underlyings: ['NIFTY', 'BANKNIFTY'],
  },
]

export function getStrategy(id) {
  return STRATEGIES.find((s) => s.id === id) || STRATEGIES[0]
}

/** Monthly ₹ goal → daily paper target using ~22 trading sessions. */
export function planFromMonthly(monthlyGoal, tradingDays = TRADING_DAYS_PER_MONTH) {
  const monthly = Number(monthlyGoal) || 0
  const days = Math.max(1, Number(tradingDays) || TRADING_DAYS_PER_MONTH)
  const daily = Math.round(monthly / days)
  return {
    monthlyGoal: monthly,
    tradingDays: days,
    dailyGoal: daily,
  }
}

export function strategiesForMode(mode = 'stocks') {
  if (mode === 'options') return STRATEGIES.filter((s) => s.assetClass === 'options')
  if (mode === 'both') return STRATEGIES
  return STRATEGIES.filter((s) => s.assetClass === 'stocks')
}

/**
 * Score equity instruments for a strategy. Higher = better candidate.
 */
export function scorePicks(strategy, instruments, limit = 5) {
  if (strategy.assetClass === 'options') return []
  const list = (instruments || []).filter((i) => i && i.symbol && Number(i.price) > 0 && !i.isOption)
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
        isOption: false,
      })
    }
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

/**
 * Score paper index option contracts from the synthetic chain.
 * Registers quotes on market so GTT / fills can track premium.
 */
export function scoreOptionPicks(strategy, marketApi, limit = 5) {
  const underlyings = strategy.underlyings || ['NIFTY', 'BANKNIFTY']
  const scored = []

  for (const key of underlyings) {
    const chain = marketApi.optionChain(key)
    const index = marketApi.getIndex(key)
    if (!chain || !index) continue

    const changePct = Number(index.changePct) || 0
    // Directional: green → CE, red → PE; flat → skip weak setups
    if (Math.abs(changePct) < 0.08) continue
    const optType = changePct >= 0 ? 'CE' : 'PE'
    const atm = chain.rows.find((r) => r.atm) || chain.rows[Math.floor(chain.rows.length / 2)]
    if (!atm) continue
    const leg = optType === 'CE' ? atm.call : atm.put
    if (!(leg?.ltp > 0)) continue

    const row = marketApi.upsertPaperOption({
      underlying: key,
      expiry: chain.expiry,
      strike: atm.strike,
      optType,
      price: leg.ltp,
      lotSize: chain.lotSize,
      name: `${key} ${atm.strike} ${optType} ${chain.expiry}`,
    })

    const score = Math.abs(changePct) * 20 + Math.log10((leg.oi || 1) + 10)
    scored.push({
      symbol: row.symbol,
      name: row.name,
      sector: 'Options',
      price: row.price,
      changePct,
      volume: leg.volume || 0,
      score: +score.toFixed(2),
      reason: `${key} ${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}% · ATM ${optType} ${atm.strike} · lot ${chain.lotSize}`,
      isOption: true,
      lotSize: chain.lotSize,
      underlying: key,
      strike: atm.strike,
      optType,
      expiry: chain.expiry,
    })
  }

  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

/** Collect picks for stocks / options / both. */
export function collectPicks(strategy, marketApi, mode = 'stocks', limit = 8) {
  const m = mode || 'stocks'
  if (strategy.assetClass === 'options' || m === 'options') {
    const optStrategy = strategy.assetClass === 'options' ? strategy : getStrategy('index_options_pulse')
    return scoreOptionPicks(optStrategy, marketApi, limit)
  }
  if (m === 'both') {
    const stocks = scorePicks(strategy.assetClass === 'options' ? getStrategy('momentum_breakout') : strategy, marketApi.list(), limit)
    const opts = scoreOptionPicks(getStrategy('index_options_pulse'), marketApi, Math.max(2, Math.floor(limit / 2)))
    return [...stocks, ...opts].sort((a, b) => b.score - a.score).slice(0, limit)
  }
  return scorePicks(strategy, marketApi.list(), limit)
}

function formatVol(v) {
  if (v >= 1e7) return `${(v / 1e7).toFixed(1)}Cr`
  if (v >= 1e5) return `${(v / 1e5).toFixed(1)}L`
  return String(v)
}

/**
 * Size qty so stop distance fits max daily loss / risk budget,
 * and target can approach daily goal.
 */
export function sizeQuantity({
  cash,
  entry,
  stopPct,
  targetPct,
  dailyGoal,
  maxDailyLoss,
  lotSize = 1,
  riskFraction = 0.35,
}) {
  const price = Number(entry)
  const stop = Number(stopPct)
  const target = Number(targetPct)
  const lot = Math.max(1, Number(lotSize) || 1)
  if (!(price > 0) || !(stop > 0)) return 0

  const lossCap = Number(maxDailyLoss) > 0
    ? Number(maxDailyLoss)
    : Math.max(200, Number(dailyGoal) * riskFraction || 500)
  const riskBudget = Math.max(100, Math.min(Number(cash) * 0.08, lossCap))
  const lossPerUnit = price * stop
  let units = Math.floor(riskBudget / lossPerUnit)

  const maxByCash = Math.floor((Number(cash) * 0.92) / price)
  units = Math.max(0, Math.min(units, maxByCash))

  if (units > 0 && target > 0) {
    const profitPerUnit = price * target
    const goalUnits = Math.max(1, Math.ceil((Number(dailyGoal) || 500) / profitPerUnit))
    units = Math.min(units, goalUnits + (lot > 1 ? lot : 1))
  }

  // Options: round to full lots
  if (lot > 1) {
    const lots = Math.max(0, Math.floor(units / lot))
    return lots * lot
  }

  return units
}
