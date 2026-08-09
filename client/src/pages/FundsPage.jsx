import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, formatINR } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { setUser } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { EmptyState, PageHeader, Screen } from '../components/Screen'
import { PaperWalletBanner } from '../components/PaperWalletBanner'
import { EmptyFundsArt } from '../components/Illustrations'
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBank,
  IconDocument,
  IconRefresh,
  IconWallet,
} from '../components/Icons'
import { PAGE_THEMES } from '../lib/theme'

export function FundsPage() {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const [ledger, setLedger] = useState([])
  const [amount, setAmount] = useState('10000')
  const [mode, setMode] = useState('add')
  const [resetting, setResetting] = useState(false)

  const load = () => {
    api('/portfolio/funds').then((d) => {
      setLedger(d.ledger || [])
      if (d.cash != null) dispatch(setUser({ ...user, cash: d.cash, paperCash: d.cash }))
    }).catch(() => {})
  }

  useEffect(load, [])

  const submit = async (e) => {
    e.preventDefault()
    const value = Number(amount)
    if (!(value > 0)) {
      dispatch(showToast({ type: 'warning', title: 'Invalid amount', message: 'Enter an amount greater than 0' }))
      return
    }
    try {
      const path = mode === 'add' ? '/portfolio/funds/add' : '/portfolio/funds/withdraw'
      const data = await api(path, { method: 'POST', body: { amount: value } })
      dispatch(setUser(data.user))
      dispatch(showToast({
        type: 'success',
        title: mode === 'add' ? 'Paper cash added' : 'Paper withdrawal simulated',
        message: `₹${formatINR(value)} ${mode === 'add' ? 'credited to practice wallet' : 'removed from practice wallet'}`,
      }))
      load()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Transaction failed', message: err.message }))
    }
  }

  const resetPaper = async () => {
    if (!window.confirm('Reset paper portfolio? Holdings and open orders will be cleared and cash restored to ₹1,00,000 fake currency.')) {
      return
    }
    setResetting(true)
    try {
      const data = await api('/portfolio/paper/reset', { method: 'POST' })
      dispatch(setUser(data.user))
      dispatch(showToast({
        type: 'success',
        title: 'Paper wallet reset',
        message: '₹1,00,000 practice cash restored. Not real money.',
      }))
      load()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Reset failed', message: err.message }))
    } finally {
      setResetting(false)
    }
  }

  const quickAmounts = [5000, 10000, 25000, 50000]

  return (
    <Screen theme="funds">
      <PageHeader
        icon={IconWallet}
        eyebrow="Paper wallet"
        title="Practice cash & ledger"
        subtitle="₹1,00,000 fake currency by default — add/withdraw is simulated for learning"
      />

      <PaperWalletBanner compact />

      <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
        <div className="card tile-accent h-fit p-5">
          <p className="flex items-center gap-1.5 text-xs font-bold tracking-wide text-muted uppercase">
            <IconWallet size={15} className="text-page-accent" />
            Paper cash
          </p>
          <p className="mt-1 font-mono text-3xl font-bold">₹{formatINR(user?.cash)}</p>
          <p className="mt-1 text-xs text-muted">Starting capital ₹1,00,000 · not your bank balance</p>

          <div className="mt-4 flex overflow-hidden rounded-xl border border-line bg-surface-2 p-1">
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold ${mode === 'add' ? 'bg-accent text-white' : 'text-muted'}`}
              onClick={() => setMode('add')}
            >
              <IconArrowDownLeft size={16} />
              Add
            </button>
            <button
              type="button"
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-sm font-bold ${mode === 'withdraw' ? 'bg-brand text-white' : 'text-muted'}`}
              onClick={() => setMode('withdraw')}
            >
              <IconArrowUpRight size={16} />
              Withdraw
            </button>
          </div>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div>
              <label className="label">Amount (fake ₹)</label>
              <input className="field" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="flex flex-wrap gap-1.5">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="rounded-lg border border-line bg-surface px-2.5 py-1 text-xs font-bold text-muted transition hover:border-page-accent hover:text-page-accent"
                  onClick={() => setAmount(String(amt))}
                >
                  +{formatINR(amt)}
                </button>
              ))}
            </div>
            <p className="flex items-start gap-2 text-xs text-muted">
              <IconBank size={15} className="mt-px flex-none text-page-accent" />
              {mode === 'add'
                ? 'Simulated top-up for practice only (mock gateway).'
                : 'Simulated withdraw — removes paper cash from this wallet.'}
            </p>
            <button className="btn btn-primary w-full" type="submit">
              {mode === 'add' ? <IconArrowDownLeft size={17} /> : <IconArrowUpRight size={17} />}
              {mode === 'add' ? 'Add paper cash' : 'Withdraw paper cash'}
            </button>
          </form>

          <div className="mt-4 border-t border-line pt-4">
            <button
              type="button"
              className="btn btn-ghost w-full text-xs bold"
              onClick={resetPaper}
              disabled={resetting}
            >
              <IconRefresh size={15} />
              {resetting ? 'Resetting…' : 'Reset paper portfolio → ₹1L'}
            </button>
            <p className="mt-2 text-center text-[11px] text-muted">
              Clears stock holdings & open orders, restores ₹1,00,000
            </p>
            <Link to="/app/explore" className="mt-3 btn btn-dark w-full text-xs bold">
              Start buying stocks
            </Link>
          </div>
        </div>

        <div className="card p-4">
          <h2 className="mb-3 flex items-center gap-2 font-extrabold tracking-tight">
            <span className="icon-chip icon-chip-sm">
              <IconDocument size={15} />
            </span>
            Paper ledger
          </h2>
          <div>
            {ledger.map((l) => {
              const credit = l.type === 'credit'
              return (
                <div key={l.id} className="flex items-center gap-3 border-b border-line py-2.5 text-sm last:border-b-0">
                  <span
                    className={`grid h-8 w-8 flex-none place-items-center rounded-xl ${
                      credit ? 'bg-up-bg text-up' : 'bg-down-bg text-down'
                    }`}
                  >
                    {credit ? <IconArrowDownLeft size={16} /> : <IconArrowUpRight size={16} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-semibold">{l.note}</div>
                    <div className="text-xs text-muted">{new Date(l.createdAt).toLocaleString('en-IN')}</div>
                  </div>
                  <div className={`font-mono font-bold ${credit ? 'text-up' : 'text-down'}`}>
                    {credit ? '+' : '-'}₹{formatINR(l.amount)}
                  </div>
                </div>
              )
            })}
            {ledger.length === 0 && (
              <EmptyState
                art={EmptyFundsArt}
                accent={PAGE_THEMES.funds.accent}
                title="No paper movements yet"
                message="Complete KYC for ₹1L starting cash, then buy stocks to see the ledger update."
              />
            )}
          </div>
        </div>
      </div>
    </Screen>
  )
}
