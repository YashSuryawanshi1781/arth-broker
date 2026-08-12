import {
  IconBriefcase,
  IconCalculator,
  IconCandles,
  IconCoins,
  IconExplore,
  IconHome,
  IconDocument,
  IconList,
  IconRocket,
  IconShield,
  IconSparkles,
  IconUser,
  IconWallet,
} from './Icons'

/** Shown in the desktop nav rail and the mobile bottom bar. */
export const PRIMARY_NAV = [
  { to: '/app', end: true, label: 'Home', icon: IconHome, theme: 'home' },
  { to: '/app/explore', label: 'Explore', icon: IconExplore, theme: 'explore' },
  { to: '/app/auto', label: 'Auto Desk', icon: IconRocket, theme: 'explore' },
  { to: '/app/learn', label: 'Learn · AI', icon: IconSparkles, theme: 'home' },
  { to: '/app/investments', label: 'Investments', icon: IconBriefcase, theme: 'investments' },
  { to: '/app/orders', label: 'Orders', icon: IconList, theme: 'orders' },
]

/** Grouped navigation for the drawer. */
export const DRAWER_SECTIONS = [
  {
    label: 'Invest',
    items: [
      { to: '/app', end: true, label: 'Dashboard', icon: IconHome, theme: 'home', hint: 'Portfolio overview' },
      { to: '/app/explore', label: 'Stocks', icon: IconCandles, theme: 'explore', hint: 'Live NSE universe' },
      { to: '/app/learn', label: 'Learn · AI', icon: IconSparkles, theme: 'home', hint: 'Coach, lessons & paper book' },
      { to: '/app/auto', label: 'Auto Desk', icon: IconRocket, theme: 'explore', hint: 'Daily goal · auto entry & SL/TP' },
      { to: '/app/compare', label: 'Compare', icon: IconCandles, theme: 'explore', hint: 'Side-by-side stocks' },
      { to: '/app/screener', label: 'Screener', icon: IconExplore, theme: 'explore', hint: 'Technical filters' },
      { to: '/app/heatmap', label: 'Heatmap', icon: IconExplore, theme: 'explore', hint: 'Sector drill-down' },
      { to: '/app/mf', label: 'Mutual funds', icon: IconCoins, theme: 'mf', hint: 'SIP & lumpsum' },
      { to: '/app/ipo', label: 'IPO', icon: IconRocket, theme: 'ipo', hint: 'Apply with UPI' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/app/investments', label: 'Investments', icon: IconBriefcase, theme: 'investments', hint: 'Holdings & SIPs' },
      { to: '/app/orders', label: 'Orders', icon: IconList, theme: 'orders', hint: 'Order book' },
      { to: '/app/basket', label: 'Basket', icon: IconList, theme: 'orders', hint: 'Multi-leg orders' },
      { to: '/app/funds', label: 'Funds', icon: IconWallet, theme: 'funds', hint: 'Add or withdraw' },
      { to: '/app/reports', label: 'Reports', icon: IconDocument, theme: 'reports', hint: 'P&L, trades & statements' },
      { to: '/app/mf/calculator', label: 'Calculator', icon: IconCalculator, theme: 'mf', hint: 'Plan a goal' },
      { to: '/app/calendar', label: 'Corporate actions', icon: IconDocument, theme: 'reports', hint: 'Dividends & splits' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/app/account', label: 'Profile & alerts', icon: IconUser, theme: 'account', hint: 'Security, notifications' },
      { to: '/app/activity', label: 'Activity', icon: IconList, theme: 'account', hint: 'What happened' },
      { to: '/app/admin', label: 'Demo admin', icon: IconShield, theme: 'account', hint: 'Reset seed data' },
    ],
  },
]

export const KYC_LINK = { to: '/kyc', label: 'Complete KYC', icon: IconShield, theme: 'kyc', hint: 'Unlock trading' }
