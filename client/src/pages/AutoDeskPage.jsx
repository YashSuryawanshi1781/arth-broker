import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatINR } from '../lib/api'
import { useAppDispatch } from '../app/hooks'
import { showToast } from '../features/ui/uiSlice'
import { PageHeader, Screen } from '../components/Screen'
import { IconAlertTriangle, IconCandles, IconRefresh, IconRocket, IconSparkles } from '../components/Icons'

const MONTHLY_PRESETS = [20000, 50000, 100000]
const DAILY_PRESETS = [500, 1000, 2000, 5000]
const TRADING_DAYS = 22

function statusLabel(status) {
  switch (status) {
    case 'armed':
      return 'Hands-free · scanning'
    case 'in_trade':
      return 'In trade · auto SL & TP'
    case 'goal_hit':
      return 'Daily paper goal hit'
    case 'stopped':
      return 'Stopped'
    default:
      return status || 'Idle'
  }
}

function statusTone(status) {
  if (status === 'in_trade') return 'text-blue-700 bg-blue-50'
  if (status === 'goal_hit') return 'text-emerald-700 bg-emerald-50'
  if (status === 'armed') return 'text-amber-800 bg-amber-50'
  return 'text-muted bg-surface'
}

export function AutoDeskPage() {
  const dispatch = useAppDispatch()
  const [strategies, setStrategies] = useState([])
  const [disclaimer, setDisclaimer] = useState('')
  const [planPeriod, setPlanPeriod] = useState('monthly')
  const [monthlyGoal, setMonthlyGoal] = useState(50000)
  const [dailyGoal, setDailyGoal] = useState(Math.round(50000 / TRADING_DAYS))
  const [maxDailyLoss, setMaxDailyLoss] = useState(1500)
  const [instrumentMode, setInstrumentMode] = useState('stocks')
  const [strategyId, setStrategyId] = useState('momentum_breakout')
  const [picks, setPicks] = useState([])
  const [bot, setBot] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [arming, setArming] = useState(false)

  const selected = strategies.find((s) => s.id === strategyId) || strategies[0]

  const derivedDaily = useMemo(() => {
    if (planPeriod === 'monthly') {
      return Math.max(100, Math.round(Number(monthlyGoal) / TRADING_DAYS) || 0)
    }
    return Number(dailyGoal) || 0
  }, [planPeriod, monthlyGoal, dailyGoal])

  const loadBot = useCallback(() => {
    return api('/auto/bot')
      .then((res) => {
        setBot(res.bot)
        setEvents(res.events || [])
        if (res.bot?.strategyId) setStrategyId(res.bot.strategyId)
        if (res.bot?.dailyGoal) setDailyGoal(Number(res.bot.dailyGoal))
        if (res.bot?.monthlyGoal) {
          setMonthlyGoal(Number(res.bot.monthlyGoal))
          setPlanPeriod('monthly')
        }
        if (res.bot?.maxDailyLoss) setMaxDailyLoss(Number(res.bot.maxDailyLoss))
        if (res.bot?.instrumentMode) setInstrumentMode(res.bot.instrumentMode)
      })
      .catch(() => {})
  }, [])

  const loadPicks = useCallback((id, mode) => {
    const sid = id || strategyId
    const m = mode || instrumentMode
    return api(`/auto/picks?strategy=${encodeURIComponent(sid)}&mode=${encodeURIComponent(m)}`)
      .then((res) => setPicks(res.picks || []))
      .catch(() => setPicks([]))
  }, [strategyId, instrumentMode])

  const loadStrategies = useCallback(async (mode) => {
    const strat = await api(`/auto/strategies?mode=${encodeURIComponent(mode || instrumentMode)}`)
    setStrategies(strat.strategies || [])
    setDisclaimer(strat.disclaimer || '')
    const ids = (strat.strategies || []).map((s) => s.id)
    setStrategyId((prev) => (ids.includes(prev) ? prev : ids[0] || 'momentum_breakout'))
  }, [instrumentMode])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      await loadStrategies(instrumentMode)
      await Promise.all([loadBot(), loadPicks(strategyId, instrumentMode)])
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Auto desk unavailable', message: err.message }))
    } finally {
      setLoading(false)
    }
  }, [dispatch, loadBot, loadPicks, loadStrategies, instrumentMode, strategyId])

  useEffect(() => {
    refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadStrategies(instrumentMode).catch(() => {})
  }, [instrumentMode, loadStrategies])

  useEffect(() => {
    loadPicks(strategyId, instrumentMode)
  }, [strategyId, instrumentMode, loadPicks])

  useEffect(() => {
    if (planPeriod === 'monthly') {
      setDailyGoal(Math.max(100, Math.round(Number(monthlyGoal) / TRADING_DAYS) || 100))
    }
  }, [planPeriod, monthlyGoal])

  useEffect(() => {
    const t = setInterval(() => {
      loadBot()
      loadPicks(strategyId, instrumentMode)
    }, 8000)
    return () => clearInterval(t)
  }, [loadBot, loadPicks, strategyId, instrumentMode])

  const arm = async () => {
    setArming(true)
    try {
      const goal = derivedDaily
      const res = await api('/auto/bot', {
        method: 'POST',
        body: {
          strategyId,
          dailyGoal: goal,
          monthlyGoal: planPeriod === 'monthly' ? Number(monthlyGoal) : null,
          maxDailyLoss: Number(maxDailyLoss),
          instrumentMode,
          stopPct: selected?.stopPct,
          targetPct: selected?.targetPct,
        },
      })
      setBot(res.bot)
      dispatch(showToast({
        type: 'success',
        title: 'Hands-free desk armed',
        message: `Daily paper target ${formatINR(goal)} · bot will buy & sell for you`,
      }))
      await loadBot()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Could not arm', message: err.message }))
    } finally {
      setArming(false)
    }
  }

  const stop = async () => {
    try {
      const res = await api('/auto/bot/stop', { method: 'POST' })
      setBot(res.bot)
      dispatch(showToast({ type: 'success', title: 'Auto desk stopped' }))
      await loadBot()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Stop failed', message: err.message }))
    }
  }

  const progress = bot?.dailyGoal
    ? Math.min(100, Math.max(0, (Number(bot.dayPnl) / Number(bot.dailyGoal)) * 100))
    : 0
  const live = bot && (bot.status === 'armed' || bot.status === 'in_trade')

  return (
    <Screen theme="explore">
      <PageHeader
        icon={IconRocket}
        eyebrow="Paper auto desk"
        title="Baba Auto Desk"
        subtitle="Set monthly/daily plan · affordable stop · bot buys & sells stocks or options for you"
        actions={(
          <button type="button" className="btn btn-ghost btn-sm" onClick={refresh} disabled={loading}>
            <IconRefresh size={16} />
            Refresh
          </button>
        )}
      />

      <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
        <div className="flex gap-2">
          <IconAlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-700" />
          <div>
            <p className="font-bold">Hands-free paper bot — not a profit guarantee</p>
            <p className="mt-1 text-amber-900/90">
              {disclaimer || 'You set the plan. Bot auto-enters and exits with SL/TP. Paper only · not SEBI advice.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr]">
        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="text-sm font-extrabold text-ink">1 · Your money plan</h2>
            <p className="mt-1 text-xs text-muted">
              Example: ₹50,000 / month → ~₹{formatINR(Math.round(50000 / TRADING_DAYS))} per trading day ({TRADING_DAYS} sessions).
            </p>

            <div className="mt-3 flex gap-2">
              {[
                ['monthly', 'Monthly goal'],
                ['daily', 'Daily goal'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  disabled={live}
                  className={`btn btn-sm flex-1 ${planPeriod === id ? 'btn-primary' : 'btn-ghost'}`}
                  onClick={() => setPlanPeriod(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {planPeriod === 'monthly' ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MONTHLY_PRESETS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`btn btn-sm ${Number(monthlyGoal) === g ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setMonthlyGoal(g)}
                      disabled={live}
                    >
                      {formatINR(g)}/mo
                    </button>
                  ))}
                </div>
                <label className="mt-3 block text-xs font-bold text-muted">
                  Monthly paper target (₹)
                  <input
                    type="number"
                    min={1000}
                    max={5000000}
                    step={1000}
                    className="input mt-1 w-full"
                    value={monthlyGoal}
                    disabled={live}
                    onChange={(e) => setMonthlyGoal(e.target.value)}
                  />
                </label>
                <div className="mt-3 rounded-lg bg-surface px-3 py-2 text-sm">
                  <span className="text-muted">Daily target ≈ </span>
                  <span className="font-extrabold tabular-nums text-ink">{formatINR(derivedDaily)}</span>
                  <span className="text-muted"> · {TRADING_DAYS} trading days</span>
                </div>
              </>
            ) : (
              <>
                <div className="mt-3 flex flex-wrap gap-2">
                  {DAILY_PRESETS.map((g) => (
                    <button
                      key={g}
                      type="button"
                      className={`btn btn-sm ${Number(dailyGoal) === g ? 'btn-primary' : 'btn-ghost'}`}
                      onClick={() => setDailyGoal(g)}
                      disabled={live}
                    >
                      {formatINR(g)}
                    </button>
                  ))}
                </div>
                <label className="mt-3 block text-xs font-bold text-muted">
                  Daily paper target (₹)
                  <input
                    type="number"
                    min={100}
                    max={100000}
                    step={100}
                    className="input mt-1 w-full"
                    value={dailyGoal}
                    disabled={live}
                    onChange={(e) => setDailyGoal(e.target.value)}
                  />
                </label>
              </>
            )}

            <label className="mt-4 block text-xs font-bold text-muted">
              Max loss I can afford today (₹) — bot pauses if hit
              <input
                type="number"
                min={50}
                max={200000}
                step={100}
                className="input mt-1 w-full"
                value={maxDailyLoss}
                disabled={live}
                onChange={(e) => setMaxDailyLoss(e.target.value)}
              />
            </label>
            <p className="mt-1 text-[11px] text-muted">
              Position size uses this budget so one bad trade cannot blow past your stop comfort.
            </p>
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-extrabold text-ink">2 · What to auto-trade</h2>
            <p className="mt-1 text-xs text-muted">Bot picks, buys, and exits — you don’t sit on the terminal.</p>
            <div className="mt-3 grid grid-cols-3 gap-2">
              {[
                ['stocks', 'Stocks'],
                ['options', 'Index options'],
                ['both', 'Both'],
              ].map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  disabled={live}
                  className={`rounded-xl border px-2 py-3 text-center text-xs font-bold transition ${
                    instrumentMode === id
                      ? 'border-page-accent bg-[color-mix(in_srgb,var(--page-accent)_8%,white)] text-ink'
                      : 'border-line text-muted hover:border-page-accent/40'
                  }`}
                  onClick={() => setInstrumentMode(id)}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-extrabold text-ink">3 · Strategy playbook</h2>
            <p className="mt-1 text-xs text-muted">Indicators + entry/exit % the bot follows.</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              {strategies.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  disabled={live}
                  onClick={() => setStrategyId(s.id)}
                  className={`rounded-xl border px-3 py-3 text-left transition ${
                    strategyId === s.id
                      ? 'border-page-accent bg-[color-mix(in_srgb,var(--page-accent)_8%,white)]'
                      : 'border-line hover:border-page-accent/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-sm font-bold text-ink">{s.name}</div>
                    <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                      {s.assetClass}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-muted">{s.tagline}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                      SL {(s.stopPct * 100).toFixed(s.assetClass === 'options' ? 0 : 1)}%
                    </span>
                    <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                      TP {(s.targetPct * 100).toFixed(s.assetClass === 'options' ? 0 : 1)}%
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {selected ? (
              <div className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
                <p className="font-bold text-ink">{selected.vibe}</p>
                <p className="mt-1">Indicators: {(selected.indicators || []).join(' · ')}</p>
                <p className="mt-1">Session 09:15–15:20 IST · auto BUY → GTT stop + target · no manual clicks</p>
              </div>
            ) : null}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-extrabold text-ink">4 · Bot will look at these next</h2>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Live score</span>
            </div>
            {loading && !picks.length ? (
              <p className="px-4 py-6 text-sm text-muted">Loading picks…</p>
            ) : !picks.length ? (
              <p className="px-4 py-6 text-sm text-muted">No clean setup right now — bot keeps scanning when armed.</p>
            ) : (
              <ul className="divide-y divide-line">
                {picks.slice(0, 6).map((p, i) => (
                  <li key={p.symbol} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      {p.isOption ? (
                        <span className="text-sm font-bold text-ink">{p.name || p.symbol}</span>
                      ) : (
                        <Link to={`/app/stocks/${p.symbol}`} className="text-sm font-bold text-ink hover:underline">
                          {p.symbol}
                        </Link>
                      )}
                      <p className="truncate text-xs text-muted">{p.reason}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums">{formatINR(p.price)}</div>
                      {p.isOption ? (
                        <div className="text-[10px] font-bold uppercase text-muted">Option</div>
                      ) : (
                        <div className={`text-xs font-bold tabular-nums ${p.changePct >= 0 ? 'text-pos' : 'text-neg'}`}>
                          {p.changePct >= 0 ? '+' : ''}
                          {Number(p.changePct).toFixed(2)}%
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <div className="space-y-4">
          <section className="card p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-extrabold text-ink">Bot status</h2>
                <p className="mt-0.5 text-xs text-muted">Automatic entry & exit while you stay away</p>
              </div>
              {bot?.status ? (
                <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${statusTone(bot.status)}`}>
                  {statusLabel(bot.status)}
                </span>
              ) : (
                <span className="rounded-full bg-surface px-2.5 py-1 text-[10px] font-bold uppercase text-muted">
                  Idle
                </span>
              )}
            </div>

            <div className="mt-3 rounded-lg border border-line bg-surface/50 px-3 py-2 text-xs text-muted">
              <p className="font-bold text-ink">Plan snapshot</p>
              <p className="mt-1 tabular-nums">
                Daily {formatINR(derivedDaily)}
                {planPeriod === 'monthly' ? ` · Monthly ${formatINR(monthlyGoal)}` : ''}
                {' · '}Max loss {formatINR(maxDailyLoss)}
                {' · '}{instrumentMode}
              </p>
            </div>

            {bot ? (
              <div className="mt-4 space-y-3">
                <div>
                  <div className="flex justify-between text-xs font-bold text-muted">
                    <span>Day P&amp;L</span>
                    <span className="tabular-nums text-ink">
                      {formatINR(bot.dayPnl || 0)} / {formatINR(bot.dailyGoal)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-surface">
                    <div
                      className="h-full rounded-full bg-page-accent transition-all"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
                <div className="rounded-lg border border-line bg-surface/60 px-3 py-2 text-xs">
                  <p className="font-bold text-ink">{bot.strategyName}</p>
                  <p className="mt-1 text-muted">{bot.note || bot.lastSignal || '—'}</p>
                  {bot.status === 'in_trade' && bot.symbol ? (
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <span className="text-muted">Contract</span>
                        <div className="font-bold break-all">{bot.symbol} · {bot.qty}</div>
                      </div>
                      <div>
                        <span className="text-muted">Entry</span>
                        <div className="font-bold tabular-nums">{formatINR(bot.entryPrice)}</div>
                      </div>
                      <div>
                        <span className="text-muted">Stop</span>
                        <div className="font-bold tabular-nums text-neg">{formatINR(bot.stopPrice)}</div>
                      </div>
                      <div>
                        <span className="text-muted">Target</span>
                        <div className="font-bold tabular-nums text-pos">{formatINR(bot.targetPrice)}</div>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="mt-4 text-sm text-muted">
                Arm once. During market hours the bot picks, buys, places SL + TP, and exits — no clicking needed.
              </p>
            )}

            <div className="mt-4 flex flex-wrap gap-2">
              {live ? (
                <button type="button" className="btn btn-ghost flex-1" onClick={stop}>
                  Stop bot
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary flex-1"
                  onClick={arm}
                  disabled={arming || loading}
                >
                  {arming ? 'Arming…' : `Arm hands-free · ${formatINR(derivedDaily)}/day`}
                </button>
              )}
              <Link to="/app/orders" className="btn btn-ghost">
                Orders
              </Link>
            </div>
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center gap-2 border-b border-line px-4 py-3">
              <IconCandles size={16} className="text-page-accent" />
              <h2 className="text-sm font-extrabold text-ink">Desk log</h2>
            </div>
            {!events.length ? (
              <p className="px-4 py-6 text-sm text-muted">Entries, stops and targets will show here.</p>
            ) : (
              <ul className="max-h-80 divide-y divide-line overflow-y-auto">
                {events.map((e) => (
                  <li key={e.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-bold text-ink">{e.title}</span>
                      <span className="shrink-0 text-[10px] font-bold uppercase text-muted">{e.kind}</span>
                    </div>
                    {e.body ? <p className="mt-0.5 text-xs text-muted">{e.body}</p> : null}
                    <p className="mt-1 text-[10px] text-muted">
                      {new Date(e.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card p-4">
            <div className="flex items-start gap-2">
              <IconSparkles size={18} className="mt-0.5 text-page-accent" />
              <div className="text-xs text-muted">
                <p className="font-bold text-ink">How hands-free works</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>You set monthly/daily goal + max loss you can afford.</li>
                  <li>Choose stocks, index options, or both + a playbook.</li>
                  <li>Arm once — bot auto-buys, places stop & target, exits.</li>
                  <li>Repeats until daily goal or your max-loss guard.</li>
                </ol>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Screen>
  )
}
