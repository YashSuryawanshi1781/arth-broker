import { nanoid } from 'nanoid'
import { db } from './db.js'
import { addNotification } from './auth.js'
import { FUND_MAP } from './mutualFunds.js'
import { roundMoney } from './money.js'

let lastPass = 0

/**
 * Execute due SIP installments. Runs at most once a minute from the market tick loop.
 * An installment is due when today is on/after the SIP day and it has not run this calendar month.
 */
export function processDueSips() {
  const now = Date.now()
  if (now - lastPass < 60_000) return 0
  lastPass = now

  const today = new Date()
  const day = today.getDate()
  const monthKey = `${today.getFullYear()}-${today.getMonth()}`

  const sips = db.prepare(`SELECT * FROM sips WHERE status = 'active'`).all()
  let ran = 0

  for (const sip of sips) {
    if (day < sip.day_of_month) continue
    if (sip.last_run_at) {
      const last = new Date(sip.last_run_at)
      const lastKey = `${last.getFullYear()}-${last.getMonth()}`
      if (lastKey === monthKey) continue
    }

    const fund = FUND_MAP[sip.fund_id]
    if (!fund) continue
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(sip.user_id)
    if (!user || !user.kyc_complete) continue
    if (roundMoney(user.cash) + 0.009 < sip.amount) {
      addNotification(sip.user_id, 'SIP skipped', `Insufficient funds for ${fund.name}`)
      continue
    }

    const units = +(sip.amount / fund.nav).toFixed(4)
    try {
      db.transaction(() => {
        db.prepare('UPDATE users SET cash = ROUND(cash - ?, 2) WHERE id = ?').run(sip.amount, sip.user_id)
        const existing = db.prepare('SELECT * FROM mf_holdings WHERE user_id = ? AND fund_id = ?')
          .get(sip.user_id, sip.fund_id)
        if (existing) {
          const totalUnits = existing.units + units
          const avg = +(((existing.avg_nav * existing.units) + sip.amount) / totalUnits).toFixed(4)
          db.prepare('UPDATE mf_holdings SET units = ?, avg_nav = ? WHERE id = ?')
            .run(totalUnits, avg, existing.id)
        } else {
          db.prepare(
            'INSERT INTO mf_holdings (id, user_id, fund_id, units, avg_nav, created_at) VALUES (?, ?, ?, ?, ?, ?)',
          ).run(nanoid(10), sip.user_id, sip.fund_id, units, fund.nav, now)
        }
        db.prepare(
          'INSERT INTO mf_transactions (id, user_id, fund_id, type, amount, units, nav, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
        ).run(nanoid(10), sip.user_id, sip.fund_id, 'purchase', sip.amount, units, fund.nav, now)
        const cash = db.prepare('SELECT cash FROM users WHERE id = ?').get(sip.user_id).cash
        db.prepare(
          'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
        ).run(nanoid(10), sip.user_id, 'debit', sip.amount, cash, `SIP ${fund.name}`, now)
        db.prepare('UPDATE sips SET last_run_at = ? WHERE id = ?').run(now, sip.id)
      })()
      ran += 1
      addNotification(sip.user_id, 'SIP invested', `₹${sip.amount} invested in ${fund.name}`)
    } catch (err) {
      console.warn('SIP run failed', sip.id, err.message)
    }
  }

  return ran
}
