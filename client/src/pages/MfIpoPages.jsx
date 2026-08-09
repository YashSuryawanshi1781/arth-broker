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
          <span className="row gap-sm rounded border px-lg text-xs bold muted">
            <IconClock size={15} />
            {ipos.filter((i) => i.status === 'open').length} open now
          </span>
        }
      />
      <div className="grid gap-md">
        {ipos.map((ipo) => (
          <div key={ipo.id} className="card p-lg">
            <div className="row-start gap-md">
              <div className="row min- gap-md">
                <span className="icon-chip">
                  <IconRocket size={18} />
                </span>
                <div className="min-">
                  <div className="truncate bold">{ipo.name}</div>
                  <div className="text-xs muted">
                    ₹{ipo.priceMin}–{ipo.priceMax} · Lot {ipo.lotSize}
                  </div>
                </div>
              </div>
              <span className={`row shrink-0 gap-xs rounded px-lg text-[10px] bold uppercase ${ ipo.status === 'open' ? ' ' : ipo.status === 'upcoming' ? ' text-muted' : '-bg ' }`}>
                {ipo.status === 'open' ? <IconCheckCircle size={12} /> : <IconClock size={12} />}
                {ipo.status}
              </span>
            </div>
            <div className="mt-md row wrap gap-md text-xs muted">
              <span className="row gap-xs">
                <IconClock size={14} />
                {ipo.openDate} → {ipo.closeDate}
              </span>
              <span className="row gap-xs bold up">
                <IconTrendingUp size={14} />
                GMP ₹{ipo.gmp}
              </span>
            </div>
            {ipo.status === 'open' && (
              <button type="button" className="btn btn-primary mt-md text-sm" onClick={() => setSelected(ipo)}>
                <IconRocket size={16} />
                Apply
              </button>
            )}
          </div>
        ))}
      </div>

      <section className="card p-lg">
        <h2 className="mb-md row gap-sm extrabold">
          <span className="icon-chip icon-chip-sm">
            <IconDocument size={15} />
          </span>
          My applications
        </h2>
        {apps.length === 0 ? (
          <EmptyState
            art={IpoRocketArt}
            accent={PAGE_THEMES.ipo.accent}
            title="No IPO applications yet"
            message="Apply to an open issue above and track allotment here."
          />
        ) : (
          <div className="stack gap-md text-sm">
            {apps.map((a) => (
              <div key={a.id} className="row border-b border py-md">
                <div>
                  <div className="bold">{a.name}</div>
                  <div className="text-xs muted">{a.lots} lot(s) · {a.upi}</div>
                </div>
                <div className="right mono">
                  <div>₹{formatINR(a.amount)}</div>
                  <div className="text-xs muted">{a.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {selected && (
        <div className="fixed z-[90] grid p-lg">
          <div className="card theme-ipo w-full stack gap-md p-xl">
            <h2 className="row gap-md text-lg bold">
              <span className="icon-chip">
                <IconRocket size={18} />
              </span>
              Apply · {selected.name}
            </h2>
            <div>
              <label className="label">Lots</label>
              <input className="field" type="number" min={1} max={10} value={lots} onChange={(e) => setLots(e.target.value)} />
            </div>
            <div>
              <label className="label">UPI ID</label>
              <input className="field" value={upi} onChange={(e) => setUpi(e.target.value)} />
            </div>
            <p className="row gap-sm rounded bg-page-tint px-lg py-md text-sm bold">
              <IconCalculator size={16} className="text-page-accent" />
              Amount ≈ ₹{formatINR(selected.priceMax * selected.lotSize * Number(lots || 1))}
            </p>
            <div className="row gap-sm">
              <button type="button" className="btn btn-ghost grow" onClick={() => setSelected(null)}>Close</button>
              <button type="button" className="btn btn-primary grow" onClick={apply}>
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
