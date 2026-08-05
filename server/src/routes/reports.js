import { Router } from 'express'
import { db } from '../db.js'
import { authRequired } from '../auth.js'
import { market, IPOS } from '../market.js'
import { MUTUAL_FUNDS } from '../mutualFunds.js'
import { computeCharges } from '../money.js'

const router = Router()
const FUND_MAP = Object.fromEntries(MUTUAL_FUNDS.map((fund) => [fund.id, fund]))
const IPO_MAP = Object.fromEntries(IPOS.map((ipo) => [ipo.id, ipo]))

const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const number = (value, fallback = 0) => Number.isFinite(Number(value)) ? Number(value) : fallback
const round = (value) => +number(value).toFixed(2)

function paging(query) {
  const page = clamp(Math.floor(number(query.page, 1)), 1, 100000)
  const pageSize = clamp(Math.floor(number(query.pageSize, 20)), 10, 1000)
  return { page, pageSize, offset: (page - 1) * pageSize }
}

function dateBounds(query) {
  const from = query.from ? new Date(`${query.from}T00:00:00`).getTime() : null
  const to = query.to ? new Date(`${query.to}T23:59:59.999`).getTime() : null
  return {
    from: Number.isFinite(from) ? from : null,
    to: Number.isFinite(to) ? to : null,
  }
}

function matchesCommon(row, query, fields) {
  const search = String(query.search || '').trim().toLowerCase()
  if (search && !fields.some((field) => String(row[field] ?? '').toLowerCase().includes(search))) return false
  const { from, to } = dateBounds(query)
  const timestamp = number(row.createdAt ?? row.lastTradeAt)
  if (from && timestamp < from) return false
  if (to && timestamp > to) return false
  return true
}

function sortRows(rows, query, allowed, fallback) {
  const sortBy = allowed.includes(query.sortBy) ? query.sortBy : fallback
  const direction = query.sortDir === 'asc' ? 1 : -1
  return rows.sort((a, b) => {
    const left = a[sortBy]
    const right = b[sortBy]
    if (typeof left === 'string' || typeof right === 'string') {
      return String(left ?? '').localeCompare(String(right ?? '')) * direction
    }
    return (number(left) - number(right)) * direction
  })
}

function respond(res, rows, query, summary, options = {}) {
  const { page, pageSize, offset } = paging(query)
  const total = rows.length
  res.json({
    rows: rows.slice(offset, offset + pageSize),
    summary,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.max(1, Math.ceil(total / pageSize)),
    },
    options,
  })
}

function chargesFor(order) {
  return computeCharges(
    number(order.fillPrice ?? order.fill_price ?? order.price) * number(order.qty),
    order.side,
    order.product || 'delivery',
  )
}

function orderRows(userId) {
  return db.prepare('SELECT * FROM orders WHERE user_id = ?').all(userId).map((order) => ({
    id: order.id,
    symbol: order.symbol,
    side: order.side,
    orderType: order.type,
    product: order.product,
    qty: order.qty,
    price: order.price,
    fillPrice: order.fill_price,
    status: order.status,
    turnover: round((order.fill_price || order.price || 0) * order.qty),
    createdAt: order.created_at,
    updatedAt: order.updated_at,
  }))
}

function tradebook(req, res) {
  let rows = orderRows(req.user.id).filter((row) => matchesCommon(row, req.query, ['symbol', 'side', 'product', 'status']))
  if (req.query.status && req.query.status !== 'all') rows = rows.filter((row) => row.status === req.query.status)
  if (req.query.side && req.query.side !== 'all') rows = rows.filter((row) => row.side === req.query.side)
  if (req.query.product && req.query.product !== 'all') rows = rows.filter((row) => row.product === req.query.product)
  sortRows(
    rows,
    req.query,
    ['createdAt', 'symbol', 'side', 'product', 'orderType', 'qty', 'fillPrice', 'turnover', 'status'],
    'createdAt',
  )
  const filled = rows.filter((row) => row.status === 'filled')
  const summary = {
    orders: rows.length,
    filled: filled.length,
    buyValue: round(filled.filter((row) => row.side === 'buy').reduce((sum, row) => sum + row.turnover, 0)),
    sellValue: round(filled.filter((row) => row.side === 'sell').reduce((sum, row) => sum + row.turnover, 0)),
    turnover: round(filled.reduce((sum, row) => sum + row.turnover, 0)),
  }
  respond(res, rows, req.query, summary, {
    statuses: ['all', 'filled', 'open', 'cancelled', 'rejected'],
    sides: ['all', 'buy', 'sell'],
    products: ['all', 'delivery', 'intraday'],
  })
}

function pnlReport(req, res) {
  const orders = db.prepare(
    "SELECT * FROM orders WHERE user_id = ? AND status = 'filled' ORDER BY created_at ASC",
  ).all(req.user.id)
  const positions = new Map()
  for (const order of orders) {
    const price = number(order.fill_price || order.price)
    const state = positions.get(order.symbol) || {
      symbol: order.symbol,
      buyQty: 0,
      sellQty: 0,
      openQty: 0,
      avgBuyPrice: 0,
      buyValue: 0,
      sellValue: 0,
      realizedPnl: 0,
      charges: 0,
      lastTradeAt: 0,
    }
    const fees = chargesFor(order)
    state.charges += fees.total
    state.lastTradeAt = Math.max(state.lastTradeAt, order.created_at)
    if (order.side === 'buy') {
      const cost = state.avgBuyPrice * state.openQty + price * order.qty
      state.openQty += order.qty
      state.buyQty += order.qty
      state.buyValue += price * order.qty
      state.avgBuyPrice = state.openQty ? cost / state.openQty : 0
    } else {
      const matched = Math.min(state.openQty, order.qty)
      state.realizedPnl += (price - state.avgBuyPrice) * matched
      state.openQty -= matched
      state.sellQty += order.qty
      state.sellValue += price * order.qty
      if (!state.openQty) state.avgBuyPrice = 0
    }
    positions.set(order.symbol, state)
  }

  // Holdings may pre-date the available order book (for example imported or
  // seeded portfolios). Reconcile the open leg to the authoritative holdings
  // table while preserving realised P&L calculated from historical sells.
  const holdings = db.prepare('SELECT * FROM holdings WHERE user_id = ?').all(req.user.id)
  for (const holding of holdings) {
    const state = positions.get(holding.symbol) || {
      symbol: holding.symbol,
      buyQty: holding.qty,
      sellQty: 0,
      buyValue: holding.qty * holding.avg_price,
      sellValue: 0,
      realizedPnl: 0,
      charges: 0,
      lastTradeAt: 0,
    }
    state.openQty = holding.qty
    state.avgBuyPrice = holding.avg_price
    positions.set(holding.symbol, state)
  }

  let rows = [...positions.values()].map((row) => {
    const ltp = market.price(row.symbol) || row.avgBuyPrice
    const unrealizedPnl = (ltp - row.avgBuyPrice) * row.openQty
    return {
      ...row,
      name: market.get(row.symbol)?.name || row.symbol,
      ltp: round(ltp),
      avgBuyPrice: round(row.avgBuyPrice),
      buyValue: round(row.buyValue),
      sellValue: round(row.sellValue),
      realizedPnl: round(row.realizedPnl),
      unrealizedPnl: round(unrealizedPnl),
      charges: round(row.charges),
      netPnl: round(row.realizedPnl + unrealizedPnl - row.charges),
    }
  }).filter((row) => matchesCommon(row, req.query, ['symbol', 'name']))
  if (req.query.status === 'profit') rows = rows.filter((row) => row.netPnl >= 0)
  if (req.query.status === 'loss') rows = rows.filter((row) => row.netPnl < 0)
  sortRows(
    rows,
    req.query,
    [
      'symbol',
      'buyValue',
      'sellValue',
      'openQty',
      'avgBuyPrice',
      'ltp',
      'realizedPnl',
      'unrealizedPnl',
      'charges',
      'netPnl',
      'lastTradeAt',
    ],
    'netPnl',
  )
  respond(res, rows, req.query, {
    symbols: rows.length,
    realizedPnl: round(rows.reduce((sum, row) => sum + row.realizedPnl, 0)),
    unrealizedPnl: round(rows.reduce((sum, row) => sum + row.unrealizedPnl, 0)),
    charges: round(rows.reduce((sum, row) => sum + row.charges, 0)),
    netPnl: round(rows.reduce((sum, row) => sum + row.netPnl, 0)),
  }, { statuses: ['all', 'profit', 'loss'] })
}

function fundsReport(req, res) {
  let rows = db.prepare('SELECT * FROM ledger WHERE user_id = ?').all(req.user.id).map((row) => ({
    id: row.id,
    transactionType: row.type,
    amount: row.amount,
    balanceAfter: row.balance_after,
    note: row.note,
    createdAt: row.created_at,
  })).filter((row) => matchesCommon(row, req.query, ['transactionType', 'note']))
  if (req.query.transactionType && req.query.transactionType !== 'all') {
    rows = rows.filter((row) => row.transactionType === req.query.transactionType)
  }
  sortRows(rows, req.query, ['createdAt', 'transactionType', 'amount', 'balanceAfter', 'note'], 'createdAt')
  respond(res, rows, req.query, {
    transactions: rows.length,
    credits: round(rows.filter((row) => row.transactionType === 'credit').reduce((sum, row) => sum + row.amount, 0)),
    debits: round(rows.filter((row) => row.transactionType === 'debit').reduce((sum, row) => sum + row.amount, 0)),
    closingBalance: rows.length
      ? [...rows].sort((a, b) => b.createdAt - a.createdAt)[0].balanceAfter
      : req.user.cash,
  }, { transactionTypes: ['all', 'credit', 'debit'] })
}

function mutualFundsReport(req, res) {
  let rows = db.prepare('SELECT * FROM mf_transactions WHERE user_id = ?').all(req.user.id).map((row) => ({
    id: row.id,
    fundId: row.fund_id,
    fund: FUND_MAP[row.fund_id]?.name || row.fund_id,
    category: FUND_MAP[row.fund_id]?.subCategory || 'Other',
    transactionType: row.type,
    amount: row.amount,
    units: row.units,
    nav: row.nav,
    createdAt: row.created_at,
  })).filter((row) => matchesCommon(row, req.query, ['fund', 'category', 'transactionType']))
  if (req.query.transactionType && req.query.transactionType !== 'all') {
    rows = rows.filter((row) => row.transactionType === req.query.transactionType)
  }
  sortRows(rows, req.query, ['createdAt', 'fund', 'category', 'transactionType', 'amount', 'units', 'nav'], 'createdAt')
  respond(res, rows, req.query, {
    transactions: rows.length,
    purchases: round(rows.filter((row) => row.transactionType === 'purchase').reduce((sum, row) => sum + row.amount, 0)),
    redemptions: round(rows.filter((row) => row.transactionType === 'redemption').reduce((sum, row) => sum + row.amount, 0)),
    netInvestment: round(rows.reduce(
      (sum, row) => sum + (row.transactionType === 'purchase' ? row.amount : -row.amount),
      0,
    )),
  }, { transactionTypes: ['all', 'purchase', 'redemption'] })
}

function chargesReport(req, res) {
  let rows = orderRows(req.user.id)
    .filter((row) => row.status === 'filled')
    .map((row) => ({ ...row, ...chargesFor(row) }))
    .filter((row) => matchesCommon(row, req.query, ['symbol', 'side', 'product']))
  if (req.query.side && req.query.side !== 'all') rows = rows.filter((row) => row.side === req.query.side)
  if (req.query.product && req.query.product !== 'all') rows = rows.filter((row) => row.product === req.query.product)
  sortRows(
    rows,
    req.query,
    [
      'createdAt',
      'symbol',
      'side',
      'product',
      'turnover',
      'brokerage',
      'stt',
      'exchange',
      'gst',
      'stampDuty',
      'total',
    ],
    'createdAt',
  )
  respond(res, rows, req.query, {
    trades: rows.length,
    turnover: round(rows.reduce((sum, row) => sum + row.turnover, 0)),
    brokerage: round(rows.reduce((sum, row) => sum + row.brokerage, 0)),
    taxes: round(rows.reduce((sum, row) => sum + row.stt + row.exchange + row.sebi + row.stampDuty + row.gst, 0)),
    totalCharges: round(rows.reduce((sum, row) => sum + row.total, 0)),
  }, {
    sides: ['all', 'buy', 'sell'],
    products: ['all', 'delivery', 'intraday'],
  })
}

function ipoReport(req, res) {
  let rows = db.prepare('SELECT * FROM ipo_applications WHERE user_id = ?').all(req.user.id).map((row) => ({
    id: row.id,
    ipoId: row.ipo_id,
    ipo: IPO_MAP[row.ipo_id]?.name || row.ipo_id,
    lots: row.lots,
    amount: row.amount,
    status: row.status,
    upi: row.upi,
    createdAt: row.created_at,
  })).filter((row) => matchesCommon(row, req.query, ['ipo', 'status', 'upi']))
  if (req.query.status && req.query.status !== 'all') rows = rows.filter((row) => row.status === req.query.status)
  sortRows(rows, req.query, ['createdAt', 'ipo', 'lots', 'amount', 'status', 'upi'], 'createdAt')
  respond(res, rows, req.query, {
    applications: rows.length,
    lots: rows.reduce((sum, row) => sum + row.lots, 0),
    blockedAmount: round(rows.reduce((sum, row) => sum + row.amount, 0)),
  }, { statuses: ['all', 'submitted', 'allotted', 'not-allotted', 'cancelled'] })
}

router.get('/:type', authRequired, (req, res) => {
  const handlers = {
    tradebook,
    pnl: pnlReport,
    funds: fundsReport,
    'mutual-funds': mutualFundsReport,
    charges: chargesReport,
    ipo: ipoReport,
  }
  const handler = handlers[req.params.type]
  if (!handler) return res.status(404).json({ error: 'Report type not found' })
  handler(req, res)
})

export default router
