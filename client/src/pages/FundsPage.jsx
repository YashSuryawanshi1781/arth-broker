import { useEffect, useState } from 'react'
import { api, formatINR } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { setUser } from '../features/auth/authSlice'
import { showToast } from '../features/ui/uiSlice'
import { EmptyState, PageHeader, Screen } from '../components/Screen'
import { EmptyFundsArt } from '../components/Illustrations'
import {
  IconArrowDownLeft,
  IconArrowUpRight,
  IconBank,
  IconDocument,
  IconWallet,
} from '../components/Icons'
import { PAGE_THEMES } from '../lib/theme'

export function FundsPage() {
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const [ledger, setLedger] = useState([])
  const [amount, setAmount] = useState('10000')
  const [mode, setMode] = useState('add')

  const load = () => {
    api('/portfolio/funds').then((d) => {
      setLedger(d.ledger || [])
      if (d.cash != null) dispatch(setUser({ ...user, cash: d.cash }))
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
        title: mode === 'add' ? 'Money added' : 'Withdrawal initiated',
        message: `₹${formatINR(value)} ${mode === 'add' ? 'credited' : 'sent to bank'}`,
      }))
      load()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Transaction failed', message: err.message }))
    }
  }

  const quickAmounts = [5000, 10000, 25000, 50000]

  return (
    <Screen theme="funds">
      <PageHeader
        icon={IconWallet}
        eyebrow="Funds"
        title="Money & ledger"
        subtitle="Add or withdraw demo capital and review every movement"
      />
      <div className="grid gap-lg ]">
        <div className="card tile-accent h-fit p-xl">
          <p className="row gap-sm text-xs bold muted uppercase">
            <IconWallet size={15} className="text-page-accent" />
            Available cash
          </p>
          <p className="mt-sm mono text-3xl bold">₹{formatINR(user?.cash)}</p>
          <div className="mt-lg row overflow-hidden rounded border p-1">
            <button
              type="button"
              className={`row grow gap-sm rounded py-md text-sm bold ${mode === 'add' ? 'bg-accent text-white' : 'text-muted'}`}
              onClick={() => setMode('add')}
            >
              <IconArrowDownLeft size={16} />
              Add
            </button>
            <button
              type="button"
              className={`row grow gap-sm rounded py-md text-sm bold ${mode === 'withdraw' ? 'bg-brand text-white' : 'text-muted'}`}
              onClick={() => setMode('withdraw')}
            >
              <IconArrowUpRight size={16} />
              Withdraw
            </button>
          </div>
          <form onSubmit={submit} className="mt-lg stack gap-md">
            <div>
              <label className="label">Amount</label>
              <input className="field" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="row wrap gap-sm">
              {quickAmounts.map((amt) => (
                <button
                  key={amt}
                  type="button"
                  className="rounded border py-md text-xs bold muted"
                  onClick={() => setAmount(String(amt))}
                >
                  +{formatINR(amt)}
                </button>
              ))}
            </div>
            <p className="row-start gap-sm text-xs muted">
              <IconBank size={15} className="mt-px shrink-0 text-page-accent" />
              {mode === 'add' ? 'Mock Razorpay checkout (may randomly decline).' : 'Withdraws to KYC-linked bank.'}
            </p>
            <button className="btn btn-primary w-full" type="submit">
              {mode === 'add' ? <IconArrowDownLeft size={17} /> : <IconArrowUpRight size={17} />}
              {mode === 'add' ? 'Add money' : 'Withdraw'}
            </button>
          </form>
        </div>

        <div className="card p-lg">
          <h2 className="mb-md row gap-sm extrabold">
            <span className="icon-chip icon-chip-sm">
              <IconDocument size={15} />
            </span>
            Ledger
          </h2>
          <div>
            {ledger.map((l) => {
              const credit = l.type === 'credit'
              return (
                <div key={l.id} className="row gap-md border-b border py-md text-sm">
                  <span
                    className={`grid shrink-0 rounded ${ credit ? ' ' : '-bg ' }`}
                  >
                    {credit ? <IconArrowDownLeft size={16} /> : <IconArrowUpRight size={16} />}
                  </span>
                  <div className="min- grow">
                    <div className="truncate bold">{l.note}</div>
                    <div className="text-xs muted">{new Date(l.createdAt).toLocaleString('en-IN')}</div>
                  </div>
                  <div className={`mono bold ${credit ? '' : ''}`}>
                    {credit ? '+' : '-'}₹{formatINR(l.amount)}
                  </div>
                </div>
              )
            })}
            {ledger.length === 0 && (
              <EmptyState
                art={EmptyFundsArt}
                accent={PAGE_THEMES.funds.accent}
                title="No transactions yet"
                message="Add demo money to see credits and debits listed here."
              />
            )}
          </div>
        </div>
      </div>
    </Screen>
  )
}
