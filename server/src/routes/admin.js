import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db, DEMO_EMAIL } from '../db.js'
import { authRequired, publicUser, addNotification } from '../auth.js'
import { logActivity } from '../activity.js'
import { PAPER_STARTING_CASH } from '../paperTrading.js'

const router = Router()

router.post('/reset-demo', authRequired, (req, res) => {
  if (req.user.email !== DEMO_EMAIL) {
    return res.status(403).json({ error: 'Demo reset is only available for the demo account' })
  }

  const userId = req.user.id
  const now = Date.now()

  db.transaction(() => {
    db.prepare('DELETE FROM orders WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM holdings WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM positions WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM trade_lots WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM ledger WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM conditional_orders WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM price_alerts WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM activity_events WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM notifications WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM goals WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM mf_transactions WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM mf_holdings WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM sips WHERE user_id = ?').run(userId)
    db.prepare('DELETE FROM ipo_applications WHERE user_id = ?').run(userId)

    // Fresh paper wallet: ₹1L fake cash, no leftover positions from prior practice.
    db.prepare('UPDATE users SET cash = ? WHERE id = ?').run(PAPER_STARTING_CASH, userId)

    db.prepare(
      'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(
      nanoid(10),
      userId,
      'credit',
      PAPER_STARTING_CASH,
      PAPER_STARTING_CASH,
      'Paper trading reset — ₹1,00,000 fake currency',
      now,
    )

    addNotification(
      userId,
      'Paper wallet reset',
      'Portfolio cleared. ₹1,00,000 paper cash ready — buy & sell to learn. Not real money.',
    )
    logActivity(userId, 'admin', 'Paper wallet reset', `Cash ₹${PAPER_STARTING_CASH.toLocaleString('en-IN')} restored`)
  })()

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  res.json({ ok: true, user: publicUser(user) })
})

export default router
