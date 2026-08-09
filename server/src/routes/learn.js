import { Router } from 'express'
import { db } from '../db.js'
import { authRequired, publicUser } from '../auth.js'
import { LESSONS, CHALLENGES, GLOSSARY } from '../learnContent.js'
import { logActivity } from '../activity.js'
import { market } from '../market.js'
import { roundMoney } from '../money.js'
import { PAPER_STARTING_CASH } from '../paperTrading.js'

const router = Router()

function mapPracticeOrder(order) {
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
    isPractice: !!order.is_practice,
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  }
}

function practiceBook(userId) {
  const cash = roundMoney(db.prepare('SELECT cash FROM users WHERE id = ?').get(userId)?.cash || 0)
  const orders = db.prepare(`
    SELECT * FROM orders
    WHERE user_id = ? AND is_practice = 1
    ORDER BY created_at DESC
    LIMIT 40
  `).all(userId).map(mapPracticeOrder)

  const practiceSymbols = new Set(
    db.prepare(`
      SELECT DISTINCT symbol FROM orders
      WHERE user_id = ? AND is_practice = 1
    `).all(userId).map((r) => r.symbol),
  )

  const holdings = db.prepare('SELECT symbol, qty, avg_price FROM holdings WHERE user_id = ?').all(userId)
    .filter((h) => practiceSymbols.has(h.symbol) && h.qty > 0)
    .map((h) => {
      const ltp = market.get(h.symbol)?.price || h.avg_price
      const invested = roundMoney(h.qty * h.avg_price)
      const current = roundMoney(h.qty * ltp)
      return {
        symbol: h.symbol,
        qty: h.qty,
        avgPrice: h.avg_price,
        ltp,
        invested,
        current,
        pnl: roundMoney(current - invested),
        product: 'delivery',
      }
    })

  const positions = db.prepare('SELECT symbol, qty, avg_price FROM positions WHERE user_id = ?').all(userId)
    .filter((h) => practiceSymbols.has(h.symbol) && h.qty > 0)
    .map((h) => {
      const ltp = market.get(h.symbol)?.price || h.avg_price
      const invested = roundMoney(h.qty * h.avg_price)
      const current = roundMoney(h.qty * ltp)
      return {
        symbol: h.symbol,
        qty: h.qty,
        avgPrice: h.avg_price,
        ltp,
        invested,
        current,
        pnl: roundMoney(current - invested),
        product: 'intraday',
      }
    })

  const filled = orders.filter((o) => o.status === 'filled')
  const open = orders.filter((o) => o.status === 'open')
  const invested = [...holdings, ...positions].reduce((s, h) => s + h.invested, 0)
  const current = [...holdings, ...positions].reduce((s, h) => s + h.current, 0)

  return {
    cash,
    startingCash: PAPER_STARTING_CASH,
    orders,
    openOrders: open,
    holdings,
    positions,
    summary: {
      tradeCount: filled.length,
      openCount: open.length,
      holdingCount: holdings.length + positions.length,
      invested: roundMoney(invested),
      current: roundMoney(current),
      pnl: roundMoney(current - invested),
    },
  }
}

router.get('/content', authRequired, (req, res) => {
  const done = new Set(
    db.prepare('SELECT challenge_id FROM learning_progress WHERE user_id = ?').all(req.user.id).map((r) => r.challenge_id),
  )
  res.json({
    learningMode: !!req.user.learning_mode,
    lessons: LESSONS,
    challenges: CHALLENGES.map((c) => ({ ...c, completed: done.has(c.id) })),
    glossary: GLOSSARY,
    completedCount: done.size,
    totalChallenges: CHALLENGES.length,
    practice: practiceBook(req.user.id),
  })
})

router.get('/practice', authRequired, (req, res) => {
  res.json(practiceBook(req.user.id))
})

router.post('/lessons/:id/complete', authRequired, (req, res) => {
  const lesson = LESSONS.find((l) => l.id === req.params.id)
  if (!lesson) return res.status(404).json({ error: 'Lesson not found' })
  const id = `lesson:${lesson.id}`
  const now = Date.now()
  db.prepare(`
    INSERT INTO learning_progress (user_id, challenge_id, completed_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, challenge_id) DO UPDATE SET completed_at = excluded.completed_at
  `).run(req.user.id, id, now)
  // Also mark read-lesson challenge
  db.prepare(`
    INSERT INTO learning_progress (user_id, challenge_id, completed_at)
    VALUES (?, 'read-lesson', ?)
    ON CONFLICT(user_id, challenge_id) DO NOTHING
  `).run(req.user.id, now)
  logActivity(req.user.id, 'lesson', `Completed lesson: ${lesson.title}`, lesson.summary)
  res.json({ ok: true })
})

router.post('/challenges/:id/complete', authRequired, (req, res) => {
  const challenge = CHALLENGES.find((c) => c.id === req.params.id)
  if (!challenge) return res.status(404).json({ error: 'Challenge not found' })
  const now = Date.now()
  db.prepare(`
    INSERT INTO learning_progress (user_id, challenge_id, completed_at)
    VALUES (?, ?, ?)
    ON CONFLICT(user_id, challenge_id) DO UPDATE SET completed_at = excluded.completed_at
  `).run(req.user.id, challenge.id, now)
  logActivity(req.user.id, 'challenge', `Challenge done: ${challenge.title}`, challenge.hint)
  res.json({ ok: true })
})

router.patch('/mode', authRequired, (req, res) => {
  const enabled = req.body?.enabled !== false
  db.prepare('UPDATE users SET learning_mode = ? WHERE id = ?').run(enabled ? 1 : 0, req.user.id)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ user: publicUser(user) })
})

/** Auto-detect challenge completion from account state. */
router.post('/sync', authRequired, (req, res) => {
  const uid = req.user.id
  const now = Date.now()
  const mark = (id) => {
    db.prepare(`
      INSERT INTO learning_progress (user_id, challenge_id, completed_at)
      VALUES (?, ?, ?)
      ON CONFLICT(user_id, challenge_id) DO NOTHING
    `).run(uid, id, now)
  }

  const deliveryBuy = db.prepare(`
    SELECT id FROM orders WHERE user_id = ? AND side = 'buy' AND product = 'delivery' AND status = 'filled' LIMIT 1
  `).get(uid)
  if (deliveryBuy) mark('buy-delivery')

  const limitOpen = db.prepare(`
    SELECT id FROM orders WHERE user_id = ? AND type = 'limit' AND status = 'open' LIMIT 1
  `).get(uid)
  if (limitOpen) mark('limit-below')

  const sip = db.prepare(`SELECT id FROM sips WHERE user_id = ? AND status = 'active' LIMIT 1`).get(uid)
  if (sip) mark('start-sip')

  const alert = db.prepare(`SELECT id FROM price_alerts WHERE user_id = ? LIMIT 1`).get(uid)
  if (alert) mark('set-alert')

  const done = db.prepare('SELECT challenge_id FROM learning_progress WHERE user_id = ?').all(uid)
  res.json({ completed: done.map((d) => d.challenge_id) })
})

export default router
