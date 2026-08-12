import { Router } from 'express'
import { authRequired } from '../auth.js'
import { market } from '../market.js'
import {
  STRATEGIES,
  TRADING_DAYS_PER_MONTH,
  collectPicks,
  getStrategy,
  planFromMonthly,
  strategiesForMode,
} from '../strategies.js'
import {
  createOrReplaceBot,
  getUserBot,
  listBotEvents,
  stopBot,
} from '../autoBotRunner.js'

const router = Router()

router.get('/strategies', authRequired, (req, res) => {
  const mode = req.query.mode || 'stocks'
  const list = strategiesForMode(mode)
  res.json({
    strategies: (list.length ? list : STRATEGIES).map((s) => ({
      id: s.id,
      name: s.name,
      tagline: s.tagline,
      vibe: s.vibe,
      indicators: s.indicators,
      product: s.product,
      assetClass: s.assetClass,
      stopPct: s.stopPct,
      targetPct: s.targetPct,
    })),
    tradingDaysPerMonth: TRADING_DAYS_PER_MONTH,
    disclaimer:
      'Paper auto desk only. No guaranteed profit. Not SEBI advice. Stocks & index options use practice cash on Arth.',
  })
})

router.get('/plan', authRequired, (req, res) => {
  const monthly = Number(req.query.monthlyGoal)
  const days = Number(req.query.tradingDays) || TRADING_DAYS_PER_MONTH
  if (!(monthly >= 1000 && monthly <= 5_000_000)) {
    return res.status(400).json({ error: 'Monthly goal must be between ₹1,000 and ₹50,00,000' })
  }
  res.json(planFromMonthly(monthly, days))
})

router.get('/picks', authRequired, (req, res) => {
  const strategy = getStrategy(req.query.strategy || 'momentum_breakout')
  const mode = req.query.mode || 'stocks'
  const picks = collectPicks(strategy, market, mode, 8)
  res.json({ strategyId: strategy.id, mode, picks })
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
      monthlyGoal: req.body?.monthlyGoal,
      maxDailyLoss: req.body?.maxDailyLoss,
      instrumentMode: req.body?.instrumentMode,
      stopPct: req.body?.stopPct,
      targetPct: req.body?.targetPct,
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
