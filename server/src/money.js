/** Paisa-safe money helpers shared by orders, reports and wallets. */

export function roundMoney(value) {
  return Math.round((Number(value) || 0) * 100) / 100
}

export const INTRADAY_LEVERAGE = 5

/**
 * NSE-style rough charges used for both live tickets and statements.
 * Delivery brokerage is waived in this demo (Groww/Zerodha zero-brokerage style).
 */
export function computeCharges(value, side, product = 'delivery') {
  const turnover = Math.max(0, Number(value) || 0)
  const brokerage = product === 'intraday' ? Math.min(20, turnover * 0.0003) : 0
  const stt = side === 'buy'
    ? (product === 'delivery' ? turnover * 0.001 : 0)
    : (product === 'delivery' ? turnover * 0.001 : turnover * 0.00025)
  const exchange = turnover * 0.0000297
  const sebi = turnover * 0.000001
  const stampDuty = side === 'buy' ? turnover * (product === 'delivery' ? 0.00015 : 0.00003) : 0
  const gst = (brokerage + exchange + sebi) * 0.18
  return {
    turnover: roundMoney(turnover),
    brokerage: roundMoney(brokerage),
    stt: roundMoney(stt),
    exchange: roundMoney(exchange),
    sebi: roundMoney(sebi),
    stampDuty: roundMoney(stampDuty),
    gst: roundMoney(gst),
    total: roundMoney(brokerage + stt + exchange + sebi + stampDuty + gst),
  }
}

export function marginRequired(notional, product = 'delivery') {
  const value = Math.max(0, Number(notional) || 0)
  if (product === 'intraday') return roundMoney(value / INTRADAY_LEVERAGE)
  return roundMoney(value)
}

export function buyDebit(notional, side, product) {
  const charges = computeCharges(notional, side, product)
  return {
    charges,
    margin: marginRequired(notional, product),
    debit: roundMoney(marginRequired(notional, product) + charges.total),
  }
}
