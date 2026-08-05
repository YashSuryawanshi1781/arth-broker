import { apiUrl } from './config'

// Access and refresh credentials live exclusively in httpOnly cookies. Remove
// tokens from the previous implementation so XSS cannot recover old sessions.
localStorage.removeItem('arth_token')
localStorage.removeItem('ticklab_token')

let refreshPromise = null

const NO_AUTO_REFRESH = new Set([
  '/auth/login',
  '/auth/register',
  '/auth/forgot',
  '/auth/reset',
  '/auth/refresh',
  '/auth/logout',
  '/auth/logout-all',
])

async function request(path, options = {}) {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }

  const res = await fetch(apiUrl(`/api${path}`), {
    ...options,
    headers,
    credentials: 'include',
    body: options.body ? JSON.stringify(options.body) : undefined,
  })

  const data = await res.json().catch(() => ({}))
  return { res, data }
}

async function doRefresh() {
  // Another tab may already have rotated cookies while we waited for the lock.
  const probe = await request('/auth/me')
  if (probe.res.ok) return probe.data

  const { res, data } = await request('/auth/refresh', { method: 'POST' })
  if (!res.ok) {
    const err = new Error(data.error || 'Session expired')
    err.status = res.status
    err.code = data.code
    throw err
  }
  return data
}

async function refreshSession() {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      if (typeof navigator !== 'undefined' && navigator.locks?.request) {
        return navigator.locks.request('arth-auth-refresh', doRefresh)
      }
      return doRefresh()
    })().finally(() => {
      refreshPromise = null
    })
  }
  return refreshPromise
}

function announceSessionExpired() {
  window.dispatchEvent(new CustomEvent('arth:session-expired'))
  try {
    const channel = new BroadcastChannel('arth-auth')
    channel.postMessage({ type: 'signed-out' })
    channel.close()
  } catch {
    // BroadcastChannel is optional; this tab still receives the local event.
  }
}

export async function api(path, options = {}) {
  let { res, data } = await request(path, options)

  if (res.status === 401 && !NO_AUTO_REFRESH.has(path) && !options.skipRefresh) {
    try {
      await refreshSession()
      ;({ res, data } = await request(path, options))
    } catch (refreshError) {
      announceSessionExpired()
      throw refreshError
    }
  }

  if (!res.ok) {
    const err = new Error(data.error || 'Request failed')
    err.status = res.status
    err.code = data.code
    err.data = data
    throw err
  }
  return data
}

export function formatINR(value) {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number(value) || 0)
}

export function formatINRShort(value) {
  const n = Number(value) || 0
  if (Math.abs(n) >= 10000000) return `${(n / 10000000).toFixed(2)}Cr`
  if (Math.abs(n) >= 100000) return `${(n / 100000).toFixed(2)}L`
  return formatINR(n)
}
