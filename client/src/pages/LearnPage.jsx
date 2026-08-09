import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { setUser } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { PageHeader, Screen } from '../components/Screen'
import { IconSparkles } from '../components/Icons'

export function LearnPage() {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const [data, setData] = useState(null)
  const [busy, setBusy] = useState(false)
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
      dispatch(showToast({ type: 'success', title: enabled ? 'Learning mode on' : 'Learning mode off' }))
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Could not update', message: err.message }))
    } finally {
      setBusy(false)
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
  const learningOn = data?.learningMode ?? user?.learningMode ?? true

  return (
    <Screen theme="home" className="stack gap-lg">
      <PageHeader
        icon={IconSparkles}
        eyebrow="Paper trading school"
        title="Learn"
        subtitle="Guided practice for beginners — still simulated money only."
        actions={
          <label className="flex items-center gap-2 rounded-xl border border-line bg-surface px-3 py-1.5 text-sm">
            <span className="text-muted">Learning mode</span>
            <input
              type="checkbox"
              checked={learningOn}
              disabled={busy}
              onChange={(e) => toggleMode(e.target.checked)}
            />
          </label>
        }
      />

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
          Complete challenges by trading for real on Arth (paper). Sync runs automatically.
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
                      <Link to="/app/explore" className="btn btn-ghost text-sm">Explore stocks</Link>
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
