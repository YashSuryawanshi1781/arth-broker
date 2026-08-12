import { nanoid } from 'nanoid'
import { db } from './db.js'
import { market } from './market.js'
import { buyDebit, roundMoney } from './money.js'
import { bookQty, settleFilledOrder } from './orderEngine.js'
import { addNotification } from './auth.js'
import { logActivity } from './activity.js'
import { getStrategy, scorePicks, sizeQuantity } from './strategies.js'

function istParts(now = Date.now()) {
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
  const parts = Object.fromEntries(fmt.formatToParts(new Date(now)).map((p) => [p.type, p.value]))
  return {
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

function inSession(strategy, minutes) {
  // Rough NSE cash session 09:15–15:20 IST
  const open = 9 * 60 + 15
  const close = 15 * 60 + 20
  if (strategy.session === 'any') return minutes >= open && minutes < close
  return minutes >= open && minutes < close
}

function mapBot(row) {
  if (!row) return null
  const strategy = getStrategy(row.strategy_id)
  return {
    id: row.id,
    strategyId: row.strategy_id,
    strategyName: strategy.name,
    strategyVibe: strategy.vibe,
    indicators: strategy.indicators,
    dailyGoal: row.daily_goal,
    dayPnl: row.day_pnl,
    dayKey: row.day_key,
    status: row.status,
    symbol: row.symbol,
    qty: row.qty,
    entryPrice: row.entry_price,
    stopPrice: row.stop_price,
    targetPrice: row.target_price,
    product: row.product,
    entryOrderId: row.entry_order_id,
    stopOrderId: row.stop_order_id,
    targetOrderId: row.target_order_id,
    lastSignal: row.last_signal,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export function getUserBot(userId) {
  return mapBot(
    db.prepare('SELECT * FROM auto_bots WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId),
  )
}

export function listBotEvents(userId, limit = 20) {
  return db
    .prepare(`
      SELECT * FROM auto_bot_events
      WHERE user_id = ? ORDER BY created_at DESC LIMIT ?
    `)
    .all(userId, limit)
    .map((e) => ({
      id: e.id,
      botId: e.bot_id,
      kind: e.kind,
      title: e.title,
      body: e.body,
      createdAt: e.created_at,
    }))
}

function pushEvent(userId, botId, kind, title, body = '') {
  db.prepare(`
    INSERT INTO auto_bot_events (id, user_id, bot_id, kind, title, body, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(nanoid(12), userId, botId, kind, title, body, Date.now())
}

function placeMarketOrder({ userId, symbol, side, qty, product, practice = true }) {
  const instrument = market.get(symbol)
  if (!instrument) return { ok: false, error: 'Unknown symbol' }
  const fillPrice = instrument.price
  const notional = roundMoney(fillPrice * qty)
  const now = Date.now()
  const id = nanoid(10)
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(userId)
  if (!user) return { ok: false, error: 'User missing' }

  try {
    const result = db.transaction(() => {
      if (side === 'buy') {
        const { debit } = buyDebit(notional, side, product)
        if (roundMoney(user.cash) + 0.009 < debit) throw new Error('Insufficient funds for auto entry')
      } else if (bookQty(userId, symbol, product) < qty) {
        throw new Error('No position to exit')
      }

      db.prepare(`
        INSERT INTO orders (
          id, user_id, symbol, side, type, qty, price, fill_price, status, product,
          reserved_cash, is_practice, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 'market', ?, ?, NULL, 'open', ?, 0, ?, ?, ?)
      `).run(id, userId, symbol, side, qty, fillPrice, product, practice ? 1 : 0, now, now)

      const settled = settleFilledOrder({
        userId,
        orderId: id,
        symbol,
        side,
        qty,
        fillPrice,
        product,
        reservedCash: 0,
        now,
      })
      if (!settled.ok) throw new Error(settled.error)
      return settled
    })()

    return { ok: true, orderId: id, fillPrice, cash: result.cash }
  } catch (err) {
    return { ok: false, error: err.message }
  }
}

function placeExitTriggers({ userId, symbol, qty, product, stopPrice, targetPrice }) {
  const now = Date.now()
  const stopId = nanoid(12)
  const targetId = nanoid(12)

  db.prepare(`
    INSERT INTO conditional_orders
      (id, user_id, symbol, side, product, qty, trigger_type, trigger_price, limit_price, status, created_at, updated_at)
    VALUES (?, ?, ?, 'sell', ?, ?, 'below', ?, NULL, 'open', ?, ?)
  `).run(stopId, userId, symbol, product, qty, stopPrice, now, now)

  db.prepare(`
    INSERT INTO conditional_orders
      (id, user_id, symbol, side, product, qty, trigger_type, trigger_price, limit_price, status, created_at, updated_at)
    VALUES (?, ?, ?, 'sell', ?, ?, 'above', ?, NULL, 'open', ?, ?)
  `).run(targetId, userId, symbol, product, qty, targetPrice, now, now)

  return { stopId, targetId }
}

function cancelConditional(id) {
  if (!id) return
  db.prepare(`
    UPDATE conditional_orders SET status = 'cancelled', updated_at = ?
    WHERE id = ? AND status = 'open'
  `).run(Date.now(), id)
}

function realizedDayPnl(userId, dayKey) {
  // Approx: sum sell notional - buy notional for bot-tagged practice fills today is hard;
  // use bot.day_pnl field maintained on exits.
  const bot = db.prepare('SELECT day_pnl, day_key FROM auto_bots WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId)
  if (!bot || bot.day_key !== dayKey) return 0
  return Number(bot.day_pnl) || 0
}

function rolloverDay(bot, dayKey) {
  if (bot.day_key === dayKey) return bot
  db.prepare(`
    UPDATE auto_bots SET day_key = ?, day_pnl = 0, updated_at = ? WHERE id = ?
  `).run(dayKey, Date.now(), bot.id)
  return db.prepare('SELECT * FROM auto_bots WHERE id = ?').get(bot.id)
}

function syncOpenTrade(bot) {
  if (bot.status !== 'in_trade' || !bot.symbol) return bot

  const stop = bot.stop_order_id
    ? db.prepare('SELECT * FROM conditional_orders WHERE id = ?').get(bot.stop_order_id)
    : null
  const target = bot.target_order_id
    ? db.prepare('SELECT * FROM conditional_orders WHERE id = ?').get(bot.target_order_id)
    : null

  const stopHit = stop?.status === 'triggered'
  const targetHit = target?.status === 'triggered'

  if (!stopHit && !targetHit) return bot

  // Cancel the other leg
  if (stopHit) cancelConditional(bot.target_order_id)
  if (targetHit) cancelConditional(bot.stop_order_id)

  const exitPrice = stopHit
    ? (stop.trigger_price || bot.stop_price)
    : (target.trigger_price || bot.target_price)
  const entry = Number(bot.entry_price) || 0
  const qty = Number(bot.qty) || 0
  const pnl = roundMoney((Number(exitPrice) - entry) * qty)
  const dayPnl = roundMoney((Number(bot.day_pnl) || 0) + pnl)
  const now = Date.now()
  const hitGoal = dayPnl >= Number(bot.daily_goal)
  const nextStatus = hitGoal ? 'goal_hit' : 'armed'

  db.prepare(`
    UPDATE auto_bots SET
      status = ?, symbol = NULL, qty = 0, entry_price = NULL, stop_price = NULL, target_price = NULL,
      entry_order_id = NULL, stop_order_id = NULL, target_order_id = NULL,
      day_pnl = ?, last_signal = ?, note = ?, updated_at = ?
    WHERE id = ?
  `).run(
    nextStatus,
    dayPnl,
    stopHit ? 'stop_hit' : 'target_hit',
    stopHit
      ? `Stop hit on ${bot.symbol} · P&L ₹${pnl}`
      : `Target hit on ${bot.symbol} · P&L ₹${pnl}`,
    now,
    bot.id,
  )

  pushEvent(
    bot.user_id,
    bot.id,
    stopHit ? 'stop' : 'target',
    stopHit ? `Stop loss · ${bot.symbol}` : `Target booked · ${bot.symbol}`,
    `Exit ≈ ₹${roundMoney(exitPrice)} · trade P&L ₹${pnl} · day ₹${dayPnl}`,
  )
  addNotification(
    bot.user_id,
    stopHit ? 'Auto desk · stop hit' : 'Auto desk · target hit',
    `${bot.symbol}: day P&L now ₹${dayPnl} / goal ₹${bot.daily_goal}`,
  )
  logActivity(bot.user_id, 'auto', stopHit ? `Stop ${bot.symbol}` : `Target ${bot.symbol}`, `Day P&L ₹${dayPnl}`)

  return db.prepare('SELECT * FROM auto_bots WHERE id = ?').get(bot.id)
}

function tryEnter(bot, strategy) {
  const picks = scorePicks(strategy, market.list(), 5)
  if (!picks.length) {
    db.prepare(`UPDATE auto_bots SET last_signal = ?, note = ?, updated_at = ? WHERE id = ?`).run(
      'waiting',
      'No clean setup right now — scanning…',
      Date.now(),
      bot.id,
    )
    return
  }

  const pick = picks[0]
  const user = db.prepare('SELECT cash, kyc_complete FROM users WHERE id = ?').get(bot.user_id)
  if (!user?.kyc_complete) return

  const qty = sizeQuantity({
    cash: user.cash,
    entry: pick.price,
    stopPct: strategy.stopPct,
    targetPct: strategy.targetPct,
    dailyGoal: bot.daily_goal,
  })
  if (!(qty > 0)) {
    db.prepare(`UPDATE auto_bots SET note = ?, updated_at = ? WHERE id = ?`).run(
      'Need more cash to size a safe lot for this goal',
      Date.now(),
      bot.id,
    )
    return
  }

  const stopPrice = roundMoney(pick.price * (1 - strategy.stopPct))
  const targetPrice = roundMoney(pick.price * (1 + strategy.targetPct))

  const entry = placeMarketOrder({
    userId: bot.user_id,
    symbol: pick.symbol,
    side: 'buy',
    qty,
    product: strategy.product,
    practice: true,
  })
  if (!entry.ok) {
    db.prepare(`UPDATE auto_bots SET note = ?, updated_at = ? WHERE id = ?`).run(
      `Entry blocked: ${entry.error}`,
      Date.now(),
      bot.id,
    )
    return
  }

  const exits = placeExitTriggers({
    userId: bot.user_id,
    symbol: pick.symbol,
    qty,
    product: strategy.product,
    stopPrice,
    targetPrice,
  })

  const now = Date.now()
  db.prepare(`
    UPDATE auto_bots SET
      status = 'in_trade', symbol = ?, qty = ?, entry_price = ?, stop_price = ?, target_price = ?,
      product = ?, entry_order_id = ?, stop_order_id = ?, target_order_id = ?,
      last_signal = ?, note = ?, updated_at = ?
    WHERE id = ?
  `).run(
    pick.symbol,
    qty,
    entry.fillPrice,
    stopPrice,
    targetPrice,
    strategy.product,
    entry.orderId,
    exits.stopId,
    exits.targetId,
    pick.reason,
    `Auto BUY ${qty} ${pick.symbol} @ ₹${entry.fillPrice} · SL ₹${stopPrice} · TP ₹${targetPrice}`,
    now,
    bot.id,
  )

  pushEvent(
    bot.user_id,
    bot.id,
    'entry',
    `Entered ${pick.symbol}`,
    `BUY ${qty} @ ₹${entry.fillPrice} · SL ₹${stopPrice} · TP ₹${targetPrice} · ${pick.reason}`,
  )
  addNotification(
    bot.user_id,
    'Auto desk · entry',
    `Bought ${qty} ${pick.symbol} for paper goal ₹${bot.daily_goal}`,
  )
  logActivity(bot.user_id, 'auto', `Auto BUY ${pick.symbol}`, `${qty} @ ₹${entry.fillPrice}`)
}

/** Called from market tick broadcast — paper auto desk brain. */
export function processAutoBots() {
  const { dayKey, minutes } = istParts()
  const bots = db.prepare(`SELECT * FROM auto_bots WHERE status IN ('armed', 'in_trade')`).all()
  if (!bots.length) return

  for (let bot of bots) {
    try {
      bot = rolloverDay(bot, dayKey)
      bot = syncOpenTrade(bot)

      if (bot.status === 'goal_hit' || bot.status === 'stopped') continue

      const strategy = getStrategy(bot.strategy_id)
      if (!inSession(strategy, minutes)) {
        if (bot.status === 'armed') {
          db.prepare(`UPDATE auto_bots SET note = ?, updated_at = ? WHERE id = ?`).run(
            'Waiting for market session (09:15–15:20 IST)',
            Date.now(),
            bot.id,
          )
        }
        continue
      }

      if (bot.status === 'in_trade') continue

      // armed — try entry if day goal not already reached
      if ((Number(bot.day_pnl) || 0) >= Number(bot.daily_goal)) {
        db.prepare(`UPDATE auto_bots SET status = 'goal_hit', note = ?, updated_at = ? WHERE id = ?`).run(
          `Daily paper goal ₹${bot.daily_goal} done`,
          Date.now(),
          bot.id,
        )
        continue
      }

      // Max daily loss guard: -1.5x goal
      if ((Number(bot.day_pnl) || 0) <= -1.5 * Number(bot.daily_goal)) {
        db.prepare(`UPDATE auto_bots SET status = 'stopped', note = ?, updated_at = ? WHERE id = ?`).run(
          'Paused — day loss hit risk guard',
          Date.now(),
          bot.id,
        )
        pushEvent(bot.user_id, bot.id, 'risk', 'Risk guard', 'Day loss exceeded 1.5× goal — bot paused')
        continue
      }

      tryEnter(bot, strategy)
    } catch (err) {
      console.warn('Auto bot error', bot.id, err.message)
    }
  }
}

export function createOrReplaceBot(userId, { strategyId, dailyGoal }) {
  const strategy = getStrategy(strategyId)
  const goal = Number(dailyGoal)
  if (!(goal >= 100 && goal <= 100000)) {
    const err = new Error('Daily goal must be between ₹100 and ₹1,00,000')
    err.status = 400
    throw err
  }
  const user = db.prepare('SELECT kyc_complete FROM users WHERE id = ?').get(userId)
  if (!user?.kyc_complete) {
    const err = new Error('Complete KYC to arm the auto desk')
    err.status = 403
    err.code = 'KYC_REQUIRED'
    throw err
  }

  const existing = db.prepare('SELECT * FROM auto_bots WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId)
  if (existing?.status === 'in_trade') {
    const err = new Error('Close or wait for the open auto trade before re-arming')
    err.status = 400
    throw err
  }

  // Stop previous bots
  db.prepare(`UPDATE auto_bots SET status = 'stopped', updated_at = ? WHERE user_id = ? AND status IN ('armed', 'goal_hit')`)
    .run(Date.now(), userId)

  const { dayKey } = istParts()
  const id = nanoid(12)
  const now = Date.now()
  db.prepare(`
    INSERT INTO auto_bots (
      id, user_id, strategy_id, daily_goal, day_pnl, day_key, status, product,
      last_signal, note, created_at, updated_at
    ) VALUES (?, ?, ?, ?, 0, ?, 'armed', ?, 'armed', ?, ?, ?)
  `).run(
    id,
    userId,
    strategy.id,
    goal,
    dayKey,
    strategy.product,
    `Armed · ${strategy.name} · goal ₹${goal}`,
    now,
    now,
  )

  pushEvent(userId, id, 'armed', 'Auto desk armed', `${strategy.name} · daily paper goal ₹${goal}`)
  logActivity(userId, 'auto', 'Armed auto desk', `${strategy.name} · ₹${goal}/day`)
  addNotification(userId, 'Auto desk armed', `${strategy.name} hunting paper setups for ₹${goal}`)

  return getUserBot(userId)
}

export function stopBot(userId) {
  const bot = db.prepare('SELECT * FROM auto_bots WHERE user_id = ? ORDER BY created_at DESC LIMIT 1').get(userId)
  if (!bot) return null
  if (bot.status === 'in_trade') {
    cancelConditional(bot.stop_order_id)
    cancelConditional(bot.target_order_id)
    // Leave position — user can manage manually; mark stopped
  }
  db.prepare(`
    UPDATE auto_bots SET status = 'stopped', note = ?, updated_at = ? WHERE id = ?
  `).run('Stopped by you', Date.now(), bot.id)
  pushEvent(userId, bot.id, 'stopped', 'Auto desk stopped', 'Manual stop')
  return getUserBot(userId)
}

export { mapBot, realizedDayPnl }
