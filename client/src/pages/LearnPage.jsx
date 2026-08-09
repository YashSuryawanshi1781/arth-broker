import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Button,
  Chip,
  LinearProgress,
  Switch,
  Typography,
} from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
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

  return (
    <Screen theme="home" className="stack gap-lg">
      <PageHeader
        icon={IconSparkles}
        eyebrow="Paper trading school"
        title="Learn"
        subtitle="Guided practice for beginners — still simulated money only."
        actions={
          <div className="row gap-sm">
            <Typography variant="body2" className="muted">Learning mode</Typography>
            <Switch
              checked={data?.learningMode ?? user?.learningMode ?? true}
              disabled={busy}
              onChange={(e) => toggleMode(e.target.checked)}
            />
          </div>
        }
      />

      <section className="card p-lg stack gap-md">
        <div className="row-between">
          <Typography fontWeight={800}>Practice progress</Typography>
          <Chip size="small" label={`${data?.completedCount || 0}/${data?.totalChallenges || 0}`} />
        </div>
        <LinearProgress variant="determinate" value={pct} sx={{ height: 8, borderRadius: 99 }} />
        <Typography variant="caption" color="text.secondary">
          Complete challenges by trading for real on Arth (paper). Sync runs automatically.
        </Typography>
      </section>

      <section className="stack gap-md">
        <Typography variant="h6" fontWeight={800}>Challenges</Typography>
        <div className="grid-2 gap-md">
          {(data?.challenges || []).map((c) => (
            <div key={c.id} className={`card p-lg stack gap-sm ${c.completed ? 'border-page-accent' : ''}`}>
              <div className="row-between">
                <Typography fontWeight={800}>{c.title}</Typography>
                <Chip size="small" color={c.completed ? 'success' : 'default'} label={c.completed ? 'Done' : 'Open'} />
              </div>
              <Typography variant="body2" color="text.secondary">{c.hint}</Typography>
            </div>
          ))}
        </div>
      </section>

      <section className="stack gap-md">
        <Typography variant="h6" fontWeight={800}>Lessons</Typography>
        {(data?.lessons || []).map((lesson) => (
          <Accordion key={lesson.id} disableGutters elevation={0} className="card">
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <div className="row gap-md grow">
                <Typography fontWeight={700}>{lesson.title}</Typography>
                <Chip size="small" label={`${lesson.minutes} min`} />
              </div>
            </AccordionSummary>
            <AccordionDetails className="stack gap-md">
              <Typography color="text.secondary">{lesson.summary}</Typography>
              <ul className="stack gap-sm" style={{ paddingLeft: '1.1rem', margin: 0 }}>
                {lesson.body.map((line) => (
                  <li key={line}><Typography variant="body2">{line}</Typography></li>
                ))}
              </ul>
              <div className="row gap-sm">
                <Button variant="contained" onClick={() => completeLesson(lesson.id)}>Mark complete</Button>
                {lesson.id === 'sip' && <Button component={Link} to="/app/mf" variant="outlined">Open mutual funds</Button>}
                {lesson.id === 'market-vs-limit' && <Button component={Link} to="/app/explore" variant="outlined">Explore stocks</Button>}
              </div>
            </AccordionDetails>
          </Accordion>
        ))}
      </section>

      <section className="card p-lg stack gap-md">
        <Typography variant="h6" fontWeight={800}>Glossary</Typography>
        <div className="grid-2 gap-md">
          {(data?.glossary || []).map((g) => (
            <div key={g.term}>
              <Typography fontWeight={800} className="mono">{g.term}</Typography>
              <Typography variant="body2" color="text.secondary">{g.def}</Typography>
            </div>
          ))}
        </div>
      </section>
    </Screen>
  )
}
