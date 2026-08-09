import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { api } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { setUser } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { PageHeader, Screen } from '../components/Screen'
import { IconShield } from '../components/Icons'

const DEMO_EMAIL = 'demo@arth.app'

export function AdminPage() {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const [busy, setBusy] = useState(false)

  if (user && user.email !== DEMO_EMAIL) {
    return <Navigate to="/app" replace />
  }

  const reset = async () => {
    if (!window.confirm('Reset demo account to sample holdings and ₹2,50,000 cash?')) return
    setBusy(true)
    try {
      const data = await api('/admin/reset-demo', { method: 'POST' })
      if (data.user) dispatch(setUser(data.user))
      dispatch(showToast({ type: 'success', title: 'Demo reset complete' }))
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Reset failed', message: err.message }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Screen theme="account" className="stack gap-md">
      <PageHeader
        icon={IconShield}
        eyebrow="Demo tools"
        title="Admin"
        subtitle="Soft-reset the demo@arth.app paper account"
      />

      <div className="card max-w-xl space-y-4 p-6">
        <p className="text-sm leading-relaxed text-muted">
          Clears orders, holdings, alerts and activity for the demo user, restores ₹2,50,000 cash
          and re-seeds sample stock / MF positions.
        </p>
        <p className="text-xs text-muted">
          Signed in as <span className="font-mono font-bold text-ink">{user?.email || '…'}</span>
        </p>
        <button type="button" className="btn btn-dark" disabled={busy} onClick={reset}>
          {busy ? 'Resetting…' : 'Reset demo account'}
        </button>
      </div>
    </Screen>
  )
}
