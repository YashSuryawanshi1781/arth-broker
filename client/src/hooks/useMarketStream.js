import { useEffect } from 'react'
import { useAppDispatch } from '../app/hooks'
import { applyTicks, setConnected, setMarketStatus, setSnapshot } from '../features/market/marketSlice'
import { api } from '../lib/api'
import { streamUrl } from '../lib/config'

/** Live market SSE + initial instruments snapshot. Safe to mount once per tab. */
export function useMarketStream() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    let es
    let retryTimer
    let closed = false

    const connect = () => {
      if (closed) return
      es = new EventSource(streamUrl('/api/market/stream'), { withCredentials: true })
      es.onmessage = (ev) => {
        try {
          const data = JSON.parse(ev.data)
          if (data.type === 'snapshot') dispatch(setSnapshot(data))
          if (data.type === 'ticks') dispatch(applyTicks(data))
          if (data.type === 'status' && data.marketStatus) dispatch(setMarketStatus(data.marketStatus))
        } catch {
          /* ignore bad frames */
        }
      }
      es.onopen = () => dispatch(setConnected(true))
      es.onerror = () => {
        dispatch(setConnected(false))
        es.close()
        retryTimer = setTimeout(connect, 2000)
      }
    }

    api('/market/instruments')
      .then((data) => {
        if (data.instruments?.length) {
          dispatch(setSnapshot({
            instruments: data.instruments,
            indices: data.indices || {},
            marketStatus: data.marketStatus,
          }))
        }
      })
      .catch(() => {})

    connect()
    return () => {
      closed = true
      clearTimeout(retryTimer)
      es?.close()
    }
  }, [dispatch])
}
