import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatINR } from '../lib/api'
import { useLiveMarket } from '../hooks/useLiveMarket'
import { enrichHoldings, portfolioTotals } from '../lib/livePortfolio'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { setUser } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { EmptyState, PageHeader, Screen } from '../components/Screen'
import { EmptyPortfolioArt, EmptySipArt, EmptyFundsArt } from '../components/Illustrations'
import {
  IconBriefcase,
  IconCandles,
  IconCoins,
  IconList,
  IconRocket,
  IconSparkles,
} from '../components/Icons'
import { PAGE_THEMES } from '../lib/theme'

export function InvestmentsPage() {
  const [holdings, setHoldings] = useState([])
  const [positions, setPositions] = useState([])
  const [mf, setMf] = useState([])
  const [sips, setSips] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [goals, setGoals] = useState([])
  const [dividends, setDividends] = useState(null)
  const [goalForm, setGoalForm] = useState({ name: '', targetAmount: '', monthlySip: '' })
  const [squaring, setSquaring] = useState(false)
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const market = useLiveMarket(500)

  const load = () => {
    api('/portfolio/holdings').then((d) => setHoldings(d.holdings || [])).catch(() => {})
    api('/portfolio/positions').then((d) => setPositions(d.positions || [])).catch(() => {})
    api('/mf/holdings').then((d) => setMf(d.holdings || [])).catch(() => {})
    api('/mf/sips').then((d) => setSips(d.sips || [])).catch(() => {})
    api('/portfolio/analytics').then(setAnalytics).catch(() => {})
    api('/goals').then((d) => setGoals(d.goals || [])).catch(() => {})
    api('/portfolio/dividends').then(setDividends).catch(() => {})
  }

  useEffect(load, [])

  const liveHoldings = useMemo(
    () => enrichHoldings(holdings, market.instruments).sort((a, b) => b.value - a.value),
    [holdings, market.instruments],
  )
  const totals = useMemo(
    () => portfolioTotals(liveHoldings, user?.cash || 0),
    [liveHoldings, user?.cash],
  )
  const mfInvested = mf.reduce((sum, holding) => sum + (holding.invested ?? holding.avgNav * holding.units), 0)
  const mfCurrent = mf.reduce((sum, holding) => sum + holding.value, 0)

  const feedLabel = !market.connected
    ? 'Feed offline'
    : market.status?.source === 'yahoo'
      ? 'Yahoo Finance'
      : market.status?.source === 'yahoo-stale'
        ? 'Yahoo data stale'
        : 'Demo fallback'

  return (
    <Screen theme="investments" className="space-y-5">
      <PageHeader
        icon={IconBriefcase}
        eyebrow="Portfolio"
        title="Investments"
        subtitle={
          <>
            Holdings & positions · live feed{' · '}
            <span className={market.connected && market.status?.source === 'yahoo' ? 'font-bold text-up' : 'font-bold text-down'}>
              {feedLabel}
            </span>
          </>
        }
        actions={
          <>
            <Link to="/app/mf" className="btn btn-ghost text-sm">
              <IconCoins size={16} />
              Mutual funds
            </Link>
            <Link to="/app/ipo" className="btn btn-ghost text-sm">
              <IconRocket size={16} />
              IPOs
            </Link>
            <Link to="/app/orders" className="btn btn-primary text-sm">
              <IconList size={16} />
              Orders
            </Link>
          </>
        }
      />

      <section className="card overflow-hidden">
        <div className="hero-mesh grid gap-5 px-5 py-5 text-white md:grid-cols-[1.2fr_1fr] md:px-7">
          <div>
            <p className="text-[11px] font-bold tracking-[0.16em] text-white/50 uppercase">Equity portfolio</p>
            <div className="mt-2 font-mono text-3xl font-bold">₹{formatINR(totals.current)}</div>
            <div className={`mt-2 text-sm font-bold ${totals.pnl >= 0 ? 'text-[#7dffc8]' : 'text-[#ff9d9d]'}`}>
              {totals.pnl >= 0 ? '+' : ''}₹{formatINR(totals.pnl)} ({totals.pnlPct.toFixed(2)}%) overall
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 self-end">
            <HeroMetric label="Invested" value={`₹${formatINR(totals.invested)}`} />
            <HeroMetric
              label="Today's P&L"
              value={`${totals.dayPnl >= 0 ? '+' : ''}₹${formatINR(totals.dayPnl)}`}
              tone={totals.dayPnl >= 0 ? 'up' : 'down'}
            />
            <HeroMetric label="XIRR" value={analytics?.xirrPct != null ? `${analytics.xirrPct}%` : '—'} />
          </div>
        </div>
      </section>

      {dividends && (
        <section className="card flex flex-wrap items-center gap-4 px-4 py-3">
          <div>
            <div className="text-[10px] font-bold tracking-wide text-muted uppercase">Projected dividends</div>
            <div className="font-mono text-xl font-bold">₹{formatINR(dividends.totalProjected || 0)}</div>
            <div className="text-xs text-muted">~{dividends.portfolioYieldPct || 0}% portfolio yield (demo)</div>
          </div>
          <div className="flex flex-1 flex-wrap gap-2">
            {(dividends.dividends || []).slice(0, 6).map((d) => (
              <span key={d.symbol} className="rounded-xl border border-line bg-surface-2/60 px-3 py-1.5 text-xs">
                <span className="font-mono font-bold">{d.symbol}</span>
                {' '}
                <span className="text-muted">₹{formatINR(d.projectedAnnual)} · {d.yieldPct}%</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
          <div>
            <h3 className="font-extrabold tracking-tight">Intraday positions (MIS)</h3>
            <p className="text-xs text-muted">Auto square-off near 15:20 IST</p>
          </div>
          <button
            type="button"
            className="btn btn-ghost text-sm"
            disabled={squaring || !positions.length}
            onClick={async () => {
              setSquaring(true)
              try {
                const data = await api('/portfolio/positions/square-off', { method: 'POST' })
                if (data.user) dispatch(setUser(data.user))
                dispatch(showToast({ type: 'success', title: 'Squared off', message: `${data.squared || 0} position(s)` }))
                load()
              } catch (err) {
                dispatch(showToast({ type: 'error', title: 'Square-off failed', message: err.message }))
              } finally {
                setSquaring(false)
              }
            }}
          >
            {squaring ? 'Squaring…' : 'Square off all'}
          </button>
        </div>
        {positions.length === 0 ? (
          <p className="px-4 py-6 text-sm text-muted">No open MIS positions.</p>
        ) : (
          positions.map((p) => {
            const up = (p.pnl || 0) >= 0
            return (
              <Link
                key={p.symbol}
                to={`/app/stocks/${p.symbol}`}
                className="flex w-full items-center justify-between border-b border-line px-4 py-3 transition last:border-b-0 hover:bg-surface-2/70"
              >
                <div>
                  <div className="font-mono font-bold">{p.symbol}</div>
                  <div className="text-xs text-muted">{p.qty} qty · avg ₹{formatINR(p.avgPrice)}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold">₹{formatINR(p.ltp)}</div>
                  <div className={`text-xs font-bold ${up ? 'text-up' : 'text-down'}`}>
                    {up ? '+' : ''}₹{formatINR(p.pnl)}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </section>

      <section className="card space-y-3 p-4">
        <h3 className="text-sm font-extrabold tracking-tight">Goals</h3>
        <form
          className="flex flex-wrap gap-2"
          onSubmit={async (e) => {
            e.preventDefault()
            try {
              await api('/goals', {
                method: 'POST',
                body: {
                  name: goalForm.name,
                  targetAmount: Number(goalForm.targetAmount),
                  monthlySip: goalForm.monthlySip ? Number(goalForm.monthlySip) : undefined,
                },
              })
              setGoalForm({ name: '', targetAmount: '', monthlySip: '' })
              dispatch(showToast({ type: 'success', title: 'Goal added' }))
              load()
            } catch (err) {
              dispatch(showToast({ type: 'error', title: 'Failed', message: err.message }))
            }
          }}
        >
          <input className="field min-w-[140px] flex-1" placeholder="Goal name" value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} required />
          <input className="field w-32" type="number" placeholder="Target ₹" value={goalForm.targetAmount} onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })} required />
          <input className="field w-36" type="number" placeholder="Monthly SIP" value={goalForm.monthlySip} onChange={(e) => setGoalForm({ ...goalForm, monthlySip: e.target.value })} />
          <button className="btn btn-primary text-sm" type="submit">Add goal</button>
        </form>
        {goals.length === 0 ? (
          <p className="text-sm text-muted">No goals yet — set a target to track SIPs against.</p>
        ) : (
          <div className="space-y-2">
            {goals.map((g) => (
              <div key={g.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5">
                <div>
                  <div className="font-bold">{g.name}</div>
                  <div className="text-xs text-muted">
                    Target ₹{formatINR(g.targetAmount)}
                    {g.monthlySip ? ` · SIP ₹${formatINR(g.monthlySip)}` : ''}
                    {g.targetDate ? ` · by ${new Date(g.targetDate).toLocaleDateString('en-IN')}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs font-bold text-down"
                  onClick={async () => {
                    try {
                      await api(`/goals/${g.id}`, { method: 'DELETE' })
                      load()
                    } catch (err) {
                      dispatch(showToast({ type: 'error', title: 'Failed', message: err.message }))
                    }
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      {analytics?.sectorExposure?.length > 0 && (
        <section className="card space-y-3 p-4">
          <h3 className="text-sm font-extrabold tracking-tight">Sector exposure</h3>
          <div className="space-y-2">
            {analytics.sectorExposure.map((s) => (
              <div key={s.sector} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold">{s.sector}</span>
                  <span className="font-mono text-muted">{s.weightPct}% · ₹{formatINR(s.value)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                  <div
                    className="h-full rounded-full bg-page-accent"
                    style={{ width: `${Math.min(100, s.weightPct)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <Section
        title="Stock holdings"
        icon={IconCandles}
        theme="explore"
        meta={liveHoldings.length ? `Last updated ${new Date().toLocaleTimeString('en-IN', { hour12: false })}` : ''}
      >
        {liveHoldings.length === 0 ? (
          <EmptyState
            art={EmptyPortfolioArt}
            accent={PAGE_THEMES.investments.accent}
            title="No stock holdings yet"
            message="Buy your first stock and it will be tracked live here."
            action={<Link to="/app/explore" className="btn btn-primary text-sm"><IconCandles size={16} />Explore stocks</Link>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface-2/80 text-[10px] font-bold tracking-wide text-muted uppercase">
                  <th className="px-4 py-2.5">Instrument</th>
                  <th className="px-3 py-2.5 text-right">Qty</th>
                  <th className="px-3 py-2.5 text-right">Avg price</th>
                  <th className="px-3 py-2.5 text-right">LTP</th>
                  <th className="px-3 py-2.5 text-right">Current value</th>
                  <th className="px-4 py-2.5 text-right">Total P&L</th>
                </tr>
              </thead>
              <tbody>
                {liveHoldings.map((holding) => (
                  <tr key={holding.symbol} className="border-b border-line transition last:border-0 hover:bg-surface-2/70">
                    <td className="px-4 py-2.5">
                      <Link to={`/app/stocks/${holding.symbol}`} className="font-mono font-bold hover:text-accent">
                        {holding.symbol}
                      </Link>
                      <div className="text-xs text-muted">{holding.name}</div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono">{holding.qty}</td>
                    <td className="px-3 py-2.5 text-right font-mono">₹{formatINR(holding.avgPrice)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <div className="font-mono font-bold">₹{formatINR(holding.ltp)}</div>
                      <div className={`text-xs font-bold ${holding.dayChangePct >= 0 ? 'text-up' : 'text-down'}`}>
                        {holding.dayChangePct >= 0 ? '+' : ''}{holding.dayChangePct.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right font-mono font-bold">₹{formatINR(holding.value)}</td>
                    <td className={`px-4 py-2.5 text-right ${holding.pnl >= 0 ? 'text-up' : 'text-down'}`}>
                      <div className="font-mono font-bold">
                        {holding.pnl >= 0 ? '+' : ''}₹{formatINR(holding.pnl)}
                      </div>
                      <div className="text-xs font-bold">
                        {holding.pnlPct >= 0 ? '+' : ''}{holding.pnlPct.toFixed(2)}%
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Section>

      <Section
        title="Mutual fund holdings"
        icon={IconCoins}
        theme="mf"
        meta={mf.length ? `₹${formatINR(mfCurrent)} current · ₹${formatINR(mfInvested)} invested` : ''}
      >
        {mf.length === 0 ? (
          <EmptyState
            art={EmptyFundsArt}
            accent={PAGE_THEMES.mf.accent}
            title="No mutual fund holdings"
            message="Start a SIP or invest a lumpsum to build long-term wealth."
            action={<Link to="/app/mf" className="btn btn-primary text-sm"><IconCoins size={16} />Browse funds</Link>}
          />
        ) : (
          <div className="space-y-2 p-4">
            {mf.map((h) => (
              <Link
                key={h.id}
                to={`/app/mf/${h.fundId}`}
                className="flex items-center justify-between rounded-xl bg-surface-2/60 px-3 py-2.5 transition hover:bg-page-tint"
              >
                <div>
                  <div className="font-semibold">{h.name}</div>
                  <div className="text-xs text-muted">{h.units} units · avg NAV ₹{formatINR(h.avgNav)}</div>
                </div>
                <div className="text-right font-mono text-sm">
                  <div>₹{formatINR(h.value)}</div>
                  <div className={h.pnl >= 0 ? 'text-up' : 'text-down'}>{h.pnl >= 0 ? '+' : ''}{formatINR(h.pnl)}</div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Section>

      <Section title="SIPs" icon={IconSparkles} theme="mf">
        {sips.length === 0 ? (
          <EmptyState
            art={EmptySipArt}
            accent={PAGE_THEMES.mf.accent}
            title="No SIPs running"
            message="Automate monthly investing — pause or cancel any time."
            action={<Link to="/app/mf" className="btn btn-primary text-sm"><IconSparkles size={16} />Start a SIP</Link>}
          />
        ) : (
          <div className="space-y-2 p-4">
            {sips.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5 text-sm">
                <div>
                  <div className="font-bold">{s.name}</div>
                  <div className="text-muted">₹{formatINR(s.amount)} on day {s.dayOfMonth} · {s.status}</div>
                </div>
                <SipActions id={s.id} status={s.status} onDone={load} />
              </div>
            ))}
          </div>
        )}
      </Section>
    </Screen>
  )
}

function SipActions({ id, status, onDone }) {
  const dispatch = useAppDispatch()
  const toggle = async (next) => {
    try {
      await api(`/mf/sips/${id}`, { method: 'PATCH', body: { status: next } })
      dispatch(showToast({ type: 'success', title: `SIP ${next}` }))
      onDone()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'SIP update failed', message: err.message }))
    }
  }
  if (status === 'cancelled') return <span className="text-xs text-muted">Cancelled</span>
  return (
    <div className="flex gap-2">
      {status === 'active' ? (
        <button type="button" className="btn btn-ghost text-xs" onClick={() => toggle('paused')}>Pause</button>
      ) : (
        <button type="button" className="btn btn-ghost text-xs" onClick={() => toggle('active')}>Resume</button>
      )}
      <button type="button" className="btn btn-ghost text-xs" onClick={() => toggle('cancelled')}>Cancel</button>
    </div>
  )
}

function HeroMetric({ label, value, tone }) {
  const color = tone === 'up' ? 'text-[#7dffc8]' : tone === 'down' ? 'text-[#ff9d9d]' : ''
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 p-2.5">
      <div className="text-[9px] font-bold tracking-wide text-white/50 uppercase">{label}</div>
      <div className={`mt-1 font-mono text-sm font-bold ${color}`}>{value}</div>
    </div>
  )
}

function Section({ title, meta, icon: Icon, theme, children }) {
  return (
    <section className={`card overflow-hidden ${theme ? `theme-${theme}` : ''}`}>
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
        <h2 className="flex items-center gap-2 font-extrabold tracking-tight">
          {Icon ? (
            <span className="icon-chip icon-chip-sm">
              <Icon size={15} />
            </span>
          ) : null}
          {title}
        </h2>
        {meta && <span className="text-[11px] text-muted">{meta}</span>}
      </div>
      {children}
    </section>
  )
}
