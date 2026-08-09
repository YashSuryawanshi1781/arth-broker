import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, formatINR, formatINRShort } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { setUser } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { FundLogo, Stars, RiskBadge, Riskometer, Donut, NavChart } from '../components/MfWidgets'
import { BreadcrumbBar } from '../components/BreadcrumbBar'
import { Screen } from '../components/Screen'
import { EmptyFundsArt } from '../components/Illustrations'
import { GrowthChart, GrowthDonut } from '../components/CalculatorWidgets'
import { buildProjection } from '../lib/projection'
import {
  IconCalculator,
  IconDocument,
  IconPieChart,
  IconShield,
  IconSparkles,
  IconTrendingUp,
} from '../components/Icons'

const RANGES = [
  ['1m', '1M'],
  ['3m', '3M'],
  ['6m', '6M'],
  ['1y', '1Y'],
  ['3y', '3Y'],
  ['5y', '5Y'],
]

const SECTOR_COLORS = ['#00a878', '#16325c', '#f59e0b', '#6366f1', '#06b6d4', '#94a3b8']

export function MfFundPage() {
  const { fundId } = useParams()
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const user = useAppSelector((s) => s.auth.user)

  const [detail, setDetail] = useState(null)
  const [history, setHistory] = useState([])
  const [range, setRange] = useState('1y')
  const [tab, setTab] = useState('performance')
  const [holding, setHolding] = useState(null)

  const [mode, setMode] = useState('sip')
  const [amount, setAmount] = useState('5000')
  const [sipDay, setSipDay] = useState(5)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!fundId) return
    api(`/mf/${fundId}`)
      .then((d) => {
        setDetail(d)
        setAmount(String(d.fund.minSip >= 1000 ? 5000 : 1000))
      })
      .catch(() => dispatch(showToast({ type: 'error', title: 'Fund not found', message: 'Could not load this fund' })))
    api('/mf/holdings')
      .then((d) => setHolding((d.holdings || []).find((h) => h.fundId === fundId) || null))
      .catch(() => {})
  }, [fundId, dispatch])

  useEffect(() => {
    if (!fundId) return
    api(`/mf/${fundId}/nav-history?range=${range}`)
      .then((d) => setHistory(d.history || []))
      .catch(() => {})
  }, [fundId, range])

  const fund = detail?.fund

  const sectorSegments = useMemo(() => {
    if (!fund) return []
    return fund.sectorAllocation.map((s, i) => ({
      label: s.sector,
      pct: s.pct,
      color: SECTOR_COLORS[i % SECTOR_COLORS.length],
    }))
  }, [fund])

  const projectedUnits = fund ? Number(amount || 0) / fund.nav : 0

  if (!fund) {
    return (
      <Screen theme="mf" className="stack gap-md">
        <BreadcrumbBar
          fallback="/app/mf"
          items={[
            { label: 'Mutual funds', to: '/app/mf' },
            { label: 'Loading…' },
          ]}
        />
        <div className="card grid p-8 center">
          <EmptyFundsArt accent="#4f46e5" width={170} height={128} className="" />
          <p className="bold">Loading fund…</p>
        </div>
      </Screen>
    )
  }

  const invest = async () => {
    if (!user?.kycComplete) {
      dispatch(showToast({ type: 'warning', title: 'KYC required', message: 'Complete KYC to invest in mutual funds' }))
      navigate('/kyc')
      return
    }
    const minimum = mode === 'sip' ? fund.minSip : fund.minLumpsum
    if (!(Number(amount) >= minimum)) {
      dispatch(showToast({ type: 'warning', title: `Minimum ₹${minimum}`, message: `Enter at least ₹${minimum} for this fund` }))
      return
    }

    setBusy(true)
    try {
      if (mode === 'lumpsum') {
        const data = await api('/mf/invest', { method: 'POST', body: { fundId: fund.id, amount: Number(amount) } })
        dispatch(setUser(data.user))
        dispatch(showToast({
          type: 'success',
          title: 'Investment successful',
          message: `${data.units} units of ${fund.name} allotted at NAV ₹${data.nav}`,
        }))
        api('/mf/holdings')
          .then((d) => setHolding((d.holdings || []).find((h) => h.fundId === fundId) || null))
          .catch(() => {})
      } else {
        await api('/mf/sips', { method: 'POST', body: { fundId: fund.id, amount: Number(amount), dayOfMonth: Number(sipDay) } })
        dispatch(showToast({
          type: 'success',
          title: 'SIP registered',
          message: `₹${formatINR(amount)} will be invested on the ${sipDay}th of every month`,
        }))
      }
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Transaction failed', message: err.message }))
    } finally {
      setBusy(false)
    }
  }

  const navUp = fund.navChange >= 0
  const categoryHref = fund.subCategory
    ? `/app/mf?subCategory=${encodeURIComponent(fund.subCategory)}`
    : '/app/mf'

  return (
    <Screen theme="mf" className="stack gap-md">
      <BreadcrumbBar
        fallback={categoryHref}
        items={[
          { label: 'Mutual funds', to: '/app/mf' },
          { label: fund.subCategory || fund.category || 'Funds', to: categoryHref },
          { label: fund.amcShort || fund.name },
        ]}
      />

      {/* Fund header */}
      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-start justify-between gap-4 p-5">
          <div className="flex gap-4">
            <FundLogo name={fund.amcShort} size="lg" />
            <div>
              <h1 className="text-xl font-extrabold tracking-tight">{fund.name}</h1>
              <p className="mt-0.5 text-sm text-muted">
                {fund.plan} · {fund.option} · {fund.amc}
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                <span className="rounded-lg bg-surface-2 px-2 py-0.5 font-bold text-muted">{fund.category}</span>
                <Link
                  to={categoryHref}
                  className="rounded-lg bg-surface-2 px-2 py-0.5 font-bold text-muted transition hover:bg-page-tint hover:text-page-accent"
                >
                  {fund.subCategory}
                </Link>
                <RiskBadge risk={fund.risk} />
                <Stars count={fund.rating} />
                <span className="text-muted">CRISIL Rank {fund.crisilRank}</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Current NAV</div>
            <div className="font-mono text-3xl font-bold">₹{formatINR(fund.nav)}</div>
            <div className={`text-sm font-bold ${navUp ? 'text-up' : 'text-down'}`}>
              {navUp ? '+' : ''}{fund.navChange}% today
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-y divide-line border-t border-line sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
          <Quote label="1Y return" value={`${fund.returns['1y']}%`} tone={fund.returns['1y'] >= 0 ? 'up' : 'down'} />
          <Quote label="3Y CAGR" value={`${fund.returns['3y']}%`} tone="up" />
          <Quote label="5Y CAGR" value={`${fund.returns['5y']}%`} tone="up" />
          <Quote label="Fund size" value={`₹${formatINRShort(fund.aum)} Cr`} />
          <Quote label="Expense ratio" value={`${fund.expenseRatio}%`} />
          <Quote label="Exit load" value={fund.exitLoad === 'Nil' ? 'Nil' : '1–2%'} />
        </div>
      </section>

      <div className="grid gap-lg">
        <div className="stack gap-md">
          {/* NAV chart */}
          <section className="card p-lg">
            <div className="mb-md row flex-wrap gap-sm">
              <h3 className="extrabold">NAV performance</h3>
              <div className="row">
                {RANGES.map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setRange(id)}
                    className={`rounded-md px-2.5 py-1 font-mono text-xs font-semibold transition ${
                      range === id ? 'bg-surface-2 text-ink' : 'text-muted hover:text-ink'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <NavChart data={history} />
          </section>

          <section className="card overflow-hidden">
            <div className="flex gap-1 overflow-x-auto border-b border-line px-2 pt-2">
              {[
                ['performance', 'Performance', IconTrendingUp],
                ['calculator', 'Calculator', IconCalculator],
                ['portfolio', 'Portfolio', IconPieChart],
                ['risk', 'Risk analysis', IconShield],
                ['details', 'Fund details', IconDocument],
                ['tax', 'Tax & charges', IconSparkles],
              ].map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`flex items-center gap-1.5 whitespace-nowrap border-b-2 px-3 pt-1 pb-2.5 text-sm font-bold transition ${
                    tab === id ? 'border-accent text-ink' : 'border-transparent text-muted hover:text-ink'
                  }`}
                >
                  <Icon size={15} />
                  {label}
                </button>
              ))}
            </div>

            <div className="p-4 md:p-5">
              {tab === 'performance' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 text-sm font-bold tracking-tight">Trailing returns</h4>
                    <div className="overflow-x-auto rounded-xl border border-line">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="bg-surface-2/80 text-[10px] font-bold tracking-wide text-muted uppercase">
                            <th className="px-4 py-2.5 text-left">Period</th>
                            <th className="px-4 py-2.5 text-right">This fund</th>
                            <th className="px-4 py-2.5 text-right">Benchmark</th>
                            <th className="px-4 py-2.5 text-right">Category avg</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {[
                            ['1 month', fund.returns['1m'], null, null],
                            ['3 months', fund.returns['3m'], null, null],
                            ['6 months', fund.returns['6m'], null, null],
                            ['1 year', fund.returns['1y'], fund.benchmarkReturns['1y'], fund.categoryReturns['1y']],
                            ['3 years', fund.returns['3y'], fund.benchmarkReturns['3y'], fund.categoryReturns['3y']],
                            ['5 years', fund.returns['5y'], fund.benchmarkReturns['5y'], fund.categoryReturns['5y']],
                            ['Since launch', fund.returns.all, null, null],
                          ].map(([label, self, bench, cat]) => (
                            <tr key={label} className="border-t border-line transition hover:bg-surface-2/50">
                              <td className="px-4 py-2.5 font-sans text-muted">{label}</td>
                              <td className={`px-4 py-2.5 text-right font-bold ${self >= 0 ? 'text-up' : 'text-down'}`}>
                                {self >= 0 ? '+' : ''}{self}%
                              </td>
                              <td className="px-4 py-2.5 text-right text-muted">{bench != null ? `${bench}%` : '—'}</td>
                              <td className="px-4 py-2.5 text-right text-muted">{cat != null ? `${cat}%` : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    <p className="mt-2 text-[11px] text-muted">
                      Returns up to 1 year are absolute; beyond 1 year they are compounded annually (CAGR).
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-3 text-sm font-bold tracking-tight">If you had invested in this fund</h4>
                    <div className="grid gap-3 sm:grid-cols-3">
                      {['1y', '3y', '5y'].map((key) => {
                        const g = detail.growth[key]
                        const gain = g.sipValue - g.sipInvested
                        return (
                          <div
                            key={key}
                            className="rounded-xl border border-line bg-gradient-to-b from-surface to-surface-2/40 p-4 shadow-sm"
                          >
                            <div className="text-[10px] font-bold tracking-wide text-muted uppercase">
                              ₹10,000 SIP · {key.toUpperCase()}
                            </div>
                            <div className="mt-2 font-mono text-xl font-bold tracking-tight">
                              ₹{formatINRShort(g.sipValue)}
                            </div>
                            <div className="mt-1 text-[11px] text-muted">
                              Invested ₹{formatINRShort(g.sipInvested)}
                            </div>
                            <div className="mt-2 inline-flex rounded-md bg-up-bg px-2 py-0.5 text-xs font-bold text-up">
                              +₹{formatINRShort(gain)} gain
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'calculator' && <FundCalculator fund={fund} />}

              {tab === 'portfolio' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 text-sm font-bold tracking-tight">Asset allocation</h4>
                    <div className="space-y-3">
                      <AllocationBar label="Equity" pct={fund.assetAllocation.equity} color="#00a878" />
                      <AllocationBar label="Debt" pct={fund.assetAllocation.debt} color="#16325c" />
                      <AllocationBar label="Cash & equivalents" pct={fund.assetAllocation.cash} color="#94a3b8" />
                    </div>
                  </div>

                  {fund.marketCapAllocation.large > 0 && (
                    <div>
                      <h4 className="mb-3 text-sm font-bold tracking-tight">Market cap allocation</h4>
                      <div className="space-y-3">
                        <AllocationBar label="Large cap" pct={fund.marketCapAllocation.large} color="#16325c" />
                        <AllocationBar label="Mid cap" pct={fund.marketCapAllocation.mid} color="#6366f1" />
                        <AllocationBar label="Small cap" pct={fund.marketCapAllocation.small} color="#f59e0b" />
                      </div>
                    </div>
                  )}

                  <div>
                    <h4 className="mb-3 text-sm font-bold tracking-tight">Sector breakdown</h4>
                    <div className="flex flex-wrap items-center gap-4">
                      <Donut segments={sectorSegments} size="h-28 w-28" />
                      <div className="min-w-[200px] flex-1 space-y-1.5">
                        {sectorSegments.map((s) => (
                          <div key={s.label} className="flex items-center gap-2 text-xs">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: s.color }} />
                            <span className="min-w-0 flex-1 truncate text-muted">{s.label}</span>
                            <span className="font-mono font-bold">{s.pct}%</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-bold tracking-tight">Top holdings</h4>
                    <div className="overflow-hidden rounded-xl border border-line">
                      {fund.topHoldings.map((h) => (
                        <div key={h.name} className="flex items-center justify-between gap-3 border-b border-line px-4 py-2.5 last:border-0 hover:bg-surface-2/50">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-bold">{h.name}</div>
                            <div className="text-[11px] text-muted">{h.sector}</div>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-2">
                              <div className="h-full rounded-full bg-accent" style={{ width: `${(h.pct / 12) * 100}%` }} />
                            </div>
                            <span className="w-12 text-right font-mono text-sm font-bold">{h.pct}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                    <p className="mt-2 text-[11px] text-muted">
                      Portfolio turnover ratio: {fund.turnoverRatio}% · Holdings are indicative for demonstration.
                    </p>
                  </div>
                </div>
              )}

              {tab === 'risk' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-3 text-sm font-bold tracking-tight">Riskometer</h4>
                    <Riskometer level={fund.riskometer} />
                    <p className="mt-3 text-xs text-muted">
                      Investors understand that their principal will be at <strong className="text-ink">{fund.risk.toLowerCase()}</strong> risk.
                    </p>
                  </div>

                  <div>
                    <h4 className="mb-3 text-sm font-bold tracking-tight">Risk-adjusted metrics (3 year)</h4>
                    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      <MetricCard label="Alpha" value={fund.riskMetrics.alpha} hint="Excess return vs benchmark" />
                      <MetricCard label="Beta" value={fund.riskMetrics.beta} hint="Volatility vs market" />
                      <MetricCard label="Sharpe ratio" value={fund.riskMetrics.sharpe} hint="Return per unit of risk" />
                      <MetricCard label="Sortino ratio" value={fund.riskMetrics.sortino} hint="Return per unit of downside risk" />
                      <MetricCard label="Std deviation" value={`${fund.riskMetrics.stdDev}%`} hint="Dispersion of returns" />
                      <MetricCard label="Turnover" value={`${fund.turnoverRatio}%`} hint="Portfolio churn per year" />
                    </div>
                  </div>

                  <div className="rounded-xl bg-surface-2/60 px-4 py-3 text-xs leading-relaxed text-muted">
                    An alpha above zero means the fund has outperformed its benchmark after adjusting for risk.
                    A beta below 1 indicates the fund has historically been less volatile than its benchmark.
                  </div>
                </div>
              )}

              {tab === 'details' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-2 text-sm font-bold tracking-tight">Investment objective</h4>
                    <p className="text-sm leading-relaxed text-muted">{fund.objective}</p>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-bold tracking-tight">Fund managers</h4>
                    <div className="space-y-2">
                      {fund.managers.map((m) => (
                        <div key={m.name} className="flex items-center gap-3 rounded-xl border border-line p-3">
                          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-surface-2 text-xs font-bold text-muted">
                            {m.name.split(' ').map((p) => p[0]).join('')}
                          </span>
                          <div>
                            <div className="text-sm font-bold">{m.name}</div>
                            <div className="text-[11px] text-muted">{m.qualification} · Managing since {m.since}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="overflow-hidden rounded-xl border border-line px-4">
                    <DetailRow label="Benchmark" value={fund.benchmark} />
                    <DetailRow label="Launch date" value={fund.launchDate} />
                    <DetailRow label="Fund size (AUM)" value={`₹${formatINRShort(fund.aum)} Cr`} />
                    <DetailRow label="Expense ratio" value={`${fund.expenseRatio}% (category ${fund.categoryExpense}%)`} />
                    <DetailRow label="Minimum SIP" value={`₹${formatINR(fund.minSip)}`} />
                    <DetailRow label="Minimum lumpsum" value={`₹${formatINR(fund.minLumpsum)}`} />
                    <DetailRow label="Lock-in period" value={fund.lockIn} />
                    <DetailRow label="Plan" value={`${fund.plan} · ${fund.option}`} />
                  </div>
                </div>
              )}

              {tab === 'tax' && (
                <div className="space-y-6">
                  <div>
                    <h4 className="mb-2 text-sm font-bold tracking-tight">Exit load</h4>
                    <p className="rounded-xl border border-line p-3 text-sm text-muted">{fund.exitLoad}</p>
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-bold tracking-tight">Taxation</h4>
                    {fund.taxation === 'equity' ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TaxCard
                          title="Short term capital gains"
                          period="Units held under 1 year"
                          rate="20%"
                        />
                        <TaxCard
                          title="Long term capital gains"
                          period="Units held over 1 year"
                          rate="12.5% above ₹1.25L gains per year"
                        />
                      </div>
                    ) : (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <TaxCard
                          title="All capital gains"
                          period="Any holding period"
                          rate="Taxed at your income slab rate"
                        />
                        <TaxCard
                          title="Indexation benefit"
                          period="Post April 2023 investments"
                          rate="Not available"
                        />
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="mb-2 text-sm font-bold tracking-tight">Charges on Arth</h4>
                    <div className="overflow-hidden rounded-xl border border-line px-4">
                      <DetailRow label="Commission" value="₹0 (direct plan)" />
                      <DetailRow label="Transaction charges" value="₹0" />
                      <DetailRow label="Account maintenance" value="₹0" />
                      <DetailRow label="Expense ratio (by AMC)" value={`${fund.expenseRatio}% per year`} />
                    </div>
                  </div>

                  <p className="rounded-xl bg-surface-2/60 px-4 py-3 text-xs text-muted">
                    Tax rates shown are indicative for resident individuals and may change with the Finance Act.
                    Please consult a tax advisor for your specific situation.
                  </p>
                </div>
              )}
            </div>
          </section>

          {detail.peers.length > 0 && (
            <section className="card overflow-hidden">
              <div className="border-b border-line px-lg py-md">
                <h3 className="extrabold">Similar {detail.peerScope || fund.subCategory} funds</h3>
              </div>
              <div className="">
                {detail.peers.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    className="flex w-full items-center justify-between px-4 py-3 text-left transition hover:bg-surface-2/60"
                    onClick={() => navigate(`/app/mf/${p.id}`)}
                  >
                    <div className="row min-w-0 gap-md">
                      <FundLogo name={p.amcShort} />
                      <div className="min-w-0">
                        <div className="truncate text-sm bold">{p.name}</div>
                        <div className="text-[11px] muted">
                          {p.subCategory} · Expense {p.expenseRatio}%
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 right">
                      <div className="font-mono text-sm font-bold text-up">{p.returns['3y']}%</div>
                      <div className="text-[10px] muted">3Y CAGR</div>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}
        </div>

        {/* Invest panel */}
        <div className="stack gap-md">
          {holding && (
            <section className="card p-lg">
              <div className="row-between">
                <h3 className="text-sm extrabold">Your investment</h3>
                <span className="rounded px-lg text-[10px] bold muted">HOLDING</span>
              </div>
              <div className="mt-md grid-2 gap-md">
                <PositionStat label="Current value" value={`₹${formatINR(holding.value)}`} />
                <PositionStat label="Invested" value={`₹${formatINR(holding.invested)}`} />
                <PositionStat label="Units" value={holding.units.toFixed(3)} />
                <PositionStat
                  label="Returns"
                  value={`${holding.pnl >= 0 ? '+' : ''}₹${formatINR(holding.pnl)}`}
                  tone={holding.pnl >= 0 ? 'up' : 'down'}
                />
              </div>
            </section>
          )}

          <section className="card overflow-hidden">
            <div className="grid grid-cols-2">
              <button
                type="button"
                className={`py-3 text-sm font-extrabold transition ${mode === 'sip' ? 'bg-accent text-white' : 'bg-surface-2 text-muted hover:text-ink'}`}
                onClick={() => setMode('sip')}
              >
                MONTHLY SIP
              </button>
              <button
                type="button"
                className={`py-3 text-sm font-extrabold transition ${mode === 'lumpsum' ? 'bg-accent text-white' : 'bg-surface-2 text-muted hover:text-ink'}`}
                onClick={() => setMode('lumpsum')}
              >
                ONE-TIME
              </button>
            </div>

            <div className="stack gap-1.5 p-lg">
              <div>
                <label className="label" htmlFor="mf-amount">
                  {mode === 'sip' ? 'Monthly amount' : 'Investment amount'}
                </label>
                <input
                  id="mf-amount"
                  className="field mono bold"
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <div className="mt-sm grid-4 gap-xs">
                  {(mode === 'sip' ? [1000, 2500, 5000, 10000] : [5000, 10000, 25000, 50000]).map((n) => (
                    <button
                      key={n}
                      type="button"
                      className={`rounded border py-md text-[11px] bold ${ Number(amount) === n ? 'border-accent bg-up-bg text-accent' : 'border-line text-muted hover:bg-surface-2' }`}
                      onClick={() => setAmount(String(n))}
                    >
                      {n >= 1000 ? `${n / 1000}k` : n}
                    </button>
                  ))}
                </div>
              </div>

              {mode === 'sip' && (
                <div>
                  <label className="label" htmlFor="mf-sip-day">Monthly debit date</label>
                  <select id="mf-sip-day" className="field" value={sipDay} onChange={(e) => setSipDay(e.target.value)}>
                    {[1, 5, 10, 15, 20, 25].map((d) => (
                      <option key={d} value={d}>{d}th of every month</option>
                    ))}
                  </select>
                </div>
              )}

              <div className="rounded border">
                <SummaryRow
                  label={mode === 'sip' ? 'Monthly investment' : 'Investment amount'}
                  value={`₹${formatINR(Number(amount || 0))}`}
                />
                {mode === 'lumpsum' && (
                  <>
                    <SummaryRow label="NAV" value={`₹${formatINR(fund.nav)}`} />
                    <SummaryRow label="Units allotted (approx)" value={projectedUnits.toFixed(4)} strong />
                  </>
                )}
                {mode === 'sip' && (
                  <>
                    <SummaryRow label="Minimum SIP" value={`₹${formatINR(fund.minSip)}`} />
                    <SummaryRow label="First debit" value={`${sipDay}th of next month`} strong />
                  </>
                )}
                <SummaryRow label="Available cash" value={`₹${formatINR(user?.cash)}`} />
              </div>

              {mode === 'sip' && (
                <div className="rounded px-lg py-md text-xs">
                  <div className="bold accent">
                    Projected value in 10 years: ₹{formatINRShort(sipProjection(Number(amount || 0), fund.returns['5y'], 10))}
                  </div>
                  <div className="mt-sm muted">
                    Assuming {fund.returns['5y']}% annual returns, the fund&apos;s 5-year CAGR.
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={busy}
                className="btn btn-primary w-full py-md"
                onClick={invest}
              >
                {busy ? 'Processing…' : mode === 'sip' ? 'Start SIP' : 'Invest now'}
              </button>

              <p className="row-center gap-sm center text-[10px] muted">
                <IconShield size={13} className="text-page-accent" />
                Direct plan · Zero commission · Simulated transaction
              </p>
            </div>
          </section>
        </div>
      </div>
    </Screen>
  )
}

function sipProjection(monthly, annualPct, years) {
  const months = years * 12
  const rate = (1 + annualPct / 100) ** (1 / 12) - 1
  return monthly * (((1 + rate) ** months - 1) / rate) * (1 + rate)
}

/**
 * Calculator seeded with this fund's own track record, so the projection
 * reflects what the scheme has actually delivered rather than a generic rate.
 */
function FundCalculator({ fund }) {
  const basisOptions = useMemo(() => [
    { id: '1y', label: '1Y return', rate: fund.returns['1y'] },
    { id: '3y', label: '3Y CAGR', rate: fund.returns['3y'] },
    { id: '5y', label: '5Y CAGR', rate: fund.returns['5y'] },
    { id: 'all', label: 'Since launch', rate: fund.returns.all },
    { id: 'category', label: 'Category avg', rate: fund.categoryReturns?.['5y'] },
    { id: 'benchmark', label: 'Benchmark', rate: fund.benchmarkReturns?.['5y'] },
  ].filter((option) => Number.isFinite(option.rate)), [fund])

  const [basis, setBasis] = useState('5y')
  const [mode, setMode] = useState('sip')
  const [amount, setAmount] = useState(() => Math.max(fund.minSip || 500, 5000))
  const [years, setYears] = useState(10)

  const activeBasis = basisOptions.find((option) => option.id === basis) || basisOptions[0]
  const rate = activeBasis?.rate ?? 12
  const minimum = mode === 'sip' ? fund.minSip : fund.minLumpsum
  const belowMinimum = amount < minimum

  const result = useMemo(
    () => buildProjection({ mode, amount, years, rate }),
    [mode, amount, years, rate],
  )

  return (
    <div className="stack gap-md">
      <div>
        <h4 className="text-sm bold">Project this fund&apos;s returns</h4>
        <p className="mt-sm text-xs muted">
          Every figure below comes from {fund.name}&apos;s own performance history.
        </p>
      </div>

      <div className="row flex-wrap gap-sm">
        {basisOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            onClick={() => setBasis(option.id)}
            className={`rounded-xl border px-3 py-1.5 text-left transition ${basis === option.id ? 'border-page-accent bg-page-tint' : 'border-line bg-surface hover:border-page-accent/40'}`}
          >
            <span className="block text-[10px] bold muted uppercase">{option.label}</span>
            <span className={`block mono text-sm bold ${option.rate >= 0 ? 'text-up' : 'text-down'}`}>
              {option.rate >= 0 ? '+' : ''}{option.rate}%
            </span>
          </button>
        ))}
      </div>

      <div className="grid gap-lg">
        <div className="stack gap-md">
          <div className="flex gap-1 rounded-xl bg-surface-2 p-1">
            {[['sip', 'Monthly SIP'], ['lumpsum', 'One-time']].map(([id, label]) => (
              <button
                key={id}
                type="button"
                onClick={() => setMode(id)}
                className={`flex-1 rounded-lg px-3 py-1.5 text-xs font-bold transition ${mode === id ? 'bg-white text-ink shadow-sm' : 'text-muted'}`}
              >
                {label}
              </button>
            ))}
          </div>

          <div>
            <div className="mb-sm row-between gap-sm">
              <span className="text-sm bold">
                {mode === 'sip' ? 'Monthly investment' : 'One-time investment'}
              </span>
              <span className="rounded-lg bg-up-bg px-2.5 py-1 font-mono text-sm font-bold text-up">
                ₹{formatINR(amount)}
              </span>
            </div>
            <input
              type="range"
              className="w-full accent-[#4f46e5]"
              min={minimum}
              max={mode === 'sip' ? 100000 : 2000000}
              step={mode === 'sip' ? 500 : 5000}
              value={Math.max(amount, minimum)}
              onChange={(e) => setAmount(Number(e.target.value))}
            />
            <div className="mt-sm row text-[10px] muted">
              <span>Min ₹{formatINR(minimum)}</span>
              <span>₹{formatINRShort(mode === 'sip' ? 100000 : 2000000)}</span>
            </div>
          </div>

          <div>
            <div className="mb-sm row-between gap-sm">
              <span className="text-sm bold">Investment period</span>
              <span className="rounded-lg bg-up-bg px-2.5 py-1 font-mono text-sm font-bold text-up">
                {years} {years === 1 ? 'year' : 'years'}
              </span>
            </div>
            <input
              type="range"
              className="w-full accent-[#4f46e5]"
              min={1}
              max={30}
              step={1}
              value={years}
              onChange={(e) => setYears(Number(e.target.value))}
            />
          </div>

          {belowMinimum && (
            <p className="rounded px-lg py-md text-xs font-bold text-down">
              Minimum {mode === 'sip' ? 'SIP' : 'lumpsum'} for this fund is ₹{formatINR(minimum)}.
            </p>
          )}
        </div>

        <div className="rounded border border-line bg-surface-2/50 p-lg">
          <GrowthDonut invested={result.invested} gain={result.gain} size={150} thickness={17} />
          <div className="mt-lg border-t border-line">
            <div className="text-[10px] bold muted uppercase">Projected value</div>
            <div className="mt-sm mono text-2xl bold">₹{formatINR(result.value)}</div>
            <div className="mt-sm text-xs muted">
              at {rate}% p.a. ({activeBasis?.label}) over {years} {years === 1 ? 'year' : 'years'}
            </div>
          </div>
        </div>
      </div>

      <div>
        <h4 className="mb-sm text-sm bold">Growth projection</h4>
        <GrowthChart schedule={result.schedule} height={240} />
      </div>

      <div className="grid-2 gap-sm">
        <MiniStat label="Invested" value={`₹${formatINRShort(result.invested)}`} />
        <MiniStat label="Est. returns" value={`₹${formatINRShort(result.gain)}`} tone="up" />
        <MiniStat label="Total value" value={`₹${formatINRShort(result.value)}`} />
        <MiniStat
          label="Wealth gain"
          value={`${((result.gain / (result.invested || 1)) * 100).toFixed(0)}%`}
          tone="up"
        />
      </div>

      <div className="row flex-wrap gap-sm">
        <Link to={`/app/mf/calculator?fund=${fund.id}`} className="btn btn-ghost text-sm">
          <IconCalculator size={15} />
          Advanced calculator
        </Link>
      </div>

      <p className="rounded px-lg py-md text-xs leading-relaxed muted">
        Past performance does not guarantee future returns. This projection compounds the selected historical
        rate at a constant pace; real NAV movement will vary year to year.
      </p>
    </div>
  )
}

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-line px-3 py-2">
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${tone === 'up' ? 'text-up' : ''}`}>{value}</div>
    </div>
  )
}

function Quote({ label, value, tone }) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink'
  return (
    <div className="px-3 py-2.5">
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${color}`}>{value}</div>
    </div>
  )
}

function AllocationBar({ label, pct, color }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="font-semibold">{label}</span>
        <span className="font-mono font-bold">{pct}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-surface-2">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
    </div>
  )
}

function MetricCard({ label, value, hint }) {
  return (
    <div className="rounded-xl bg-surface-2 px-3 py-2.5">
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{label}</div>
      <div className="mt-0.5 font-mono text-lg font-bold">{value}</div>
      <div className="mt-0.5 text-[10px] text-muted">{hint}</div>
    </div>
  )
}

function TaxCard({ title, period, rate }) {
  return (
    <div className="rounded-xl border border-line p-3">
      <div className="text-sm font-bold">{title}</div>
      <div className="mt-0.5 text-[11px] text-muted">{period}</div>
      <div className="mt-2 font-mono text-sm font-bold text-accent">{rate}</div>
    </div>
  )
}

function DetailRow({ label, value }) {
  return (
    <div className="flex items-center justify-between border-b border-line py-2.5 text-sm last:border-0">
      <span className="text-muted">{label}</span>
      <span className="text-right font-semibold">{value}</span>
    </div>
  )
}

function PositionStat({ label, value, tone }) {
  const color = tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink'
  return (
    <div>
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${color}`}>{value}</div>
    </div>
  )
}

function SummaryRow({ label, value, strong }) {
  return (
    <div className="flex justify-between border-b border-line px-3 py-2 text-xs last:border-0">
      <span className="text-muted">{label}</span>
      <span className={`font-mono ${strong ? 'font-bold' : ''}`}>{value}</span>
    </div>
  )
}
