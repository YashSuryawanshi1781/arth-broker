import { useEffect } from 'react'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { clearToast } from '../features/ui/uiSlice'
import { IconAlertTriangle, IconCheckCircle, IconInfo, IconXCircle } from './Icons'

const STYLES = {
  success: 'border-up/30 bg-up-bg text-ink',
  error: 'border-down/30 bg-down-bg text-ink',
  warning: 'border-gold/40 bg-[#fff6e8] text-ink',
  info: 'border-line bg-surface text-ink',
}

const ICONS = {
  success: { Cmp: IconCheckCircle, className: 'text-up' },
  error: { Cmp: IconXCircle, className: 'text-down' },
  warning: { Cmp: IconAlertTriangle, className: 'text-gold' },
  info: { Cmp: IconInfo, className: 'text-brand-2' },
}

export function Toast() {
  const toast = useAppSelector((s) => s.ui.toast)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(() => dispatch(clearToast()), 3800)
    return () => clearTimeout(t)
  }, [toast, dispatch])

  if (!toast) return null

  const { Cmp, className: iconClass } = ICONS[toast.type] || ICONS.info

  return (
    <div className="pointer-events-none fixed inset-x-0 top-4 z-[100] flex justify-center px-4">
      <div
        className={`pointer-events-auto flex w-full max-w-md items-start gap-3 rounded-2xl border px-4 py-3 shadow-[0_12px_40px_rgb(11_27_51_/_0.16)] ${STYLES[toast.type] || STYLES.info}`}
        role="status"
      >
        <Cmp size={20} className={`mt-0.5 flex-none ${iconClass}`} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-extrabold">{toast.title}</p>
          {toast.message ? <p className="mt-0.5 text-sm text-muted">{toast.message}</p> : null}
        </div>
        <button
          type="button"
          className="rounded-lg p-1 text-muted hover:bg-black/5"
          onClick={() => dispatch(clearToast())}
          aria-label="Dismiss notification"
        >
          <IconXCircle size={16} />
        </button>
      </div>
    </div>
  )
}
