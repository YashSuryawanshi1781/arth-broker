/**
 * NSE session helpers. The app is IST-facing, so these read the browser's local
 * clock rather than converting time zones.
 */
const OPEN_MINUTES = 9 * 60 + 15
const CLOSE_MINUTES = 15 * 60 + 30

const isWeekday = (d) => d.getDay() >= 1 && d.getDay() <= 5
const minutesOf = (d) => d.getHours() * 60 + d.getMinutes()

export function nseSession(now = new Date()) {
  const minutes = minutesOf(now)
  if (!isWeekday(now)) return 'closed'
  if (minutes < OPEN_MINUTES) return 'pre'
  if (minutes < CLOSE_MINUTES) return 'open'
  return 'post'
}

export function nextOpen(now = new Date()) {
  const d = new Date(now)
  const opensLaterToday = isWeekday(d) && minutesOf(d) < OPEN_MINUTES
  if (!opensLaterToday) {
    do {
      d.setDate(d.getDate() + 1)
    } while (!isWeekday(d))
  }
  d.setHours(9, 15, 0, 0)
  return d
}

/** Label + tone for the header session chip. */
export function sessionChip(now = new Date()) {
  const phase = nseSession(now)
  if (phase === 'open') {
    return { tone: 'open', label: 'Market open', detail: 'Closes 3:30 PM' }
  }

  const opens = nextOpen(now)
  const sameDay = opens.toDateString() === now.toDateString()
  const tomorrow = new Date(now)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const isTomorrow = opens.toDateString() === tomorrow.toDateString()

  const when = sameDay
    ? 'today 9:15 AM'
    : isTomorrow
      ? 'tomorrow 9:15 AM'
      : `${opens.toLocaleDateString('en-IN', { weekday: 'short' })} 9:15 AM`

  return {
    tone: phase === 'pre' ? 'pre' : 'closed',
    label: phase === 'pre' ? 'Pre-open' : 'Market closed',
    detail: `Opens ${when}`,
  }
}

export function daysUntil(dateish, now = new Date()) {
  if (!dateish) return null
  const target = new Date(dateish)
  if (Number.isNaN(target.getTime())) return null
  const a = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const b = new Date(target.getFullYear(), target.getMonth(), target.getDate())
  return Math.round((b - a) / 86400000)
}
