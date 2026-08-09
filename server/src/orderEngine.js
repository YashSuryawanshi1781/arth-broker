import { nanoid } from 'nanoid'
import { db } from './db.js'
import { buyDebit, computeCharges, roundMoney } from './money.js'

function insertTradeLot(userId, symbol, qty, price, now) {
  db.prepare(`
    INSERT INTO trade_lots (id, user_id, symbol, qty, remaining_qty, avg_price, bought_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(nanoid(12), userId, symbol, qty, qty, price, now)
}

/** Consume open lots FIFO on sell; returns false if insufficient remaining qty. */
function consumeTradeLots(userId, symbol, qty) {
  const lots = db
    .prepare(`
      SELECT * FROM trade_lots
      WHERE user_id = ? AND symbol = ? AND remaining_qty > 0
      ORDER BY bought_at ASC
    `)
    .all(userId, symbol)
  const available = lots.reduce((sum, lot) => sum + lot.remaining_qty, 0)
  if (available + 1e-9 < qty) return false

  let left = qty
  const update = db.prepare('UPDATE trade_lots SET remaining_qty = ? WHERE id = ?')
  for (const lot of lots) {
    if (left <= 0) break
    const take = Math.min(lot.remaining_qty, left)
    update.run(roundMoney(lot.remaining_qty - take), lot.id)
    left = roundMoney(left - take)
  }
  return true
}

function applyBook(table, userId, symbol, qtyDelta, price) {
  const row = db.prepare(`SELECT * FROM ${table} WHERE user_id = ? AND symbol = ?`).get(userId, symbol)
  if (!row) {
    if (qtyDelta <= 0) return false
    db.prepare(`INSERT INTO ${table} (user_id, symbol, qty, avg_price) VALUES (?, ?, ?, ?)`).run(
      userId, symbol, qtyDelta, price,
    )
    return true
  }
  const newQty = row.qty + qtyDelta
  if (newQty < 0) return false
  if (newQty === 0) {
    db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND symbol = ?`).run(userId, symbol)
    return true
  }
  const avg = qtyDelta > 0
    ? +(((row.avg_price * row.qty) + price * qtyDelta) / newQty).toFixed(2)
    : row.avg_price
  db.prepare(`UPDATE ${table} SET qty = ?, avg_price = ? WHERE user_id = ? AND symbol = ?`).run(
    newQty, avg, userId, symbol,
  )
  return true
}

export function applyHolding(userId, symbol, qtyDelta, price) {
  return applyBook('holdings', userId, symbol, qtyDelta, price)
}

export function applyPosition(userId, symbol, qtyDelta, price) {
  return applyBook('positions', userId, symbol, qtyDelta, price)
}

export function bookQty(userId, symbol, product) {
  const table = product === 'intraday' ? 'positions' : 'holdings'
  const row = db.prepare(`SELECT qty FROM ${table} WHERE user_id = ? AND symbol = ?`).get(userId, symbol)
  return row?.qty || 0
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

  const isMis = product === 'intraday'

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
    if (isMis) {
      if (!applyPosition(userId, symbol, qty, fillPrice)) {
        return { ok: false, error: 'Could not open position' }
      }
    } else {
      applyHolding(userId, symbol, qty, fillPrice)
      insertTradeLot(userId, symbol, qty, fillPrice, now)
    }
    writeLedger(userId, 'debit', margin, `Buy ${qty} ${symbol}${isMis ? ' MIS' : ''}`, now)
    if (charges.total > 0) {
      if (!(reservedCash > 0)) adjustCash(userId, -charges.total)
      writeLedger(userId, 'debit', charges.total, `Charges ${symbol}`, now)
    }
  } else {
    if (isMis) {
      if (!applyPosition(userId, symbol, -qty, fillPrice)) {
        return { ok: false, error: 'Insufficient intraday position' }
      }
    } else {
      if (!consumeTradeLots(userId, symbol, qty)) {
        // Legacy holdings without lots — still allow the sell.
      }
      if (!applyHolding(userId, symbol, -qty, fillPrice)) {
        return { ok: false, error: 'Insufficient holdings' }
      }
    }
    adjustCash(userId, notional)
    writeLedger(userId, 'credit', notional, `Sell ${qty} ${symbol}${isMis ? ' MIS' : ''}`, now)
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
