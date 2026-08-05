import { useId } from 'react'

/**
 * The Arth mark: a breakout tick that doubles as a checkmark, set on a
 * navy-to-teal squircle with two ghosted candles behind it.
 */
export function BrandMark({ size = 40, className = '' }) {
  const uid = useId()
  const plate = `plate-${uid}`
  const stroke = `stroke-${uid}`
  const glow = `glow-${uid}`

  return (
    <svg
      viewBox="0 0 40 40"
      width={size}
      height={size}
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={plate} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#12305A" />
          <stop offset="52%" stopColor="#0B1B33" />
          <stop offset="100%" stopColor="#0A3E33" />
        </linearGradient>
        <linearGradient id={stroke} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%" stopColor="#3BE0A5" />
          <stop offset="100%" stopColor="#8CFFD2" />
        </linearGradient>
        <radialGradient id={glow}>
          <stop offset="0%" stopColor="#8CFFD2" stopOpacity="0.75" />
          <stop offset="100%" stopColor="#8CFFD2" stopOpacity="0" />
        </radialGradient>
      </defs>

      <rect width="40" height="40" rx="12" fill={`url(#${plate})`} />
      <rect x="0.75" y="0.75" width="38.5" height="38.5" rx="11.25" stroke="#fff" strokeOpacity="0.12" strokeWidth="1.5" />

      <rect x="10" y="19" width="3.4" height="10" rx="1.7" fill="#fff" fillOpacity="0.13" />
      <rect x="17.3" y="23" width="3.4" height="6" rx="1.7" fill="#fff" fillOpacity="0.1" />

      <circle cx="29" cy="12" r="9" fill={`url(#${glow})`} />
      <path
        d="M9.5 21.5 16.5 28 29 12"
        stroke={`url(#${stroke})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M22.6 12H29v6.4"
        stroke={`url(#${stroke})`}
        strokeWidth="3.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

const SIZES = {
  sm: { mark: 32, name: 'text-[15px]', tag: 'text-[9px]' },
  md: { mark: 38, name: 'text-lg', tag: 'text-[10px]' },
  lg: { mark: 48, name: 'text-2xl', tag: 'text-[11px]' },
}

/**
 * Mark + wordmark. Use tone="light" on dark backgrounds.
 */
export function BrandLockup({ size = 'md', tone = 'dark', tagline = true, className = '' }) {
  const s = SIZES[size] || SIZES.md
  const light = tone === 'light'

  return (
    <span className={`flex items-center gap-2.5 ${className}`}>
      <BrandMark size={s.mark} />
      <span className="flex flex-col justify-center leading-none">
        <span className={`${s.name} font-extrabold tracking-[-0.03em] ${light ? 'text-white' : 'text-ink'}`}>
          Arth
          <span className={light ? 'text-[#7dffc8]' : 'text-accent'}>.</span>
        </span>
        {tagline ? (
          <span
            className={`mt-1 ${s.tag} font-bold tracking-[0.22em] uppercase ${
              light ? 'text-white/55' : 'text-muted'
            }`}
          >
            Broking
          </span>
        ) : null}
      </span>
    </span>
  )
}
