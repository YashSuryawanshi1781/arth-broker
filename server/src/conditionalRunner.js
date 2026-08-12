import { nanoid } from 'nanoid'
import { db } from './db.js'
import { market } from './market.js'
import { settleFilledOrder } from './orderEngine.js'
import { addNotification } from './auth.js'
import { logActivity } from './activity.js'
import { roundMoney } from './money.js'

/** Trigger open GTT / SL / target orders against the latest LTP map. */
export function processConditionalOrders(priceMap) {
  const open = db
    .prepare("SELECT * FROM conditional_orders WHERE status = 'open'")
    .all()
  if (!open.length) return

  const now = Date.now()

  for (const row of open) {
    const price =
      priceMap.get(row.symbol)
      ?? market.price(row.symbol)
    if (!(price > 0)) continue

    const hit =
      row.trigger_type === 'above'
        ? price >= row.trigger_price
        : price <= row.trigger_price
    if (!hit) continue

    const orderId = nanoid(10)
    const fillPrice = row.limit_price != null
      ? (row.side === 'buy' ? Math.min(price, row.limit_price) : Math.max(price, row.limit_price))
      : price

    try {
      db.transaction(() => {
        const stillOpen = db
          .prepare("SELECT id FROM conditional_orders WHERE id = ? AND status = 'open'")
          .get(row.id)
        if (!stillOpen) return

        db.prepare(`
          INSERT INTO orders (id, user_id, symbol, side, type, qty, price, fill_price, status, product, reserved_cash, created_at, updated_at)
          VALUES (?, ?, ?, ?, 'market', ?, ?, NULL, 'open', ?, 0, ?, ?)
        `).run(
          orderId,
          row.user_id,
          row.symbol,
          row.side,
          row.qty,
          fillPrice,
          row.product,
          now,
          now,
        )

        const settled = settleFilledOrder({
          userId: row.user_id,
          orderId,
          symbol: row.symbol,
          side: row.side,
          qty: row.qty,
          fillPrice,
          product: row.product,
          reservedCash: 0,
          now,
        })
        if (!settled.ok) throw new Error(settled.error)

        db.prepare(`
          UPDATE conditional_orders
          SET status = 'triggered', linked_order_id = ?, triggered_at = ?, updated_at = ?
          WHERE id = ?
        `).run(orderId, now, now, row.id)

        // OCO: cancel sibling open legs on same symbol/side (stop vs target)
        db.prepare(`
          UPDATE conditional_orders
          SET status = 'cancelled', updated_at = ?
          WHERE user_id = ? AND symbol = ? AND side = ? AND product = ?
            AND status = 'open' AND id != ?
        `).run(now, row.user_id, row.symbol, row.side, row.product, row.id)
      })()

      const triggered = db.prepare('SELECT status FROM conditional_orders WHERE id = ?').get(row.id)
      if (triggered?.status !== 'triggered') continue

      addNotification(
        row.user_id,
        'Conditional order triggered',
        `${row.side.toUpperCase()} ${row.qty} ${row.symbol} @ ₹${roundMoney(fillPrice)}`,
      )
      logActivity(
        row.user_id,
        'conditional',
        `Triggered ${row.side.toUpperCase()} ${row.symbol}`,
        `Filled @ ₹${roundMoney(fillPrice)}`,
        { conditionalId: row.id, orderId, fillPrice },
      )
    } catch (err) {
      console.warn('Conditional order failed:', row.id, err.message)
    }
  }
}
