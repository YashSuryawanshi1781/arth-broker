import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAppDispatch } from '../app/hooks'
import { showToast } from '../features/ui/uiSlice'

/**
 * Loads the user's primary watchlist and exposes add / remove / toggle.
 * Creates a "Favorites" list automatically if the user has none.
 */
export function useWatchlist() {
  const dispatch = useAppDispatch()
  const [listId, setListId] = useState(null)
  const [symbols, setSymbols] = useState([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(null)

  const reload = useCallback(async () => {
    const data = await api('/watchlists')
    let lists = data.watchlists || []
    if (!lists.length) {
      const created = await api('/watchlists', { method: 'POST', body: { name: 'Favorites' } })
      lists = [created.watchlist]
    }
    setListId(lists[0].id)
    setSymbols(lists[0].symbols || [])
    setReady(true)
    return lists[0]
  }, [])

  useEffect(() => {
    reload().catch(() => {
      setReady(true)
      dispatch(showToast({ type: 'error', title: 'Watchlist unavailable', message: 'Could not load your watchlist. Retry from Explore.' }))
    })
  }, [reload, dispatch])

  const has = useCallback((symbol) => symbols.includes(String(symbol || '').toUpperCase()), [symbols])

  const add = useCallback(
    async (symbol) => {
      const sym = String(symbol || '').toUpperCase()
      if (!sym) return
      if (!listId) {
        dispatch(showToast({ type: 'error', title: 'Watchlist unavailable', message: 'Refresh the page and try again.' }))
        return
      }
      setBusy(sym)
      try {
        await api(`/watchlists/${listId}/symbols`, { method: 'POST', body: { symbol: sym } })
        setSymbols((prev) => (prev.includes(sym) ? prev : [...prev, sym]))
        dispatch(showToast({ type: 'success', title: 'Added to watchlist', message: sym }))
      } catch (err) {
        dispatch(showToast({ type: 'error', title: 'Could not add', message: err.message }))
      } finally {
        setBusy(null)
      }
    },
    [listId, dispatch],
  )

  const remove = useCallback(
    async (symbol) => {
      const sym = String(symbol || '').toUpperCase()
      if (!sym || !listId) return
      setBusy(sym)
      try {
        await api(`/watchlists/${listId}/symbols/${sym}`, { method: 'DELETE' })
        setSymbols((prev) => prev.filter((s) => s !== sym))
        dispatch(showToast({ type: 'success', title: 'Removed from watchlist', message: sym }))
      } catch (err) {
        dispatch(showToast({ type: 'error', title: 'Could not remove', message: err.message }))
      } finally {
        setBusy(null)
      }
    },
    [listId, dispatch],
  )

  const toggle = useCallback(
    async (symbol) => {
      if (has(symbol)) await remove(symbol)
      else await add(symbol)
    },
    [has, add, remove],
  )

  return { ready, listId, symbols, has, add, remove, toggle, busy, reload }
}
