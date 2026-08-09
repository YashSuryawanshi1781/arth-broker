import { nanoid } from 'nanoid'
import { db } from './db.js'
import { ACCESS_COOKIE, SESSION_IDLE_MS, verifyAccessToken } from './session.js'
import { roundMoney } from './money.js'
import { paperMeta } from './paperTrading.js'

export function authRequired(req, res, next) {
  const token = req.cookies?.[ACCESS_COOKIE]
  if (!token) {
    return res.status(401).json({ error: 'Session access expired', code: 'ACCESS_EXPIRED' })
  }
  try {
    const payload = verifyAccessToken(token)
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(payload.sub)
    const session = db.prepare(`
      SELECT * FROM sessions WHERE id = ? AND user_id = ?
    `).get(payload.sid, payload.sub)
    const now = Date.now()
    if (
      !user
      || !session
      || session.revoked_at
      || session.expires_at <= now
      || session.last_seen_at + SESSION_IDLE_MS <= now
    ) {
      return res.status(401).json({ error: 'Session is no longer active', code: 'SESSION_INVALID' })
    }
    // Sliding activity window — keep idle timeout honest without rewriting every ms.
    if (now - session.last_seen_at > 60_000) {
      db.prepare('UPDATE sessions SET last_seen_at = ? WHERE id = ?').run(now, session.id)
      session.last_seen_at = now
    }
    req.user = user
    req.session = session
    next()
  } catch {
    return res.status(401).json({ error: 'Session access expired', code: 'ACCESS_EXPIRED' })
  }
}

export function publicUser(user) {
  const cash = roundMoney(user.cash)
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: user.phone,
    cash,
    ...paperMeta(cash),
    kycStep: user.kyc_step,
    kycComplete: !!user.kyc_complete,
    pan: user.pan,
    aadhaar: user.aadhaar ? `XXXX-XXXX-${String(user.aadhaar).slice(-4)}` : null,
    bankAccount: user.bank_account ? `XXXX${String(user.bank_account).slice(-4)}` : null,
    bankIfsc: user.bank_ifsc,
    bankName: user.bank_name,
    learningMode: !!user.learning_mode,
    nomineeName: user.nominee_name || null,
    dpId: user.dp_id || null,
    hasPin: !!user.pin_hash,
    createdAt: user.created_at,
  }
}

export function addNotification(userId, title, body) {
  db.prepare(
    'INSERT INTO notifications (id, user_id, title, body, read, created_at) VALUES (?, ?, ?, ?, 0, ?)',
  ).run(nanoid(10), userId, title, body, Date.now())
}
