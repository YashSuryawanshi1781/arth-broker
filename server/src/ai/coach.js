/**
 * Arth AI coach — OpenAI gpt-4o-mini when OPENAI_API_KEY is set,
 * otherwise a local educational fallback so Learn still works offline.
 */
import { db } from '../db.js'
import { market } from '../market.js'
import { LESSONS, CHALLENGES, GLOSSARY } from '../learnContent.js'
import { roundMoney } from '../money.js'
import { PAPER_STARTING_CASH } from '../paperTrading.js'

export const AI_MODEL = 'gpt-4o-mini'
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions'

export function openaiApiKey() {
  return String(process.env.OPENAI_API_KEY || '').trim().replace(/^['"]|['"]$/g, '')
}

export function aiConfigured() {
  return Boolean(openaiApiKey())
}

export function aiKeyLooksValid() {
  const key = openaiApiKey()
  return key.startsWith('sk-')
}

export function buildLearnContext(userId) {
  const user = db.prepare('SELECT id, name, cash, learning_mode, kyc_complete FROM users WHERE id = ?').get(userId)
  const cash = roundMoney(user?.cash || 0)
  const done = new Set(
    db.prepare('SELECT challenge_id FROM learning_progress WHERE user_id = ?').all(userId).map((r) => r.challenge_id),
  )
  let practiceOrders = []
  try {
    practiceOrders = db.prepare(`
      SELECT symbol, side, type, qty, fill_price, price, status, product, created_at
      FROM orders WHERE user_id = ? AND is_practice = 1
      ORDER BY created_at DESC LIMIT 12
    `).all(userId)
  } catch {
    practiceOrders = []
  }

  const holdings = db.prepare('SELECT symbol, qty, avg_price FROM holdings WHERE user_id = ?').all(userId)
  const openChallenges = CHALLENGES.filter((c) => !done.has(c.id)).slice(0, 4).map((c) => c.title)

  return {
    mode: 'learn',
    learner: user?.name || 'Learner',
    cash,
    startingCash: PAPER_STARTING_CASH,
    practiceTradingOn: !!user?.learning_mode,
    kycComplete: !!user?.kyc_complete,
    challengesDone: [...done].filter((id) => !String(id).startsWith('lesson:')).length,
    challengesTotal: CHALLENGES.length,
    openChallenges,
    lessonTitles: LESSONS.map((l) => l.title),
    recentPracticeOrders: practiceOrders.map((o) => ({
      symbol: o.symbol,
      side: o.side,
      qty: o.qty,
      product: o.product,
      status: o.status,
      price: o.fill_price || o.price,
    })),
    holdings: holdings.map((h) => ({
      symbol: h.symbol,
      qty: h.qty,
      avg: h.avg_price,
      ltp: market.get(h.symbol)?.price ?? h.avg_price,
    })),
    glossaryTerms: GLOSSARY.map((g) => g.term),
  }
}

export function buildStockContext(userId, symbol) {
  const sym = String(symbol || '').toUpperCase()
  const row = market.get(sym)
  if (!row) return null
  const holding = db.prepare('SELECT qty, avg_price FROM holdings WHERE user_id = ? AND symbol = ?').get(userId, sym)
  const position = db.prepare('SELECT qty, avg_price FROM positions WHERE user_id = ? AND symbol = ?').get(userId, sym)
  const cash = roundMoney(db.prepare('SELECT cash FROM users WHERE id = ?').get(userId)?.cash || 0)
  return {
    mode: 'stock',
    symbol: row.symbol,
    name: row.name,
    sector: row.sector,
    price: row.price,
    changePct: row.changePct,
    prevClose: row.prevClose,
    high: row.high,
    low: row.low,
    volume: row.volume,
    pe: row.pe,
    about: row.about,
    cash,
    holdingQty: holding?.qty || 0,
    holdingAvg: holding?.avg_price || null,
    misQty: position?.qty || 0,
  }
}

function systemPrompt(mode) {
  const base = `You are Arth Coach, an educational assistant inside Arth — an Indian paper-trading / learning brokerage demo.
Rules:
- Be concise (3–8 short sentences or tight bullets). Use simple language.
- Educate; never give guaranteed profit tips or "buy this now" advice.
- Remind that Arth is practice / demo when relevant — not SEBI-registered live brokerage advice.
- Prefer CNC vs MIS, risk, diversification, and order types over stock tips.
- If asked about real money or SEBI registration, say Arth is a learning terminal.
- Indian market context (NSE, ₹, CNC/MIS, SIP) is fine.`
  if (mode === 'stock') {
    return `${base}\nFocus on explaining this one stock and how to practice trading it safely on Arth.`
  }
  return `${base}\nYou are in the Learn classroom. Use the learner's practice book and open challenges when helpful.`
}

export async function askCoach({ userId, message, mode = 'learn', symbol, history = [] }) {
  const text = String(message || '').trim().slice(0, 1200)
  if (!text) {
    const err = new Error('Message required')
    err.status = 400
    throw err
  }

  let context
  if (mode === 'stock') {
    context = buildStockContext(userId, symbol)
    if (!context) {
      const err = new Error('Unknown symbol')
      err.status = 404
      throw err
    }
  } else {
    context = buildLearnContext(userId)
  }

  if (!aiConfigured()) {
    return {
      reply: localFallback(text, context),
      provider: 'local',
      model: null,
      contextSummary: summarizeContext(context),
    }
  }

  if (!aiKeyLooksValid()) {
    return {
      reply: 'OPENAI_API_KEY is set on Render, but it is not an OpenAI secret. OpenAI keys start with sk- or sk-proj-. Replace the value, then Save, rebuild, and deploy.',
      provider: 'local',
      model: null,
      fallbackReason: 'invalid_key_format',
      contextSummary: summarizeContext(context),
    }
  }

  const messages = [
    { role: 'system', content: systemPrompt(mode) },
    {
      role: 'system',
      content: `Learner context (JSON):\n${JSON.stringify(context)}`,
    },
    ...normalizeHistory(history),
    { role: 'user', content: text },
  ]

  const res = await fetch(OPENAI_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiApiKey()}`,
    },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.4,
      max_tokens: 450,
      messages,
    }),
  })

  if (!res.ok) {
    const body = await res.text().catch(() => '')
    console.error('OpenAI error', res.status, body.slice(0, 400))
    return {
      reply: openaiFailureMessage(res.status),
      provider: 'local',
      model: null,
      fallbackReason: `openai_${res.status}`,
      contextSummary: summarizeContext(context),
    }
  }

  const data = await res.json()
  const reply = data.choices?.[0]?.message?.content?.trim()
    || localFallback(text, context)

  return {
    reply,
    provider: 'openai',
    model: AI_MODEL,
    contextSummary: summarizeContext(context),
  }
}

function normalizeHistory(history) {
  if (!Array.isArray(history)) return []
  return history
    .slice(-8)
    .filter((m) => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
    .map((m) => ({ role: m.role, content: m.content.slice(0, 800) }))
}

function summarizeContext(ctx) {
  if (ctx.mode === 'stock') {
    return `${ctx.symbol} ₹${ctx.price} (${ctx.changePct}%) · cash ₹${ctx.cash}`
  }
  return `cash ₹${ctx.cash} · ${ctx.challengesDone}/${ctx.challengesTotal} challenges · ${ctx.recentPracticeOrders.length} practice orders`
}

function localFallback(message, ctx) {
  const q = message.toLowerCase()

  if (ctx.mode === 'stock') {
    if (q.includes('buy') || q.includes('should i')) {
      return [
        `${ctx.symbol} is trading near ₹${Number(ctx.price).toLocaleString('en-IN')} (${ctx.changePct >= 0 ? '+' : ''}${ctx.changePct}%).`,
        'Arth Coach won’t tell you to buy or sell. For practice: size the order so it is a small slice of your cash, prefer CNC while learning, and use MIS only if you understand same-day square-off.',
        ctx.holdingQty
          ? `You already hold ${ctx.holdingQty} shares (avg ₹${ctx.holdingAvg}). Adding more concentrates risk.`
          : `You don’t hold ${ctx.symbol} yet. Available cash ≈ ₹${Number(ctx.cash).toLocaleString('en-IN')}.`,
        'Tip: turn on Practice trading from Learn so the fill shows in your paper trade book.',
      ].join('\n')
    }
    return [
      `**${ctx.symbol} — ${ctx.name}** (${ctx.sector})`,
      `LTP ₹${Number(ctx.price).toLocaleString('en-IN')} · day ${ctx.changePct >= 0 ? '+' : ''}${ctx.changePct}% · range ₹${ctx.low}–₹${ctx.high}.`,
      ctx.about ? `${ctx.about}` : '',
      'This is educational context only. Use Learn → Practice a trade to try a small CNC order without treating it as advice.',
    ].filter(Boolean).join('\n')
  }

  // Learn mode
  if (q.includes('challenge') || q.includes('next')) {
    const next = ctx.openChallenges?.[0]
    return next
      ? `Next open challenge: **${next}**. Turn on Practice trading, place the matching action on Arth, then return here — sync marks it done.`
      : 'Nice work — practice challenges look complete. Skim a lesson or reset the paper wallet if you want a clean ₹1L slate.'
  }
  if (q.includes('cnc') || q.includes('mis') || q.includes('delivery') || q.includes('intraday')) {
    return [
      '**CNC (delivery)** — you keep the shares overnight; full cash is blocked. Best while learning.',
      '**MIS (intraday)** — leveraged same-day trade; Arth auto square-off near 15:20 IST. Higher risk for beginners.',
      'Practice tip: do your first few buys in CNC with a small quantity.',
    ].join('\n')
  }
  if (q.includes('reset') || q.includes('1l') || q.includes('cash')) {
    return `Your classroom cash is about ₹${Number(ctx.cash).toLocaleString('en-IN')} (start ₹${Number(ctx.startingCash).toLocaleString('en-IN')}). Use **Reset → ₹1L** on Learn to clear holdings/orders and restore practice cash.`
  }
  if (q.includes('risk') || q.includes('diversif')) {
    const n = ctx.holdings?.length || 0
    return n <= 1
      ? 'Risk check: a single-stock book is fragile. Practice spreading buys across 2–3 sectors instead of putting most cash into one name.'
      : `You have practice exposure in ${n} names. Still watch concentration — if one holding is most of invested value, trim size on the next practice buy.`
  }
  if (ctx.recentPracticeOrders?.length) {
    const last = ctx.recentPracticeOrders[0]
    return [
      `Latest practice order: ${last.side.toUpperCase()} ${last.qty} ${last.symbol} (${last.product}, ${last.status}).`,
      `Progress: ${ctx.challengesDone}/${ctx.challengesTotal} challenges.`,
      'Ask me about CNC vs MIS, your next challenge, or how to size a safer practice order.',
    ].join('\n')
  }
  return [
    `Hi ${ctx.learner} — I’m Arth Coach in local mode (OpenAI is not connected on this API process).`,
    'I can explain CNC/MIS, challenges, risk sizing, and your paper trade book.',
    ctx.openChallenges?.[0]
      ? `Suggested next step: **${ctx.openChallenges[0]}**.`
      : 'Open a lesson, or tap Practice a trade to get a fill into your paper book.',
  ].join('\n')
}

function openaiFailureMessage(status) {
  if (status === 401) {
    return 'OpenAI rejected the key (401). On Render, click the eye on OPENAI_API_KEY — it must start with sk-. If you pasted the old key in chat, revoke it and create a new one, then Save, rebuild, and deploy.'
  }
  if (status === 403 || status === 429) {
    return 'OpenAI blocked the request (billing or rate limit). Add a payment method at platform.openai.com/settings/organization/billing, then try again.'
  }
  if (status === 404) {
    return 'OpenAI could not find the model. The API key is reaching OpenAI, but gpt-4o-mini may not be enabled on this account.'
  }
  return `OpenAI request failed (HTTP ${status}). Check Render logs for arth-api, confirm the service finished deploying after you saved the key, then try again.`
}
