export function FundLogo({ name, size = 'md' }) {
  const dim = size === 'lg' ? 'h-14 w-14 text-base rounded-2xl' : 'h-10 w-10 text-sm rounded-xl'
  return (
    <span className={`grid ${dim} shrink-0 place-items-center bg-brand font-extrabold text-white`}>
      {(name || '?').slice(0, 2).toUpperCase()}
    </span>
  )
}

export function Stars({ count = 0 }) {
  return (
    <span className="text-gold">
      {'★'.repeat(count)}
      <span className="text-line">{'★'.repeat(Math.max(0, 5 - count))}</span>
    </span>
  )
}

export function RiskBadge({ risk }) {
  const tone = risk === 'Low' || risk === 'Moderate'
    ? 'bg-up-bg text-up'
    : risk === 'Very High'
      ? 'bg-down-bg text-down'
      : 'bg-[#fff6e8] text-gold'
  return <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${tone}`}>{risk}</span>
}

export function Donut({ segments, size = 'h-24 w-24' }) {
  let acc = 0
  const stops = segments
    .map((s) => {
      const start = acc
      acc += s.pct
      return `${s.color} ${start.toFixed(2)}% ${acc.toFixed(2)}%`
    })
    .join(', ')

  return (
    <div className={`relative ${size} shrink-0 rounded-full`} style={{ background: `conic-gradient(${stops})` }}>
      <div className="absolute inset-[24%] grid place-items-center rounded-full bg-surface">
        <span className="text-[10px] font-bold text-muted">{segments.length}</span>
      </div>
    </div>
  )
}

/** Horizontal SEBI-style riskometer, 1 (low) to 6 (very high). */
export function Riskometer({ level = 3 }) {
  const labels = ['Low', 'Low to Moderate', 'Moderate', 'Moderately High', 'High', 'Very High']
  const colors = ['#2dd4a7', '#5ec98a', '#f0c419', '#f59e0b', '#f2743a', '#e5484d']
  return (
    <div>
      <div className="flex gap-1">
        {colors.map((color, i) => (
          <div
            key={color}
            className="h-2 flex-1 rounded-full transition"
            style={{ background: color, opacity: i + 1 <= level ? 1 : 0.18 }}
          />
        ))}
      </div>
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted">Low risk</span>
        <span className="text-xs font-bold" style={{ color: colors[level - 1] }}>{labels[level - 1]}</span>
        <span className="text-[10px] text-muted">Very high</span>
      </div>
    </div>
  )
}

/** Lightweight SVG area chart used for the NAV history. */
export function NavChart({ data, height = 220 }) {
  if (!data || data.length < 2) {
    return <div className="grid h-56 place-items-center text-sm text-muted">Loading NAV history…</div>
  }

  const values = data.map((d) => d.nav)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1
  const width = 800
  const pad = 6
  const up = values[values.length - 1] >= values[0]
  const stroke = up ? '#00a878' : '#e5484d'

  const points = data.map((d, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - pad - ((d.nav - min) / range) * (height - pad * 2)
    return `${x.toFixed(1)},${y.toFixed(1)}`
  })

  const first = data[0]
  const last = data[data.length - 1]
  const changePct = ((last.nav - first.nav) / first.nav) * 100

  return (
    <div>
      <div className="mb-2 flex items-baseline justify-between">
        <div>
          <span className="font-mono text-2xl font-bold">₹{last.nav.toFixed(2)}</span>
          <span className={`ml-2 text-sm font-bold ${up ? 'text-up' : 'text-down'}`}>
            {changePct >= 0 ? '+' : ''}{changePct.toFixed(2)}%
          </span>
        </div>
        <span className="text-[10px] text-muted">
          {first.date} → {last.date}
        </span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full" style={{ height }} preserveAspectRatio="none">
        <defs>
          <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
            <stop offset="100%" stopColor={stroke} stopOpacity="0" />
          </linearGradient>
        </defs>
        {[0.25, 0.5, 0.75].map((f) => (
          <line key={f} x1="0" x2={width} y1={height * f} y2={height * f} stroke="#eef2f6" strokeWidth="1" />
        ))}
        <polygon points={`0,${height} ${points.join(' ')} ${width},${height}`} fill="url(#navFill)" />
        <polyline points={points.join(' ')} fill="none" stroke={stroke} strokeWidth="2" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between font-mono text-[10px] text-muted">
        <span>Low ₹{min.toFixed(2)}</span>
        <span>High ₹{max.toFixed(2)}</span>
      </div>
    </div>
  )
}
