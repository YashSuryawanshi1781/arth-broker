import { nanoid } from 'nanoid'
import { db } from './db.js'

export function logActivity(userId, kind, title, body = '', meta = null) {
  db.prepare(`
    INSERT INTO activity_events (id, user_id, kind, title, body, meta, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(nanoid(12), userId, kind, title, body, meta ? JSON.stringify(meta) : null, Date.now())
}

export function listActivity(userId, limit = 50) {
  return db
    .prepare('SELECT * FROM activity_events WHERE user_id = ? ORDER BY created_at DESC LIMIT ?')
    .all(userId, limit)
    .map((row) => ({
      id: row.id,
      kind: row.kind,
      title: row.title,
      body: row.body,
      meta: row.meta ? JSON.parse(row.meta) : null,
      createdAt: row.created_at,
    }))
}
