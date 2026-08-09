import { useMemo, useState } from 'react'
import { formatINR, formatINRShort } from '../lib/api'

const PALETTE = {
  light: {
    invested: '#94a3b8',
    gain: '#00a878',
    track: '#eef2f6',
    grid: '#e5eaf0',
    axis: '#8898a8',
    ink: '#0b1b33',
    muted: '#5b6b7c',
    tooltipBg: '#ffffff',
    tooltipLine: '#dce3eb',
  },
  dark: {
    invested: '#a7b6c7',
    gain: '#7dffc8',
    track: 'rgba(255,255,255,0.14)',
    grid: 'rgba(255,255,255,0.12)',
    axis: 'rgba(255,255,255,0.5)',
    ink: '#ffffff',
    muted: 'rgba(255,255,255,0.6)',
    tooltipBg: 'rgba(11,27,51,0.94)',
    tooltipLine: 'rgba(255,255,255,0.2)',
  },
}

/**
 * Donut split between capital invested and projected gains. Drawn with stroked
 * arcs so the centre stays transparent and it reads correctly on any surface.
 */
export function GrowthDonut({
  invested,
  gain,
  size = 184,
  thickness = 20,
  variant = 'light',
  caption = 'Projected value',
}) {
  const colors = PALETTE[variant] || PALETTE.light
  const total = invested + gain
  const safeTotal = total > 0 ? total : 1
  const investedPct = Math.max(0, Math.min(100, (invested / safeTotal) * 100))
  const gainPct = Math.max(0, 100 - investedPct)

  const radius = (size - thickness) / 2
  const circumference = 2 * Math.PI * radius
  const investedLength = (investedPct / 100) * circumference
  const gainLength = (gainPct / 100) * circumference
  const gainMultiple = invested > 0 ? total / invested : 0

  return (
    <div className="stack">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Invested versus returns split">
          <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={colors.track}
              strokeWidth={thickness}
            />
            {investedPct > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={colors.invested}
                strokeWidth={thickness}
                strokeDasharray={`${investedLength} ${circumference - investedLength}`}
                strokeLinecap="butt"
              />
            )}
            {gainPct > 0 && (
              <circle
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="none"
                stroke={colors.gain}
                strokeWidth={thickness}
                strokeDasharray={`${gainLength} ${circumference - gainLength}`}
                strokeDashoffset={-investedLength}
                strokeLinecap="butt"
              />
            )}
          </g>
        </svg>

        <div className="absolute grid px-lg center">
          <div>
            <div className="text-[10px] bold tracking-[0.12em] uppercase" style={{ color: colors.muted }}>
              {caption}
            </div>
            <div className="mt-sm mono text-xl bold" style={{ color: colors.ink }}>
              ₹{formatINRShort(total)}
            </div>
            {gainMultiple > 0 && (
              <div className="mt-sm text-[11px] bold" style={{ color: colors.gain }}>
                {gainMultiple.toFixed(2)}× your capital
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="mt-lg grid w-full grid-2 gap-sm">
        <LegendCell
          color={colors.invested}
          label="Invested"
          value={invested}
          share={investedPct}
          colors={colors}
        />
        <LegendCell
          color={colors.gain}
          label="Returns"
          value={gain}
          share={gainPct}
          colors={colors}
        />
      </div>
    </div>
  )
}

function LegendCell({ color, label, value, share, colors }) {
  return (
    <div
      className="rounded py-md"
      style={{ background: colors.track }}
    >
      <div className="row gap-sm">
        <span className=".5 shrink-0 rounded" style={{ background: color }} />
        <span className="text-[10px] bold uppercase" style={{ color: colors.muted }}>
          {label}
        </span>
      </div>
      <div className="mt-sm mono text-sm bold" style={{ color: colors.ink }}>
        ₹{formatINRShort(value)}
      </div>
      <div className="text-[10px] bold" style={{ color: colors.muted }}>
        {share.toFixed(1)}%
      </div>
    </div>
  )
}

/**
 * Stacked growth chart: invested capital as the lower band, returns stacked on
 * top, with a hover crosshair reading out both figures for a given year.
 */
export function GrowthChart({ schedule, height = 280, variant = 'light' }) {
  const colors = PALETTE[variant] || PALETTE.light
  const [hover, setHover] = useState(null)

  const width = 720
  const padding = { top: 16, right: 16, bottom: 30, left: 54 }
  const plotWidth = width - padding.left - padding.right
  const plotHeight = height - padding.top - padding.bottom

  const geometry = useMemo(() => {
    if (!schedule || schedule.length < 2) return null
    const maxValue = Math.max(...schedule.map((row) => row.value), 1)
    const niceMax = niceCeil(maxValue)
    const lastYear = schedule[schedule.length - 1].year || 1

    const x = (year) => padding.left + (year / lastYear) * plotWidth
    const y = (value) => padding.top + plotHeight - (value / niceMax) * plotHeight

    const valuePoints = schedule.map((row) => `${x(row.year).toFixed(1)},${y(row.value).toFixed(1)}`)
    const investedPoints = schedule.map((row) => `${x(row.year).toFixed(1)},${y(row.invested).toFixed(1)}`)
    const baseline = `${padding.left + plotWidth},${padding.top + plotHeight} ${padding.left},${padding.top + plotHeight}`

    return {
      niceMax,
      lastYear,
      x,
      y,
      valueArea: `${valuePoints.join(' ')} ${baseline}`,
      investedArea: `${investedPoints.join(' ')} ${baseline}`,
      valueLine: valuePoints.join(' '),
      investedLine: investedPoints.join(' '),
    }
  }, [schedule, plotWidth, plotHeight, padding.left, padding.top])

  if (!geometry) {
    return (
      <div className="grid text-sm" style={{ height, color: colors.muted }}>
        Adjust the inputs to see a projection.
      </div>
    )
  }

  const { niceMax, lastYear, x, y, valueArea, investedArea, valueLine, investedLine } = geometry
  const gridLines = [0, 0.25, 0.5, 0.75, 1]
  const yearTicks = tickYears(lastYear)
  const hovered = hover != null ? schedule[hover] : null

  const handleMove = (event) => {
    const rect = event.currentTarget.getBoundingClientRect()
    const ratio = (event.clientX - rect.left) / rect.width
    const svgX = ratio * width
    const year = ((svgX - padding.left) / plotWidth) * lastYear
    const index = Math.round((year / lastYear) * (schedule.length - 1))
    setHover(Math.max(0, Math.min(schedule.length - 1, index)))
  }

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full touch-none"
        style={{ height }}
        onMouseMove={handleMove}
        onMouseLeave={() => setHover(null)}
        role="img"
        aria-label="Projected growth over time"
      >
        <defs>
          <linearGradient id="growthValueFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.gain} stopOpacity="0.38" />
            <stop offset="100%" stopColor={colors.gain} stopOpacity="0.04" />
          </linearGradient>
          <linearGradient id="growthInvestedFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={colors.invested} stopOpacity="0.45" />
            <stop offset="100%" stopColor={colors.invested} stopOpacity="0.12" />
          </linearGradient>
        </defs>

        {gridLines.map((fraction) => {
          const lineY = padding.top + plotHeight * (1 - fraction)
          return (
            <g key={fraction}>
              <line
                x1={padding.left}
                x2={padding.left + plotWidth}
                y1={lineY}
                y2={lineY}
                stroke={colors.grid}
                strokeWidth="1"
              />
              <text
                x={padding.left - 8}
                y={lineY + 3.5}
                textAnchor="end"
                fontSize="10"
                fontWeight="600"
                fill={colors.axis}
              >
                {fraction === 0 ? '0' : formatINRShort(niceMax * fraction)}
              </text>
            </g>
          )
        })}

        <polygon points={valueArea} fill="url(#growthValueFill)" />
        <polygon points={investedArea} fill="url(#growthInvestedFill)" />
        <polyline points={valueLine} fill="none" stroke={colors.gain} strokeWidth="2.5" strokeLinejoin="round" />
        <polyline
          points={investedLine}
          fill="none"
          stroke={colors.invested}
          strokeWidth="2"
          strokeDasharray="5 4"
          strokeLinejoin="round"
        />

        {yearTicks.map((year) => (
          <text
            key={year}
            x={x(year)}
            y={height - 10}
            textAnchor="middle"
            fontSize="10"
            fontWeight="600"
            fill={colors.axis}
          >
            {year === 0 ? 'Now' : `${year}y`}
          </text>
        ))}

        {hovered && (
          <g>
            <line
              x1={x(hovered.year)}
              x2={x(hovered.year)}
              y1={padding.top}
              y2={padding.top + plotHeight}
              stroke={colors.tooltipLine}
              strokeWidth="1.5"
            />
            <circle cx={x(hovered.year)} cy={y(hovered.value)} r="4.5" fill={colors.gain} />
            <circle cx={x(hovered.year)} cy={y(hovered.invested)} r="4" fill={colors.invested} />
          </g>
        )}
      </svg>

      <div className="mt-sm row wrap gap-sm text-[11px]">
        <div className="row wrap gap-md">
          <LegendKey color={colors.gain} label="Total value" colors={colors} />
          <LegendKey color={colors.invested} label="Invested" colors={colors} dashed />
        </div>
        {hovered ? (
          <span className="mono bold" style={{ color: colors.ink }}>
            {hovered.year === 0 ? 'Start' : `Year ${hovered.year}`} · ₹{formatINR(hovered.value)}
            <span style={{ color: colors.muted }}> (invested ₹{formatINRShort(hovered.invested)})</span>
          </span>
        ) : (
          <span style={{ color: colors.muted }}>Hover the chart for year-wise values</span>
        )}
      </div>
    </div>
  )
}

function LegendKey({ color, label, colors, dashed = false }) {
  return (
    <span className="row gap-sm" style={{ color: colors.muted }}>
      <span
        className="inline-block .5 rounded"
        style={{
          background: dashed
            ? `repeating-linear-gradient(90deg, ${color} 0 5px, transparent 5px 9px)`
            : color,
        }}
      />
      <span className="bold">{label}</span>
    </span>
  )
}

/** Rounds an axis maximum up to a clean 1/2/5 × 10^n step. */
function niceCeil(value) {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalised = value / magnitude
  const step = normalised <= 1 ? 1 : normalised <= 2 ? 2 : normalised <= 5 ? 5 : 10
  return step * magnitude
}

function tickYears(lastYear) {
  const target = 6
  const step = Math.max(1, Math.round(lastYear / target))
  const years = []
  for (let year = 0; year <= lastYear; year += step) years.push(year)
  if (years[years.length - 1] !== lastYear) years.push(lastYear)
  return years
}
