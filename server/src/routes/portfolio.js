import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { authRequired, publicUser, addNotification } from '../auth.js'
import { market } from '../market.js'
import { analyticsForUser } from '../portfolioAnalytics.js'
import { settleFilledOrder } from '../orderEngine.js'

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

router.get('/dividends', authRequired, (req, res) => {
  const holdings = db.prepare('SELECT * FROM holdings WHERE user_id = ?').all(req.user.id)
  const yieldBySymbol = {
    TCS: 1.4,
    INFY: 2.1,
    RELIANCE: 0.4,
    HDFCBANK: 1.2,
    SBIN: 1.8,
    ITC: 3.2,
    WIPRO: 0.9,
    TITAN: 0.3,
  }
  const rows = holdings.map((h) => {
    const ltp = market.price(h.symbol) || h.avg_price
    const value = ltp * h.qty
    const yieldPct = yieldBySymbol[h.symbol] ?? 1.0
    const projected = +(value * (yieldPct / 100)).toFixed(2)
    return {
      symbol: h.symbol,
      name: market.get(h.symbol)?.name || h.symbol,
      qty: h.qty,
      value: +value.toFixed(2),
      yieldPct,
      projectedAnnual: projected,
    }
  })
  const totalProjected = +rows.reduce((s, r) => s + r.projectedAnnual, 0).toFixed(2)
  const portfolioValue = +rows.reduce((s, r) => s + r.value, 0).toFixed(2)
  res.json({
    dividends: rows,
    totalProjected,
    portfolioYieldPct: portfolioValue ? +((totalProjected / portfolioValue) * 100).toFixed(2) : 0,
    note: 'Projected yield is illustrative demo data.',
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

router.get('/positions', authRequired, (req, res) => {
  const positions = db.prepare('SELECT * FROM positions WHERE user_id = ?').all(req.user.id).map((p) => {
    const ltp = market.price(p.symbol) || p.avg_price
    const cost = p.avg_price * p.qty
    const value = ltp * p.qty
    return {
      symbol: p.symbol,
      name: market.get(p.symbol)?.name || p.symbol,
      qty: p.qty,
      avgPrice: p.avg_price,
      ltp,
      value: +value.toFixed(2),
      pnl: +(value - cost).toFixed(2),
      pnlPct: cost ? +(((value - cost) / cost) * 100).toFixed(2) : 0,
      product: 'intraday',
    }
  })
  res.json({
    positions,
    squareOffNote: 'Open MIS positions auto square-off near 15:20 IST (paper).',
  })
})

router.post('/positions/square-off', authRequired, (req, res) => {
  const mine = db.prepare('SELECT * FROM positions WHERE user_id = ? AND qty > 0').all(req.user.id)
  if (!mine.length) return res.json({ squared: 0, message: 'No open positions' })

  const now = Date.now()
  let squared = 0
  for (const pos of mine) {
    const price = market.price(pos.symbol)
    if (!(price > 0)) continue
    const orderId = nanoid(10)
    try {
      db.transaction(() => {
        db.prepare(`
          INSERT INTO orders (id, user_id, symbol, side, type, qty, price, fill_price, status, product, reserved_cash, created_at, updated_at)
          VALUES (?, ?, ?, 'sell', 'market', ?, ?, NULL, 'open', 'intraday', 0, ?, ?)
        `).run(orderId, req.user.id, pos.symbol, pos.qty, price, now, now)
        const settled = settleFilledOrder({
          userId: req.user.id,
          orderId,
          symbol: pos.symbol,
          side: 'sell',
          qty: pos.qty,
          fillPrice: price,
          product: 'intraday',
          reservedCash: 0,
          now,
        })
        if (!settled.ok) throw new Error(settled.error)
      })()
      addNotification(req.user.id, 'Squared off', `Sold ${pos.qty} ${pos.symbol} MIS`)
      squared += 1
    } catch (err) {
      console.warn(err.message)
    }
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ squared, user: publicUser(user) })
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
