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
  IconUser,
  IconWallet,
} from './Icons'

/** Shown in the desktop nav rail and the mobile bottom bar. */
export const PRIMARY_NAV = [
  { to: '/app', end: true, label: 'Home', icon: IconHome, theme: 'home' },
  { to: '/app/explore', label: 'Explore', icon: IconExplore, theme: 'explore' },
  { to: '/app/investments', label: 'Investments', icon: IconBriefcase, theme: 'investments' },
  { to: '/app/orders', label: 'Orders', icon: IconList, theme: 'orders' },
  { to: '/app/funds', label: 'Funds', icon: IconWallet, theme: 'funds' },
  { to: '/app/reports', label: 'Reports', icon: IconDocument, theme: 'reports' },
]

/** Grouped navigation for the drawer. */
export const DRAWER_SECTIONS = [
  {
    label: 'Invest',
    items: [
      { to: '/app', end: true, label: 'Dashboard', icon: IconHome, theme: 'home', hint: 'Portfolio overview' },
      { to: '/app/explore', label: 'Stocks', icon: IconCandles, theme: 'explore', hint: 'Live NSE universe' },
      { to: '/app/mf', label: 'Mutual funds', icon: IconCoins, theme: 'mf', hint: 'SIP & lumpsum' },
      { to: '/app/ipo', label: 'IPO', icon: IconRocket, theme: 'ipo', hint: 'Apply with UPI' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { to: '/app/investments', label: 'Investments', icon: IconBriefcase, theme: 'investments', hint: 'Holdings & SIPs' },
      { to: '/app/orders', label: 'Orders', icon: IconList, theme: 'orders', hint: 'Order book' },
      { to: '/app/funds', label: 'Funds', icon: IconWallet, theme: 'funds', hint: 'Add or withdraw' },
      { to: '/app/reports', label: 'Reports', icon: IconDocument, theme: 'reports', hint: 'P&L, trades & statements' },
      { to: '/app/mf/calculator', label: 'Calculator', icon: IconCalculator, theme: 'mf', hint: 'Plan a goal' },
    ],
  },
  {
    label: 'Account',
    items: [
      { to: '/app/account', label: 'Profile & alerts', icon: IconUser, theme: 'account', hint: 'Security, notifications' },
    ],
  },
]

export const KYC_LINK = { to: '/kyc', label: 'Complete KYC', icon: IconShield, theme: 'kyc', hint: 'Unlock trading' }
