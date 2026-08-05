import { Router } from 'express'
import { db } from '../db.js'
import { authRequired } from '../auth.js'

const router = Router()

router.get('/', authRequired, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 40')
    .all(req.user.id)
    .map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      read: !!n.read,
      createdAt: n.created_at,
    }))
  res.json({ notifications: rows })
})

router.post('/read-all', authRequired, (req, res) => {
  db.prepare('UPDATE notifications SET read = 1 WHERE user_id = ?').run(req.user.id)
  res.json({ ok: true })
})

export default router
