/**
 * Flat SVG illustrations for empty states and hero sections. Each accepts an
 * `accent` colour so a screen can tint the artwork with its own theme.
 */
function Frame({ children, className = '', width = 200, height = 150 }) {
  return (
    <svg
      viewBox="0 0 200 150"
      width={width}
      height={height}
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  )
}

const LINE = '#dce3eb'
const SURFACE = '#eef2f6'
const INK = '#0b1b33'

export function EmptyPortfolioArt({ accent = '#00a878', ...props }) {
  return (
    <Frame {...props}>
      <ellipse cx="100" cy="130" rx="62" ry="8" fill={SURFACE} />
      <rect x="42" y="44" width="116" height="76" rx="10" fill="#fff" stroke={LINE} strokeWidth="2" />
      <rect x="42" y="44" width="116" height="18" rx="10" fill={SURFACE} />
      <circle cx="53" cy="53" r="3" fill={accent} opacity="0.5" />
      <circle cx="63" cy="53" r="3" fill={LINE} />
      <rect x="56" y="94" width="16" height="18" rx="3" fill={accent} opacity="0.25" />
      <rect x="80" y="82" width="16" height="30" rx="3" fill={accent} opacity="0.45" />
      <rect x="104" y="88" width="16" height="24" rx="3" fill={accent} opacity="0.3" />
      <rect x="128" y="72" width="16" height="40" rx="3" fill={accent} />
      <path d="M60 78 84 68l24 8 30-22" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="138" cy="54" r="4.5" fill="#fff" stroke={accent} strokeWidth="2.5" />
    </Frame>
  )
}

export function EmptyOrdersArt({ accent = '#c98516', ...props }) {
  return (
    <Frame {...props}>
      <ellipse cx="100" cy="130" rx="58" ry="8" fill={SURFACE} />
      <rect x="56" y="28" width="88" height="94" rx="10" fill="#fff" stroke={LINE} strokeWidth="2" />
      <rect x="70" y="46" width="42" height="6" rx="3" fill={INK} opacity="0.18" />
      <rect x="70" y="62" width="60" height="6" rx="3" fill={LINE} />
      <rect x="70" y="78" width="52" height="6" rx="3" fill={LINE} />
      <rect x="70" y="94" width="36" height="6" rx="3" fill={LINE} />
      <circle cx="134" cy="98" r="19" fill="#fff" stroke={accent} strokeWidth="2.5" />
      <path d="M134 90v9l6 3.5" stroke={accent} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  )
}

export function EmptyWatchlistArt({ accent = '#2563eb', ...props }) {
  return (
    <Frame {...props}>
      <ellipse cx="100" cy="130" rx="56" ry="8" fill={SURFACE} />
      <circle cx="92" cy="66" r="34" fill="#fff" stroke={LINE} strokeWidth="2.5" />
      <path d="m78 68 9-10 8 7 12-14" stroke={accent} strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" />
      <path d="m117 91 16 17" stroke={INK} strokeWidth="4" strokeLinecap="round" opacity="0.75" />
      <path
        d="m150 34 2.6 6.4 6.4 2.6-6.4 2.6L150 52l-2.6-6.4-6.4-2.6 6.4-2.6L150 34Z"
        fill={accent}
        opacity="0.4"
      />
    </Frame>
  )
}

export function EmptyFundsArt({ accent = '#0891b2', ...props }) {
  return (
    <Frame {...props}>
      <ellipse cx="100" cy="130" rx="58" ry="8" fill={SURFACE} />
      <rect x="46" y="56" width="108" height="62" rx="12" fill="#fff" stroke={LINE} strokeWidth="2" />
      <path d="M46 76h108" stroke={LINE} strokeWidth="2" />
      <rect x="118" y="88" width="24" height="16" rx="4" fill={accent} opacity="0.25" />
      <circle cx="130" cy="96" r="4" fill={accent} />
      <ellipse cx="100" cy="44" rx="26" ry="10" fill="#fff" stroke={accent} strokeWidth="2.5" />
      <path d="M74 44v12c0 5.5 11.6 10 26 10s26-4.5 26-10V44" stroke={accent} strokeWidth="2.5" fill="none" />
      <path d="M100 38v12M95 44h10" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
    </Frame>
  )
}

export function EmptySipArt({ accent = '#4f46e5', ...props }) {
  return (
    <Frame {...props}>
      <ellipse cx="100" cy="130" rx="58" ry="8" fill={SURFACE} />
      <rect x="44" y="34" width="112" height="84" rx="12" fill="#fff" stroke={LINE} strokeWidth="2" />
      <rect x="44" y="34" width="112" height="20" rx="12" fill={accent} opacity="0.12" />
      <path d="M64 30v10M136 30v10" stroke={accent} strokeWidth="3" strokeLinecap="round" />
      <rect x="60" y="66" width="14" height="14" rx="4" fill={accent} opacity="0.25" />
      <rect x="84" y="66" width="14" height="14" rx="4" fill={accent} opacity="0.5" />
      <rect x="108" y="66" width="14" height="14" rx="4" fill={accent} />
      <rect x="132" y="66" width="14" height="14" rx="4" fill={LINE} />
      <rect x="60" y="90" width="14" height="14" rx="4" fill={LINE} />
      <rect x="84" y="90" width="14" height="14" rx="4" fill={LINE} />
      <rect x="108" y="90" width="14" height="14" rx="4" fill={LINE} />
      <rect x="132" y="90" width="14" height="14" rx="4" fill={LINE} />
    </Frame>
  )
}

export function EmptySearchArt({ accent = '#2563eb', ...props }) {
  return (
    <Frame {...props}>
      <ellipse cx="100" cy="130" rx="52" ry="8" fill={SURFACE} />
      <rect x="52" y="40" width="96" height="70" rx="10" fill="#fff" stroke={LINE} strokeWidth="2" />
      <rect x="66" y="58" width="68" height="8" rx="4" fill={SURFACE} />
      <rect x="66" y="76" width="46" height="8" rx="4" fill={SURFACE} />
      <circle cx="128" cy="96" r="20" fill="#fff" stroke={accent} strokeWidth="2.8" />
      <path d="m142 110 10 11" stroke={accent} strokeWidth="4" strokeLinecap="round" />
      <path d="M121 96h14" stroke={accent} strokeWidth="2.6" strokeLinecap="round" />
    </Frame>
  )
}

export function KycShieldArt({ accent = '#00a878', ...props }) {
  return (
    <Frame {...props}>
      <ellipse cx="100" cy="132" rx="50" ry="8" fill={SURFACE} />
      <path
        d="M100 22 62 36v34c0 26 16 46 38 56 22-10 38-30 38-56V36l-38-14Z"
        fill="#fff"
        stroke={accent}
        strokeWidth="2.8"
        strokeLinejoin="round"
      />
      <path
        d="M100 22 62 36v34c0 26 16 46 38 56V22Z"
        fill={accent}
        opacity="0.08"
      />
      <path d="m84 74 12 12 22-24" stroke={accent} strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" />
    </Frame>
  )
}

export function IpoRocketArt({ accent = '#e11d48', ...props }) {
  return (
    <Frame {...props}>
      <ellipse cx="100" cy="132" rx="46" ry="8" fill={SURFACE} />
      <path
        d="M100 24c14 10 22 26 22 44 0 12-4 22-8 28H86c-4-6-8-16-8-28 0-18 8-34 22-44Z"
        fill="#fff"
        stroke={INK}
        strokeWidth="2.5"
        strokeLinejoin="round"
      />
      <circle cx="100" cy="62" r="9" fill={accent} opacity="0.25" stroke={accent} strokeWidth="2.5" />
      <path d="M78 78 64 92v14l14-10M122 78l14 14v14l-14-10" fill={accent} opacity="0.3" stroke={accent} strokeWidth="2.2" strokeLinejoin="round" />
      <path d="M92 96h16l-3 14-5 8-5-8-3-14Z" fill={accent} />
      <circle cx="46" cy="46" r="3" fill={accent} opacity="0.4" />
      <circle cx="156" cy="60" r="4" fill={accent} opacity="0.25" />
    </Frame>
  )
}

export function GrowthHeroArt({ accent = '#00a878', className = '' }) {
  return (
    <svg viewBox="0 0 320 220" className={className} fill="none" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={accent} stopOpacity="0.35" />
          <stop offset="100%" stopColor={accent} stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x="16" y="20" width="288" height="176" rx="18" fill="#fff" fillOpacity="0.06" stroke="#fff" strokeOpacity="0.16" strokeWidth="1.5" />
      <path d="M16 60h288M16 100h288M16 140h288" stroke="#fff" strokeOpacity="0.08" strokeWidth="1" />
      <path
        d="M40 158c26-4 34-30 56-38s34 14 54-6 32-46 58-52v106H40v-10Z"
        fill="url(#heroFill)"
      />
      <path
        d="M40 158c26-4 34-30 56-38s34 14 54-6 32-46 58-52"
        stroke={accent}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="208" cy="62" r="6" fill={accent} stroke="#fff" strokeWidth="2.5" />
      <rect x="40" y="168" width="36" height="8" rx="4" fill="#fff" fillOpacity="0.18" />
      <rect x="86" y="168" width="24" height="8" rx="4" fill="#fff" fillOpacity="0.12" />
    </svg>
  )
}
