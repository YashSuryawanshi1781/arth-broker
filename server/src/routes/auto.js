import { Router } from 'express'
import { authRequired } from '../auth.js'
import { market } from '../market.js'
import { STRATEGIES, getStrategy, scorePicks } from '../strategies.js'
import {
  createOrReplaceBot,
  getUserBot,
  listBotEvents,
  stopBot,
} from '../autoBotRunner.js'

const router = Router()

router.get('/strategies', authRequired, (_req, res) => {
  res.json({
    strategies: STRATEGIES.map((s) => ({
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      vibe: s.vibe,
      indicators: s.indicators,
      product: s.product,
      stopPct: s.stopPct,
      targetPct: s.targetPct,
    })),
    disclaimer:
      'Paper auto desk only. No guaranteed profit. Not SEBI advice. Orders use practice cash on Arth.',
  })
})

router.get('/picks', authRequired, (req, res) => {
  const strategy = getStrategy(req.query.strategy || 'momentum_breakout')
  const picks = scorePicks(strategy, market.list(), 8)
  res.json({ strategyId: strategy.id, picks })
})

router.get('/bot', authRequired, (req, res) => {
  res.json({
    bot: getUserBot(req.user.id),
    events: listBotEvents(req.user.id, 25),
  })
})

router.post('/bot', authRequired, (req, res) => {
  try {
    const bot = createOrReplaceBot(req.user.id, {
      strategyId: req.body?.strategyId,
      dailyGoal: req.body?.dailyGoal,
    })
    res.status(201).json({ bot })
  } catch (err) {
    res.status(err.status || 500).json({ error: err.message, code: err.code })
  }
})

router.post('/bot/stop', authRequired, (req, res) => {
  const bot = stopBot(req.user.id)
  res.json({ bot })
})

export default router
