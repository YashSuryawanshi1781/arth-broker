import { Router } from 'express'
import { authRequired } from '../auth.js'
import { listActivity } from '../activity.js'

const router = Router()

router.get('/', authRequired, (req, res) => {
  res.json({ events: listActivity(req.user.id, Number(req.query.limit) || 50) })
})

export default router
