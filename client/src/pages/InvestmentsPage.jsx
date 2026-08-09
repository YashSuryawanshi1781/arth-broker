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
    <Screen theme="investments" className="stack gap-md">
      <PageHeader
        icon={IconBriefcase}
        eyebrow="Portfolio"
        title="Investments"
        subtitle={
          <>
            Stocks update automatically from the live market feed{' · '}
            <span className={market.connected && market.status?.source === 'yahoo' ? 'font-bold up' : 'font-bold down'}>
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
        <div className="hero-mesh grid gap-lg px-lg p-xl" style={{ color: '#fff' }}>
          <div>
            <p className="text-xs bold uppercase">Equity portfolio</p>
            <div className="mt-sm mono text-3xl bold">₹{formatINR(totals.current)}</div>
            <div className={`mt-sm text-sm bold ${totals.pnl >= 0 ? 'up' : 'down'}`}>
              {totals.pnl >= 0 ? '+' : ''}₹{formatINR(totals.pnl)} ({totals.pnlPct.toFixed(2)}%) overall
            </div>
          </div>
          <div className="grid-3 gap-sm">
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
        <section className="card row flex-wrap gap-lg px-lg py-md">
          <div>
            <div className="text-[10px] bold muted uppercase">Projected dividends</div>
            <div className="mono text-xl bold">₹{formatINR(dividends.totalProjected || 0)}</div>
            <div className="text-xs muted">~{dividends.portfolioYieldPct || 0}% portfolio yield (demo)</div>
          </div>
          <div className="row flex-wrap gap-sm flex-1">
            {(dividends.dividends || []).slice(0, 6).map((d) => (
              <span key={d.symbol} className="rounded border px-lg py-md text-xs">
                <span className="mono bold">{d.symbol}</span>
                {' '}
                <span className="muted">₹{formatINR(d.projectedAnnual)} · {d.yieldPct}%</span>
              </span>
            ))}
          </div>
        </section>
      )}

      <section className="card overflow-hidden">
        <div className="row-between flex-wrap gap-sm border-b border px-lg py-md">
          <div>
            <h3 className="extrabold">Intraday positions (MIS)</h3>
            <p className="text-xs muted">Auto square-off near 15:20 IST · paper only</p>
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
          <p className="px-lg py-md text-sm muted">No open MIS positions.</p>
        ) : (
          positions.map((p) => {
            const up = (p.pnl || 0) >= 0
            return (
              <Link
                key={p.symbol}
                to={`/app/stocks/${p.symbol}`}
                className="row w-full border-b border px-lg py-md"
                style={{ textDecoration: 'none', color: 'inherit' }}
              >
                <div>
                  <div className="mono bold">{p.symbol}</div>
                  <div className="text-xs muted">{p.qty} qty · avg ₹{formatINR(p.avgPrice)}</div>
                </div>
                <div className="right">
                  <div className="mono bold">₹{formatINR(p.ltp)}</div>
                  <div className={`text-xs bold ${up ? 'up' : 'down'}`}>
                    {up ? '+' : ''}₹{formatINR(p.pnl)}
                  </div>
                </div>
              </Link>
            )
          })
        )}
      </section>

      <section className="card stack gap-md p-lg">
        <div className="row-between">
          <h3 className="text-sm extrabold">Goals</h3>
        </div>
        <form
          className="row flex-wrap gap-sm"
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
          <input className="field" placeholder="Goal name" value={goalForm.name} onChange={(e) => setGoalForm({ ...goalForm, name: e.target.value })} required />
          <input className="field" type="number" placeholder="Target ₹" value={goalForm.targetAmount} onChange={(e) => setGoalForm({ ...goalForm, targetAmount: e.target.value })} required />
          <input className="field" type="number" placeholder="Monthly SIP" value={goalForm.monthlySip} onChange={(e) => setGoalForm({ ...goalForm, monthlySip: e.target.value })} />
          <button className="btn btn-primary text-sm" type="submit">Add goal</button>
        </form>
        {goals.length === 0 ? (
          <p className="text-sm muted">No goals yet — set a target to track SIPs against.</p>
        ) : (
          <div className="stack gap-sm">
            {goals.map((g) => (
              <div key={g.id} className="row-between rounded border px-lg py-md">
                <div>
                  <div className="bold">{g.name}</div>
                  <div className="text-xs muted">
                    Target ₹{formatINR(g.targetAmount)}
                    {g.monthlySip ? ` · SIP ₹${formatINR(g.monthlySip)}` : ''}
                    {g.targetDate ? ` · by ${new Date(g.targetDate).toLocaleDateString('en-IN')}` : ''}
                  </div>
                </div>
                <button
                  type="button"
                  className="text-xs bold down"
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
        <section className="card p-lg stack gap-md">
          <h3 className="text-sm extrabold">Sector exposure</h3>
          <div className="stack gap-sm">
            {analytics.sectorExposure.map((s) => (
              <div key={s.sector} className="stack gap-xs">
                <div className="row-between text-xs">
                  <span className="bold">{s.sector}</span>
                  <span className="mono muted">{s.weightPct}% · ₹{formatINR(s.value)}</span>
                </div>
                <div style={{ height: 8, borderRadius: 99, background: 'var(--color-surface-2)' }}>
                  <div
                    style={{
                      width: `${Math.min(100, s.weightPct)}%`,
                      height: '100%',
                      borderRadius: 99,
                      background: 'var(--page-accent)',
                    }}
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
          <div className="overflow-auto">
            <table className="w-full w-[720px] text-sm">
              <thead>
                <tr className="border-b border text-[10px] bold muted uppercase">
                  <th className="px-lg py-md">Instrument</th>
                  <th className="px-lg right">Qty</th>
                  <th className="px-lg right">Avg price</th>
                  <th className="px-lg right">LTP</th>
                  <th className="px-lg right">Current value</th>
                  <th className="px-lg right">Total P&L</th>
                </tr>
              </thead>
              <tbody>
                {liveHoldings.map((holding) => (
                  <tr key={holding.symbol} className="border-b border last:border-0">
                    <td className="px-lg py-md">
                      <Link to={`/app/stocks/${holding.symbol}`} className="mono bold">
                        {holding.symbol}
                      </Link>
                      <div className="text-xs muted">{holding.name}</div>
                    </td>
                    <td className="px-lg right mono">{holding.qty}</td>
                    <td className="px-lg right mono">₹{formatINR(holding.avgPrice)}</td>
                    <td className="px-lg right">
                      <div className="mono bold">₹{formatINR(holding.ltp)}</div>
                      <div className={`text-xs bold ${holding.dayChangePct >= 0 ? '' : ''}`}>
                        {holding.dayChangePct >= 0 ? '+' : ''}{holding.dayChangePct.toFixed(2)}%
                      </div>
                    </td>
                    <td className="px-lg right mono bold">₹{formatINR(holding.value)}</td>
                    <td className={`px-lg right ${holding.pnl >= 0 ? '' : ''}`}>
                      <div className="mono bold">
                        {holding.pnl >= 0 ? '+' : ''}₹{formatINR(holding.pnl)}
                      </div>
                      <div className="text-xs bold">
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
          <div className="stack gap-md p-lg">
            {mf.map((h) => (
              <Link
                key={h.id}
                to={`/app/mf/${h.fundId}`}
                className="row-between rounded /60 px-lg py-md"
              >
                <div>
                  <div className="bold">{h.name}</div>
                  <div className="text-xs muted">{h.units} units · avg NAV ₹{formatINR(h.avgNav)}</div>
                </div>
                <div className="right mono text-sm">
                  <div>₹{formatINR(h.value)}</div>
                  <div className={h.pnl >= 0 ? 'up' : 'down'}>{h.pnl >= 0 ? '+' : ''}{formatINR(h.pnl)}</div>
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
          <div className="stack gap-md p-lg">
            {sips.map((s) => (
              <div key={s.id} className="row-between rounded border px-lg py-md text-sm">
                <div>
                  <div className="bold">{s.name}</div>
                  <div className="muted">₹{formatINR(s.amount)} on day {s.dayOfMonth} · {s.status}</div>
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
  if (status === 'cancelled') return <span className="text-xs muted">Cancelled</span>
  return (
    <div className="row gap-sm">
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
    <div className="rounded border p-1.5">
      <div className="text-[9px] bold uppercase">{label}</div>
      <div className={`mt-sm mono text-sm bold ${color}`}>{value}</div>
    </div>
  )
}

function Section({ title, meta, icon: Icon, theme, children }) {
  return (
    <section className={`card overflow-hidden ${theme ?`theme-${theme}` : ''}`}>
      <div className="row-between gap-md border-b border px-lg py-md">
        <h2 className="row gap-sm extrabold">
          {Icon ? (
            <span className="icon-chip icon-chip-sm">
              <Icon size={15} />
            </span>
          ) : null}
          {title}
        </h2>
        {meta && <span className="text-[11px] muted">{meta}</span>}
      </div>
      {children}
    </section>
  )
}
