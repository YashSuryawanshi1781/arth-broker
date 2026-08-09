import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { authRequired, publicUser } from '../auth.js'
import { market } from '../market.js'
import { addNotification } from '../auth.js'
import { analyticsForUser } from '../portfolioAnalytics.js'

const router = Router()

router.get('/analytics', authRequired, (req, res) => {
  res.json(analyticsForUser(req.user.id))
})

router.get('/summary', authRequired, (req, res) => {
  const holdings = db.prepare('SELECT * FROM holdings WHERE user_id = ?').all(req.user.id)
  let invested = 0
  let current = 0
  const mapped = holdings.map((h) => {
    const ltp = market.price(h.symbol) || h.avg_price
    const value = ltp * h.qty
    const cost = h.avg_price * h.qty
    invested += cost
    current += value
    return {
      symbol: h.symbol,
      name: market.get(h.symbol)?.name || h.symbol,
      qty: h.qty,
      avgPrice: h.avg_price,
      ltp,
      pnl: +(value - cost).toFixed(2),
      pnlPct: cost ? +(((value - cost) / cost) * 100).toFixed(2) : 0,
      dayChangePct: market.get(h.symbol)?.changePct || 0,
    }
  })
  const cash = req.user.cash
  res.json({
    cash,
    invested: +invested.toFixed(2),
    current: +current.toFixed(2),
    totalPnl: +(current - invested).toFixed(2),
    equity: +(cash + current).toFixed(2),
    holdings: mapped,
  })
})

router.get('/holdings', authRequired, (req, res) => {
  const holdings = db.prepare('SELECT * FROM holdings WHERE user_id = ?').all(req.user.id).map((h) => {
    const ltp = market.price(h.symbol) || h.avg_price
    const cost = h.avg_price * h.qty
    const value = ltp * h.qty
    return {
      symbol: h.symbol,
      name: market.get(h.symbol)?.name || h.symbol,
      qty: h.qty,
      avgPrice: h.avg_price,
      ltp,
      value: +value.toFixed(2),
      pnl: +(value - cost).toFixed(2),
      pnlPct: cost ? +(((value - cost) / cost) * 100).toFixed(2) : 0,
    }
  })
  res.json({ holdings })
})

router.get('/funds', authRequired, (req, res) => {
  const ledger = db
    .prepare('SELECT * FROM ledger WHERE user_id = ? ORDER BY created_at DESC LIMIT 50')
    .all(req.user.id)
    .map((l) => ({
      id: l.id,
      type: l.type,
      amount: l.amount,
      balanceAfter: l.balance_after,
      note: l.note,
      createdAt: l.created_at,
    }))
  res.json({ cash: req.user.cash, ledger })
})

router.post('/funds/add', authRequired, (req, res) => {
  const amount = Number(req.body?.amount)
  if (!(amount > 0) || amount > 500000) {
    return res.status(400).json({ error: 'Enter amount between ₹1 and ₹5,00,000' })
  }
  // Simulate gateway: 8% chance of failure
  if (Math.random() < 0.08) {
    return res.status(402).json({ error: 'Payment gateway declined (simulated). Try again.' })
  }
  const now = Date.now()
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET cash = cash + ? WHERE id = ?').run(amount, req.user.id)
    const cash = db.prepare('SELECT cash FROM users WHERE id = ?').get(req.user.id).cash
    db.prepare(
      'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(nanoid(10), req.user.id, 'credit', amount, cash, 'Add money (Razorpay mock)', now)
  })
  tx()
  addNotification(req.user.id, 'Money added', `₹${amount.toLocaleString('en-IN')} credited to wallet`)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ user: publicUser(user) })
})

router.post('/funds/withdraw', authRequired, (req, res) => {
  const amount = Number(req.body?.amount)
  if (!(amount > 0)) return res.status(400).json({ error: 'Invalid amount' })
  if (amount > req.user.cash) return res.status(400).json({ error: 'Insufficient balance' })
  if (!req.user.bank_account) return res.status(400).json({ error: 'Link a bank account in KYC first' })
  const now = Date.now()
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET cash = cash - ? WHERE id = ?').run(amount, req.user.id)
    const cash = db.prepare('SELECT cash FROM users WHERE id = ?').get(req.user.id).cash
    db.prepare(
      'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(nanoid(10), req.user.id, 'debit', amount, cash, 'Withdraw to bank (mock)', now)
  })
  tx()
  addNotification(req.user.id, 'Withdrawal initiated', `₹${amount.toLocaleString('en-IN')} sent to linked bank`)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ user: publicUser(user) })
})

export default router
