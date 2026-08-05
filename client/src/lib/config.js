/** Absolute API origin in production (empty in local Vite → same-origin proxy). */
export const API_BASE = String(import.meta.env.VITE_API_BASE || '').replace(/\/$/, '')

export function apiUrl(path) {
  const p = path.startsWith('/') ? path : `/${path}`
  return `${API_BASE}${p}`
}
