import { Link } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'
import { formatINR } from '../lib/api'
import { IconSparkles, IconWallet } from './Icons'

const STARTING = 100000

/**
 * Practice classroom banner — use on Learn only.
 * Trading pages use normal Cash / Portfolio language.
 */
export function PaperWalletBanner({ compact = false, onReset, resetting = false, onPracticeTrade }) {
  const user = useAppSelector((s) => s.auth.user)
  const cash = user?.paperCash ?? user?.cash ?? 0
  const ready = !!user?.kycComplete

  if (compact) {
    return (
      <div className="paper-banner paper-banner-compact">
        <IconSparkles size={14} />
        <span>Practice classroom · ₹{formatINR(cash)} starter cash · learning only</span>
      </div>
    )
  }

  return (
    <section className="paper-banner">
      <div className="paper-banner-icon">
        <IconWallet size={20} />
      </div>
      <div className="paper-banner-copy">
        <p className="paper-banner-eyebrow">Paper trading · Learn only</p>
        <h2>
          {ready
            ? `Practice with ₹${formatINR(cash)} classroom cash`
            : `Complete KYC to unlock ₹${formatINR(STARTING)} practice cash`}
        </h2>
        <p>
          Paper orders and holdings show in the trade book below. Turn on Practice trading,
          place a buy/sell, then come back here to review them.
        </p>
      </div>
      <div className="paper-banner-actions">
        {ready ? (
          <>
            {onPracticeTrade ? (
              <button type="button" className="btn btn-primary text-xs bold" onClick={onPracticeTrade}>
                Practice a trade
              </button>
            ) : (
              <Link to="/app/explore" className="btn btn-primary text-xs bold">Practice a trade</Link>
            )}
            {onReset && (
              <button type="button" className="btn btn-ghost text-xs bold" onClick={onReset} disabled={resetting}>
                {resetting ? 'Resetting…' : 'Reset → ₹1L'}
              </button>
            )}
            <Link to="/app/funds" className="btn btn-ghost text-xs bold">Open wallet</Link>
          </>
        ) : (
          <Link to="/kyc" className="btn btn-primary text-xs bold">Complete KYC · unlock ₹1L</Link>
        )}
      </div>
    </section>
  )
}
