import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { authRequired, addNotification } from '../auth.js'
import { market } from '../market.js'
import { buyDebit, roundMoney } from '../money.js'
import { adjustCash, settleFilledOrder, writeLedger } from '../orderEngine.js'

const router = Router()
const PRODUCTS = new Set(['delivery', 'intraday'])

function requireKyc(req, res) {
  if (!req.user.kyc_complete) {
    res.status(403).json({ error: 'Complete KYC to place orders', code: 'KYC_REQUIRED' })
    return false
  }
  return true
}

function mapOrder(order) {
  return {
    id: order.id,
    symbol: order.symbol,
    side: order.side,
    type: order.type,
    qty: order.qty,
    price: order.price,
    fillPrice: order.fill_price,
    status: order.status,
    product: order.product,
    reservedCash: order.reserved_cash || 0,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  }
}

router.get('/', authRequired, (req, res) => {
  const status = req.query.status
  let rows
  if (status) {
    rows = db.prepare('SELECT * FROM orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC LIMIT 100')
      .all(req.user.id, status)
  } else {
    rows = db.prepare('SELECT * FROM orders WHERE user_id = ? ORDER BY created_at DESC LIMIT 100').all(req.user.id)
  }

  const summary = db.prepare(`
    SELECT
      COUNT(*) AS all_count,
      SUM(CASE WHEN status = 'open' THEN 1 ELSE 0 END) AS open_count,
      SUM(CASE WHEN status = 'filled' THEN 1 ELSE 0 END) AS filled_count,
      SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) AS cancelled_count
    FROM orders WHERE user_id = ?
  `).get(req.user.id)

  res.json({
    orders: rows.map(mapOrder),
    summary: {
      all: summary.all_count || 0,
      open: summary.open_count || 0,
      filled: summary.filled_count || 0,
      cancelled: summary.cancelled_count || 0,
    },
  })
})

router.post('/preview', authRequired, (req, res) => {
  const { side = 'buy', type = 'market', qty, price, product = 'delivery', symbol } = req.body || {}
  const instrument = market.get(String(symbol || '').toUpperCase())
  if (!instrument) return res.status(404).json({ error: 'Unknown symbol' })
  if (!PRODUCTS.has(product)) return res.status(400).json({ error: 'Invalid product' })
  const quantity = Number(qty)
  if (!Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' })
  const ref = type === 'limit' ? Number(price) : instrument.price
  if (!(ref > 0)) return res.status(400).json({ error: 'Price required' })
  const notional = roundMoney(ref * quantity)
  const { charges, margin, debit } = buyDebit(notional, side, product)
  const holding = db.prepare('SELECT qty FROM holdings WHERE user_id = ? AND symbol = ?')
    .get(req.user.id, instrument.symbol)
  res.json({
    price: ref,
    notional,
    margin,
    charges,
    required: side === 'buy' ? debit : charges.total,
    cash: roundMoney(req.user.cash),
    holdingsQty: holding?.qty || 0,
  })
})

router.post('/', authRequired, (req, res) => {
  if (!requireKyc(req, res)) return
  const { symbol, side, type, qty, price, product = 'delivery' } = req.body || {}
  const sym = String(symbol || '').toUpperCase()
  const instrument = market.get(sym)
  if (!instrument) return res.status(404).json({ error: 'Unknown symbol' })
  if (!['buy', 'sell'].includes(side)) return res.status(400).json({ error: 'Invalid side' })
  if (!['market', 'limit'].includes(type)) return res.status(400).json({ error: 'Invalid type' })
  if (!PRODUCTS.has(product)) return res.status(400).json({ error: 'Invalid product' })
  const quantity = Number(qty)
  if (!Number.isInteger(quantity) || quantity <= 0) return res.status(400).json({ error: 'Invalid quantity' })

  const now = Date.now()
  const id = nanoid(10)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)

  if (type === 'limit') {
    const limitPrice = Number(price)
    if (!(limitPrice > 0)) return res.status(400).json({ error: 'Limit price required' })

    let reservedCash = 0
    if (side === 'buy') {
      const { debit } = buyDebit(roundMoney(limitPrice * quantity), side, product)
      if (roundMoney(user.cash) + 0.009 < debit) {
        return res.status(400).json({ error: 'Insufficient funds for limit order' })
      }
      reservedCash = debit
    } else {
      const holding = db.prepare('SELECT * FROM holdings WHERE user_id = ? AND symbol = ?').get(user.id, sym)
      if (!holding || holding.qty < quantity) {
        return res.status(400).json({ error: 'Insufficient holdings' })
      }
    }

    // Immediate fill when the market is already through the limit.
    const ltp = instrument.price
    const through = side === 'buy' ? ltp <= limitPrice : ltp >= limitPrice
    if (through) {
      try {
        const result = db.transaction(() => {
          if (reservedCash > 0) {
            adjustCash(user.id, -reservedCash)
            writeLedger(user.id, 'debit', reservedCash, `Block ${sym} limit`, now)
          }
          db.prepare(`
            INSERT INTO orders (id, user_id, symbol, side, type, qty, price, fill_price, status, product, reserved_cash, created_at, updated_at)
            VALUES (?, ?, ?, ?, 'limit', ?, ?, NULL, 'open', ?, ?, ?, ?)
          `).run(id, user.id, sym, side, quantity, limitPrice, product, reservedCash, now, now)
          const fillPrice = side === 'buy' ? Math.min(ltp, limitPrice) : Math.max(ltp, limitPrice)
          const settled = settleFilledOrder({
            userId: user.id,
            orderId: id,
            symbol: sym,
            side,
            qty: quantity,
            fillPrice,
            product,
            reservedCash,
            now,
          })
          if (!settled.ok) throw new Error(settled.error)
          return settled
        })()
        addNotification(user.id, 'Order filled', `${side.toUpperCase()} ${quantity} ${sym} @ ₹${roundMoney(result.notional / quantity)}`)
        return res.status(201).json({
          order: mapOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)),
          cash: roundMoney(result.cash),
          charges: result.charges,
        })
      } catch (err) {
        return res.status(400).json({ error: err.message || 'Could not fill limit order' })
      }
    }

    db.transaction(() => {
      if (reservedCash > 0) {
        adjustCash(user.id, -reservedCash)
        writeLedger(user.id, 'debit', reservedCash, `Block ${sym} limit`, now)
      }
      db.prepare(`
        INSERT INTO orders (id, user_id, symbol, side, type, qty, price, fill_price, status, product, reserved_cash, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'limit', ?, ?, NULL, 'open', ?, ?, ?, ?)
      `).run(id, user.id, sym, side, quantity, limitPrice, product, reservedCash, now, now)
    })()

    return res.status(201).json({
      order: mapOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)),
      cash: roundMoney(db.prepare('SELECT cash FROM users WHERE id = ?').get(user.id).cash),
    })
  }

  const fillPrice = instrument.price
  const notional = roundMoney(fillPrice * quantity)

  try {
    const result = db.transaction(() => {
      if (side === 'buy') {
        const { debit } = buyDebit(notional, side, product)
        if (roundMoney(user.cash) + 0.009 < debit) throw new Error('Insufficient funds')
      } else {
        const holding = db.prepare('SELECT * FROM holdings WHERE user_id = ? AND symbol = ?').get(user.id, sym)
        if (!holding || holding.qty < quantity) throw new Error('Insufficient holdings')
      }

      db.prepare(`
        INSERT INTO orders (id, user_id, symbol, side, type, qty, price, fill_price, status, product, reserved_cash, created_at, updated_at)
        VALUES (?, ?, ?, ?, 'market', ?, ?, NULL, 'open', ?, 0, ?, ?)
      `).run(id, user.id, sym, side, quantity, fillPrice, product, now, now)

      const settled = settleFilledOrder({
        userId: user.id,
        orderId: id,
        symbol: sym,
        side,
        qty: quantity,
        fillPrice,
        product,
        reservedCash: 0,
        now,
      })
      if (!settled.ok) throw new Error(settled.error)
      return settled
    })()

    addNotification(user.id, 'Order filled', `${side === 'buy' ? 'Bought' : 'Sold'} ${quantity} ${sym} @ ₹${fillPrice}`)
    res.status(201).json({
      order: mapOrder(db.prepare('SELECT * FROM orders WHERE id = ?').get(id)),
      cash: roundMoney(result.cash),
      charges: result.charges,
    })
  } catch (err) {
    res.status(400).json({ error: err.message || 'Order failed' })
  }
})

router.delete('/:id', authRequired, (req, res) => {
  const order = db.prepare('SELECT * FROM orders WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!order) return res.status(404).json({ error: 'Order not found' })
  if (order.status !== 'open') return res.status(400).json({ error: 'Only open orders can be cancelled' })

  const now = Date.now()
  db.transaction(() => {
    if (order.reserved_cash > 0) {
      adjustCash(order.user_id, order.reserved_cash)
      writeLedger(order.user_id, 'credit', order.reserved_cash, `Unblock ${order.symbol} limit`, now)
    }
    db.prepare(`
      UPDATE orders SET status = 'cancelled', reserved_cash = 0, updated_at = ? WHERE id = ?
    `).run(now, order.id)
  })()

  res.json({
    ok: true,
    cash: roundMoney(db.prepare('SELECT cash FROM users WHERE id = ?').get(req.user.id).cash),
  })
})

export default router
