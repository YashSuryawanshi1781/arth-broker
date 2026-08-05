import { nanoid } from 'nanoid'
import { db } from './db.js'
import { buyDebit, computeCharges, roundMoney } from './money.js'

export function applyHolding(userId, symbol, qtyDelta, price) {
  const row = db.prepare('SELECT * FROM holdings WHERE user_id = ? AND symbol = ?').get(userId, symbol)
  if (!row) {
    if (qtyDelta <= 0) return false
    db.prepare('INSERT INTO holdings (user_id, symbol, qty, avg_price) VALUES (?, ?, ?, ?)').run(
      userId, symbol, qtyDelta, price,
    )
    return true
  }
  const newQty = row.qty + qtyDelta
  if (newQty < 0) return false
  if (newQty === 0) {
    db.prepare('DELETE FROM holdings WHERE user_id = ? AND symbol = ?').run(userId, symbol)
    return true
  }
  const avg = qtyDelta > 0
    ? +(((row.avg_price * row.qty) + price * qtyDelta) / newQty).toFixed(2)
    : row.avg_price
  db.prepare('UPDATE holdings SET qty = ?, avg_price = ? WHERE user_id = ? AND symbol = ?').run(
    newQty, avg, userId, symbol,
  )
  return true
}

export function writeLedger(userId, type, amount, note, now = Date.now()) {
  const cash = db.prepare('SELECT cash FROM users WHERE id = ?').get(userId).cash
  db.prepare(
    'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(nanoid(10), userId, type, amount, cash, note, now)
}

export function adjustCash(userId, delta) {
  db.prepare('UPDATE users SET cash = ROUND(cash + ?, 2) WHERE id = ?').run(delta, userId)
}

/**
 * Execute a filled order against cash / holdings. Used by market fills and the
 * limit-order matcher. Callers must wrap in a transaction when needed.
 */
export function settleFilledOrder({
  userId,
  orderId,
  symbol,
  side,
  qty,
  fillPrice,
  product,
  reservedCash = 0,
  now = Date.now(),
}) {
  const notional = roundMoney(fillPrice * qty)
  const charges = computeCharges(notional, side, product)

  if (side === 'buy') {
    const { debit, margin } = buyDebit(notional, side, product)
    const user = db.prepare('SELECT cash FROM users WHERE id = ?').get(userId)
    const available = roundMoney((user?.cash || 0) + reservedCash)
    if (available + 0.009 < debit) return { ok: false, error: 'Insufficient funds' }

    if (reservedCash > 0) {
      const delta = roundMoney(debit - reservedCash)
      if (delta !== 0) adjustCash(userId, -delta)
    } else {
      adjustCash(userId, -margin)
    }
    applyHolding(userId, symbol, qty, fillPrice)
    writeLedger(userId, 'debit', margin, `Buy ${qty} ${symbol}`, now)
    if (charges.total > 0) {
      if (!(reservedCash > 0)) adjustCash(userId, -charges.total)
      writeLedger(userId, 'debit', charges.total, `Charges ${symbol}`, now)
    }
  } else {
    if (!applyHolding(userId, symbol, -qty, fillPrice)) {
      return { ok: false, error: 'Insufficient holdings' }
    }
    adjustCash(userId, notional)
    writeLedger(userId, 'credit', notional, `Sell ${qty} ${symbol}`, now)
    if (charges.total > 0) {
      adjustCash(userId, -charges.total)
      writeLedger(userId, 'debit', charges.total, `Charges ${symbol}`, now)
    }
  }

  db.prepare(`
    UPDATE orders
    SET status = 'filled', fill_price = ?, reserved_cash = 0, updated_at = ?
    WHERE id = ?
  `).run(fillPrice, now, orderId)

  return {
    ok: true,
    notional,
    charges,
    cash: db.prepare('SELECT cash FROM users WHERE id = ?').get(userId).cash,
  }
}
