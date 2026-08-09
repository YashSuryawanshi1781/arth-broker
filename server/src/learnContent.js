export const LESSONS = [
  {
    id: 'ltp',
    title: 'What is LTP?',
    minutes: 3,
    summary: 'Last Traded Price is the most recent deal on the exchange.',
    body: [
      'LTP updates as buyers and sellers match. Your portfolio value uses LTP × quantity.',
      'Change % is vs previous close. In Arth, Yahoo (delayed) or demo ticks drive LTP.',
      'Never confuse LTP with your average buy price — that is cost basis.',
    ],
  },
  {
    id: 'market-vs-limit',
    title: 'Market vs Limit orders',
    minutes: 4,
    summary: 'Market fills now at LTP; limit waits for your price.',
    body: [
      'Market: fastest fill, price can slip in fast markets.',
      'Limit buy: fills at your price or better when LTP ≤ limit.',
      'Limit sell: fills when LTP ≥ limit. Open limits reserve cash on buys.',
    ],
  },
  {
    id: 'delivery-intraday',
    title: 'Delivery (CNC) vs Intraday (MIS)',
    minutes: 4,
    summary: 'Delivery stays overnight; intraday uses leverage and must square off.',
    body: [
      'CNC delivery: you own the shares; full cash is blocked.',
      'MIS intraday: margin leverage (paper); positions should close same day.',
      'Arth can auto square-off open MIS near session end for practice.',
    ],
  },
  {
    id: 'charges',
    title: 'Charges & STT',
    minutes: 3,
    summary: 'Brokerage, STT, exchange, GST and stamp duty reduce net P&L.',
    body: [
      'Preview on the ticket before you place — same math as fill settlement.',
      'STT is higher on delivery sells; intraday has different slabs.',
      'Paper trading still deducts charges so P&L habits stay realistic.',
    ],
  },
  {
    id: 'risk',
    title: 'Risk basics',
    minutes: 5,
    summary: 'Size positions so one trade cannot wipe your practice capital.',
    body: [
      'Avoid putting all cash into one stock (concentration risk).',
      'Use stop-loss / GTT style exits once you unlock Wave-2 tools.',
      'Learning mode shows soft warnings before risky confirms.',
    ],
  },
  {
    id: 'sip',
    title: 'SIP & mutual funds',
    minutes: 4,
    summary: 'Systematic Investment Plans invest a fixed amount every month.',
    body: [
      'SIPs buy units at that day’s NAV — rupee-cost averaging.',
      'Pause/resume anytime in Investments; due SIPs run on the market loop.',
      'Use the calculator to map a goal to a monthly amount.',
    ],
  },
]

export const CHALLENGES = [
  {
    id: 'buy-delivery',
    title: 'Buy 1 delivery share',
    hint: 'Open any stock → CNC → Market → qty 1 → Buy',
    check: 'order_delivery_buy',
  },
  {
    id: 'limit-below',
    title: 'Place a limit buy below LTP',
    hint: 'Use Limit type with price under current LTP so it stays open',
    check: 'order_limit_open',
  },
  {
    id: 'start-sip',
    title: 'Start a SIP',
    hint: 'Mutual funds → pick a fund → create SIP',
    check: 'sip_active',
  },
  {
    id: 'set-alert',
    title: 'Set a price alert',
    hint: 'Stock page → Set alert',
    check: 'alert_created',
  },
  {
    id: 'read-lesson',
    title: 'Complete a lesson',
    hint: 'Open Learn → finish any module',
    check: 'lesson_done',
  },
]

export const GLOSSARY = [
  { term: 'LTP', def: 'Last Traded Price — most recent match.' },
  { term: 'CNC', def: 'Cash and Carry delivery product.' },
  { term: 'MIS', def: 'Margin Intraday Square-off product.' },
  { term: 'GTT', def: 'Good Till Triggered — waits for a trigger price.' },
  { term: 'STT', def: 'Securities Transaction Tax on eligible trades.' },
  { term: 'XIRR', def: 'Annualised return accounting for cashflow timing.' },
  { term: 'OI', def: 'Open Interest — open option contracts.' },
  { term: 'PCR', def: 'Put-Call Ratio — puts OI / calls OI.' },
]
