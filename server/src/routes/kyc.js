import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { addNotification, authRequired, publicUser } from '../auth.js'
import { PAPER_STARTING_CASH } from '../paperTrading.js'

const router = Router()

function bumpStep(userId, step) {
  db.prepare(`
    UPDATE users SET kyc_step = CASE WHEN kyc_step < ? THEN ? ELSE kyc_step END WHERE id = ?
  `).run(step, step, userId)
}

router.get('/', authRequired, (req, res) => {
  res.json({
    step: req.user.kyc_step,
    complete: !!req.user.kyc_complete,
    pan: req.user.pan,
    aadhaar: req.user.aadhaar ? `XXXX-XXXX-${String(req.user.aadhaar).slice(-4)}` : null,
    bankAccount: req.user.bank_account ? `XXXX${String(req.user.bank_account).slice(-4)}` : null,
    bankIfsc: req.user.bank_ifsc,
    bankName: req.user.bank_name,
  })
})

router.post('/profile', authRequired, (req, res) => {
  const { name, phone } = req.body || {}
  if (!name || !phone) return res.status(400).json({ error: 'Name and phone required' })
  db.prepare('UPDATE users SET name = ?, phone = ? WHERE id = ?').run(name.trim(), phone.trim(), req.user.id)
  bumpStep(req.user.id, 1)
  res.json({ user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
})

router.post('/verify-pan', authRequired, (req, res) => {
  if (req.user.kyc_step < 1) return res.status(400).json({ error: 'Complete profile first' })
  const pan = String(req.body?.pan || '').toUpperCase().trim()
  if (!/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) {
    return res.status(400).json({ error: 'Invalid PAN format (e.g. ABCDE1234F)' })
  }
  db.prepare('UPDATE users SET pan = ? WHERE id = ?').run(pan, req.user.id)
  bumpStep(req.user.id, 2)
  res.json({ ok: true, user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
})

router.post('/verify-aadhaar', authRequired, (req, res) => {
  if (req.user.kyc_step < 2 || !req.user.pan) return res.status(400).json({ error: 'Verify PAN first' })
  const aadhaar = String(req.body?.aadhaar || '').replace(/\s/g, '')
  const otp = String(req.body?.otp || '')
  if (!/^\d{12}$/.test(aadhaar)) return res.status(400).json({ error: 'Aadhaar must be 12 digits' })
  if (otp !== '123456') return res.status(400).json({ error: 'Invalid OTP. Use demo OTP 123456' })
  db.prepare('UPDATE users SET aadhaar = ? WHERE id = ?').run(aadhaar, req.user.id)
  bumpStep(req.user.id, 3)
  res.json({ ok: true, user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
})

router.post('/link-bank', authRequired, (req, res) => {
  if (req.user.kyc_step < 3 || !req.user.aadhaar) return res.status(400).json({ error: 'Verify Aadhaar first' })
  const { account, ifsc, bankName } = req.body || {}
  if (!account || !ifsc || !bankName) return res.status(400).json({ error: 'Account, IFSC and bank name required' })
  if (!/^[A-Z]{4}0[A-Z0-9]{6}$/i.test(ifsc)) return res.status(400).json({ error: 'Invalid IFSC' })
  db.prepare('UPDATE users SET bank_account = ?, bank_ifsc = ?, bank_name = ? WHERE id = ?').run(
    String(account), String(ifsc).toUpperCase(), bankName, req.user.id,
  )
  bumpStep(req.user.id, 4)
  res.json({ ok: true, user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
})

router.post('/complete', authRequired, (req, res) => {
  const fresh = db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)
  if (fresh.kyc_step < 4 || !fresh.pan || !fresh.aadhaar || !fresh.bank_account) {
    return res.status(400).json({ error: 'Complete all KYC steps first' })
  }
  if (!req.body?.accepted) return res.status(400).json({ error: 'Accept risk disclosure to continue' })
  const target = PAPER_STARTING_CASH
  const bonus = Math.max(0, +(target - fresh.cash).toFixed(2))
  const cash = +(fresh.cash + bonus).toFixed(2)
  db.prepare('UPDATE users SET kyc_complete = 1, kyc_step = 5, cash = ? WHERE id = ?').run(cash, req.user.id)
  if (bonus > 0) {
    db.prepare(
      'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(
      nanoid(10),
      req.user.id,
      'credit',
      bonus,
      cash,
      'Paper trading starting capital (₹1,00,000 fake currency)',
      Date.now(),
    )
  }
  addNotification(
    req.user.id,
    'Paper wallet ready',
    bonus > 0
      ? `KYC done. ₹${bonus.toLocaleString('en-IN')} paper cash credited — buy & sell stocks to learn. Not real money.`
      : 'KYC done. Your paper wallet is ready for practice trades.',
  )
  res.json({ ok: true, user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)) })
})

export default router
