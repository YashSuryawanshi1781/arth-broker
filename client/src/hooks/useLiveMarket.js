import { useEffect, useState } from 'react'
import { useStore } from 'react-redux'

/**
 * Reads the Redux market feed at a UI-friendly rate. The SSE stream updates
 * around twelve times per second; portfolio tables do not need to rerender for
 * every frame to feel live.
 */
export function useLiveMarket(intervalMs = 500) {
  const store = useStore()
  const [market, setMarket] = useState(() => {
    const state = store.getState().market
    return {
      instruments: state.instruments,
      indices: state.indices,
      connected: state.connected,
      status: state.status,
    }
  })

  useEffect(() => {
    const read = () => {
      const state = store.getState().market
      setMarket({
        instruments: state.instruments,
        indices: state.indices,
        connected: state.connected,
        status: state.status,
      })
    }

    read()
    const timer = setInterval(read, intervalMs)
    return () => clearInterval(timer)
  }, [store, intervalMs])

  return market
}
