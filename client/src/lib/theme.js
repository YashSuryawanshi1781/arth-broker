/**
 * Per-screen colour themes. Each screen picks a key and gets a matching accent
 * for headers, icon chips and illustrations. The hex values here mirror the
 * `.theme-*` CSS classes in index.css — keep both sides in sync.
 */
export const PAGE_THEMES = {
  home: { key: 'home', accent: '#00a878', label: 'Dashboard' },
  explore: { key: 'explore', accent: '#2563eb', label: 'Markets' },
  stock: { key: 'stock', accent: '#0f766e', label: 'Terminal' },
  investments: { key: 'investments', accent: '#7c3aed', label: 'Portfolio' },
  orders: { key: 'orders', accent: '#c98516', label: 'Orders' },
  funds: { key: 'funds', accent: '#0891b2', label: 'Funds' },
  mf: { key: 'mf', accent: '#4f46e5', label: 'Mutual funds' },
  ipo: { key: 'ipo', accent: '#e11d48', label: 'IPO' },
  account: { key: 'account', accent: '#16325c', label: 'Account' },
  kyc: { key: 'kyc', accent: '#00a878', label: 'KYC' },
  reports: { key: 'reports', accent: '#b45309', label: 'Reports' },
}

export function pageTheme(key) {
  return PAGE_THEMES[key] || PAGE_THEMES.home
}

export function themeClass(key) {
  return `theme-${pageTheme(key).key}`
}
