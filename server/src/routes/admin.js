import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db, DEMO_EMAIL } from '../db.js'
import { authRequired, publicUser, addNotification } from '../auth.js'
import { logActivity } from '../activity.js'

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

    db.prepare('UPDATE users SET cash = 250000 WHERE id = ?').run(userId)

    for (const [symbol, qty, avg] of [
      ['RELIANCE', 15, 2750],
      ['TCS', 8, 3800],
      ['INFY', 20, 1500],
    ]) {
      db.prepare('INSERT INTO holdings (user_id, symbol, qty, avg_price) VALUES (?, ?, ?, ?)').run(
        userId, symbol, qty, avg,
      )
      db.prepare(`
        INSERT INTO trade_lots (id, user_id, symbol, qty, remaining_qty, avg_price, bought_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(nanoid(12), userId, symbol, qty, qty, avg, now)
    }

    db.prepare(
      'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(nanoid(10), userId, 'credit', 250000, 250000, 'Demo reset wallet', now)

    db.prepare(
      'INSERT INTO mf_holdings (id, user_id, fund_id, units, avg_nav, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    ).run(nanoid(10), userId, 'mf-parag', 120.5, 78.2, now)

    db.prepare(
      'INSERT INTO sips (id, user_id, fund_id, amount, day_of_month, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(nanoid(10), userId, 'mf-uti', 5000, 5, 'active', now)

    addNotification(userId, 'Demo reset', 'Portfolio and wallet restored to sample state.')
    logActivity(userId, 'admin', 'Demo account reset', 'Cash ₹2,50,000 and sample holdings restored')
  })()

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  res.json({ ok: true, user: publicUser(user) })
})

export default router
