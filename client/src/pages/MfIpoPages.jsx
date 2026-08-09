import { useEffect, useState } from 'react'
import { api, formatINR } from '../lib/api'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { showToast } from '../features/ui/uiSlice'
import { useNavigate } from 'react-router-dom'
import { EmptyState, PageHeader, Screen } from '../components/Screen'
import { IpoRocketArt } from '../components/Illustrations'
import {
  IconCalculator,
  IconCheckCircle,
  IconClock,
  IconDocument,
  IconRocket,
  IconTrendingUp,
} from '../components/Icons'
import { PAGE_THEMES } from '../lib/theme'

export function IpoPage() {
  const [ipos, setIpos] = useState([])
  const [apps, setApps] = useState([])
  const [selected, setSelected] = useState(null)
  const [lots, setLots] = useState(1)
  const [upi, setUpi] = useState('investor@upi')
  const user = useAppSelector((s) => s.auth.user)
  const dispatch = useAppDispatch()
  const navigate = useNavigate()

  const load = () => {
    api('/ipo').then((d) => setIpos(d.ipos || [])).catch(() => {})
    api('/ipo/applications').then((d) => setApps(d.applications || [])).catch(() => {})
  }

  useEffect(load, [])

  const apply = async () => {
    if (!user?.kycComplete) {
      dispatch(showToast({ type: 'warning', title: 'KYC required', message: 'Complete KYC to apply for IPOs' }))
      navigate('/kyc')
      return
    }
    if (!upi.includes('@')) {
      dispatch(showToast({ type: 'warning', title: 'Invalid UPI', message: 'Enter a UPI ID like name@upi' }))
      return
    }
    try {
      await api('/ipo/apply', { method: 'POST', body: { ipoId: selected.id, lots: Number(lots), upi } })
      dispatch(showToast({ type: 'success', title: 'IPO applied', message: selected.name }))
      setSelected(null)
      load()
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Failed', message: err.message }))
    }
  }

  return (
    <Screen theme="ipo" className="stack gap-md">
      <PageHeader
        icon={IconRocket}
        eyebrow="Primary market"
        title="IPOs"
        subtitle="Apply with UPI and track allotment status"
        actions={
          <span className="flex items-center gap-1.5 rounded-lg border border-line px-3 py-1.5 text-xs font-bold text-muted">
            <IconClock size={15} />
            {ipos.filter((i) => i.status === 'open').length} open now
          </span>
        }
      />
      <div className="grid gap-3">
        {ipos.map((ipo) => (
          <div key={ipo.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="icon-chip">
                  <IconRocket size={18} />
                </span>
                <div className="min-w-0">
                  <div className="truncate font-bold">{ipo.name}</div>
                  <div className="text-xs text-muted">
                    ₹{ipo.priceMin}–{ipo.priceMax} · Lot {ipo.lotSize}
                  </div>
                </div>
              </div>
              <span
                className={`inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-bold uppercase ${
                  ipo.status === 'open'
                    ? 'bg-up-bg text-up'
                    : ipo.status === 'upcoming'
                      ? 'bg-surface-2 text-muted'
                      : 'bg-down-bg text-down'
                }`}
              >
                {ipo.status === 'open' ? <IconCheckCircle size={12} /> : <IconClock size={12} />}
                {ipo.status}
              </span>
            </div>
            <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted">
              <span className="inline-flex items-center gap-1">
                <IconClock size={14} />
                {ipo.openDate} → {ipo.closeDate}
              </span>
              <span className="inline-flex items-center gap-1 font-bold text-up">
                <IconTrendingUp size={14} />
                GMP ₹{ipo.gmp}
              </span>
            </div>
            {ipo.status === 'open' && (
              <button type="button" className="btn btn-primary mt-3 text-sm" onClick={() => setSelected(ipo)}>
                <IconRocket size={16} />
                Apply
              </button>
            )}
          </div>
        ))}
        {ipos.length === 0 && (
          <EmptyState
            art={IpoRocketArt}
            accent={PAGE_THEMES.ipo.accent}
            title="No IPOs listed"
            message="Open and upcoming issues will appear here."
          />
        )}
      </div>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h2 className="flex items-center gap-2 text-sm font-extrabold">
            <span className="icon-chip icon-chip-sm">
              <IconDocument size={15} />
            </span>
            My applications
          </h2>
        </div>
        {apps.length === 0 ? (
          <EmptyState
            art={IpoRocketArt}
            accent={PAGE_THEMES.ipo.accent}
            title="No IPO applications yet"
            message="Apply to an open issue above and track allotment here."
          />
        ) : (
          <div className="divide-y divide-line">
            {apps.map((a) => (
              <div key={a.id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
                <div className="min-w-0">
                  <div className="truncate font-bold">{a.name}</div>
                  <div className="text-xs text-muted">{a.lots} lot(s) · {a.upi}</div>
                </div>
                <div className="shrink-0 text-right font-mono">
                  <div>₹{formatINR(a.amount)}</div>
                  <div className="text-xs text-muted">{a.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed inset-0 z-[90] grid place-items-center bg-ink/40 p-4">
          <div className="card theme-ipo w-full max-w-md space-y-4 p-6">
            <h2 className="flex items-center gap-3 text-lg font-bold">
              <span className="icon-chip">
                <IconRocket size={18} />
              </span>
              Apply · {selected.name}
            </h2>
            <div>
              <label className="label" htmlFor="ipo-lots">Lots</label>
              <input
                id="ipo-lots"
                className="field"
                type="number"
                min={1}
                max={10}
                value={lots}
                onChange={(e) => setLots(e.target.value)}
              />
            </div>
            <div>
              <label className="label" htmlFor="ipo-upi">UPI ID</label>
              <input
                id="ipo-upi"
                className="field"
                value={upi}
                onChange={(e) => setUpi(e.target.value)}
                placeholder="name@upi"
              />
            </div>
            <p className="flex items-center gap-2 rounded-xl bg-page-tint px-3 py-2 text-sm font-semibold">
              <IconCalculator size={16} className="text-page-accent" />
              Amount ≈ ₹{formatINR(selected.priceMax * selected.lotSize * Number(lots || 1))}
            </p>
            <div className="flex gap-2">
              <button type="button" className="btn btn-ghost flex-1" onClick={() => setSelected(null)}>Close</button>
              <button type="button" className="btn btn-primary flex-1" onClick={apply}>
                <IconCheckCircle size={16} />
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </Screen>
  )
}
