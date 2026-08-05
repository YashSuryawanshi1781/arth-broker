import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import { nanoid } from 'nanoid'
import { db } from './db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'arth-dev-secret-change-me'
const REFRESH_PEPPER = process.env.REFRESH_TOKEN_PEPPER || `${JWT_SECRET}:refresh`

export const ACCESS_COOKIE = 'arth_access'
export const REFRESH_COOKIE = 'arth_refresh'
export const ACCESS_TTL_MS = 15 * 60 * 1000
export const SESSION_IDLE_MS = 7 * 24 * 60 * 60 * 1000
export const SESSION_MAX_MS = 30 * 24 * 60 * 60 * 1000

const production = process.env.NODE_ENV === 'production'
const crossSite = String(process.env.COOKIE_SAMESITE || '').toLowerCase() === 'none'

if (production && (!process.env.JWT_SECRET || !process.env.REFRESH_TOKEN_PEPPER)) {
  throw new Error('JWT_SECRET and REFRESH_TOKEN_PEPPER are required in production')
}

const accessCookieOptions = {
  httpOnly: true,
  secure: production || crossSite,
  sameSite: crossSite ? 'none' : 'lax',
  path: '/',
  maxAge: ACCESS_TTL_MS,
}

const refreshCookieOptions = {
  httpOnly: true,
  secure: production || crossSite,
  sameSite: crossSite ? 'none' : 'strict',
  path: '/api/auth',
  maxAge: SESSION_MAX_MS,
}

function randomRefreshToken() {
  return crypto.randomBytes(48).toString('base64url')
}

function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(`${token}.${REFRESH_PEPPER}`).digest('hex')
}

function requestIp(req) {
  const forwarded = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim()
  return forwarded || req.ip || req.socket?.remoteAddress || null
}

function signAccessToken(userId, sessionId) {
  return jwt.sign({ sub: userId, sid: sessionId, type: 'access' }, JWT_SECRET, {
    expiresIn: Math.floor(ACCESS_TTL_MS / 1000),
  })
}

export function verifyAccessToken(token) {
  const payload = jwt.verify(token, JWT_SECRET)
  if (payload.type !== 'access' || !payload.sub || !payload.sid) throw new Error('Invalid access token')
  return payload
}

export function setSessionCookies(res, accessToken, refreshToken) {
  res.cookie(ACCESS_COOKIE, accessToken, accessCookieOptions)
  res.cookie(REFRESH_COOKIE, refreshToken, refreshCookieOptions)
}

export function clearSessionCookies(res) {
  res.clearCookie(ACCESS_COOKIE, { ...accessCookieOptions, maxAge: undefined })
  res.clearCookie(REFRESH_COOKIE, { ...refreshCookieOptions, maxAge: undefined })
  // Remove the pre-session-management cookie during migration.
  res.clearCookie('token', { path: '/' })
}

export function createSession(userId, req, res) {
  const now = Date.now()
  db.prepare(`
    DELETE FROM sessions
    WHERE expires_at <= ?
       OR last_seen_at <= ?
       OR (revoked_at IS NOT NULL AND revoked_at <= ?)
  `).run(now, now - SESSION_IDLE_MS, now - 7 * 24 * 60 * 60 * 1000)

  const sessionId = nanoid(24)
  const refreshToken = randomRefreshToken()

  db.prepare(`
    INSERT INTO sessions (
      id, user_id, refresh_token_hash, user_agent, ip_address,
      created_at, last_seen_at, expires_at, revoked_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, NULL)
  `).run(
    sessionId,
    userId,
    hashRefreshToken(refreshToken),
    String(req.headers['user-agent'] || '').slice(0, 500) || null,
    requestIp(req),
    now,
    now,
    now + SESSION_MAX_MS,
  )

  setSessionCookies(res, signAccessToken(userId, sessionId), refreshToken)
  return sessionId
}

export function rotateSession(req, res) {
  const refreshToken = req.cookies?.[REFRESH_COOKIE]
  if (!refreshToken) return null

  const presentedHash = hashRefreshToken(refreshToken)
  const session = db.prepare(`
    SELECT * FROM sessions WHERE refresh_token_hash = ?
  `).get(presentedHash)

  const now = Date.now()
  if (!session) {
    // A consumed token appearing again usually means another tab won the
    // refresh race. Only revoke the family when the reuse is stale.
    const replay = db.prepare(`
      SELECT session_id, consumed_at FROM session_refresh_history WHERE token_hash = ?
    `).get(presentedHash)
    if (replay && now - replay.consumed_at > 15_000) {
      db.prepare(`
        UPDATE sessions SET revoked_at = ?
        WHERE id = ? AND revoked_at IS NULL
      `).run(now, replay.session_id)
    }
    clearSessionCookies(res)
    return null
  }

  const invalid = session.revoked_at
    || session.expires_at <= now
    || session.last_seen_at + SESSION_IDLE_MS <= now

  if (invalid) {
    if (session && !session.revoked_at) {
      db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ?').run(now, session.id)
    }
    clearSessionCookies(res)
    return null
  }

  const nextRefreshToken = randomRefreshToken()
  db.transaction(() => {
    db.prepare(`
      INSERT INTO session_refresh_history (token_hash, session_id, consumed_at)
      VALUES (?, ?, ?)
    `).run(presentedHash, session.id, now)
    db.prepare(`
      UPDATE sessions
      SET refresh_token_hash = ?, last_seen_at = ?, user_agent = ?, ip_address = ?
      WHERE id = ? AND revoked_at IS NULL
    `).run(
      hashRefreshToken(nextRefreshToken),
      now,
      String(req.headers['user-agent'] || '').slice(0, 500) || session.user_agent,
      requestIp(req),
      session.id,
    )
  })()

  setSessionCookies(res, signAccessToken(session.user_id, session.id), nextRefreshToken)
  return session
}

export function revokeCurrentSession(req, res) {
  const now = Date.now()
  if (req.session?.id) {
    db.prepare('UPDATE sessions SET revoked_at = ? WHERE id = ? AND revoked_at IS NULL').run(now, req.session.id)
  } else {
    const refreshToken = req.cookies?.[REFRESH_COOKIE]
    if (refreshToken) {
      db.prepare(`
        UPDATE sessions SET revoked_at = ?
        WHERE refresh_token_hash = ? AND revoked_at IS NULL
      `).run(now, hashRefreshToken(refreshToken))
    }
  }
  clearSessionCookies(res)
}

export function revokeAllSessions(userId, exceptSessionId = null) {
  const now = Date.now()
  if (exceptSessionId) {
    return db.prepare(`
      UPDATE sessions SET revoked_at = ?
      WHERE user_id = ? AND id <> ? AND revoked_at IS NULL
    `).run(now, userId, exceptSessionId).changes
  }
  return db.prepare(`
    UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL
  `).run(now, userId).changes
}

export function revokeSession(userId, sessionId) {
  return db.prepare(`
    UPDATE sessions SET revoked_at = ?
    WHERE id = ? AND user_id = ? AND revoked_at IS NULL
  `).run(Date.now(), sessionId, userId).changes > 0
}

function deviceLabel(userAgent = '') {
  const browser = /Edg\//.test(userAgent) ? 'Edge'
    : /Chrome\//.test(userAgent) ? 'Chrome'
      : /Firefox\//.test(userAgent) ? 'Firefox'
        : /Safari\//.test(userAgent) ? 'Safari'
          : 'Browser'
  const os = /iPhone|iPad/.test(userAgent) ? 'iOS'
    : /Android/.test(userAgent) ? 'Android'
      : /Mac OS X/.test(userAgent) ? 'macOS'
        : /Windows/.test(userAgent) ? 'Windows'
          : /Linux/.test(userAgent) ? 'Linux'
            : 'Unknown device'
  return `${browser} on ${os}`
}

export function listSessions(userId, currentSessionId) {
  const now = Date.now()
  return db.prepare(`
    SELECT id, user_agent, ip_address, created_at, last_seen_at, expires_at
    FROM sessions
    WHERE user_id = ?
      AND revoked_at IS NULL
      AND expires_at > ?
      AND last_seen_at > ?
    ORDER BY last_seen_at DESC
  `).all(userId, now, now - SESSION_IDLE_MS).map((session) => ({
    id: session.id,
    device: deviceLabel(session.user_agent),
    ipAddress: session.ip_address,
    createdAt: session.created_at,
    lastSeenAt: session.last_seen_at,
    expiresAt: session.expires_at,
    current: session.id === currentSessionId,
  }))
}
