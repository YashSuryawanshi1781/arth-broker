import { Link } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import { formatINR } from '../lib/api'
import { IconSparkles, IconWallet } from './Icons'

const STARTING = 100000

/**
 * Persistent reminder that Arth cash/holdings are paper-only practice money.
 */
export function PaperWalletBanner({ compact = false }) {
  const user = useAppSelector((s) => s.auth.user)
  const cash = user?.paperCash ?? user?.cash ?? 0
  const ready = !!user?.kycComplete

  if (compact) {
    return (
      <div className="paper-banner paper-banner-compact">
        <IconSparkles size={14} />
        <span>Paper trading · ₹{formatINR(cash)} practice cash · not real money</span>
      </div>
    )
  }

  return (
    <section className="paper-banner">
      <div className="paper-banner-icon">
        <IconWallet size={20} />
      </div>
      <div className="paper-banner-copy">
        <p className="paper-banner-eyebrow">Paper trading classroom</p>
        <h2>
          {ready
            ? `Practice with ₹${formatINR(cash)} fake currency`
            : `Get ₹${formatINR(STARTING)} paper cash after KYC`}
        </h2>
        <p>
          Buy & sell stocks, watch charts, and track a practice portfolio.
          This balance is not your bank account — it&apos;s for learning only.
        </p>
      </div>
      <div className="paper-banner-actions">
        {ready ? (
          <>
            <Link to="/app/explore" className="btn btn-primary text-xs bold">Trade stocks</Link>
            <Link to="/app/investments" className="btn btn-ghost text-xs bold">Paper portfolio</Link>
            <Link to="/app/funds" className="btn btn-ghost text-xs bold">Paper wallet</Link>
          </>
        ) : (
          <Link to="/kyc" className="btn btn-primary text-xs bold">Complete KYC · unlock ₹1L</Link>
        )}
      </div>
    </section>
  )
}
