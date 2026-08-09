import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import { useAppDispatch } from '../app/hooks'
import { showToast } from '../features/ui/uiSlice'
import { PageHeader, Screen } from '../components/Screen'
import { IconBell } from '../components/Icons'

export function ActivityPage() {
  const dispatch = useAppDispatch()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/activity')
      .then((d) => setEvents(d.events || []))
      .catch((err) => dispatch(showToast({ type: 'error', title: 'Activity unavailable', message: err.message })))
      .finally(() => setLoading(false))
  }, [dispatch])

  return (
    <Screen theme="account" className="stack gap-md">
      <PageHeader
        icon={IconBell}
        eyebrow="Audit trail"
        title="Activity"
        subtitle="Orders, goals, GTT triggers and account events"
      />

      <div className="stack gap-sm">
        {events.map((e) => (
          <div key={e.id} className="card space-y-1 px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-bold tracking-wide text-muted uppercase">
                {e.kind}
              </span>
              <span className="font-bold">{e.title}</span>
              <span className="ml-auto text-xs text-muted">
                {new Date(e.createdAt).toLocaleString('en-IN', { hour12: false })}
              </span>
            </div>
            {e.body && <p className="text-sm text-muted">{e.body}</p>}
          </div>
        ))}
        {loading && <div className="card px-4 py-8 text-center text-sm text-muted">Loading…</div>}
        {!loading && events.length === 0 && (
          <div className="card px-4 py-8 text-center text-sm text-muted">No activity yet — place an order or set a goal.</div>
        )}
      </div>
    </Screen>
  )
}
