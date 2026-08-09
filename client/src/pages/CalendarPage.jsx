import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAppDispatch } from '../app/hooks'
import { showToast } from '../features/ui/uiSlice'
import { PageHeader, Screen } from '../components/Screen'
import { IconClock } from '../components/Icons'

const TYPE_CLASS = {
  dividend: 'bg-up-bg text-up',
  bonus: 'bg-page-tint text-page-accent',
  split: 'bg-[#fff6e8] text-gold',
  result: 'bg-surface-2 text-muted',
}

export function CalendarPage() {
  const dispatch = useAppDispatch()
  const [actions, setActions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('/market/corporate-actions')
      .then((d) => setActions(d.actions || []))
      .catch((err) => dispatch(showToast({ type: 'error', title: 'Calendar unavailable', message: err.message })))
      .finally(() => setLoading(false))
  }, [dispatch])

  const sorted = [...actions].sort((a, b) => a.date.localeCompare(b.date))

  return (
    <Screen theme="home" className="stack gap-md">
      <PageHeader
        icon={IconClock}
        eyebrow="Corporate actions"
        title="Calendar"
        subtitle="Upcoming dividends, bonuses, splits and results (demo list)"
      />

      <div className="stack gap-sm">
        {sorted.map((a, i) => (
          <div key={`${a.symbol}-${a.date}-${i}`} className="card flex flex-wrap items-center gap-3 px-4 py-3">
            <div className="min-w-[96px] font-mono text-sm font-bold">{a.date}</div>
            <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${TYPE_CLASS[a.type] || 'bg-surface-2 text-muted'}`}>
              {a.type}
            </span>
            <Link to={`/app/stocks/${a.symbol}`} className="font-mono font-bold">{a.symbol}</Link>
            <div className="min-w-0 flex-1 text-sm">{a.title}</div>
            {a.amount != null && <span className="font-mono text-sm text-muted">₹{a.amount}</span>}
            {a.ratio && <span className="font-mono text-sm text-muted">{a.ratio}</span>}
          </div>
        ))}
        {loading && <div className="card px-4 py-8 text-center text-sm text-muted">Loading…</div>}
        {!loading && sorted.length === 0 && (
          <div className="card px-4 py-8 text-center text-sm text-muted">No corporate actions in the demo calendar.</div>
        )}
      </div>
    </Screen>
  )
}
