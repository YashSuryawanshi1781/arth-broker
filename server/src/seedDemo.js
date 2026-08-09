import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { db, DEMO_EMAIL } from './db.js'
import { PAPER_STARTING_CASH } from './paperTrading.js'

/** Idempotent demo account for production / interview demos. */
export async function ensureDemoUser() {
  const email = DEMO_EMAIL
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email)
  if (existing) {
    console.log('Demo user ready:', email)
    return existing.id
  }

  const id = nanoid(12)
  const hash = await bcrypt.hash('Demo@1234', 10)
  const now = Date.now()
  db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, cash, kyc_step, kyc_complete, pan, aadhaar, bank_account, bank_ifsc, bank_name, created_at)
    VALUES (?, 'Demo Investor', ?, '9876543210', ?, ?, 5, 1, 'ABCDE1234F', '123456789012', '123456789012', 'HDFC0001234', 'HDFC Bank', ?)
  `).run(id, email, hash, PAPER_STARTING_CASH, now)

  const wl = nanoid(10)
  db.prepare('INSERT INTO watchlists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run(wl, id, 'Favorites', now)
  for (const sym of ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN', 'TITAN']) {
    db.prepare('INSERT INTO watchlist_items (watchlist_id, symbol) VALUES (?, ?)').run(wl, sym)
  }

  db.prepare(
    'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(
    nanoid(10),
    id,
    'credit',
    PAPER_STARTING_CASH,
    PAPER_STARTING_CASH,
    'Paper trading starting capital',
    now,
  )

  db.prepare(
    'INSERT INTO notifications (id, user_id, title, body, read, created_at) VALUES (?, ?, ?, ?, 0, ?)',
  ).run(
    nanoid(10),
    id,
    'Paper wallet ready',
    'You have ₹1,00,000 fake currency. Explore stocks and place paper buy/sell orders to learn. Not real money.',
    now,
  )

  console.log('Seeded demo user:', email, '/ Demo@1234')
  return id
}
