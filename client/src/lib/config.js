/**
 * API origin. Empty in local dev (Vite proxy) and on Vercel, where /api is
 * rewritten to the API host so session cookies stay first-party.
 */
export const API_BASE = String(import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

/**
 * The SSE market feed is public and long-lived, so it talks to the API host
 * directly instead of being held open through the Vercel proxy.
 */
export const STREAM_BASE = String(import.meta.env.VITE_STREAM_BASE || API_BASE).replace(/\/$/, '')

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}

export function streamUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${STREAM_BASE}${p}`
}
