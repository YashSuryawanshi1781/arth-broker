export function enrichHoldings(holdings = [], instruments = {}) {
  return holdings.map((holding) => {
    const instrument = instruments[holding.symbol]
    const ltp = instrument?.price ?? holding.ltp ?? holding.avgPrice
    const cost = holding.avgPrice * holding.qty
    const value = ltp * holding.qty
    const pnl = value - cost
    const dayPnl = instrument?.prevClose != null
      ? (ltp - instrument.prevClose) * holding.qty
      : 0

    return {
      ...holding,
      ltp,
      value,
      cost,
      pnl,
      pnlPct: cost ? (pnl / cost) * 100 : 0,
      dayPnl,
      dayChangePct: instrument?.changePct ?? holding.dayChangePct ?? 0,
      sector: instrument?.sector ?? holding.sector ?? 'Other',
      lastUpdate: instrument?.lastUpdate,
    }
  })
}

export function portfolioTotals(holdings = [], cash = 0) {
  const invested = holdings.reduce((sum, holding) => sum + holding.cost, 0)
  const current = holdings.reduce((sum, holding) => sum + holding.value, 0)
  const pnl = current - invested

  return {
    invested,
    current,
    cash,
    equity: current + cash,
    pnl,
    pnlPct: invested ? (pnl / invested) * 100 : 0,
    dayPnl: holdings.reduce((sum, holding) => sum + holding.dayPnl, 0),
  }
}
