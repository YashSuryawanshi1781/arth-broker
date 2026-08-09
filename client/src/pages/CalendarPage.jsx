import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Chip } from '@mui/material'
import { api } from '../lib/api'
import { useAppDispatch } from '../app/hooks'
import { showToast } from '../features/ui/uiSlice'
import { PageHeader, Screen } from '../components/Screen'
import { IconClock } from '../components/Icons'

const TYPE_TONE = {
  dividend: 'success',
  bonus: 'info',
  split: 'warning',
  result: 'default',
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
          <div key={`${a.symbol}-${a.date}-${i}`} className="card row wrap gap-md px-lg py-md">
            <div className="mono bold" style={{ minWidth: 96 }}>{a.date}</div>
            <Chip size="small" label={a.type} color={TYPE_TONE[a.type] || 'default'} />
            <Link to={`/app/stocks/${a.symbol}`} className="mono bold">{a.symbol}</Link>
            <div className="min- flex-1">{a.title}</div>
            {a.amount != null && <span className="mono muted">₹{a.amount}</span>}
            {a.ratio && <span className="mono muted">{a.ratio}</span>}
          </div>
        ))}
        {loading && <div className="card px-lg py-md muted text-sm">Loading…</div>}
        {!loading && sorted.length === 0 && (
          <div className="card px-lg py-md muted text-sm">No corporate actions in the demo calendar.</div>
        )}
      </div>
    </Screen>
  )
}
