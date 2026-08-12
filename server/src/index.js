import express from 'express'
import cors from 'cors'
import cookieParser from 'cookie-parser'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { initDb } from './db.js'
import { market } from './market.js'
import { ensureDemoUser } from './seedDemo.js'
import { rateLimit } from './rateLimit.js'
import { auditRequest } from './audit.js'
import authRoutes from './routes/auth.js'
import kycRoutes from './routes/kyc.js'
import marketRoutes from './routes/market.js'
import orderRoutes from './routes/orders.js'
import portfolioRoutes from './routes/portfolio.js'
import watchlistRoutes from './routes/watchlists.js'
import mfRoutes from './routes/mf.js'
import ipoRoutes from './routes/ipo.js'
import notificationRoutes from './routes/notifications.js'
import reportRoutes from './routes/reports.js'
import alertRoutes from './routes/alerts.js'
import learnRoutes from './routes/learn.js'
import activityRoutes from './routes/activity.js'
import conditionalRoutes from './routes/conditionalOrders.js'
import goalsRoutes from './routes/goals.js'
import adminRoutes from './routes/admin.js'
import aiRoutes from './routes/ai.js'
import autoRoutes from './routes/auto.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

initDb()
if (process.env.SEED_DEMO === 'true') {
  await ensureDemoUser()
}
market.start()

const app = express()
const PORT = process.env.PORT || 4000

const defaultOrigins = ['http://127.0.0.1:5173', 'http://localhost:5173']
const allowedOrigins = [
  ...defaultOrigins,
  ...String(process.env.CLIENT_ORIGIN || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
]

const openapiPath = path.join(__dirname, '..', 'openapi.json')
const openapiDoc = JSON.parse(fs.readFileSync(openapiPath, 'utf8'))

app.use(
  cors({
    origin(origin, cb) {
      if (!origin || allowedOrigins.includes(origin)) return cb(null, true)
      return cb(new Error(`Origin ${origin} not allowed by CORS`))
    },
    credentials: true,
  }),
)
app.use(express.json())
app.use(cookieParser())

app.get('/api/health', (_req, res) => res.json({
  ok: true,
  service: 'arth-api',
  marketData: market.status,
}))

app.get('/api/openapi.json', (_req, res) => {
  res.type('application/json').json(openapiDoc)
})

app.get('/api/docs', (_req, res) => {
  res.type('html').send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Arth API Docs</title>
  <link rel="stylesheet" href="https://unpkg.com/swagger-ui-dist@5/swagger-ui.css" />
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://unpkg.com/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.ui = SwaggerUIBundle({
      url: '/api/openapi.json',
      dom_id: '#swagger-ui',
    })
  </script>
</body>
</html>`)
})

app.use(
  '/api/auth',
  rateLimit({ windowMs: 60_000, max: 30 }),
  auditRequest('auth'),
  authRoutes,
)
app.use('/api/kyc', kycRoutes)
app.use('/api/market', marketRoutes)
app.use(
  '/api/orders',
  rateLimit({ windowMs: 60_000, max: 60 }),
  auditRequest('orders'),
  orderRoutes,
)
app.use('/api/portfolio', portfolioRoutes)
app.use('/api/watchlists', watchlistRoutes)
app.use('/api/mf', mfRoutes)
app.use('/api/ipo', ipoRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/reports', reportRoutes)
app.use('/api/alerts', alertRoutes)
app.use('/api/learn', learnRoutes)
app.use('/api/activity', activityRoutes)
app.use('/api/conditional', conditionalRoutes)
app.use('/api/goals', goalsRoutes)
app.use('/api/admin', adminRoutes)
app.use(
  '/api/ai',
  rateLimit({ windowMs: 60_000, max: 30 }),
  aiRoutes,
)
app.use(
  '/api/auto',
  rateLimit({ windowMs: 60_000, max: 40 }),
  autoRoutes,
)

// Optional: serve the Vite build from the same process (Render one-box deploy).
const clientDist = path.join(__dirname, '..', '..', 'client', 'dist')
app.use(express.static(clientDist))
app.get(/^(?!\/api).*/, (req, res, next) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') return next()
  res.sendFile(path.join(clientDist, 'index.html'), (err) => {
    if (err) next()
  })
})

app.use((err, _req, res, _next) => {
  console.error(err)
  const status = err.message?.startsWith('Origin ') ? 403 : 500
  res.status(status).json({ error: status === 403 ? err.message : 'Internal server error' })
})

app.listen(PORT, () => {
  console.log(`Arth API listening on http://127.0.0.1:${PORT}`)
  console.log(`Allowed origins: ${allowedOrigins.join(', ')}`)
  if (process.env.ENABLE_WS === 'true') {
    console.log('WS dual support stub — SSE remains primary (see docs/WEBSOCKET.md)')
  }
})
