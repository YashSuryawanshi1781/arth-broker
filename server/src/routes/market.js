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
