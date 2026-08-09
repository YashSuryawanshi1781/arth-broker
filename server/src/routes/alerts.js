import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { authRequired } from '../auth.js'
import { market } from '../market.js'

const router = Router()

function mapAlert(row) {
  return {
    id: row.id,
    symbol: row.symbol,
    direction: row.direction,
    targetPrice: row.target_price,
    note: row.note,
    triggeredAt: row.triggered_at,
    createdAt: row.created_at,
    ltp: market.price(row.symbol) || market.getIndex(row.symbol)?.value || null,
  }
}

router.get('/', authRequired, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM price_alerts WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id)
  res.json({ alerts: rows.map(mapAlert) })
})

router.post('/', authRequired, (req, res) => {
  const symbol = String(req.body?.symbol || '').toUpperCase()
  const direction = req.body?.direction === 'below' ? 'below' : 'above'
  const targetPrice = Number(req.body?.targetPrice)
  const note = String(req.body?.note || '').slice(0, 120)
  const known = market.get(symbol) || market.getIndex(symbol)
  if (!known) return res.status(404).json({ error: 'Unknown symbol' })
  if (!(targetPrice > 0)) return res.status(400).json({ error: 'Enter a valid target price' })

  const id = nanoid(12)
  const now = Date.now()
  db.prepare(`
    INSERT INTO price_alerts (id, user_id, symbol, direction, target_price, note, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, symbol, direction, targetPrice, note, now)

  res.status(201).json({ alert: mapAlert(db.prepare('SELECT * FROM price_alerts WHERE id = ?').get(id)) })
})

router.delete('/:id', authRequired, (req, res) => {
  const row = db.prepare('SELECT * FROM price_alerts WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: 'Alert not found' })
  db.prepare('DELETE FROM price_alerts WHERE id = ?').run(row.id)
  res.json({ ok: true })
})

export default router
