import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { api, formatINR, formatINRShort } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { setUser } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { FundLogo, RiskBadge, Stars, Donut } from '../components/MfWidgets'
import { EmptyState, PageHeader, Screen } from '../components/Screen'
import { EmptyFundsArt, EmptySearchArt, EmptySipArt } from '../components/Illustrations'
import {
  IconCalculator,
  IconCoins,
  IconDocument,
  IconExplore,
  IconFilter,
  IconPieChart,
  IconSparkles,
} from '../components/Icons'
import { PAGE_THEMES } from '../lib/theme'

const TABS = ['explore', 'portfolio', 'sips', 'transactions']

const SORTS = [
  ['returns3y', '3Y returns'],
  ['returns1y', '1Y returns'],
  ['returns5y', '5Y returns'],
  ['aum', 'Fund size'],
  ['rating', 'Rating'],
  ['expense', 'Lowest expense'],
  ['name', 'Name'],
]

export function MfPage() {
  const [funds, setFunds] = useState([])
  const [filters, setFilters] = useState({ categories: [], subCategories: [], risks: [] })
  const [holdings, setHoldings] = useState([])
  const [sips, setSips] = useState([])
  const [transactions, setTransactions] = useState([])

  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab = TABS.includes(tabParam) ? tabParam : 'explore'
  const setTab = useCallback(
    (id) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (id === 'explore') next.delete('tab')
          else next.set('tab', id)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState(() => searchParams.get('category') || 'All')
  const [subCategory, setSubCategory] = useState(() => searchParams.get('subCategory') || 'All')
  const [risk, setRisk] = useState('All')
  const [minRating, setMinRating] = useState(0)
  const [sort, setSort] = useState('returns3y')

  // Keep filters in sync when arriving via breadcrumb deep-links like ?subCategory=Large Cap
  useEffect(() => {
    const nextCategory = searchParams.get('category') || 'All'
    const nextSub = searchParams.get('subCategory') || 'All'
    setCategory((prev) => (prev === nextCategory ? prev : nextCategory))
    setSubCategory((prev) => (prev === nextSub ? prev : nextSub))
  }, [searchParams])

  const updateCategory = useCallback(
    (value) => {
      setCategory(value)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (!value || value === 'All') next.delete('category')
          else next.set('category', value)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const updateSubCategory = useCallback(
    (value) => {
      setSubCategory(value)
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          if (!value || value === 'All') next.delete('subCategory')
          else next.set('subCategory', value)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const [redeeming, setRedeeming] = useState(null)
  const [redeemUnits, setRedeemUnits] = useState('')
  const [editingSip, setEditingSip] = useState(null)
  const [sipAmount, setSipAmount] = useState('')

  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const loadPortfolio = useCallback(() => {
    api('/mf/holdings').then((d) => setHoldings(d.holdings || [])).catch(() => {})
    api('/mf/sips').then((d) => setSips(d.sips || [])).catch(() => {})
    api('/mf/transactions').then((d) => setTransactions(d.transactions || [])).catch(() => {})
  }, [])

  useEffect(loadPortfolio, [loadPortfolio])

  useEffect(() => {
    const params = new URLSearchParams({ category, subCategory, risk, sort })
    if (query) params.set('q', query)
    if (minRating) params.set('rating', String(minRating))
    const t = setTimeout(() => {
      api(`/mf?${params.toString()}`)
        .then((d) => {
          setFunds(d.funds || [])
          if (d.filters) setFilters(d.filters)
        })
        .catch(() => {})
    }, 200)
    return () => clearTimeout(t)
  }, [query, category, subCategory, risk, minRating, sort])

  const portfolio = useMemo(() => {
    const invested = holdings.reduce((s, h) => s + h.invested, 0)
    const current = holdings.reduce((s, h) => s + h.value, 0)
    const monthlySip = sips.filter((s) => s.status === 'active').reduce((s, x) => s + x.amount, 0)
    return {
      invested,
      current,
      pnl: current - invested,
      pnlPct: invested ? ((current - invested) / invested) * 100 : 0,
      monthlySip,
      activeSips: sips.filter((s) => s.status === 'active').length,
    }
  }, [holdings, sips])

  const allocation = useMemo(() => {
    const palette = ['#00a878', '#16325c', '#f59e0b', '#6366f1', '#06b6d4', '#ec4899']
    const byCategory = new Map()
    holdings.forEach((h) => {
      byCategory.set(h.subCategory || h.category, (byCategory.get(h.subCategory || h.category) || 0) + h.value)
    })
    const total = [...byCategory.values()].reduce((a, b) => a + b, 0)
    if (!total) return []
    return [...byCategory.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([label, value], i) => ({ label, value, pct: (value / total) * 100, color: palette[i % palette.length] }))
  }, [holdings])

  const redeem = async () => {
    const units = Number(redeemUnits)
    if (!(units > 0)) {
      dispatch(showToast({ type: 'warning', title: 'Enter units', message: 'Specify how many units to redeem' }))
      return
    }
    try {
      const data = await api('/mf/redeem', { method: 'POST', body: { fundId: redeeming.fundId, units } })
      dispatch(setUser(data.user))
      dispatch(showToast({
        type: 'success',
        title: 'Redemption placed',
        message: `₹${formatINR(data.amount)} credited from ${redeeming.name}`,
      }))
      setRedeeming(null)
      setRedeemUnits('')
      loadPortfolio()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Redemption failed', message: err.message }))
    }
  }

  const updateSip = async (sip, body, successTitle) => {
    try {
      await api(`/mf/sips/${sip.id}`, { method: 'PATCH', body })
      dispatch(showToast({ type: 'success', title: successTitle, message: sip.name }))
      setEditingSip(null)
      loadPortfolio()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Could not update SIP', message: err.message }))
    }
  }

  return (
    <Screen theme="mf" className="stack gap-md">
      <PageHeader
        icon={IconCoins}
        eyebrow="Mutual funds"
        title="Mutual funds"
        subtitle="Research, compare and invest in direct plans with zero commission"
        actions={
          <Link to="/app/mf/calculator" className="btn btn-ghost text-sm">
            <IconCalculator size={16} />
            SIP calculator
          </Link>
        }
      />

      {/* Portfolio summary */}
      <section className="card overflow-hidden">
        <div className="hero-mesh grid gap-lg px-lg py-md">
          <div>
            <p className="text-[11px] bold tracking-[0.16em] uppercase">Mutual fund portfolio</p>
            <div className="mt-sm mono text-3xl bold">₹{formatINR(portfolio.current)}</div>
            <div className={`mt-sm text-sm bold ${portfolio.pnl >= 0 ? 'text-[#7dffc8]' : 'text-[#ff9d9d]'}`}>
              {portfolio.pnl >= 0 ? '+' : ''}₹{formatINR(portfolio.pnl)} ({portfolio.pnlPct.toFixed(2)}%) overall
            </div>
          </div>
          <div className="grid-3 gap-sm">
            <HeroMetric label="Invested" value={`₹${formatINRShort(portfolio.invested)}`} />
            <HeroMetric label="Monthly SIP" value={`₹${formatINRShort(portfolio.monthlySip)}`} />
            <HeroMetric label="Funds" value={String(holdings.length)} />
          </div>
        </div>
      </section>

      <nav className="row gap-xs overflow-auto rounded border p-1">
        {[
          { id: 'explore', label: `Explore (${funds.length})`, Icon: IconExplore },
          { id: 'portfolio', label: `My investments (${holdings.length})`, Icon: IconPieChart },
          { id: 'sips', label: `SIPs (${sips.length})`, Icon: IconSparkles },
          { id: 'transactions', label: 'Transactions', Icon: IconDocument },
        ].map(({ id, label, Icon }) => (
          <button
            key={id}
            type="button"
            className={`row gap-sm rounded px-lg py-md text-sm bold ${ tab === id ? 'bg-brand text-white shadow-sm' : 'text-muted hover:' }`}
            onClick={() => setTab(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      {tab === 'explore' && (
        <>
          <div className="card stack gap-md p-lg">
            <div className="row flex-wrap gap-sm">
              <div className="field-wrap w-[220px] grow">
                <IconExplore size={18} className="field-icon" />
                <input
                  className="field field-has-icon"
                  placeholder="Search by fund, AMC or category"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </div>
              <div className="field-wrap">
                <IconFilter size={16} className="field-icon" />
                <select className="field field-has-icon w-auto" value={sort} onChange={(e) => setSort(e.target.value)}>
                  {SORTS.map(([id, label]) => <option key={id} value={id}>Sort: {label}</option>)}
                </select>
              </div>
            </div>

            <div className="grid gap-sm">
              <FilterSelect label="Category" value={category} onChange={updateCategory} options={filters.categories} />
              <FilterSelect label="Sub-category" value={subCategory} onChange={updateSubCategory} options={filters.subCategories} />
              <FilterSelect label="Risk" value={risk} onChange={setRisk} options={filters.risks} />
              <div>
                <span className="label">Minimum rating</span>
                <div className="row gap-xs">
                  {[0, 3, 4, 5].map((r) => (
                    <button
                      key={r}
                      type="button"
                      onClick={() => setMinRating(r)}
                      className={`grow rounded border py-md text-xs bold ${ minRating === r ? 'border-accent text-accent' : 'border-line text-muted hover:' }`}
                    >
                      {r === 0 ? 'Any' : `${r}★+`}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Comparison table on desktop */}
          <section className="card hidden overflow-hidden">
            <div className="grid grid-cols-[2.2fr_repeat(5,1fr)] border-b border px-lg py-md text-[10px] bold muted uppercase">
              <span>Fund</span>
              <span className="right">1Y</span>
              <span className="right">3Y</span>
              <span className="right">5Y</span>
              <span className="right">Fund size</span>
              <span className="right">Expense</span>
            </div>
            {funds.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => navigate(`/app/mf/${f.id}`)}
                className="grid w-full grid-cols-[2.2fr_repeat(5,1fr)] border-b border px-lg py-md last:border-0"
              >
                <div className="row min-w-0 gap-md">
                  <FundLogo name={f.amcShort} />
                  <div className="min-w-0">
                    <div className="truncate text-sm bold">{f.name}</div>
                    <div className="mt-sm row gap-sm text-[11px]">
                      <span className="muted">{f.subCategory}</span>
                      <Stars count={f.rating} />
                      <RiskBadge risk={f.risk} />
                    </div>
                  </div>
                </div>
                <Perf value={f.returns['1y']} />
                <Perf value={f.returns['3y']} />
                <Perf value={f.returns['5y']} />
                <span className="right mono text-xs">₹{formatINRShort(f.aum)} Cr</span>
                <span className="right mono text-xs">{f.expenseRatio}%</span>
              </button>
            ))}
            {funds.length === 0 && (
              <EmptyState
                art={EmptySearchArt}
                accent={PAGE_THEMES.mf.accent}
                title="No funds match these filters"
                message="Loosen the category, risk or rating filters to see more schemes."
              />
            )}
          </section>

          {/* Cards on mobile */}
          <div className="grid gap-md lg:hidden">
            {funds.map((f) => (
              <button
                key={f.id}
                type="button"
                className="card card-hover p-lg"
                onClick={() => navigate(`/app/mf/${f.id}`)}
              >
                <div className="row-start gap-md">
                  <div className="row min-w-0 gap-md">
                    <FundLogo name={f.amcShort} />
                    <div className="min-w-0">
                      <div className="truncate bold">{f.name}</div>
                      <div className="mt-sm text-xs muted">{f.subCategory} · {f.plan} {f.option}</div>
                      <div className="mt-sm row gap-sm text-[11px]">
                        <RiskBadge risk={f.risk} />
                        <Stars count={f.rating} />
                      </div>
                    </div>
                  </div>
                  <div className="shrink-0 right">
                    <div className="mono text-lg bold up">{f.returns['3y']}%</div>
                    <div className="text-[10px] bold muted">3Y CAGR</div>
                  </div>
                </div>
                <div className="mt-lg grid-3 border-t border">
                  <MiniMetric label="NAV" value={`₹${formatINR(f.nav)}`} />
                  <MiniMetric label="Fund size" value={`₹${formatINRShort(f.aum)} Cr`} />
                  <MiniMetric label="Expense" value={`${f.expenseRatio}%`} />
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {tab === 'portfolio' && (
        <div className="grid gap-lg">
          <section className="card overflow-hidden">
            <div className="border-b border px-lg py-md">
              <h3 className="row gap-sm extrabold">
                <span className="icon-chip icon-chip-sm">
                  <IconCoins size={15} />
                </span>
                Holdings
              </h3>
            </div>
            {holdings.length === 0 ? (
              <EmptyMf
                title="No mutual fund investments"
                body="Explore direct plans and start with as little as ₹100."
                onClick={() => setTab('explore')}
              />
            ) : (
              <div className="">
                {holdings.map((h) => (
                  <div key={h.id} className="p-lg">
                    <div className="row-start gap-md">
                      <button
                        type="button"
                        className="row min-w-0 gap-md"
                        onClick={() => navigate(`/app/mf/${h.fundId}`)}
                      >
                        <FundLogo name={h.amcShort} />
                        <div className="min-w-0">
                          <div className="truncate text-sm bold">{h.name}</div>
                          <div className="text-xs muted">{h.subCategory} · Held {h.holdingDays}d</div>
                        </div>
                      </button>
                      <div className="shrink-0 right">
                        <div className="mono text-sm bold">₹{formatINR(h.value)}</div>
                        <div className={`text-xs bold ${h.pnl >= 0 ? '' : ''}`}>
                          {h.pnl >= 0 ? '+' : ''}₹{formatINR(h.pnl)} ({h.pnlPct}%)
                        </div>
                      </div>
                    </div>
                    <div className="mt-md grid-4 gap-sm rounded px-lg py-md">
                      <MiniMetric label="Units" value={h.units.toFixed(3)} />
                      <MiniMetric label="Avg NAV" value={`₹${formatINR(h.avgNav)}`} />
                      <MiniMetric label="Current NAV" value={`₹${formatINR(h.nav)}`} />
                      <MiniMetric label="XIRR" value={h.xirr != null ? `${h.xirr}%` : '—'} />
                    </div>
                    <div className="mt-md row gap-sm">
                      <button
                        type="button"
                        className="btn btn-ghost grow text-xs"
                        onClick={() => { setRedeeming(h); setRedeemUnits(String(h.units)) }}
                      >
                        Redeem
                      </button>
                      <button
                        type="button"
                        className="btn btn-primary grow text-xs"
                        onClick={() => navigate(`/app/mf/${h.fundId}`)}
                      >
                        Invest more
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="card h-fit p-lg">
            <h3 className="mb-md row gap-sm extrabold">
              <span className="icon-chip icon-chip-sm">
                <IconPieChart size={15} />
              </span>
              Allocation
            </h3>
            {allocation.length === 0 ? (
              <p className="text-sm muted">Allocation appears once you hold funds.</p>
            ) : (
              <div className="row gap-lg">
                <Donut segments={allocation} />
                <div className="min-w-0 grow stack gap-1.5">
                  {allocation.map((a) => (
                    <div key={a.label} className="row gap-sm text-xs">
                      <span className="h-3 w-24 shrink-0 rounded" style={{ background: a.color }} />
                      <span className="min-w-0 grow truncate bold">{a.label}</span>
                      <span className="mono muted">{a.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="mt-lg stack gap-md border-t border text-sm">
              <SummaryLine label="Total invested" value={`₹${formatINR(portfolio.invested)}`} />
              <SummaryLine label="Current value" value={`₹${formatINR(portfolio.current)}`} />
              <SummaryLine
                label="Total returns"
                value={`${portfolio.pnl >= 0 ? '+' : ''}₹${formatINR(portfolio.pnl)}`}
                tone={portfolio.pnl >= 0 ? 'up' : 'down'}
              />
            </div>
          </section>
        </div>
      )}

      {tab === 'sips' && (
        <section className="grid gap-md">
          {sips.length === 0 ? (
            <div className="card">
              <EmptyMf
                art={EmptySipArt}
                title="No SIPs running"
                body="Automate investing with a monthly SIP from ₹100."
                onClick={() => setTab('explore')}
              />
            </div>
          ) : sips.map((sip) => (
            <div key={sip.id} className="card p-lg">
              <div className="row-start gap-md">
                <div className="row min-w-0 gap-md">
                  <FundLogo name={sip.amcShort} />
                  <div className="min-w-0">
                    <div className="truncate bold">{sip.name}</div>
                    <div className="text-xs muted">{sip.subCategory}</div>
                  </div>
                </div>
                <span className={`shrink-0 rounded px-lg py-md text-[10px] bold uppercase ${ sip.status === 'active' ? ' ' : sip.status === 'paused' ? 'bg-[#fff6e8] text-gold' : ' text-muted' }`}>{sip.status}</span>
              </div>

              <div className="mt-lg mono text-2xl bold">
                ₹{formatINR(sip.amount)}
                <span className="text-xs muted"> / month</span>
              </div>

              <div className="mt-md grid-3 gap-sm rounded px-lg py-md">
                <MiniMetric label="Debit date" value={`${sip.dayOfMonth}th`} />
                <MiniMetric label="Installments" value={String(sip.installmentsDone)} />
                <MiniMetric label="Next" value={sip.nextInstallment ? sip.nextInstallment.slice(5) : '—'} />
              </div>

              {editingSip === sip.id ? (
                <div className="mt-md row gap-sm">
                  <input
                    className="field"
                    type="number"
                    value={sipAmount}
                    onChange={(e) => setSipAmount(e.target.value)}
                    placeholder="New amount"
                  />
                  <button
                    type="button"
                    className="btn btn-primary shrink-0 text-xs"
                    onClick={() => updateSip(sip, { amount: Number(sipAmount) }, 'SIP amount updated')}
                  >
                    Save
                  </button>
                  <button type="button" className="btn btn-ghost shrink-0 text-xs" onClick={() => setEditingSip(null)}>
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="mt-md row flex-wrap gap-sm">
                  {sip.status !== 'cancelled' && (
                    <button
                      type="button"
                      className="btn btn-ghost grow text-xs"
                      onClick={() => { setEditingSip(sip.id); setSipAmount(String(sip.amount)) }}
                    >
                      Modify
                    </button>
                  )}
                  {sip.status === 'active' && (
                    <button type="button" className="btn btn-ghost grow text-xs" onClick={() => updateSip(sip, { status: 'paused' }, 'SIP paused')}>
                      Pause
                    </button>
                  )}
                  {sip.status === 'paused' && (
                    <button type="button" className="btn btn-primary grow text-xs" onClick={() => updateSip(sip, { status: 'active' }, 'SIP resumed')}>
                      Resume
                    </button>
                  )}
                  {sip.status !== 'cancelled' && (
                    <button type="button" className="btn btn-ghost grow text-xs down" onClick={() => updateSip(sip, { status: 'cancelled' }, 'SIP cancelled')}>
                      Cancel
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </section>
      )}

      {tab === 'transactions' && (
        <section className="card overflow-hidden">
          <div className="grid grid-cols-[1.8fr_1fr_1fr_1fr] border-b border px-lg py-md text-[10px] bold muted uppercase">
            <span>Fund</span>
            <span className="right">Amount</span>
            <span className="right">Units</span>
            <span className="right">NAV</span>
          </div>
          {transactions.length === 0 ? (
            <EmptyState
              art={EmptyFundsArt}
              accent={PAGE_THEMES.mf.accent}
              title="No mutual fund transactions yet"
              message="Purchases and redemptions will be listed here with NAV and units."
            />
          ) : transactions.map((t) => (
            <div key={t.id} className="grid grid-cols-[1.8fr_1fr_1fr_1fr] border-b border px-lg py-md last:border-0">
              <div className="min-w-0">
                <div className="truncate text-sm bold">{t.name}</div>
                <div className="text-xs">
                  <span className={t.type === 'purchase' ? 'font-bold up' : 'font-bold down'}>
                    {t.type === 'purchase' ? 'Purchase' : 'Redemption'}
                  </span>
                  <span className="muted"> · {new Date(t.createdAt).toLocaleDateString('en-IN')}</span>
                </div>
              </div>
              <span className="right mono text-sm">₹{formatINR(t.amount)}</span>
              <span className="right mono text-xs muted">{t.units.toFixed(3)}</span>
              <span className="right mono text-xs muted">₹{formatINR(t.nav)}</span>
            </div>
          ))}
        </section>
      )}

      {/* Redeem modal */}
      {redeeming && (
        <div className="fixed z-[90] grid p-lg">
          <div className="card w-full p-xl">
            <h2 className="text-lg extrabold">Redeem units</h2>
            <p className="mt-sm text-sm muted">{redeeming.name}</p>

            <div className="mt-lg grid-2 gap-md rounded px-lg py-md">
              <MiniMetric label="Units held" value={redeeming.units.toFixed(4)} />
              <MiniMetric label="Current NAV" value={`₹${formatINR(redeeming.nav)}`} />
            </div>

            <div className="mt-lg">
              <label className="label" htmlFor="redeem-units">Units to redeem</label>
              <input
                id="redeem-units"
                className="field mono"
                type="number"
                step="0.0001"
                value={redeemUnits}
                onChange={(e) => setRedeemUnits(e.target.value)}
              />
              <div className="mt-sm grid-4 gap-xs">
                {[25, 50, 75, 100].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    className="rounded border py-md text-[11px] bold muted"
                    onClick={() => setRedeemUnits(((redeeming.units * pct) / 100).toFixed(4))}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-md rounded px-lg py-md text-sm">
              <div className="row">
                <span className="muted">Estimated proceeds</span>
                <span className="mono bold">₹{formatINR(Number(redeemUnits || 0) * redeeming.nav)}</span>
              </div>
            </div>

            <p className="mt-sm text-[11px] muted">
              Exit load and capital gains tax may apply on redemption depending on your holding period.
            </p>

            <div className="mt-lg row gap-sm">
              <button type="button" className="btn btn-ghost grow" onClick={() => setRedeeming(null)}>Cancel</button>
              <button type="button" className="btn btn-primary grow" onClick={redeem}>Confirm redemption</button>
            </div>
          </div>
        </div>
      )}

      {!user?.kycComplete && (
        <button
          type="button"
          className="card card-hover row w-full /50 p-lg"
          onClick={() => navigate('/kyc')}
        >
          <div>
            <div className="bold">Complete KYC to invest in mutual funds</div>
            <div className="text-sm muted">Required by SEBI for all mutual fund transactions</div>
          </div>
          <span className="bold accent">Continue →</span>
        </button>
      )}
    </Screen>
  )
}

function HeroMetric({ label, value }) {
  return (
    <div className="rounded border p-1.5">
      <div className="text-[9px] bold uppercase">{label}</div>
      <div className="mt-sm mono text-sm bold">{value}</div>
    </div>
  )
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <div>
      <span className="label">{label}</span>
      <select className="field" value={value} onChange={(e) => onChange(e.target.value)}>
        <option value="All">All</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )
}

function Perf({ value }) {
  return (
    <span className={`right mono text-sm bold ${value >= 0 ? '' : ''}`}>
      {value >= 0 ? '+' : ''}{value}%
    </span>
  )
}

function MiniMetric({ label, value }) {
  return (
    <div>
      <div className="text-[9px] bold muted uppercase">{label}</div>
      <div className="mt-sm mono text-xs bold">{value}</div>
    </div>
  )
}

function SummaryLine({ label, value, tone }) {
  const color = tone === 'up' ? 'up' : tone === 'down' ? 'down' : ''
  return (
    <div className="row">
      <span className="muted">{label}</span>
      <span className={`mono bold ${color}`}>{value}</span>
    </div>
  )
}

function EmptyMf({ title, body, onClick, art = EmptyFundsArt }) {
  return (
    <EmptyState
      art={art}
      accent={PAGE_THEMES.mf.accent}
      title={title}
      message={body}
      action={
        <button type="button" className="btn btn-primary text-sm" onClick={onClick}>
          <IconCoins size={16} />
          Explore funds
        </button>
      }
    />
  )
}
