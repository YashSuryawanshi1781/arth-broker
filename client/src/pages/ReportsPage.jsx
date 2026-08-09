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
  tax: {
    label: 'Tax P&L',
    description: 'STCG / LTCG summary for your closed trades',
    icon: IconCalculator,
    search: '',
    defaultSort: 'symbol',
    columns: [],
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
  const [taxData, setTaxData] = useState(null)
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
    if (type === 'tax') {
      api('/portfolio/analytics')
        .then(setTaxData)
        .catch((err) => setError(err.message || 'Could not load tax P&L'))
        .finally(() => setLoading(false))
      return
    }
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

  const exportExcel = async () => {
    setExporting(true)
    try {
      const params = new URLSearchParams()
      Object.entries({ ...filters, page: 1, pageSize: 1000 }).forEach(([key, value]) => {
        if (value !== '' && value !== 'all') params.set(key, String(value))
      })
      const result = await api(`/reports/${type}?${params}`)
      const cols = config.columns
      const rows = result.rows || []
      const escape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
      const head = cols.map((c) => escape(c.label)).join(',')
      const body = rows.map((row) => cols.map((c) => escape(plainReportCell(c, row))).join(',')).join('\n')
      const blob = new Blob([`\uFEFF${head}\n${body}`], { type: 'application/vnd.ms-excel;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `arth-${type}-${isoDate(new Date())}.xls`
      a.click()
      URL.revokeObjectURL(url)
    } finally {
      setExporting(false)
    }
  }

  const exportPdf = () => {
    const cols = config.columns
    const rows = data.rows || []
    const head = cols.map((c) => `<th style="text-align:${c.align || 'left'};padding:6px 8px;border-bottom:1px solid #ccc">${c.label}</th>`).join('')
    const body = rows.map((row) => (
      `<tr>${cols.map((c) => {
        const cell = plainReportCell(c, row)
        return `<td style="text-align:${c.align || 'left'};padding:6px 8px;border-bottom:1px solid #eee;font-family:monospace;font-size:12px">${escapeHtml(cell)}</td>`
      }).join('')}</tr>`
    )).join('')
    const html = `<!doctype html><html><head><title>Arth ${config.label}</title>
      <style>body{font-family:system-ui,sans-serif;padding:24px;color:#111}h1{font-size:18px;margin:0 0 4px}p{color:#666;font-size:12px;margin:0 0 16px}table{width:100%;border-collapse:collapse}</style>
      </head><body>
      <h1>Arth — ${config.label}</h1>
      <p>Generated ${new Date().toLocaleString('en-IN')} · ${rows.length} rows</p>
      <table><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table>
      <script>window.onload=()=>window.print()</script>
      </body></html>`
    const win = window.open('', '_blank')
    if (!win) return
    win.document.write(html)
    win.document.close()
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
    <Screen theme="reports" className="reports-page">
      <PageHeader
        icon={IconDocument}
        eyebrow="Statements"
        title="Reports"
        subtitle="Tradebook, P&L, funds and charges from your trading account"
        actions={
          <div className="reports-actions">
            <button type="button" className="btn btn-ghost text-xs bold" onClick={load} disabled={loading}>
              <IconRefresh size={15} />
              Refresh
            </button>
            <button type="button" className="btn btn-ghost text-xs bold" onClick={exportPdf} disabled={!data.rows.length}>
              PDF
            </button>
            <button type="button" className="btn btn-ghost text-xs bold" onClick={exportExcel} disabled={exporting || !data.rows.length}>
              Excel
            </button>
            <button type="button" className="btn btn-primary text-xs bold" onClick={exportCsv} disabled={exporting || !data.rows.length}>
              <IconArrowDownLeft size={15} />
              {exporting ? 'Exporting…' : 'CSV'}
            </button>
          </div>
        }
      />

      <nav className="reports-tabs" aria-label="Report type">
        {Object.entries(REPORTS).map(([id, item]) => {
          const Icon = item.icon
          return (
            <button
              key={id}
              type="button"
              onClick={() => switchReport(id)}
              className={`reports-tab${type === id ? ' is-active' : ''}`}
            >
              <Icon size={14} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {(SUMMARY[type] || []).length > 0 && (
        <section className="reports-summary">
          {(SUMMARY[type] || []).map(([key, label, format]) => (
            <SummaryCard key={key} label={label} value={data.summary?.[key]} format={format} />
          ))}
        </section>
      )}

      <section className="card reports-filters">
        <div className="reports-filters-row">
          <label className="reports-search">
            <span className="reports-label">Search</span>
            <span className="field-wrap block">
              <IconSearch size={15} className="field-icon" />
              <input
                className="field field-has-icon w-full"
                value={searchDraft}
                placeholder={config.search || 'Search'}
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

        <div className="reports-ranges">
          <IconFilter size={14} className="text-muted" />
          {[
            ['today', 'Today'],
            ['7d', '7 days'],
            ['30d', '30 days'],
            ['fy', 'This FY'],
            ['all', 'All time'],
          ].map(([id, label]) => (
            <button key={id} type="button" className="reports-chip" onClick={() => setRange(id)}>
              {label}
            </button>
          ))}
          {filterCount > 0 && (
            <button
              type="button"
              className="reports-clear"
              onClick={() => {
                setSearchDraft('')
                update({ search: '', from: '', to: '', status: '', side: '', product: '', transactionType: '' })
              }}
            >
              Clear {filterCount}
            </button>
          )}
        </div>
      </section>

      <section className="card reports-table-card overflow-hidden">
        <div className="reports-table-head">
          <div>
            <h2>{config.label}</h2>
            <p>{config.description}</p>
          </div>
          <span className="reports-count">
            {(data.pagination.total || 0).toLocaleString('en-IN')} records
          </span>
        </div>

        {error ? (
          <div className="reports-empty">
            <p className="font-bold text-down">Could not load report</p>
            <p className="text-sm text-muted">{error}</p>
            <button type="button" className="btn btn-ghost text-xs bold" onClick={load}>Try again</button>
          </div>
        ) : loading ? (
          <div className="p-4">
            <SkeletonRows rows={Math.min(filters.pageSize, 8)} />
          </div>
        ) : type === 'tax' && taxData?.tax ? (
          <div className="reports-tax">
            <div className="reports-tax-grid">
              <div className="reports-tax-card">
                <p>STCG (≤ 1 year)</p>
                <strong className={taxData.tax.stcg >= 0 ? 'text-up' : 'text-down'}>
                  ₹{formatINR(taxData.tax.stcg)}
                </strong>
                <span>Stub tax @ 15%: ₹{formatINR(taxData.tax.stcgTaxStub)}</span>
              </div>
              <div className="reports-tax-card">
                <p>LTCG (&gt; 1 year)</p>
                <strong className={taxData.tax.ltcg >= 0 ? 'text-up' : 'text-down'}>
                  ₹{formatINR(taxData.tax.ltcg)}
                </strong>
                <span>Stub tax @ 12.5%: ₹{formatINR(taxData.tax.ltcgTaxStub)}</span>
              </div>
            </div>
            <p className="text-xs text-muted">{taxData.tax.note}</p>
            {taxData.xirrPct != null && (
              <p className="text-sm font-semibold">
                Portfolio XIRR:{' '}
                <span className="font-mono">{taxData.xirrPct}%</span>
              </p>
            )}
          </div>
        ) : data.rows.length === 0 ? (
          <div className="reports-empty">
            <IconDocument size={32} className="text-muted" />
            <p className="font-extrabold">No records found</p>
            <p className="text-sm text-muted">Adjust dates or filters, or place trades to populate this report.</p>
          </div>
        ) : (
          <div className="reports-table-wrap">
            <table className="reports-table">
              <thead>
                <tr>
                  {config.columns.map((column) => (
                    <th
                      key={column.key}
                      className={column.align === 'left' ? 'is-left' : 'is-right'}
                    >
                      <button
                        type="button"
                        className="reports-sort"
                        onClick={() => sort(column.key)}
                      >
                        {column.label}
                        <span className={filters.sortBy === column.key ? 'text-page-accent' : 'text-muted'}>
                          {filters.sortBy === column.key ? (filters.sortDir === 'asc' ? '↑' : '↓') : '↕'}
                        </span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.rows.map((row) => (
                  <tr key={row.id || row.symbol}>
                    {config.columns.map((column) => (
                      <td
                        key={column.key}
                        className={`${column.align === 'left' ? 'is-left' : 'is-right'}${column.strong ? ' is-strong' : ''}`}
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

        {type !== 'tax' && <Pagination pagination={data.pagination} update={update} />}
      </section>

      {type === 'charges' && (
        <p className="reports-footnote">
          Charges are estimates based on product and filled turnover. Demo values may differ from live exchange invoices.
        </p>
      )}
      {type === 'pnl' && (
        <p className="reports-footnote">
          Realised P&L uses weighted-average buy price. Unrealised P&L uses the latest market price on your holdings.
        </p>
      )}
    </Screen>
  )
}

function SummaryCard({ label, value, format }) {
  const output = format(value ?? 0)
  return (
    <div className="reports-summary-card">
      <div className="reports-label">{label}</div>
      <div className="reports-summary-value">{output}</div>
    </div>
  )
}

function DateField({ label, value, onChange }) {
  return (
    <label className="reports-field">
      <span className="reports-label">{label}</span>
      <input type="date" className="field" value={value} onChange={(event) => onChange(event.target.value)} />
    </label>
  )
}

function SelectFilter({ label, value, options, onChange }) {
  return (
    <label className="reports-field">
      <span className="reports-label">{label}</span>
      <select className="field" value={value} onChange={(event) => onChange(event.target.value)}>
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
    <div className="reports-pagination">
      <div className="reports-pagination-meta">
        <span>Showing {start}–{end} of {total}</span>
        <select
          className="reports-page-size"
          value={pageSize}
          onChange={(event) => update({ pageSize: event.target.value, page: 1 }, false)}
        >
          {[10, 20, 50, 100].map((size) => (
            <option key={size} value={size}>{size} / page</option>
          ))}
        </select>
      </div>
      <div className="reports-pagination-pages">
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
      className={`reports-page-btn${active ? ' is-active' : ''}`}
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

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
}

function plainReportCell(column, row) {
  const value = row[column.key]
  if (column.format === money) return money(value)
  if (column.format === pnl) {
    const amount = Number(value || 0)
    return `${amount >= 0 ? '+' : '−'}₹${formatINR(Math.abs(amount))}`
  }
  if (column.format === dateTime) {
    if (!value) return '—'
    return `${date(value)} ${new Date(value).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`
  }
  if (column.format === date) return typeof date(value) === 'string' ? date(value) : String(value ?? '—')
  if (column.format === number) return number(value)
  if (column.format === decimal) return decimal(value)
  if (column.format === title) return title(value)
  if (column.format === badge) return title(value)
  return String(text(value))
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
    <span className={amount >= 0 ? 'up' : 'down'}>
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
      <span className="block ink">{date(value)}</span>
      <span className="block text-[10px] muted">
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
    <span className={`inline-flex rounded-md px-2 py-0.5 text-[10px] font-bold ${up ? 'bg-up-bg text-up' : down ? 'bg-down-bg text-down' : 'bg-surface-2 text-muted'}`}>
      {title(value)}
    </span>
  )
}
