/**
 * Line icon set. Every icon inherits colour from `currentColor` and sizes from
 * the `size` prop so they can be dropped anywhere without extra styling.
 */
function Icon({ size = 20, className = '', children, ...rest }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      focusable="false"
      {...rest}
    >
      {children}
    </svg>
  )
}

export function IconHome(props) {
  return (
    <Icon {...props}>
      <path d="M3 10.2 12 3l9 7.2" />
      <path d="M5 9.6V20a1 1 0 0 0 1 1h3.5v-5.5h5V21H18a1 1 0 0 0 1-1V9.6" />
    </Icon>
  )
}

export function IconExplore(props) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.2-3.2" />
      <path d="m8.5 12.5 2-2.5 2 2 2.5-3.5" />
    </Icon>
  )
}

export function IconBriefcase(props) {
  return (
    <Icon {...props}>
      <rect x="3" y="7.5" width="18" height="12.5" rx="2.5" />
      <path d="M8.5 7.5V6a2 2 0 0 1 2-2h3a2 2 0 0 1 2 2v1.5" />
      <path d="M3 12.5h18" />
      <path d="M10.5 12.5v2h3v-2" />
    </Icon>
  )
}

export function IconWallet(props) {
  return (
    <Icon {...props}>
      <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H17a1 1 0 0 1 1 1v1.5" />
      <rect x="3" y="7.5" width="18" height="12" rx="2.5" />
      <circle cx="16.5" cy="13.5" r="1.4" />
    </Icon>
  )
}

export function IconUser(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="8" r="3.6" />
      <path d="M4.5 20c.7-3.7 3.8-6 7.5-6s6.8 2.3 7.5 6" />
    </Icon>
  )
}

export function IconCandles(props) {
  return (
    <Icon {...props}>
      <path d="M7 3v3.5M7 17.5V21" />
      <rect x="4.5" y="6.5" width="5" height="11" rx="1" />
      <path d="M17 3v6M17 15v6" />
      <rect x="14.5" y="9" width="5" height="6" rx="1" />
    </Icon>
  )
}

export function IconTrendingUp(props) {
  return (
    <Icon {...props}>
      <path d="m3 16 5.5-5.5 3.5 3.5L21 5" />
      <path d="M15.5 5H21v5.5" />
    </Icon>
  )
}

export function IconTrendingDown(props) {
  return (
    <Icon {...props}>
      <path d="m3 8 5.5 5.5L12 10l9 9" />
      <path d="M15.5 19H21v-5.5" />
    </Icon>
  )
}

export function IconPieChart(props) {
  return (
    <Icon {...props}>
      <path d="M12 3a9 9 0 1 0 9 9h-9V3Z" />
      <path d="M15 3.8A9 9 0 0 1 20.2 9H15V3.8Z" />
    </Icon>
  )
}

export function IconCoins(props) {
  return (
    <Icon {...props}>
      <ellipse cx="9" cy="7" rx="5.5" ry="2.8" />
      <path d="M3.5 7v4c0 1.55 2.46 2.8 5.5 2.8s5.5-1.25 5.5-2.8V7" />
      <path d="M14.5 11.2c2.6.3 4.5 1.4 4.5 2.7 0 1.55-2.46 2.8-5.5 2.8-1.02 0-1.98-.14-2.8-.39" />
      <path d="M9 17.2v-1.4M20.5 13.9v3.6c0 1.55-2.46 2.8-5.5 2.8-2.2 0-4.1-.66-4.96-1.6" />
    </Icon>
  )
}

export function IconRocket(props) {
  return (
    <Icon {...props}>
      <path d="M13.5 3.5c3.5 0 6.5 3 6.5 6.5 0 4.2-4.2 8-6.6 9.7a1 1 0 0 1-1.1 0C9.9 18 5.7 14.2 5.7 10c0-1.3.4-2.5 1-3.5" />
      <circle cx="13" cy="10" r="2.4" />
      <path d="M9.5 17.5 7 20l-1.5-1.5 2.2-2.6M5.5 6.5 3 7l1 2.5" />
    </Icon>
  )
}

export function IconList(props) {
  return (
    <Icon {...props}>
      <path d="M8.5 6.5H21M8.5 12H21M8.5 17.5H21" />
      <path d="M3.5 6.5h.01M3.5 12h.01M3.5 17.5h.01" strokeWidth={2.4} />
    </Icon>
  )
}

export function IconShield(props) {
  return (
    <Icon {...props}>
      <path d="M12 3 5 6v5.5c0 4.3 2.9 7.9 7 9.5 4.1-1.6 7-5.2 7-9.5V6l-7-3Z" />
      <path d="m9 12 2.2 2.2L15.5 10" />
    </Icon>
  )
}

export function IconCheckCircle(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m8.5 12.2 2.4 2.4 4.6-5" />
    </Icon>
  )
}

export function IconAlertTriangle(props) {
  return (
    <Icon {...props}>
      <path d="M12 4.5 2.8 19.5h18.4L12 4.5Z" />
      <path d="M12 10v4" />
      <path d="M12 17h.01" strokeWidth={2.4} />
    </Icon>
  )
}

export function IconXCircle(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="m9.5 9.5 5 5M14.5 9.5l-5 5" />
    </Icon>
  )
}

export function IconInfo(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5.5" />
      <path d="M12 7.8h.01" strokeWidth={2.4} />
    </Icon>
  )
}

export function IconPlus(props) {
  return (
    <Icon {...props}>
      <path d="M12 5v14M5 12h14" />
    </Icon>
  )
}

export function IconMinus(props) {
  return (
    <Icon {...props}>
      <path d="M5 12h14" />
    </Icon>
  )
}

export function IconArrowLeft(props) {
  return (
    <Icon {...props}>
      <path d="M19 12H5" />
      <path d="m10.5 6.5-6 5.5 6 5.5" />
    </Icon>
  )
}

export function IconArrowRight(props) {
  return (
    <Icon {...props}>
      <path d="M4 12h15" />
      <path d="m13.5 6.5 6 5.5-6 5.5" />
    </Icon>
  )
}

export function IconArrowDownLeft(props) {
  return (
    <Icon {...props}>
      <path d="M17.5 6.5 7 17" />
      <path d="M7 9.5V17h7.5" />
    </Icon>
  )
}

export function IconArrowUpRight(props) {
  return (
    <Icon {...props}>
      <path d="M7 17 17.5 6.5" />
      <path d="M9.5 6.5H17V14" />
    </Icon>
  )
}

export function IconCalculator(props) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="3" width="15" height="18" rx="2.5" />
      <rect x="7.5" y="6" width="9" height="3.5" rx="1" />
      <path d="M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01M16 17h.01" strokeWidth={2.4} />
    </Icon>
  )
}

export function IconStar({ filled = false, ...props }) {
  return (
    <Icon {...props} fill={filled ? 'currentColor' : 'none'}>
      <path d="m12 3.8 2.6 5.3 5.9.85-4.25 4.15 1 5.9L12 17.2 6.75 20l1-5.9L3.5 9.95l5.9-.85L12 3.8Z" />
    </Icon>
  )
}

export function IconBell(props) {
  return (
    <Icon {...props}>
      <path d="M6.5 10a5.5 5.5 0 0 1 11 0c0 3.5.9 5.2 1.7 6.1a.6.6 0 0 1-.45 1H5.25a.6.6 0 0 1-.45-1c.8-.9 1.7-2.6 1.7-6.1Z" />
      <path d="M10 20a2.3 2.3 0 0 0 4 0" />
    </Icon>
  )
}

export function IconLock(props) {
  return (
    <Icon {...props}>
      <rect x="4.5" y="10" width="15" height="10.5" rx="2.5" />
      <path d="M8 10V7.5a4 4 0 0 1 8 0V10" />
      <path d="M12 14v2.5" />
    </Icon>
  )
}

export function IconIdCard(props) {
  return (
    <Icon {...props}>
      <rect x="2.5" y="5" width="19" height="14" rx="2.5" />
      <circle cx="8.5" cy="11" r="2.2" />
      <path d="M5 16c.5-1.5 1.9-2.3 3.5-2.3s3 .8 3.5 2.3" />
      <path d="M14.5 10H19M14.5 13.5h3" />
    </Icon>
  )
}

export function IconBank(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 9.5 12 4.5l8.5 5" />
      <path d="M5.5 9.5v8M9.5 9.5v8M14.5 9.5v8M18.5 9.5v8" />
      <path d="M3 20.5h18" />
    </Icon>
  )
}

export function IconLogout(props) {
  return (
    <Icon {...props}>
      <path d="M14.5 8V6a2 2 0 0 0-2-2h-5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5a2 2 0 0 0 2-2v-2" />
      <path d="M10 12h10" />
      <path d="m17 8.5 3.5 3.5-3.5 3.5" />
    </Icon>
  )
}

export function IconFilter(props) {
  return (
    <Icon {...props}>
      <path d="M3.5 6h17l-6.5 7.5V19l-4 1.5v-7L3.5 6Z" />
    </Icon>
  )
}

export function IconSparkles(props) {
  return (
    <Icon {...props}>
      <path d="m12 4 1.7 4.3L18 10l-4.3 1.7L12 16l-1.7-4.3L6 10l4.3-1.7L12 4Z" />
      <path d="M18.5 15.5l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7.7-1.8Z" />
    </Icon>
  )
}

export function IconClock(props) {
  return (
    <Icon {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5.2l3.2 2" />
    </Icon>
  )
}

export function IconRefresh(props) {
  return (
    <Icon {...props}>
      <path d="M20 12a8 8 0 1 1-2.4-5.7" />
      <path d="M20 4v4.5h-4.5" />
    </Icon>
  )
}

export function IconDocument(props) {
  return (
    <Icon {...props}>
      <path d="M14 3H7.5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h9a2 2 0 0 0 2-2V7.5L14 3Z" />
      <path d="M13.5 3v5h5" />
      <path d="M9 13h6M9 16.5h4" />
    </Icon>
  )
}

export function IconMenu(props) {
  return (
    <Icon {...props}>
      <path d="M4 7h16M4 12h16M4 17h10" />
    </Icon>
  )
}

export function IconClose(props) {
  return (
    <Icon {...props}>
      <path d="m6 6 12 12M18 6 6 18" />
    </Icon>
  )
}

export function IconChevronDown(props) {
  return (
    <Icon {...props}>
      <path d="m6 9.5 6 6 6-6" />
    </Icon>
  )
}

export function IconSearch(props) {
  return (
    <Icon {...props}>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-3.4-3.4" />
    </Icon>
  )
}

export function IconGrid(props) {
  return (
    <Icon {...props}>
      <rect x="3.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="3.5" width="7" height="7" rx="2" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="2" />
      <rect x="13.5" y="13.5" width="7" height="7" rx="2" />
    </Icon>
  )
}

export const NAV_ICONS = {
  home: IconHome,
  explore: IconExplore,
  investments: IconBriefcase,
  funds: IconWallet,
  account: IconUser,
}
