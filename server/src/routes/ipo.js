import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { authRequired, addNotification, publicUser } from '../auth.js'
import { IPOS } from '../market.js'
import { roundMoney } from '../money.js'

const router = Router()
const ipoMap = Object.fromEntries(IPOS.map((i) => [i.id, i]))

router.get('/', (_req, res) => {
  res.json({ ipos: IPOS })
})

router.get('/applications', authRequired, (req, res) => {
  const apps = db
    .prepare('SELECT * FROM ipo_applications WHERE user_id = ? ORDER BY created_at DESC')
    .all(req.user.id)
    .map((a) => ({
      id: a.id,
      ipoId: a.ipo_id,
      name: ipoMap[a.ipo_id]?.name || a.ipo_id,
      lots: a.lots,
      amount: a.amount,
      status: a.status,
      upi: a.upi,
      createdAt: a.created_at,
    }))
  res.json({ applications: apps })
})

router.post('/apply', authRequired, (req, res) => {
  if (!req.user.kyc_complete) return res.status(403).json({ error: 'Complete KYC first', code: 'KYC_REQUIRED' })
  const ipo = ipoMap[req.body?.ipoId]
  if (!ipo) return res.status(404).json({ error: 'IPO not found' })
  if (ipo.status !== 'open') return res.status(400).json({ error: 'IPO is not open for applications' })
  const lots = Number(req.body?.lots) || 1
  if (lots < 1 || lots > 10) return res.status(400).json({ error: 'Lots must be 1–10' })
  const upi = String(req.body?.upi || '').trim()
  if (!upi.includes('@')) return res.status(400).json({ error: 'Valid UPI ID required' })

  const existing = db.prepare(
    'SELECT id FROM ipo_applications WHERE user_id = ? AND ipo_id = ? AND status = ?',
  ).get(req.user.id, ipo.id, 'submitted')
  if (existing) return res.status(409).json({ error: 'You already applied for this IPO' })

  const amount = roundMoney(ipo.priceMax * ipo.lotSize * lots)
  if (roundMoney(req.user.cash) + 0.009 < amount) {
    return res.status(400).json({ error: 'Insufficient funds to block IPO amount' })
  }

  const id = nanoid(10)
  const now = Date.now()
  let cash = 0
  db.transaction(() => {
    db.prepare('UPDATE users SET cash = ROUND(cash - ?, 2) WHERE id = ?').run(amount, req.user.id)
    cash = db.prepare('SELECT cash FROM users WHERE id = ?').get(req.user.id).cash
    db.prepare(`
      INSERT INTO ipo_applications (id, user_id, ipo_id, lots, amount, status, upi, created_at)
      VALUES (?, ?, ?, ?, ?, 'submitted', ?, ?)
    `).run(id, req.user.id, ipo.id, lots, amount, upi, now)
    db.prepare(
      'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(nanoid(10), req.user.id, 'debit', amount, cash, `IPO block ${ipo.name}`, now)
  })()

  addNotification(req.user.id, 'IPO applied', `₹${amount.toLocaleString('en-IN')} blocked for ${lots} lot(s) of ${ipo.name}`)
  res.status(201).json({
    id,
    amount,
    status: 'submitted',
    user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)),
  })
})

export default router
