import { Router } from 'express'
import { market } from '../market.js'

const router = Router()

router.get('/instruments', (_req, res) => {
  const q = String(_req.query.q || '').toLowerCase()
  const sector = String(_req.query.sector || '')
  let list = market.list()
  if (sector && sector !== 'All') list = list.filter((i) => i.sector === sector)
  if (q) {
    list = list.filter(
      (i) => i.symbol.toLowerCase().includes(q) || i.name.toLowerCase().includes(q),
    )
  }
  res.json({ instruments: list, indices: market.indices, marketStatus: market.status })
})

router.get('/indices', (_req, res) => {
  res.json({ indices: market.indices, marketStatus: market.status })
})

router.get('/indices/:key', (req, res) => {
  const index = market.getIndex(req.params.key)
  if (!index) return res.status(404).json({ error: 'Index not found' })
  res.json({ index, marketStatus: market.status })
})

router.get('/indices/:key/candles', async (req, res, next) => {
  try {
    const index = market.getIndex(req.params.key)
    if (!index) return res.status(404).json({ error: 'Index not found' })
    const interval = Number(req.query.interval) || 60
    const count = Number(req.query.count) || (interval >= 86400 ? 90 : interval >= 3600 ? 120 : 150)
    const candles = await market.candles(req.params.key, count, interval)
    if (!candles.length) return res.status(404).json({ error: 'No candles available' })
    res.json({ candles, interval, source: market.status.source })
  } catch (error) {
    next(error)
  }
})

router.get('/indices/:key/options', (req, res) => {
  const chain = market.optionChain(req.params.key)
  if (!chain) return res.status(404).json({ error: 'Index not found' })
  res.json({ chain, marketStatus: market.status })
})

router.get('/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders?.()
  market.addClient(res)
  req.on('close', () => market.removeClient(res))
})

router.get('/screener', (req, res) => {
  const minChange = req.query.minChange != null ? Number(req.query.minChange) : null
  const maxChange = req.query.maxChange != null ? Number(req.query.maxChange) : null
  const minVolume = req.query.minVolume != null ? Number(req.query.minVolume) : null
  const near52w = String(req.query.near52w || '') // high | low | ''
  const sector = String(req.query.sector || '')
  const sort = String(req.query.sort || 'changePct')
  const dir = String(req.query.dir || 'desc') === 'asc' ? 1 : -1

  let rows = market.list().map((i) => {
    const high = i.week52High || i.high || i.price
    const low = i.week52Low || i.low || i.price
    const nearHighPct = high ? +(((high - i.price) / high) * 100).toFixed(2) : null
    const nearLowPct = low ? +(((i.price - low) / low) * 100).toFixed(2) : null
    return {
      symbol: i.symbol,
      name: i.name,
      sector: i.sector,
      price: i.price,
      change: i.change,
      changePct: i.changePct,
      volume: i.volume || 0,
      week52High: high,
      week52Low: low,
      nearHighPct,
      nearLowPct,
    }
  })

  if (sector && sector !== 'All') rows = rows.filter((r) => r.sector === sector)
  if (minChange != null && !Number.isNaN(minChange)) rows = rows.filter((r) => r.changePct >= minChange)
  if (maxChange != null && !Number.isNaN(maxChange)) rows = rows.filter((r) => r.changePct <= maxChange)
  if (minVolume != null && !Number.isNaN(minVolume)) rows = rows.filter((r) => r.volume >= minVolume)
  if (near52w === 'high') rows = rows.filter((r) => r.nearHighPct != null && r.nearHighPct <= 5)
  if (near52w === 'low') rows = rows.filter((r) => r.nearLowPct != null && r.nearLowPct <= 5)

  rows.sort((a, b) => {
    const av = a[sort] ?? 0
    const bv = b[sort] ?? 0
    return av === bv ? 0 : av > bv ? dir : -dir
  })

  res.json({ results: rows, marketStatus: market.status })
})

const MOCK_ACTIONS = [
  { symbol: 'TCS', type: 'dividend', title: 'Interim dividend ₹10', date: daysFromNow(5), amount: 10 },
  { symbol: 'INFY', type: 'dividend', title: 'Final dividend ₹20', date: daysFromNow(12), amount: 20 },
  { symbol: 'RELIANCE', type: 'bonus', title: 'Bonus 1:1', date: daysFromNow(20), ratio: '1:1' },
  { symbol: 'HDFCBANK', type: 'split', title: 'Stock split 2:1', date: daysFromNow(28), ratio: '2:1' },
  { symbol: 'SBIN', type: 'result', title: 'Q1 results', date: daysFromNow(8) },
  { symbol: 'TITAN', type: 'dividend', title: 'Dividend ₹11', date: daysFromNow(15), amount: 11 },
  { symbol: 'ITC', type: 'result', title: 'Q1 earnings', date: daysFromNow(3) },
  { symbol: 'WIPRO', type: 'dividend', title: 'Interim dividend ₹1', date: daysFromNow(22), amount: 1 },
]

function daysFromNow(n) {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

router.get('/corporate-actions', (req, res) => {
  const symbol = String(req.query.symbol || '').toUpperCase()
  let actions = MOCK_ACTIONS
  if (symbol) actions = actions.filter((a) => a.symbol === symbol)
  res.json({ actions })
})

router.get('/news', (req, res) => {
  const symbol = String(req.query.symbol || '').toUpperCase()
  const headlines = [
    { id: '1', symbol: symbol || 'NIFTY', title: `${symbol || 'Markets'}: Street watches FII flows into IT`, source: 'Arth Desk', publishedAt: Date.now() - 3600_000 },
    { id: '2', symbol: symbol || 'RELIANCE', title: `${symbol || 'Energy'} names firm on crude cues`, source: 'Demo Wire', publishedAt: Date.now() - 7200_000 },
    { id: '3', symbol: symbol || 'TCS', title: `Analysts reiterate overweight on ${symbol || 'large-cap IT'}`, source: 'Paper Research', publishedAt: Date.now() - 10800_000 },
    { id: '4', symbol: symbol || 'BANKNIFTY', title: 'Banking index consolidates ahead of RBI commentary', source: 'Arth Desk', publishedAt: Date.now() - 14400_000 },
  ]
  res.json({ news: headlines, note: 'Demo headlines for paper trading only.' })
})

router.get('/:symbol/candles', async (req, res, next) => {
  try {
  const interval = Number(req.query.interval) || 60
  const count = Number(req.query.count) || (interval >= 86400 ? 90 : interval >= 3600 ? 120 : 150)
  const candles = await market.candles(req.params.symbol, count, interval)
  if (!candles.length) return res.status(404).json({ error: 'Symbol not found' })
  res.json({ candles, interval, source: market.status.source })
  } catch (error) {
    next(error)
  }
})

router.get('/:symbol/depth', (req, res) => {
  if (!market.get(req.params.symbol)) return res.status(404).json({ error: 'Symbol not found' })
  res.json(market.depth(req.params.symbol))
})

router.get('/:symbol', (req, res) => {
  const instrument = market.get(req.params.symbol)
  if (!instrument) return res.status(404).json({ error: 'Symbol not found' })
  res.json({ instrument, depth: market.depth(req.params.symbol), marketStatus: market.status })
})

export default router
