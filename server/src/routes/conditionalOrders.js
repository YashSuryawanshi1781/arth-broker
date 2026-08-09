import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { authRequired } from '../auth.js'
import { market } from '../market.js'
import { logActivity } from '../activity.js'

const router = Router()
const PRODUCTS = new Set(['delivery', 'intraday'])
const TRIGGER_TYPES = new Set(['above', 'below'])

function mapRow(row) {
  return {
    id: row.id,
    symbol: row.symbol,
    side: row.side,
    product: row.product,
    qty: row.qty,
    triggerType: row.trigger_type,
    triggerPrice: row.trigger_price,
    limitPrice: row.limit_price,
    status: row.status,
    linkedOrderId: row.linked_order_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    triggeredAt: row.triggered_at,
    ltp: market.price(row.symbol),
  }
}

router.get('/', authRequired, (req, res) => {
  const status = req.query.status
  let rows
  if (status) {
    rows = db
      .prepare('SELECT * FROM conditional_orders WHERE user_id = ? AND status = ? ORDER BY created_at DESC')
      .all(req.user.id, status)
  } else {
    rows = db
      .prepare('SELECT * FROM conditional_orders WHERE user_id = ? ORDER BY created_at DESC')
      .all(req.user.id)
  }
  res.json({ orders: rows.map(mapRow) })
})

router.post('/', authRequired, (req, res) => {
  if (!req.user.kyc_complete) {
    return res.status(403).json({ error: 'Complete KYC to place conditional orders', code: 'KYC_REQUIRED' })
  }
  const {
    symbol,
    side = 'buy',
    product = 'delivery',
    qty,
    triggerType = 'above',
    triggerPrice,
    limitPrice,
  } = req.body || {}

  const sym = String(symbol || '').toUpperCase()
  const instrument = market.get(sym)
  if (!instrument) return res.status(404).json({ error: 'Unknown symbol' })
  if (!['buy', 'sell'].includes(side)) return res.status(400).json({ error: 'Invalid side' })
  if (!PRODUCTS.has(product)) return res.status(400).json({ error: 'Invalid product' })
  if (!TRIGGER_TYPES.has(triggerType)) return res.status(400).json({ error: 'Invalid trigger type' })
  const quantity = Number(qty)
  if (!(quantity > 0)) return res.status(400).json({ error: 'Invalid quantity' })
  const trigger = Number(triggerPrice)
  if (!(trigger > 0)) return res.status(400).json({ error: 'Invalid trigger price' })
  const limit = limitPrice != null && limitPrice !== '' ? Number(limitPrice) : null
  if (limit != null && !(limit > 0)) return res.status(400).json({ error: 'Invalid limit price' })

  const id = nanoid(12)
  const now = Date.now()
  db.prepare(`
    INSERT INTO conditional_orders
      (id, user_id, symbol, side, product, qty, trigger_type, trigger_price, limit_price, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'open', ?, ?)
  `).run(id, req.user.id, sym, side, product, quantity, triggerType, trigger, limit, now, now)

  logActivity(req.user.id, 'conditional', `GTT ${side.toUpperCase()} ${sym}`, `Trigger ${triggerType} ₹${trigger}`, {
    id,
    symbol: sym,
    triggerType,
    triggerPrice: trigger,
  })

  res.status(201).json({ order: mapRow(db.prepare('SELECT * FROM conditional_orders WHERE id = ?').get(id)) })
})

router.delete('/:id', authRequired, (req, res) => {
  const row = db
    .prepare('SELECT * FROM conditional_orders WHERE id = ? AND user_id = ?')
    .get(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: 'Conditional order not found' })
  if (row.status !== 'open') return res.status(400).json({ error: 'Only open orders can be cancelled' })

  const now = Date.now()
  db.prepare(`
    UPDATE conditional_orders SET status = 'cancelled', updated_at = ? WHERE id = ?
  `).run(now, row.id)

  logActivity(req.user.id, 'conditional', `Cancelled GTT ${row.symbol}`, `Trigger was ${row.trigger_type} ₹${row.trigger_price}`, {
    id: row.id,
  })

  res.json({ ok: true, order: mapRow(db.prepare('SELECT * FROM conditional_orders WHERE id = ?').get(row.id)) })
})

export default router
