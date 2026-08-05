import { Router } from 'express'
import { nanoid } from 'nanoid'
import { db } from '../db.js'
import { authRequired, publicUser, addNotification } from '../auth.js'
import { MUTUAL_FUNDS, FUND_MAP, navHistory, fundGrowth } from '../mutualFunds.js'

const router = Router()

/** Trim a fund down to the fields the listing grid needs. */
function summarise(fund) {
  return {
    id: fund.id,
    name: fund.name,
    amc: fund.amc,
    amcShort: fund.amcShort,
    category: fund.category,
    subCategory: fund.subCategory,
    plan: fund.plan,
    option: fund.option,
    nav: fund.nav,
    navChange: fund.navChange,
    rating: fund.rating,
    crisilRank: fund.crisilRank,
    aum: fund.aum,
    expenseRatio: fund.expenseRatio,
    risk: fund.risk,
    riskometer: fund.riskometer,
    minSip: fund.minSip,
    minLumpsum: fund.minLumpsum,
    returns: fund.returns,
    categoryReturns: fund.categoryReturns,
    benchmark: fund.benchmark,
  }
}

router.get('/', (req, res) => {
  const { category, subCategory, risk, rating, q, sort } = req.query
  let funds = MUTUAL_FUNDS.slice()

  if (category && category !== 'All') funds = funds.filter((f) => f.category === category)
  if (subCategory && subCategory !== 'All') funds = funds.filter((f) => f.subCategory === subCategory)
  if (risk && risk !== 'All') funds = funds.filter((f) => f.risk === risk)
  if (rating) funds = funds.filter((f) => f.rating >= Number(rating))
  if (q) {
    const needle = String(q).toLowerCase()
    funds = funds.filter((f) =>
      `${f.name} ${f.amc} ${f.subCategory} ${f.category}`.toLowerCase().includes(needle))
  }

  const sorters = {
    returns1y: (a, b) => b.returns['1y'] - a.returns['1y'],
    returns3y: (a, b) => b.returns['3y'] - a.returns['3y'],
    returns5y: (a, b) => b.returns['5y'] - a.returns['5y'],
    aum: (a, b) => b.aum - a.aum,
    rating: (a, b) => b.rating - a.rating,
    expense: (a, b) => a.expenseRatio - b.expenseRatio,
    name: (a, b) => a.name.localeCompare(b.name),
  }
  funds.sort(sorters[sort] || sorters.returns3y)

  res.json({
    funds: funds.map(summarise),
    filters: {
      categories: [...new Set(MUTUAL_FUNDS.map((f) => f.category))],
      subCategories: [...new Set(MUTUAL_FUNDS.map((f) => f.subCategory))],
      risks: [...new Set(MUTUAL_FUNDS.map((f) => f.risk))],
    },
  })
})

router.get('/holdings', authRequired, (req, res) => {
  const rows = db.prepare('SELECT * FROM mf_holdings WHERE user_id = ?').all(req.user.id).map((h) => {
    const fund = FUND_MAP[h.fund_id]
    const nav = fund?.nav || h.avg_nav
    const value = nav * h.units
    const cost = h.avg_nav * h.units
    const days = Math.max(1, Math.round((Date.now() - h.created_at) / 86400000))
    const absoluteReturn = cost ? ((value - cost) / cost) * 100 : 0
    return {
      id: h.id,
      fundId: h.fund_id,
      name: fund?.name || h.fund_id,
      amcShort: fund?.amcShort || '',
      subCategory: fund?.subCategory || '',
      category: fund?.category || '',
      units: +h.units.toFixed(4),
      avgNav: h.avg_nav,
      nav,
      invested: +cost.toFixed(2),
      value: +value.toFixed(2),
      pnl: +(value - cost).toFixed(2),
      pnlPct: +absoluteReturn.toFixed(2),
      // Annualised only once the holding is old enough for it to be meaningful.
      xirr: days >= 30 ? +(((1 + absoluteReturn / 100) ** (365 / days) - 1) * 100).toFixed(2) : null,
      investedOn: h.created_at,
      holdingDays: days,
    }
  })
  res.json({ holdings: rows })
})

router.get('/sips', authRequired, (req, res) => {
  const sips = db.prepare('SELECT * FROM sips WHERE user_id = ? ORDER BY created_at DESC').all(req.user.id).map((s) => {
    const fund = FUND_MAP[s.fund_id]
    const now = new Date()
    const next = new Date(now.getFullYear(), now.getMonth(), s.day_of_month)
    if (next <= now) next.setMonth(next.getMonth() + 1)
    const monthsRunning = Math.max(
      0,
      Math.floor((Date.now() - s.created_at) / (30.44 * 86400000)),
    )
    return {
      id: s.id,
      fundId: s.fund_id,
      name: fund?.name || s.fund_id,
      amcShort: fund?.amcShort || '',
      subCategory: fund?.subCategory || '',
      amount: s.amount,
      dayOfMonth: s.day_of_month,
      status: s.status,
      createdAt: s.created_at,
      nextInstallment: s.status === 'active' ? next.toISOString().slice(0, 10) : null,
      installmentsDone: monthsRunning,
      investedSoFar: +(s.amount * monthsRunning).toFixed(2),
    }
  })
  res.json({ sips })
})

router.get('/transactions', authRequired, (req, res) => {
  const rows = db
    .prepare('SELECT * FROM mf_transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 100')
    .all(req.user.id)
    .map((t) => ({
      id: t.id,
      fundId: t.fund_id,
      name: FUND_MAP[t.fund_id]?.name || t.fund_id,
      type: t.type,
      amount: t.amount,
      units: +t.units.toFixed(4),
      nav: t.nav,
      createdAt: t.created_at,
    }))
  res.json({ transactions: rows })
})

router.get('/:id', (req, res) => {
  const fund = FUND_MAP[req.params.id]
  if (!fund) return res.status(404).json({ error: 'Fund not found' })

  const others = MUTUAL_FUNDS.filter((f) => f.id !== fund.id)
  const sameSubCategory = others.filter((f) => f.subCategory === fund.subCategory)
  // Some sub-categories only have one fund, so widen to the parent category.
  const peers = sameSubCategory.length ? sameSubCategory : others.filter((f) => f.category === fund.category)

  res.json({
    fund,
    growth: {
      '1y': fundGrowth(fund, 1),
      '3y': fundGrowth(fund, 3),
      '5y': fundGrowth(fund, 5),
    },
    peers: peers.slice(0, 5).map(summarise),
    peerScope: sameSubCategory.length ? fund.subCategory : fund.category,
  })
})

router.get('/:id/nav-history', (req, res) => {
  const fund = FUND_MAP[req.params.id]
  if (!fund) return res.status(404).json({ error: 'Fund not found' })
  const range = String(req.query.range || '1y')
  res.json({ range, history: navHistory(fund, range) })
})

router.post('/invest', authRequired, (req, res) => {
  if (!req.user.kyc_complete) return res.status(403).json({ error: 'Complete KYC first', code: 'KYC_REQUIRED' })
  const fundId = req.body?.fundId
  const amount = Number(req.body?.amount)
  const fund = FUND_MAP[fundId]
  if (!fund) return res.status(404).json({ error: 'Fund not found' })
  const minimum = fund.minLumpsum || 500
  if (!(amount >= minimum)) return res.status(400).json({ error: `Minimum investment ₹${minimum}` })
  if (req.user.cash < amount) return res.status(400).json({ error: 'Insufficient funds' })

  const units = +(amount / fund.nav).toFixed(4)
  const now = Date.now()
  const tx = db.transaction(() => {
    db.prepare('UPDATE users SET cash = cash - ? WHERE id = ?').run(amount, req.user.id)
    const existing = db.prepare('SELECT * FROM mf_holdings WHERE user_id = ? AND fund_id = ?').get(req.user.id, fundId)
    if (existing) {
      const totalUnits = existing.units + units
      const avg = +(((existing.avg_nav * existing.units) + amount) / totalUnits).toFixed(4)
      db.prepare('UPDATE mf_holdings SET units = ?, avg_nav = ? WHERE id = ?').run(totalUnits, avg, existing.id)
    } else {
      db.prepare(
        'INSERT INTO mf_holdings (id, user_id, fund_id, units, avg_nav, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      ).run(nanoid(10), req.user.id, fundId, units, fund.nav, now)
    }
    db.prepare(
      'INSERT INTO mf_transactions (id, user_id, fund_id, type, amount, units, nav, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(nanoid(10), req.user.id, fundId, 'purchase', amount, units, fund.nav, now)
    const cash = db.prepare('SELECT cash FROM users WHERE id = ?').get(req.user.id).cash
    db.prepare(
      'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(nanoid(10), req.user.id, 'debit', amount, cash, `MF purchase ${fund.name}`, now)
  })
  tx()
  addNotification(req.user.id, 'MF investment', `Invested ₹${amount} in ${fund.name}`)
  res.status(201).json({
    ok: true,
    units,
    nav: fund.nav,
    user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)),
  })
})

router.post('/redeem', authRequired, (req, res) => {
  const fundId = req.body?.fundId
  const requestedUnits = Number(req.body?.units)
  const fund = FUND_MAP[fundId]
  if (!fund) return res.status(404).json({ error: 'Fund not found' })

  const holding = db.prepare('SELECT * FROM mf_holdings WHERE user_id = ? AND fund_id = ?').get(req.user.id, fundId)
  if (!holding) return res.status(400).json({ error: 'You do not hold this fund' })
  if (!(requestedUnits > 0)) return res.status(400).json({ error: 'Enter units to redeem' })
  if (requestedUnits > holding.units + 0.0001) {
    return res.status(400).json({ error: `You only hold ${holding.units.toFixed(4)} units` })
  }

  const units = Math.min(requestedUnits, holding.units)
  const amount = +(units * fund.nav).toFixed(2)
  const now = Date.now()
  const remaining = +(holding.units - units).toFixed(4)

  const tx = db.transaction(() => {
    if (remaining <= 0.0001) {
      db.prepare('DELETE FROM mf_holdings WHERE id = ?').run(holding.id)
    } else {
      db.prepare('UPDATE mf_holdings SET units = ? WHERE id = ?').run(remaining, holding.id)
    }
    db.prepare('UPDATE users SET cash = cash + ? WHERE id = ?').run(amount, req.user.id)
    db.prepare(
      'INSERT INTO mf_transactions (id, user_id, fund_id, type, amount, units, nav, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    ).run(nanoid(10), req.user.id, fundId, 'redemption', amount, units, fund.nav, now)
    const cash = db.prepare('SELECT cash FROM users WHERE id = ?').get(req.user.id).cash
    db.prepare(
      'INSERT INTO ledger (id, user_id, type, amount, balance_after, note, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    ).run(nanoid(10), req.user.id, 'credit', amount, cash, `MF redemption ${fund.name}`, now)
  })
  tx()
  addNotification(req.user.id, 'MF redemption', `Redeemed ₹${amount} from ${fund.name}`)
  res.json({
    ok: true,
    amount,
    units,
    user: publicUser(db.prepare('SELECT * FROM users WHERE id = ?').get(req.user.id)),
  })
})

router.post('/sips', authRequired, (req, res) => {
  if (!req.user.kyc_complete) return res.status(403).json({ error: 'Complete KYC first', code: 'KYC_REQUIRED' })
  const fundId = req.body?.fundId
  const amount = Number(req.body?.amount)
  const dayOfMonth = Math.min(28, Math.max(1, Number(req.body?.dayOfMonth) || 5))
  const fund = FUND_MAP[fundId]
  if (!fund) return res.status(404).json({ error: 'Fund not found' })
  const minimum = fund.minSip || 500
  if (!(amount >= minimum)) return res.status(400).json({ error: `Minimum SIP ₹${minimum}` })
  const id = nanoid(10)
  db.prepare(
    'INSERT INTO sips (id, user_id, fund_id, amount, day_of_month, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
  ).run(id, req.user.id, fundId, amount, dayOfMonth, 'active', Date.now())
  addNotification(req.user.id, 'SIP created', `SIP of ₹${amount} started in ${fund.name}`)
  res.status(201).json({ id, status: 'active' })
})

router.patch('/sips/:id', authRequired, (req, res) => {
  const sip = db.prepare('SELECT * FROM sips WHERE id = ? AND user_id = ?').get(req.params.id, req.user.id)
  if (!sip) return res.status(404).json({ error: 'SIP not found' })
  const { status, amount } = req.body || {}
  if (amount != null) {
    const fund = FUND_MAP[sip.fund_id]
    const minimum = fund?.minSip || 500
    if (!(Number(amount) >= minimum)) return res.status(400).json({ error: `Minimum SIP ₹${minimum}` })
    db.prepare('UPDATE sips SET amount = ? WHERE id = ?').run(Number(amount), sip.id)
  }
  if (status != null) {
    if (!['active', 'paused', 'cancelled'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status' })
    }
    db.prepare('UPDATE sips SET status = ? WHERE id = ?').run(status, sip.id)
  }
  res.json({ ok: true })
})

export default router
