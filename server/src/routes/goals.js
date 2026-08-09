import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { authRequired } from '../auth.js'
import { logActivity } from '../activity.js'

const router = Router()

function mapGoal(row) {
  return {
    id: row.id,
    name: row.name,
    targetAmount: row.target_amount,
    targetDate: row.target_date,
    monthlySip: row.monthly_sip,
    createdAt: row.created_at,
  }
}

router.get('/', authRequired, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM goals WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id)
  res.json({ goals: rows.map(mapGoal) })
})

router.post('/', authRequired, (req, res) => {
  const name = String(req.body?.name || '').trim()
  const targetAmount = Number(req.body?.targetAmount)
  const monthlySip = req.body?.monthlySip != null ? Number(req.body.monthlySip) : null
  let targetDate = null
  if (req.body?.targetDate) {
    const ts = Date.parse(req.body.targetDate)
    if (!Number.isNaN(ts)) targetDate = ts
    else if (Number(req.body.targetDate) > 0) targetDate = Number(req.body.targetDate)
  }
  if (!name) return res.status(400).json({ error: 'Goal name required' })
  if (!(targetAmount > 0)) return res.status(400).json({ error: 'Target amount required' })

  const id = nanoid(12)
  const now = Date.now()
  db.prepare(`
    INSERT INTO goals (id, user_id, name, target_amount, target_date, monthly_sip, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(id, req.user.id, name, targetAmount, targetDate, monthlySip, now)

  logActivity(req.user.id, 'goal', `Goal: ${name}`, `Target ₹${targetAmount.toLocaleString('en-IN')}`, { id })

  res.status(201).json({ goal: mapGoal(db.prepare('SELECT * FROM goals WHERE id = ?').get(id)) })
})

router.delete('/:id', authRequired, (req, res) => {
  const row = db.prepare('SELECT * FROM goals WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!row) return res.status(404).json({ error: 'Goal not found' })
  db.prepare('DELETE FROM goals WHERE id = ?').run(row.id)
  logActivity(req.user.id, 'goal', `Removed goal: ${row.name}`, '', { id: row.id })
  res.json({ ok: true })
})

export default router
