import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { db, DEMO_EMAIL } from './db.js'

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
    VALUES (?, 'Demo Investor', ?, '9876543210', ?, 250000, 5, 1, 'ABCDE1234F', '123456789012', '123456789012', 'HDFC0001234', 'HDFC Bank', ?)
  `).run(id, email, hash, now)

  const wl = nanoid(10)
  db.prepare('INSERT INTO watchlists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run(wl, id, 'Favorites', now)
  for (const sym of ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN', 'TITAN']) {
    db.prepare('INSERT INTO watchlist_items (watchlist_id, symbol) VALUES (?, ?)').run(wl, sym)
  }

  for (const [symbol, qty, avg] of [
    ['RELIANCE', 15, 2750],
    ['TCS', 8, 3800],
    ['INFY', 20, 1500],
  ]) {
    db.prepare('INSERT INTO holdings (user_id, symbol, qty, avg_price) VALUES (?, ?, ?, ?)').run(id, symbol, qty, avg)
  }

  db.prepare(
    'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(nanoid(10), id, 'credit', 250000, 250000, 'Seed wallet', now)

  db.prepare(
    'INSERT INTO mf_holdings (id, user_id, fund_id, units, avg_nav, created_at) VALUES (?, ?, ?, ?, ?, ?)',
  ).run(nanoid(10), id, 'mf-parag', 120.5, 78.2, now)

  db.prepare(
    'INSERT INTO sips (id, user_id, fund_id, amount, day_of_month, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(nanoid(10), id, 'mf-uti', 5000, 5, 'active', now)

  db.prepare(
    'INSERT INTO notifications (id, user_id, title, body, read, created_at) VALUES (?, ?, ?, ?, 0, ?)',
  ).run(nanoid(10), id, 'Welcome Demo', 'Explore stocks, funds, IPOs and place paper trades.', now)

  console.log('Seeded demo user:', email, '/ Demo@1234')
  return id
}
