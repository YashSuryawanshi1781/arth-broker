import { useEffect, useState } from 'react'
import { Chip } from '@mui/material'
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
          <div key={e.id} className="card stack gap-xs px-lg py-md">
            <div className="row wrap gap-sm">
              <Chip size="small" label={e.kind} />
              <span className="bold">{e.title}</span>
              <span className="ml-auto text-xs muted">
                {new Date(e.createdAt).toLocaleString('en-IN', { hour12: false })}
              </span>
            </div>
            {e.body && <p className="text-sm muted">{e.body}</p>}
          </div>
        ))}
        {loading && <div className="card px-lg py-md muted text-sm">Loading…</div>}
        {!loading && events.length === 0 && (
          <div className="card px-lg py-md muted text-sm">No activity yet — place an order or set a goal.</div>
        )}
      </div>
    </Screen>
  )
}
