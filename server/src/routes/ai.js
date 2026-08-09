import { Router } from 'express'
import { authRequired } from '../auth.js'
import { aiConfigured, AI_MODEL, askCoach } from '../ai/coach.js'

const router = Router()

router.get('/status', authRequired, (_req, res) => {
  const live = aiConfigured()
  res.json({
    configured: live,
    provider: live ? 'openai' : 'local',
    model: live ? AI_MODEL : null,
    note: live
      ? 'OpenAI gpt-4o-mini is active for Arth Coach.'
      : 'Set OPENAI_API_KEY on the API for live OpenAI replies. Local educational fallback is on.',
  })
})

router.post('/chat', authRequired, async (req, res) => {
  try {
    const mode = req.body?.mode === 'stock' ? 'stock' : 'learn'
    const result = await askCoach({
      userId: req.user.id,
      message: req.body?.message,
      mode,
      symbol: req.body?.symbol,
      history: req.body?.history,
    })
    res.json(result)
  } catch (err) {
    const status = err.status || 500
    res.status(status).json({ error: err.message || 'Coach unavailable' })
  }
})

export default router
