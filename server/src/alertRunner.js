import { nanoid } from 'nanoid'
import { db } from './db.js'
import { market } from './market.js'

/** Fire pending price alerts against the latest LTP map and notify the user. */
export function processPriceAlerts(priceMap) {
  const open = db
    .prepare('SELECT * FROM price_alerts WHERE triggered_at IS NULL')
    .all()
  if (!open.length) return

  const now = Date.now()
  const trigger = db.prepare('UPDATE price_alerts SET triggered_at = ? WHERE id = ?')
  const notify = db.prepare(`
    INSERT INTO notifications (id, user_id, title, body, read, created_at)
    VALUES (?, ?, ?, ?, 0, ?)
  `)

  for (const alert of open) {
    const price =
      priceMap.get(alert.symbol)
      ?? market.price(alert.symbol)
      ?? market.getIndex(alert.symbol)?.value
    if (!(price > 0)) continue
    const hit =
      alert.direction === 'above'
        ? price >= alert.target_price
        : price <= alert.target_price
    if (!hit) continue
    trigger.run(now, alert.id)
    notify.run(
      nanoid(10),
      alert.user_id,
      `${alert.symbol} alert`,
      `${alert.symbol} is ${alert.direction} ₹${alert.target_price} (LTP ₹${Number(price).toFixed(2)})`,
      now,
    )
  }
}
