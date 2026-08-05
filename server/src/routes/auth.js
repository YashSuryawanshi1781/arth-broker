import { Router } from 'express'
import bcrypt from 'bcryptjs'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { addNotification, authRequired, publicUser } from '../auth.js'
import {
  clearSessionCookies,
  createSession,
  listSessions,
  revokeAllSessions,
  revokeCurrentSession,
  revokeSession,
  rotateSession,
} from '../session.js'

const router = Router()

router.post('/register', async (req, res) => {
  const { name, email, phone, password } = req.body || {}
  if (!name || !email || !phone || !password) {
    return res.status(400).json({ error: 'All fields are required' })
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' })
  const exists = db.prepare('SELECT id FROM users WHERE email = ? COLLATE NOCASE').get(email)
  if (exists) return res.status(409).json({ error: 'Email already registered' })

  const id = nanoid(12)
  const passwordHash = await bcrypt.hash(password, 10)
  const now = Date.now()
  db.prepare(`
    INSERT INTO users (id, name, email, phone, password_hash, cash, kyc_step, kyc_complete, created_at)
    VALUES (?, ?, ?, ?, ?, 0, 0, 0, ?)
  `).run(id, name.trim(), email.trim().toLowerCase(), phone.trim(), passwordHash, now)

  const wlId = nanoid(10)
  db.prepare('INSERT INTO watchlists (id, user_id, name, created_at) VALUES (?, ?, ?, ?)').run(
    wlId, id, 'Favorites', now,
  )
  for (const sym of ['RELIANCE', 'TCS', 'INFY', 'HDFCBANK', 'SBIN']) {
    db.prepare('INSERT INTO watchlist_items (watchlist_id, symbol) VALUES (?, ?)').run(wlId, sym)
  }
  addNotification(id, 'Welcome to Arth', 'Complete KYC to start investing in stocks, MFs and IPOs.')

  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id)
  createSession(id, req, res)
  res.status(201).json({ user: publicUser(user) })
})

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {}
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' })
  const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email.trim())
  if (!user) return res.status(401).json({ error: 'Invalid email or password' })
  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Invalid email or password' })
  createSession(user.id, req, res)
  res.json({ user: publicUser(user) })
})

router.post('/refresh', (req, res) => {
  const session = rotateSession(req, res)
  if (!session) {
    return res.status(401).json({ error: 'Session expired. Please sign in again.', code: 'REFRESH_INVALID' })
  }
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(session.user_id)
  if (!user) {
    clearSessionCookies(res)
    return res.status(401).json({ error: 'Account no longer exists', code: 'SESSION_INVALID' })
  }
  res.json({ user: publicUser(user) })
})

router.post('/logout', (req, res) => {
  revokeCurrentSession(req, res)
  res.json({ ok: true })
})

router.get('/me', authRequired, (req, res) => {
  res.json({ user: publicUser(req.user) })
})

router.get('/sessions', authRequired, (req, res) => {
  res.json({ sessions: listSessions(req.user.id, req.session.id) })
})

router.delete('/sessions/:sessionId', authRequired, (req, res) => {
  const current = req.params.sessionId === req.session.id
  const revoked = revokeSession(req.user.id, req.params.sessionId)
  if (!revoked) return res.status(404).json({ error: 'Active session not found' })
  if (current) clearSessionCookies(res)
  res.json({ ok: true, current })
})

router.delete('/sessions', authRequired, (req, res) => {
  const revoked = revokeAllSessions(req.user.id, req.session.id)
  res.json({ ok: true, revoked })
})

router.post('/logout-all', authRequired, (req, res) => {
  const revoked = revokeAllSessions(req.user.id)
  clearSessionCookies(res)
  res.json({ ok: true, revoked })
})

router.post('/forgot', (req, res) => {
  const { email } = req.body || {}
  const user = db.prepare('SELECT * FROM users WHERE email = ? COLLATE NOCASE').get(email?.trim() || '')
  // Always succeed to avoid email enumeration in demo UI
  if (user) {
    const token = nanoid(24)
    db.prepare('UPDATE users SET reset_token = ?, reset_expires = ? WHERE id = ?').run(
      token, Date.now() + 3600_000, user.id,
    )
    return res.json({
      ok: true,
      message: 'If the account exists, a reset link was generated.',
      demoResetToken: token,
      demoHint: 'In production this would be emailed. Use this token on the reset page.',
    })
  }
  res.json({ ok: true, message: 'If the account exists, a reset link was generated.' })
})

router.post('/reset', async (req, res) => {
  const { token, password } = req.body || {}
  if (!token || !password || password.length < 6) {
    return res.status(400).json({ error: 'Valid token and password required' })
  }
  const user = db.prepare('SELECT * FROM users WHERE reset_token = ?').get(token)
  if (!user || !user.reset_expires || user.reset_expires < Date.now()) {
    return res.status(400).json({ error: 'Invalid or expired reset token' })
  }
  const passwordHash = await bcrypt.hash(password, 10)
  db.prepare('UPDATE users SET password_hash = ?, reset_token = NULL, reset_expires = NULL WHERE id = ?').run(
    passwordHash, user.id,
  )
  revokeAllSessions(user.id)
  res.json({ ok: true, message: 'Password updated. Please login.' })
})

router.patch('/profile', authRequired, (req, res) => {
  const { name, phone } = req.body || {}
  db.prepare('UPDATE users SET name = COALESCE(?, name), phone = COALESCE(?, phone) WHERE id = ?').run(
    name?.trim() || null, phone?.trim() || null, req.user.id,
  )
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  res.json({ user: publicUser(user) })
})

router.post('/password', authRequired, async (req, res) => {
  const { currentPassword, newPassword } = req.body || {}
  if (!currentPassword || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Current and new password (6+ chars) required' })
  }
  const ok = await bcrypt.compare(currentPassword, req.user.password_hash)
  if (!ok) return res.status(401).json({ error: 'Current password is incorrect' })
  const hash = await bcrypt.hash(newPassword, 10)
  db.prepare('UPDATE users SET password_hash = ? WHERE id = ?').run(hash, req.user.id)
  const revoked = revokeAllSessions(req.user.id, req.session.id)
  res.json({ ok: true, revokedOtherSessions: revoked })
})

export default router
