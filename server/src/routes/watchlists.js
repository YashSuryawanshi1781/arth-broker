import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { authRequired } from '../auth.js'

const router = Router()

router.get('/', authRequired, (req, res) => {
  const lists = db.prepare('SELECT * FROM watchlists WHERE user_id = ? ORDER BY created_at').all(req.user.id)
  const result = lists.map((wl) => ({
    id: wl.id,
    name: wl.name,
    symbols: db.prepare('SELECT symbol FROM watchlist_items WHERE watchlist_id = ?').all(wl.id).map((r) => r.symbol),
    createdAt: wl.created_at,
  }))
  res.json({ watchlists: result })
})

router.post('/', authRequired, (req, res) => {
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Name required' })
  const id = nanoid(10)
  db.prepare('INSERT INTO watchlists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run(
    id, req.user.id, name, Date.now(),
  )
  res.status(201).json({ watchlist: { id, name, symbols: [], createdAt: Date.now() } })
})

router.post('/:id/symbols', authRequired, (req, res) => {
  const wl = db.prepare('SELECT * FROM watchlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!wl) return res.status(404).json({ error: 'Watchlist not found' })
  const symbol = String(req.body?.symbol || '').toUpperCase()
  if (!symbol) return res.status(400).json({ error: 'Symbol required' })
  db.prepare('INSERT OR IGNORE INTO watchlist_items (watchlist_id, symbol) VALUES (?, ?)').run(wl.id, symbol)
  res.json({ ok: true })
})

router.delete('/:id/symbols/:symbol', authRequired, (req, res) => {
  const wl = db.prepare('SELECT * FROM watchlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!wl) return res.status(404).json({ error: 'Watchlist not found' })
  db.prepare('DELETE FROM watchlist_items WHERE watchlist_id = ? AND symbol = ?').run(
    wl.id, req.params.symbol.toUpperCase(),
  )
  res.json({ ok: true })
})

router.delete('/:id', authRequired, (req, res) => {
  const wl = db.prepare('SELECT * FROM watchlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!wl) return res.status(404).json({ error: 'Watchlist not found' })
  db.prepare('DELETE FROM watchlists WHERE id = ?').run(wl.id)
  res.json({ ok: true })
})

export default router
