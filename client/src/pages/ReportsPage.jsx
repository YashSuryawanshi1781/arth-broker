import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, formatINR } from '../lib/api'
import { PageHeader, Screen } from '../components/Screen'
import {
  IconArrowDownLeft,
  IconBriefcase,
  IconCalculator,
  IconCoins,
  IconDocument,
  IconFilter,
  IconList,
  IconRefresh,
  IconRocket,
  IconSearch,
} from '../components/Icons'
import { SkeletonRows } from '../components/Skeleton'

const REPORTS = {
  tradebook: {
    label: 'Tradebook',
    description: 'Every stock order with execution details',
    icon: IconList,
    search: 'Symbol, side or status',
    defaultSort: 'createdAt',
    columns: [
      col('createdAt', 'Date & time', dateTime),
      col('symbol', 'Symbol', text, 'left', true),
      col('side', 'Side', badge),
      col('product', 'Product', title),
      col('orderType', 'Order type', title),
      col('qty', 'Qty', number),
      col('fillPrice', 'Fill price', money),
      col('turnover', 'Value', money),
      col('status', 'Status', badge),
    ],
  },
  pnl: {
    label: 'P&L',
    description: 'Realised and unrealised profit by symbol',
    icon: IconBriefcase,
    search: 'Symbol or company',
    defaultSort: 'netPnl',
    columns: [
      col('symbol', 'Symbol', text, 'left', true),
      col('buyValue', 'Buy value', money),
      col('sellValue', 'Sell value', money),
      col('openQty', 'Open qty', number),
      col('avgBuyPrice', 'Avg. buy', money),
      col('ltp', 'LTP', money),
      col('realizedPnl', 'Realised', pnl),
      col('unrealizedPnl', 'Unrealised', pnl),
      col('charges', 'Charges', money),
      col('netPnl', 'Net P&L', pnl),
    ],
  },
  funds: {
    label: 'Funds',
    description: 'Cash deposits, withdrawals and trade debits',
    icon: IconArrowDownLeft,
    search: 'Transaction note or type',
    defaultSort: 'createdAt',
    columns: [
      col('createdAt', 'Date & time', dateTime),
      col('transactionType', 'Type', badge, 'left'),
      col('note', 'Description', text, 'left', true),
      col('amount', 'Amount', money),
      col('balanceAfter', 'Balance after', money),
    ],
  },
  'mutual-funds': {
    label: 'Mutual funds',
    description: 'Purchase and redemption statement',
    icon: IconCoins,
    search: 'Fund, category or transaction type',
    defaultSort: 'createdAt',
    columns: [
      col('createdAt', 'Date & time', dateTime),
      col('fund', 'Scheme', text, 'left', true),
      col('category', 'Category', text, 'left'),
      col('transactionType', 'Type', badge),
      col('units', 'Units', decimal),
      col('nav', 'NAV', money),
      col('amount', 'Amount', money),
    ],
  },
  charges: {
    label: 'Charges & taxes',
    description: 'Brokerage and statutory charge breakdown',
    icon: IconCalculator,
    search: 'Symbol, side or product',
    defaultSort: 'createdAt',
    columns: [
      col('createdAt', 'Date', date),
      col('symbol', 'Symbol', text, 'left', true),
      col('side', 'Side', badge),
      col('product', 'Product', title),
      col('turnover', 'Turnover', money),
      col('brokerage', 'Brokerage', money),
      col('stt', 'STT', money),
      col('exchange', 'Exchange', money),
      col('gst', 'GST', money),
      col('stampDuty', 'Stamp', money),
      col('total', 'Total', money, 'right', true),
    ],
  },
  ipo: {
    label: 'IPO applications',
    description: 'Applications, blocked amount and allotments',
    icon: IconRocket,
    search: 'IPO, status or UPI ID',
    defaultSort: 'createdAt',
    columns: [
      col('createdAt', 'Applied on', dateTime),
      col('ipo', 'IPO', text, 'left', true),
      col('lots', 'Lots', number),
      col('amount', 'Amount', money),
      col('status', 'Status', badge),
      col('upi', 'UPI ID', text, 'left'),
    ],
  },
}

const SUMMARY = {
  tradebook: [
    ['orders', 'Total orders', number],
    ['filled', 'Filled', number],
    ['buyValue', 'Buy value', money],
    ['sellValue', 'Sell value', money],
    ['turnover', 'Turnover', money],
  ],
  pnl: [
    ['symbols', 'Symbols', number],
    ['realizedPnl', 'Realised P&L', pnl],
    ['unrealizedPnl', 'Unrealised P&L', pnl],
    ['charges', 'Charges', money],
    ['netPnl', 'Net P&L', pnl],
  ],
  funds: [
    ['transactions', 'Transactions', number],
    ['credits', 'Credits', money],
    ['debits', 'Debits', money],
    ['closingBalance', 'Closing balance', money],
  ],
  'mutual-funds': [
    ['transactions', 'Transactions', number],
    ['purchases', 'Purchases', money],
    ['redemptions', 'Redemptions', money],
    ['netInvestment', 'Net investment', money],
  ],
  charges: [
    ['trades', 'Filled trades', number],
    ['turnover', 'Turnover', money],
    ['brokerage', 'Brokerage', money],
    ['taxes', 'Taxes', money],
    ['totalCharges', 'Total charges', money],
  ],
  ipo: [
    ['applications', 'Applications', number],
    ['lots', 'Lots applied', number],
    ['blockedAmount', 'Blocked amount', money],
  ],
}

const EMPTY_DATA = {
  rows: [],
  summary: {},
  pagination: { page: 1, pageSize: 20, total: 0, totalPages: 1 },
  options: {},
}

function col(key, label, format = text, align = 'right', strong = false) {
  return { key, label, format, align, strong }
}

export function ReportsPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('report')
  const type = REPORTS[requested] ? requested : 'tradebook'
  const config = REPORTS[type]
  const [data, setData] = useState(EMPTY_DATA)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchDraft, setSearchDraft] = useState(searchParams.get('search') || '')
  const [exporting, setExporting] = useState(false)

  const filters = useMemo(() => ({
    page: positive(searchParams.get('page'), 1),
    pageSize: positive(searchParams.get('pageSize'), 20),
    search: searchParams.get('search') || '',
    from: searchParams.get('from') || '',
    to: searchParams.get('to') || '',
    status: searchParams.get('status') || 'all',
    side: searchParams.get('side') || 'all',
    product: searchParams.get('product') || 'all',
    transactionType: searchParams.get('transactionType') || 'all',
    sortBy: searchParams.get('sortBy') || config.defaultSort,
    sortDir: searchParams.get('sortDir') === 'asc' ? 'asc' : 'desc',
  }), [searchParams, config.defaultSort])

  const update = useCallback((patch, resetPage = true) => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev)
      Object.entries(patch).forEach(([key, value]) => {
        if (value == null || value === '' || value === 'all') next.delete(key)
        else next.set(key, String(value))
      })
      if (resetPage && !Object.prototype.hasOwnProperty.call(patch, 'page')) next.delete('page')
      return next
    }, { replace: true })
  }, [setSearchParams])

  const load = useCallback(() => {
    setLoading(true)
    setError('')
    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== '' && value !== 'all') params.set(key, String(value))
    })
    api(`/reports/${type}?${params}`)
      .then(setData)
      .catch((err) => setError(err.message || 'Could not load report'))
      .finally(() => setLoading(false))
  }, [type, filters])

  useEffect(load, [load])

  useEffect(() => {
    setSearchDraft(filters.search)
  }, [filters.search])

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchDraft !== filters.search) update({ search: searchDraft })
    }, 350)
    return () => clearTimeout(timer)
  }, [searchDraft, filters.search, update])

  const switchReport = (next) => {
    setSearchDraft('')
    setData(EMPTY_DATA)
    setSearchParams(next === 'tradebook' ? {} : { report: next }, { replace: true })
  }

  const setRange = (range) => {
    if (range === 'all') return update({ from: '', to: '' })
    const today = new Date()
    const from = new Date(today)
    if (range === 'today') {
      // unchanged
    } else if (range === '7d') {
      from.setDate(from.getDate() - 6)
    } else if (range === '30d') {
      from.setDate(from.getDate() - 29)
    } else if (range === 'fy') {
      const year = today.getMonth() < 3 ? today.getFullYear() - 1 : today.getFullYear()
      from.setFullYear(year, 3, 1)
    }
    update({ from: isoDate(from), to: isoDate(today) })
  }

  const sort = (key) => {
    update({
      sortBy: key,
      sortDir: filters.sortBy === key && filters.sortDir === 'desc' ? 'asc' : 'desc',
    })
  }

  const exportCsv = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      Object.entries({ ...filters, page: 1, pageSize: 1000 }).forEach(([key, value]) => {
        if (value !== '' && value !== 'all') params.set(key, String(value))
      })
      const result = await api(`/reports/${type}?${params}`)
      downloadCsv(
        `arth-${type}-${isoDate(new Date())}.csv`,
        config.columns,
        result.rows || [],
      )
    } finally {
      setExporting(false)
    }
  }

  const filterCount = [
    filters.search,
    filters.from,
    filters.to,
    filters.status !== 'all',
    filters.side !== 'all',
    filters.product !== 'all',
    filters.transactionType !== 'all',
  ].filter(Boolean).length

  return (
    <Screen theme="reports" className="space-y-4">
      <PageHeader
        icon={IconDocument}
        eyebrow="Statements & insights"
        title="Reports"
        subtitle="Filter, sort, review and export your complete investment activity"
        actions={
          <div className="flex gap-2">
            <button type="button" className="btn btn-ghost text-sm" onClick={load} disabled={loading}>
              <IconRefresh size={16} />
              Refresh
            </button>
            <button type="button" className="btn btn-primary text-sm" onClick={exportCsv} disabled={exporting || !data.rows.length}>
              <IconArrowDownLeft size={16} />
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
          </div>
        }
      />

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
        {Object.entries(REPORTS).map(([id, item]) => {
          const Icon = item.icon
          return (
            <button
              key={id}
              type="button"
              onClick={() => switchReport(id)}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition sm:text-sm ${
                type === id ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-surface-2 hover:text-ink'
              }`}
            >
              <Icon size={15} />
              {item.label}
            </button>
          )
        })}
      </nav>

      <section className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
        {(SUMMARY[type] || []).map(([key, label, format]) => (
          <SummaryCard key={key} label={label} value={data.summary?.[key]} format={format} />
        ))}
      </section>

      <section className="card p-3">
        <div className="flex flex-wrap items-end gap-2">
          <label className="min-w-[210px] flex-1">
            <span className="mb-1 block text-[10px] font-bold tracking-wide text-muted uppercase">Search</span>
            <span className="field-wrap block">
              <IconSearch size={16} className="field-icon" />
              <input
                className="field field-has-icon w-full"
                value={searchDraft}
                placeholder={config.search}
                onChange={(event) => setSearchDraft(event.target.value)}
              />
            </span>
          </label>

          <DateField label="From" value={filters.from} onChange={(value) => update({ from: value })} />
          <DateField label="To" value={filters.to} onChange={(value) => update({ to: value })} />

          {data.options?.statuses?.length ? (
            <SelectFilter label="Status" value={filters.status} options={data.options.statuses} onChange={(value) => update({ status: value })} />
          ) : null}
          {data.options?.sides?.length ? (
            <SelectFilter label="Side" value={filters.side} options={data.options.sides} onChange={(value) => update({ side: value })} />
          ) : null}
          {data.options?.products?.length ? (
            <SelectFilter label="Product" value={filters.product} options={data.options.products} onChange={(value) => update({ product: value })} />
          ) : null}
          {data.options?.transactionTypes?.length ? (
            <SelectFilter
              label="Type"
              value={filters.transactionType}
              options={data.options.transactionTypes}
              onChange={(value) => update({ transactionType: value })}
            />
          ) : null}
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-line pt-3">
          <IconFilter size={14} className="mr-1 text-muted" />
          {[
            ['today', 'Today'],
            ['7d', '7 days'],
            ['30d', '30 days'],
            ['fy', 'This FY'],
            ['all', 'All time'],
          ].map(([id, label]) => (
            <button key={id} type="button" className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted hover:text-ink" onClick={() => setRange(id)}>
              {label}
            </button>
          ))}
          {filterCount > 0 && (
            <button
              type="button"
              className="ml-auto text-xs font-bold text-down"
              onClick={() => {
                setSearchDraft('')
                update({ search: '', from: '', to: '', status: '', side: '', product: '', transactionType: '' })
              }}
            >
              Clear {filterCount} filter{filterCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </section>

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h2 className="font-extrabold">{config.label}</h2>
            <p className="text-xs text-muted">{config.description}</p>
          </div>
          <span className="rounded-lg bg-surface-2 px-2.5 py-1 text-xs font-bold text-muted">
            {data.pagination.total.toLocaleString('en-IN')} records
          </span>
        </div>

        {error ? (
          <div className="grid place-items-center gap-2 px-4 py-14 text-center">
            <p className="font-bold text-down">Could not load report</p>
            <p className="text-sm text-muted">{error}</p>
            <button type="button" className="btn btn-ghost text-sm" onClick={load}>Try again</button>
          </div>
        ) : loading ? (
          <SkeletonRows rows={Math.min(filters.pageSize, 10)} />
        ) : data.rows.length === 0 ? (
          <div className="grid place-items-center px-4 py-14 text-center">
            <IconDocument size={34} className="text-muted" />
            <p className="mt-3 font-extrabold">No records found</p>
            <p className="mt-1 text-sm text-muted">Adjust your dates or filters to broaden this report.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-max border-collapse text-xs">
              <thead>
                <tr className="border-b border-line bg-surface-2/80">
                  {config.columns.map((column) => (
                    <th
                      key={column.key}
                      className={`px-3 py-2.5 font-bold tracking-wide text-muted uppercase ${
                        column.align === 'left' ? 'text-left' : 'text-right'
                      }`}
                    >
                      <button
                        type="button"
                        className={`inline-flex items-center gap-1 hover:text-ink ${column.align === 'left' ? '' : 'flex-row-reverse'}`}
                        onClick={() => sort(column.key)}
                      >
                        {column.label}
                        <span className={filters.sortBy === column.key ? 'text-page-accent' : 'text-line'}>
                          {filters.sortBy === column.key ? (filters.sortDir === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id || row.symbol} className="border-b border-line transition last:border-b-0 hover:bg-surface-2/50">
                    {config.columns.map((column) => (
                      <td
                        key={column.key}
                        className={`whitespace-nowrap px-3 py-2.5 ${
                          column.align === 'left' ? 'text-left' : 'text-right'
                        } ${column.strong ? 'font-bold text-ink' : 'text-muted'}`}
                      >
                        {column.format(row[column.key], row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Pagination pagination={data.pagination} update={update} />
      </section>

      {type === 'charges' && (
        <p className="rounded-xl border border-gold/30 bg-[#fdf6e7] px-3 py-2 text-xs text-muted">
          Charges are estimates based on the product and filled turnover. Exchange invoices may differ due to rounding and regulatory changes.
        </p>
      )}
      {type === 'pnl' && (
        <p className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-muted">
          Realised P&L uses the running weighted-average acquisition price. Unrealised P&L uses the latest available market price.
        </p>
      )}
    </Screen>
  )
}

function SummaryCard({ label, value, format }) {
  const output = format(value ?? 0)
  return (
    <div className="card min-w-0 p-3">
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-1 truncate font-mono text-lg font-bold">{output}</div>
    </div>
  )
}

function DateField({ label, value, onChange }) {
  return (
    <label>
      <span className="mb-1 block text-[10px] font-bold tracking-wide text-muted uppercase">{label}</span>
      <input type="date" className="field min-w-[142px]" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label>
      <span className="mb-1 block text-[10px] font-bold tracking-wide text-muted uppercase">{label}</span>
      <select className="field min-w-[120px]" value={value} onChange={(event) => onChange(event.target.value)}>
        {options.map((option) => (
          <option key={option} value={option}>{title(option)}</option>
        ))}
      </select>
    </label>
  )
}

function Pagination({ pagination, update }) {
  const { page, pageSize, total, totalPages } = pagination
  const start = total ? (page - 1) * pageSize + 1 : 0
  const end = Math.min(total, page * pageSize)
  const pages = pageWindow(page, totalPages)
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-4 py-3">
      <div className="flex items-center gap-2 text-xs text-muted">
        <span>Showing {start}–{end} of {total}</span>
        <select className="rounded-lg border border-line bg-surface px-2 py-1 font-bold" value={pageSize} onChange={(event) => update({ pageSize: event.target.value, page: 1 }, false)}>
          {[10, 20, 50, 100].map((size) => <option key={size} value={size}>{size} / page</option>)}
        </select>
      </div>
      <div className="flex items-center gap-1">
        <PageButton label="«" disabled={page <= 1} onClick={() => update({ page: 1 }, false)} />
        <PageButton label="‹" disabled={page <= 1} onClick={() => update({ page: page - 1 }, false)} />
        {pages.map((value) => (
          <PageButton key={value} label={String(value)} active={value === page} onClick={() => update({ page: value }, false)} />
        ))}
        <PageButton label="›" disabled={page >= totalPages} onClick={() => update({ page: page + 1 }, false)} />
        <PageButton label="»" disabled={page >= totalPages} onClick={() => update({ page: totalPages }, false)} />
      </div>
    </div>
  )
}

function PageButton({ label, disabled, active, onClick }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`grid h-8 min-w-8 place-items-center rounded-lg border px-1.5 text-xs font-bold transition disabled:opacity-35 ${
        active ? 'border-brand bg-brand text-white' : 'border-line bg-surface text-muted hover:bg-surface-2'
      }`}
    >
      {label}
    </button>
  )
}

function pageWindow(page, total) {
  const start = Math.max(1, Math.min(page - 2, total - 4))
  const end = Math.min(total, start + 4)
  return Array.from({ length: Math.max(0, end - start + 1) }, (_, index) => start + index)
}

function downloadCsv(filename, columns, rows) {
  const escape = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`
  const lines = [
    columns.map((column) => escape(column.label)).join(','),
    ...rows.map((row) => columns.map((column) => escape(csvValue(row[column.key]))).join(',')),
  ]
  const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function csvValue(value) {
  if (typeof value === 'number') return value
  if (Number.isFinite(Number(value)) && value !== '') return Number(value)
  return value
}

function positive(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback
}

function isoDate(dateValue) {
  const date = new Date(dateValue)
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

function text(value) {
  return value ?? '—'
}

function title(value) {
  if (!value) return '—'
  return String(value).replaceAll('-', ' ').replace(/\b\w/g, (letter) => letter.toUpperCase())
}

function number(value) {
  return Number(value || 0).toLocaleString('en-IN')
}

function decimal(value) {
  return Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 4 })
}

function money(value) {
  return `₹${formatINR(Number(value || 0))}`
}

function pnl(value) {
  const amount = Number(value || 0)
  return (
    <span className={amount >= 0 ? 'text-up' : 'text-down'}>
      {amount >= 0 ? '+' : '−'}₹{formatINR(Math.abs(amount))}
    </span>
  )
}

function date(value) {
  if (!value) return '—'
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function dateTime(value) {
  if (!value) return '—'
  return (
    <span>
      <span className="block text-ink">{date(value)}</span>
      <span className="block text-[10px] text-muted">
        {new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
      </span>
    </span>
  )
}

function badge(value) {
  const normal = String(value || '').toLowerCase()
  const up = ['buy', 'credit', 'filled', 'purchase', 'allotted', 'submitted'].includes(normal)
  const down = ['sell', 'debit', 'rejected', 'cancelled', 'redemption', 'not-allotted'].includes(normal)
  return (
    <span className={`inline-flex rounded-lg px-2 py-1 text-[10px] font-bold ${
      up ? 'bg-up-bg text-up' : down ? 'bg-down-bg text-down' : 'bg-surface-2 text-muted'
    }`}>
      {title(value)}
    </span>
  )
}
