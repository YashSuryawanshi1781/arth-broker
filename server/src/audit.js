import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const dataDir = path.join(__dirname, '..', 'data')
const auditFile = path.join(dataDir, 'audit.log')

function ensureDataDir() {
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true })
  }
}

/**
 * Append a JSON-lines audit entry. Never log passwords or secrets.
 * @param {string} action
 * @param {Record<string, unknown>} [meta]
 */
export function auditLog(action, meta = {}) {
  try {
    ensureDataDir()
    const entry = {
      ts: new Date().toISOString(),
      action,
      ...meta,
    }
    fs.appendFileSync(auditFile, `${JSON.stringify(entry)}\n`, 'utf8')
  } catch (err) {
    console.warn('auditLog failed:', err.message)
  }
}

/**
 * Express middleware: log method + path + ip (no body / passwords).
 */
export function auditRequest(action = 'http') {
  return function auditRequestMiddleware(req, _res, next) {
    auditLog(action, {
      method: req.method,
      path: req.originalUrl || req.url,
      ip: req.ip || req.socket?.remoteAddress || null,
    })
    next()
  }
}
