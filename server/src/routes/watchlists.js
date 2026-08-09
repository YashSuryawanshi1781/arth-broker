import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { authRequired } from '../auth.js'

const router = Router()

router.get('/', authRequired, (req, res) => {
  const lists = db
    .prepare('SELECT * FROM watchlists WHERE user_id = ? ORDER BY pinned DESC, sort_order ASC, created_at ASC')
    .all(req.user.id)
  const result = lists.map((wl) => ({
    id: wl.id,
    name: wl.name,
    pinned: !!wl.pinned,
    sortOrder: wl.sort_order || 0,
    symbols: db.prepare('SELECT symbol FROM watchlist_items WHERE watchlist_id = ?').all(wl.id).map((r) => r.symbol),
    createdAt: wl.created_at,
  }))
  res.json({ watchlists: result })
})

router.post('/', authRequired, (req, res) => {
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Name required' })
  const id = nanoid(10)
  const now = Date.now()
  db.prepare('INSERT INTO watchlists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run(
    id, req.user.id, name, now,
  )
  res.status(201).json({ watchlist: { id, name, pinned: false, sortOrder: 0, symbols: [], createdAt: now } })
})

router.patch('/:id', authRequired, (req, res) => {
  const wl = db.prepare('SELECT * FROM watchlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!wl) return res.status(404).json({ error: 'Watchlist not found' })
  const name = String(req.body?.name || '').trim()
  if (!name) return res.status(400).json({ error: 'Name required' })
  db.prepare('UPDATE watchlists SET name = ? WHERE id = ?').run(name, wl.id)
  res.json({
    watchlist: {
      id: wl.id,
      name,
      pinned: !!wl.pinned,
      sortOrder: wl.sort_order || 0,
      symbols: db.prepare('SELECT symbol FROM watchlist_items WHERE watchlist_id = ?').all(wl.id).map((r) => r.symbol),
      createdAt: wl.created_at,
    },
  })
})

router.patch('/:id/pin', authRequired, (req, res) => {
  const wl = db.prepare('SELECT * FROM watchlists WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!wl) return res.status(404).json({ error: 'Watchlist not found' })
  const pinned = req.body?.pinned == null ? (wl.pinned ? 0 : 1) : (req.body.pinned ? 1 : 0)
  db.prepare('UPDATE watchlists SET pinned = ? WHERE id = ?').run(pinned, wl.id)
  res.json({ ok: true, pinned: !!pinned })
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
