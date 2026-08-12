import { Router } from 'express'
import { authRequired } from '../auth.js'
import { aiConfigured, aiKeyLooksValid, AI_MODEL, askCoach } from '../ai/coach.js'

const router = Router()

router.get('/status', authRequired, (_req, res) => {
  const live = aiConfigured()
  const valid = aiKeyLooksValid()
  res.json({
    configured: live && valid,
    keyPresent: live,
    keyLooksValid: valid,
    provider: live && valid ? 'openai' : 'local',
    model: live && valid ? AI_MODEL : null,
    note: !live
      ? 'OPENAI_API_KEY is missing on the running API. Save, rebuild, and deploy on Render.'
      : !valid
        ? 'OPENAI_API_KEY is set but does not start with sk-. Replace it with an OpenAI secret key.'
        : 'OpenAI gpt-4o-mini is configured. Ask a question to confirm a live reply.',
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
