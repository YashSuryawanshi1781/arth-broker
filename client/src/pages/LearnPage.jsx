import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { api, formatINR } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { setUser } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { PageHeader, Screen } from '../components/Screen'
import { PaperWalletBanner } from '../components/PaperWalletBanner'
import { AiCoach } from '../components/AiCoach'
import { IconSparkles } from '../components/Icons'

export function LearnPage() {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
  const [resetting, setResetting] = useState(false)
  const [openLesson, setOpenLesson] = useState(null)

  const load = () => {
    api('/learn/sync').catch(() => {})
    api('/learn/content')
      .then(setData)
      .catch((err) => dispatch(showToast({ type: 'error', title: 'Learn unavailable', message: err.message })))
  }

  useEffect(load, [dispatch])

  const toggleMode = async (enabled) => {
    setBusy(true)
    try {
      const res = await api('/learn/mode', { method: 'PATCH', body: { enabled } })
      dispatch(setUser(res.user))
      setData((d) => (d ? { ...d, learningMode: enabled } : d))
      try {
        if (enabled) sessionStorage.setItem('arth_practice_order', '1')
        else sessionStorage.removeItem('arth_practice_order')
      } catch {
        /* ignore */
      }
      dispatch(showToast({
        type: 'success',
        title: enabled ? 'Practice trading on' : 'Practice trading off',
        message: enabled
          ? 'New trades are tagged as paper and show in your Learn book.'
          : 'New trades go to the trading terminal book only.',
      }))
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Could not update', message: err.message }))
    } finally {
      setBusy(false)
    }
  }

  const startPracticeTrade = async () => {
    try {
      if (!user?.learningMode) {
        const res = await api('/learn/mode', { method: 'PATCH', body: { enabled: true } })
        dispatch(setUser(res.user))
        setData((d) => (d ? { ...d, learningMode: true } : d))
      }
      sessionStorage.setItem('arth_practice_order', '1')
    } catch {
      try { sessionStorage.setItem('arth_practice_order', '1') } catch { /* ignore */ }
    }
    navigate('/app/explore')
  }

  const resetPractice = async () => {
    if (!window.confirm('Reset practice portfolio? Holdings and open orders will be cleared and cash restored to ₹1,00,000.')) {
      return
    }
    setResetting(true)
    try {
      const res = await api('/portfolio/paper/reset', { method: 'POST' })
      dispatch(setUser(res.user))
      dispatch(showToast({
        type: 'success',
        title: 'Practice wallet reset',
        message: '₹1,00,000 classroom cash restored. Continue lessons or place a practice trade.',
      }))
      load()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Reset failed', message: err.message }))
    } finally {
      setResetting(false)
    }
  }

  const completeLesson = async (id) => {
    try {
      await api(`/learn/lessons/${id}/complete`, { method: 'POST' })
      dispatch(showToast({ type: 'success', title: 'Lesson completed' }))
      load()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Failed', message: err.message }))
    }
  }

  const pct = data ? Math.round((data.completedCount / Math.max(data.totalChallenges, 1)) * 100) : 0
  const learningOn = data?.learningMode ?? user?.learningMode ?? false
  const practice = data?.practice
  const bookRows = [...(practice?.holdings || []), ...(practice?.positions || [])]
  const pnlUp = (practice?.summary?.pnl || 0) >= 0

  return (
    <Screen theme="home" className="stack gap-lg">
      <PageHeader
        icon={IconSparkles}
        eyebrow="Practice classroom"
        title="Learn"
        subtitle="Paper trades land here. Turn on Practice trading, place an order, and your book updates below."
        actions={
          <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm">
            <span className="text-muted">Practice trading</span>
            <input
              type="checkbox"
              checked={learningOn}
              disabled={busy}
              onChange={(e) => toggleMode(e.target.checked)}
            />
          </label>
        }
      />

      <PaperWalletBanner onReset={resetPractice} resetting={resetting} onPracticeTrade={startPracticeTrade} />

      <AiCoach mode="learn" />

      <section className="card space-y-4 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-extrabold">Paper trade book</h2>
            <p className="text-xs text-muted">
              {learningOn
                ? 'Practice trading is on — new fills show in this book.'
                : 'Turn on Practice trading (or tap Practice a trade) so orders are tagged as paper.'}
            </p>
          </div>
          <button type="button" className="btn btn-primary text-xs bold" onClick={startPracticeTrade}>
            Practice a trade
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <PracticeMetric label="Cash" value={`₹${formatINR(practice?.cash ?? user?.cash ?? 0)}`} />
          <PracticeMetric label="Invested" value={`₹${formatINR(practice?.summary?.invested || 0)}`} />
          <PracticeMetric label="Current" value={`₹${formatINR(practice?.summary?.current || 0)}`} />
          <PracticeMetric
            label="P&L"
            value={`${pnlUp ? '+' : ''}₹${formatINR(practice?.summary?.pnl || 0)}`}
            tone={pnlUp ? 'up' : 'down'}
          />
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold">Holdings from practice</h3>
            <span className="text-[11px] font-bold text-muted">
              {practice?.summary?.holdingCount || 0} position{(practice?.summary?.holdingCount || 0) === 1 ? '' : 's'}
            </span>
          </div>
          {bookRows.length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-surface-2/50 px-3 py-4 text-sm text-muted">
              No practice holdings yet. Place a paper buy with Practice trading on.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[520px] text-left text-sm">
                <thead className="bg-surface-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Symbol</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Avg</th>
                    <th className="px-3 py-2 text-right">LTP</th>
                    <th className="px-3 py-2 text-right">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {bookRows.map((h) => (
                    <tr key={`${h.product}-${h.symbol}`} className="border-t border-line">
                      <td className="px-3 py-2">
                        <Link to={`/app/stocks/${h.symbol}`} className="font-mono font-bold text-ink">
                          {h.symbol}
                        </Link>
                      </td>
                      <td className="px-3 py-2 text-muted">{h.product === 'intraday' ? 'MIS' : 'CNC'}</td>
                      <td className="px-3 py-2 text-right font-mono">{h.qty}</td>
                      <td className="px-3 py-2 text-right font-mono">₹{formatINR(h.avgPrice)}</td>
                      <td className="px-3 py-2 text-right font-mono">₹{formatINR(h.ltp)}</td>
                      <td className={`px-3 py-2 text-right font-mono font-bold ${h.pnl >= 0 ? 'text-up' : 'text-down'}`}>
                        {h.pnl >= 0 ? '+' : ''}₹{formatINR(h.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-2">
            <h3 className="text-sm font-extrabold">Practice orders</h3>
            <span className="text-[11px] font-bold text-muted">
              {practice?.summary?.tradeCount || 0} filled · {practice?.summary?.openCount || 0} open
            </span>
          </div>
          {(practice?.orders || []).length === 0 ? (
            <p className="rounded-xl border border-dashed border-line bg-surface-2/50 px-3 py-4 text-sm text-muted">
              No paper orders yet. Turn on Practice trading and place a buy or sell — it will list here.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[560px] text-left text-sm">
                <thead className="bg-surface-2 text-[10px] font-bold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-3 py-2">Time</th>
                    <th className="px-3 py-2">Symbol</th>
                    <th className="px-3 py-2">Side</th>
                    <th className="px-3 py-2">Type</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Price</th>
                    <th className="px-3 py-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {practice.orders.map((o) => (
                    <tr key={o.id} className="border-t border-line">
                      <td className="px-3 py-2 text-xs text-muted">
                        {new Date(o.createdAt).toLocaleString('en-IN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: 'short' })}
                      </td>
                      <td className="px-3 py-2">
                        <Link to={`/app/stocks/${o.symbol}`} className="font-mono font-bold">
                          {o.symbol}
                        </Link>
                      </td>
                      <td className={`px-3 py-2 font-mono font-bold ${o.side === 'buy' ? 'text-up' : 'text-down'}`}>
                        {o.side.toUpperCase()}
                      </td>
                      <td className="px-3 py-2 text-muted">{o.type} · {o.product === 'intraday' ? 'MIS' : 'CNC'}</td>
                      <td className="px-3 py-2 text-right font-mono">{o.qty}</td>
                      <td className="px-3 py-2 text-right font-mono">
                        ₹{formatINR(o.fillPrice || o.price || 0)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                          o.status === 'filled' ? 'bg-up-bg text-up'
                            : o.status === 'open' ? 'bg-surface-2 text-muted'
                              : 'bg-down-bg text-down'
                        }`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </section>

      <section className="card space-y-3 p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-extrabold">Practice progress</h2>
          <span className="rounded-md bg-surface-2 px-2 py-0.5 text-xs font-bold text-muted">
            {data?.completedCount || 0}/{data?.totalChallenges || 0}
          </span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-surface-2">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-muted">
          Challenges sync from practice trades (delivery buy, limit, SIP, alert).
        </p>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Challenges</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {(data?.challenges || []).map((c) => (
            <div
              key={c.id}
              className={`card space-y-2 p-4 ${c.completed ? 'border-page-accent' : ''}`}
            >
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-bold">{c.title}</h3>
                <span className={`shrink-0 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                  c.completed ? 'bg-up-bg text-up' : 'bg-surface-2 text-muted'
                }`}>
                  {c.completed ? 'Done' : 'Open'}
                </span>
              </div>
              <p className="text-sm text-muted">{c.hint}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-extrabold">Lessons</h2>
        {(data?.lessons || []).map((lesson) => {
          const open = openLesson === lesson.id
          return (
            <div key={lesson.id} className="card overflow-hidden">
              <button
                type="button"
                className="flex w-full items-center gap-3 px-4 py-3 text-left transition hover:bg-surface-2/50"
                onClick={() => setOpenLesson(open ? null : lesson.id)}
              >
                <span className="min-w-0 flex-1 font-bold">{lesson.title}</span>
                <span className="rounded-md bg-surface-2 px-2 py-0.5 text-[10px] font-bold text-muted">
                  {lesson.minutes} min
                </span>
                <span className="text-muted">{open ? '−' : '+'}</span>
              </button>
              {open && (
                <div className="space-y-3 border-t border-line px-4 py-4">
                  <p className="text-sm text-muted">{lesson.summary}</p>
                  <ul className="list-disc space-y-1.5 pl-5 text-sm">
                    {lesson.body.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <button type="button" className="btn btn-primary text-sm" onClick={() => completeLesson(lesson.id)}>
                      Mark complete
                    </button>
                    {lesson.id === 'sip' && (
                      <Link to="/app/mf" className="btn btn-ghost text-sm">Open mutual funds</Link>
                    )}
                    {lesson.id === 'market-vs-limit' && (
                      <button type="button" className="btn btn-ghost text-sm" onClick={startPracticeTrade}>
                        Practice a trade
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </section>

      <section className="card space-y-4 p-5">
        <h2 className="text-lg font-extrabold">Glossary</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          {(data?.glossary || []).map((g) => (
            <div key={g.term}>
              <div className="font-mono font-bold">{g.term}</div>
              <p className="mt-0.5 text-sm text-muted">{g.def}</p>
            </div>
          ))}
        </div>
      </section>
    </Screen>
  )
}

function PracticeMetric({ label, value, tone }) {
  return (
    <div className="rounded-xl border border-line bg-surface-2/40 px-3 py-2.5">
      <div className="text-[10px] font-bold uppercase tracking-wide text-muted">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${tone === 'up' ? 'text-up' : tone === 'down' ? 'text-down' : 'text-ink'}`}>
        {value}
      </div>
    </div>
  )
}
