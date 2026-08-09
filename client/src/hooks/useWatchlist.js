import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAppDispatch } from '../app/hooks'
import { showToast } from '../features/ui/uiSlice'

/**
 * Loads the user's watchlists, supports selecting among them, and exposes add / remove / toggle.
 * Creates a "Favorites" list automatically if the user has none.
 */
export function useWatchlist() {
  const dispatch = useAppDispatch()
  const [lists, setLists] = useState([])
  const [listId, setListId] = useState(null)
  const [symbols, setSymbols] = useState([])
  const [ready, setReady] = useState(false)
  const [busy, setBusy] = useState(null)

  const applyList = useCallback((list) => {
    if (!list) return
    setListId(list.id)
    setSymbols(list.symbols || [])
  }, [])

  const reload = useCallback(async () => {
    const data = await api('/watchlists')
    let next = data.watchlists || []
    if (!next.length) {
      const created = await api('/watchlists', { method: 'POST', body: { name: 'Favorites' } })
      next = [created.watchlist]
    }
    setLists(next)
    const preferred = next.find((l) => l.id === listId) || next.find((l) => l.pinned) || next[0]
    applyList(preferred)
    setReady(true)
    return preferred
  }, [applyList, listId])

  useEffect(() => {
    reload().catch(() => {
      setReady(true)
      dispatch(showToast({ type: 'error', title: 'Watchlist unavailable', message: 'Could not load your watchlist. Retry from Explore.' }))
    })
    // Initial load only
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dispatch])

  const selectList = useCallback((id) => {
    const list = lists.find((l) => l.id === id)
    if (list) applyList(list)
  }, [lists, applyList])

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
        setLists((prev) => prev.map((l) => (
          l.id === listId ? { ...l, symbols: l.symbols.includes(sym) ? l.symbols : [...l.symbols, sym] } : l
        )))
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
        setLists((prev) => prev.map((l) => (
          l.id === listId ? { ...l, symbols: (l.symbols || []).filter((s) => s !== sym) } : l
        )))
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

  const renameList = useCallback(async (id, name) => {
    const data = await api(`/watchlists/${id}`, { method: 'PATCH', body: { name } })
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, name: data.watchlist.name } : l)))
  }, [])

  const pinList = useCallback(async (id, pinned) => {
    await api(`/watchlists/${id}/pin`, { method: 'PATCH', body: { pinned } })
    setLists((prev) => prev.map((l) => (l.id === id ? { ...l, pinned: !!pinned } : l)))
  }, [])

  return {
    ready,
    listId,
    lists,
    symbols,
    has,
    add,
    remove,
    toggle,
    busy,
    reload,
    selectList,
    renameList,
    pinList,
  }
}
