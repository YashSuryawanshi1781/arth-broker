import { db } from './db.js'
import { addNotification } from './auth.js'
import { settleFilledOrder } from './orderEngine.js'
import { roundMoney } from './money.js'

/**
 * Match resting limit orders against the latest LTP for each symbol.
 * Buy fills when LTP <= limit; sell fills when LTP >= limit.
 */
export function matchOpenOrders(priceBySymbol) {
  const open = db.prepare(`
    SELECT * FROM orders WHERE status = 'open' AND type = 'limit' ORDER BY created_at ASC
  `).all()
  if (!open.length) return 0

  let filled = 0
  const now = Date.now()

  for (const order of open) {
    const ltp = priceBySymbol.get(order.symbol)
    if (!(ltp > 0)) continue
    const through = order.side === 'buy' ? ltp <= order.price : ltp >= order.price
    if (!through) continue

    const fillPrice = order.side === 'buy'
      ? Math.min(ltp, order.price)
      : Math.max(ltp, order.price)

    try {
      const result = db.transaction(() => {
        const fresh = db.prepare(`SELECT * FROM orders WHERE id = ? AND status = 'open'`).get(order.id)
        if (!fresh) return null
        return settleFilledOrder({
          userId: fresh.user_id,
          orderId: fresh.id,
          symbol: fresh.symbol,
          side: fresh.side,
          qty: fresh.qty,
          fillPrice,
          product: fresh.product || 'delivery',
          reservedCash: fresh.reserved_cash || 0,
          now,
        })
      })()

      if (result?.ok) {
        filled += 1
        addNotification(
          order.user_id,
          'Limit order filled',
          `${order.side.toUpperCase()} ${order.qty} ${order.symbol} @ ₹${roundMoney(fillPrice)}`,
        )
      } else if (result && !result.ok) {
        // Funds/holdings vanished — cancel and release any block.
        db.transaction(() => {
          if (order.reserved_cash > 0) {
            db.prepare('UPDATE users SET cash = ROUND(cash + ?, 2) WHERE id = ?')
              .run(order.reserved_cash, order.user_id)
          }
          db.prepare(`
            UPDATE orders SET status = 'cancelled', reserved_cash = 0, updated_at = ? WHERE id = ?
          `).run(now, order.id)
        })()
        addNotification(
          order.user_id,
          'Limit order cancelled',
          `${order.symbol} could not fill (${result.error})`,
        )
      }
    } catch (err) {
      console.warn('Limit match failed', order.id, err.message)
    }
  }

  return filled
}
