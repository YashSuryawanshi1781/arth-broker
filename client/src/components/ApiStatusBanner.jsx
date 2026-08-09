import { useEffect, useState } from 'react'
import { CircularProgress } from '@mui/material'
import { apiUrl } from '../lib/config'

export function ApiStatusBanner() {
  const [state, setState] = useState('ok') // ok | waking | offline

  useEffect(() => {
    let cancelled = false
    let timer

    const check = async () => {
      const started = Date.now()
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 45000)
      try {
        const res = await fetch(apiUrl('/api/health'), { signal: controller.signal, credentials: 'include' })
        clearTimeout(timeout)
        if (cancelled) return
        if (!res.ok) {
          setState('offline')
        } else if (Date.now() - started > 2500) {
          setState('waking')
          timer = setTimeout(() => !cancelled && setState('ok'), 2500)
        } else {
          setState('ok')
        }
      } catch {
        clearTimeout(timeout)
        if (!cancelled) setState('offline')
      }
    }

    check()
    const id = setInterval(check, 60000)
    return () => {
      cancelled = true
      clearInterval(id)
      clearTimeout(timer)
    }
  }, [])

  if (state === 'ok') return null

  return (
    <div className="api-banner" role="status">
      {state === 'waking' ? <CircularProgress size={14} color="inherit" /> : null}
      {state === 'waking'
        ? 'Waking market API… first request after idle can take up to a minute.'
        : 'API unreachable. Retrying — trading and login need the backend.'}
    </div>
  )
}
