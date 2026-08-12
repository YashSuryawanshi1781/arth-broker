import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatINR } from '../lib/api'
import { useAppDispatch } from '../app/hooks'
import { showToast } from '../features/ui/uiSlice'
import { PageHeader, Screen } from '../components/Screen'
import { IconAlertTriangle, IconCandles, IconRefresh, IconRocket, IconSparkles } from '../components/Icons'

const GOAL_PRESETS = [500, 1000, 2000, 5000]

function statusLabel(status) {
  switch (status) {
    case 'armed':
      return 'Scanning for entry'
    case 'in_trade':
      return 'In trade · SL & TP live'
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
  const [strategyId, setStrategyId] = useState('momentum_breakout')
  const [dailyGoal, setDailyGoal] = useState(2000)
  const [picks, setPicks] = useState([])
  const [bot, setBot] = useState(null)
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  const [arming, setArming] = useState(false)

  const selected = strategies.find((s) => s.id === strategyId) || strategies[0]

  const loadBot = useCallback(() => {
    return api('/auto/bot')
      .then((res) => {
        setBot(res.bot)
        setEvents(res.events || [])
        if (res.bot?.strategyId) setStrategyId(res.bot.strategyId)
        if (res.bot?.dailyGoal) setDailyGoal(Number(res.bot.dailyGoal))
      })
      .catch(() => {})
  }, [])

  const loadPicks = useCallback((id) => {
    return api(`/auto/picks?strategy=${encodeURIComponent(id || strategyId)}`)
      .then((res) => setPicks(res.picks || []))
      .catch(() => setPicks([]))
  }, [strategyId])

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const strat = await api('/auto/strategies')
      setStrategies(strat.strategies || [])
      setDisclaimer(strat.disclaimer || '')
      const sid = strat.strategies?.[0]?.id || 'momentum_breakout'
      setStrategyId((prev) => prev || sid)
      await Promise.all([loadBot(), loadPicks(strategyId || sid)])
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Auto desk unavailable', message: err.message }))
    } finally {
      setLoading(false)
    }
  }, [dispatch, loadBot, loadPicks, strategyId])

  useEffect(() => {
    refresh()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadPicks(strategyId)
  }, [strategyId, loadPicks])

  useEffect(() => {
    const t = setInterval(() => {
      loadBot()
      loadPicks(strategyId)
    }, 8000)
    return () => clearInterval(t)
  }, [loadBot, loadPicks, strategyId])

  const arm = async () => {
    setArming(true)
    try {
      const res = await api('/auto/bot', {
        method: 'POST',
        body: { strategyId, dailyGoal: Number(dailyGoal) },
      })
      setBot(res.bot)
      dispatch(showToast({
        type: 'success',
        title: 'Auto desk armed',
        message: `Paper goal ${formatINR(dailyGoal)} · hunting setups`,
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
        subtitle="Set a daily paper goal · pick a strategy · bot handles entry, stop & target"
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
            <p className="font-bold">Paper simulation only — not a profit guarantee</p>
            <p className="mt-1 text-amber-900/90">
              {disclaimer || 'Orders use Arth practice cash with stop-loss and target. Not SEBI advice. Goals are targets, not promises.'}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          <section className="card p-4">
            <h2 className="text-sm font-extrabold text-ink">1 · Daily paper goal</h2>
            <p className="mt-1 text-xs text-muted">Bot sizes risk toward this target and pauses after ~1.5× loss.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              {GOAL_PRESETS.map((g) => (
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
              Custom goal (₹)
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
          </section>

          <section className="card p-4">
            <h2 className="text-sm font-extrabold text-ink">2 · Strategy playbook</h2>
            <p className="mt-1 text-xs text-muted">Indicators + entry/exit rules the bot follows.</p>
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
                  <div className="text-sm font-bold text-ink">{s.name}</div>
                  <div className="mt-0.5 text-xs text-muted">{s.tagline}</div>
                  <div className="mt-2 flex flex-wrap gap-1">
                    <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                      SL {(s.stopPct * 100).toFixed(1)}%
                    </span>
                    <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                      TP {(s.targetPct * 100).toFixed(1)}%
                    </span>
                    <span className="rounded-md bg-surface px-1.5 py-0.5 text-[10px] font-bold uppercase text-muted">
                      {s.product}
                    </span>
                  </div>
                </button>
              ))}
            </div>
            {selected ? (
              <div className="mt-3 rounded-lg bg-surface px-3 py-2 text-xs text-muted">
                <p className="font-bold text-ink">{selected.vibe}</p>
                <p className="mt-1">
                  Indicators:{' '}
                  {(selected.indicators || []).join(' · ')}
                </p>
                <p className="mt-1">
                  Session: market hours 09:15–15:20 IST · auto BUY → GTT stop + target
                </p>
              </div>
            ) : null}
          </section>

          <section className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <h2 className="text-sm font-extrabold text-ink">3 · Suggested stocks now</h2>
              <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Live score</span>
            </div>
            {loading && !picks.length ? (
              <p className="px-4 py-6 text-sm text-muted">Loading picks…</p>
            ) : !picks.length ? (
              <p className="px-4 py-6 text-sm text-muted">No clean setup for this playbook right now.</p>
            ) : (
              <ul className="divide-y divide-line">
                {picks.slice(0, 6).map((p, i) => (
                  <li key={p.symbol} className="flex items-center gap-3 px-4 py-3">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-surface text-xs font-bold text-muted">
                      {i + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link to={`/app/stocks/${p.symbol}`} className="text-sm font-bold text-ink hover:underline">
                        {p.symbol}
                      </Link>
                      <p className="truncate text-xs text-muted">{p.reason}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold tabular-nums">{formatINR(p.price)}</div>
                      <div className={`text-xs font-bold tabular-nums ${p.changePct >= 0 ? 'text-pos' : 'text-neg'}`}>
                        {p.changePct >= 0 ? '+' : ''}
                        {Number(p.changePct).toFixed(2)}%
                      </div>
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
                <p className="mt-0.5 text-xs text-muted">Automatic paper entry & exit</p>
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
                        <span className="text-muted">Symbol</span>
                        <div className="font-bold">
                          <Link to={`/app/stocks/${bot.symbol}`} className="hover:underline">{bot.symbol}</Link>
                          {' · '}
                          {bot.qty} qty
                        </div>
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
                Arm the desk with a goal and strategy. During market hours it will pick a stock, buy, and place SL + TP.
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
                  {arming ? 'Arming…' : `Arm · goal ${formatINR(dailyGoal)}`}
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
                <p className="font-bold text-ink">How it works</p>
                <ol className="mt-2 list-decimal space-y-1 pl-4">
                  <li>You set daily goal + strategy (indicators &amp; SL/TP %).</li>
                  <li>In session, bot scores stocks and paper-buys the top pick.</li>
                  <li>GTT stop + target placed automatically.</li>
                  <li>On exit, day P&amp;L updates; re-enters until goal or risk guard.</li>
                </ol>
                <p className="mt-2">
                  Prefer lessons first?{' '}
                  <Link to="/app/learn" className="font-bold text-page-accent hover:underline">
                    Open Learn
                  </Link>
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </Screen>
  )
}
