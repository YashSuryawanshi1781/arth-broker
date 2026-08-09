import { nanoid } from 'nanoid'
import { db } from './db.js'
import { market } from './market.js'
import { settleFilledOrder } from './orderEngine.js'
import { addNotification } from './auth.js'
import { logActivity } from './activity.js'
import { roundMoney } from './money.js'

/** Last calendar day (IST) we ran auto square-off. */
let lastSquareOffDay = ''

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
  const parts = Object.fromEntries(fmt.formatToParts(new Date(now)).filter((p) => p.type !== 'literal').map((p) => [p.type, p.value]))
  return {
    dayKey: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  }
}

/** Square off all open MIS positions for every user (market sell). */
export function squareOffAllPositions({ reason = 'Auto square-off' } = {}) {
  const rows = db.prepare('SELECT * FROM positions WHERE qty > 0').all()
  if (!rows.length) return { squared: 0 }

  const now = Date.now()
  let squared = 0

  for (const pos of rows) {
    const price = market.price(pos.symbol)
    if (!(price > 0)) continue
    const orderId = nanoid(10)
    try {
      db.transaction(() => {
        db.prepare(`
          INSERT INTO orders (id, user_id, symbol, side, type, qty, price, fill_price, status, product, reserved_cash, created_at, updated_at)
          VALUES (?, ?, ?, 'sell', 'market', ?, ?, NULL, 'open', 'intraday', 0, ?, ?)
        `).run(orderId, pos.user_id, pos.symbol, pos.qty, price, now, now)

        const settled = settleFilledOrder({
          userId: pos.user_id,
          orderId,
          symbol: pos.symbol,
          side: 'sell',
          qty: pos.qty,
          fillPrice: price,
          product: 'intraday',
          reservedCash: 0,
          now,
        })
        if (!settled.ok) throw new Error(settled.error)
      })()

      addNotification(
        pos.user_id,
        reason,
        `Sold ${pos.qty} ${pos.symbol} MIS @ ₹${roundMoney(price)}`,
      )
      logActivity(
        pos.user_id,
        'square-off',
        `${reason}: ${pos.symbol}`,
        `Sold ${pos.qty} @ ₹${roundMoney(price)}`,
      )
      squared += 1
    } catch (err) {
      console.warn('Square-off failed', pos.symbol, err.message)
    }
  }

  return { squared }
}

/**
 * Near NSE close (15:20 IST), auto square-off open MIS once per day.
 * Also runs when FORCE_SQUARE_OFF=true (every tick until clear — use sparingly).
 */
export function processAutoSquareOff() {
  if (process.env.FORCE_SQUARE_OFF === 'true') {
    return squareOffAllPositions({ reason: 'Forced square-off' })
  }

  const { dayKey, minutes } = istParts()
  // 15:20 IST = 920 minutes
  if (minutes < 15 * 60 + 20) return null
  if (lastSquareOffDay === dayKey) return null
  lastSquareOffDay = dayKey
  return squareOffAllPositions({ reason: 'Auto square-off (15:20 IST)' })
}
