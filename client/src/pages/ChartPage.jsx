import { Link, useParams } from 'react-router-dom'
import { AdvancedChart } from '../components/AdvancedChart'
import { BrandLockup } from '../components/Brand'
import { ApiStatusBanner } from '../components/ApiStatusBanner'
import { useAppSelector } from '../app/hooks'
import { useMarketStream } from '../hooks/useMarketStream'
import { formatINR } from '../lib/api'
import { IconArrowLeft, IconTrendingDown, IconTrendingUp } from '../components/Icons'

export function StockChartPage() {
  const { symbol } = useParams()
  const sym = symbol?.toUpperCase()
  useMarketStream()

  const live = useAppSelector((s) => s.market.instruments[sym])
  const up = (live?.changePct ?? 0) >= 0

  return (
    <ChartWorkspace
      title={sym}
      subtitle={live?.name || 'Equity chart'}
      backTo={`/app/stocks/${sym}`}
      backLabel="Back to stock"
      price={live ? `₹${formatINR(live.price)}` : '—'}
      change={live ? `${up ? '+' : ''}${live.changePct}%` : ''}
      up={up}
    >
      <AdvancedChart
        symbol={sym}
        live={live || { symbol: sym, price: 0 }}
        variant="page"
      />
    </ChartWorkspace>
  )
}

export function IndexChartPage() {
  const { key } = useParams()
  useMarketStream()

  const live = useAppSelector((s) => s.market.indices?.[key])
  const up = (live?.changePct ?? 0) >= 0

  return (
    <ChartWorkspace
      title={live?.name || key?.toUpperCase()}
      subtitle="Index chart"
      backTo={`/app/indices/${key}`}
      backLabel="Back to index"
      price={live ? Number(live.value).toLocaleString('en-IN') : '—'}
      change={live ? `${up ? '+' : ''}${live.changePct}%` : ''}
      up={up}
    >
      <AdvancedChart
        symbol={key}
        candlesPath={`/market/indices/${key}/candles`}
        live={{ price: live?.value, symbol: key }}
        variant="page"
      />
    </ChartWorkspace>
  )
}

function ChartWorkspace({ title, subtitle, backTo, backLabel, price, change, up, children }) {
  return (
    <div className="chart-page">
      <div className="fixed inset-x-0 top-0 z-30">
        <ApiStatusBanner />
      </div>

      <header className="chart-page-bar">
        <div className="chart-page-bar-left">
          <Link to="/app" className="shrink-0" aria-label="Arth home">
            <BrandLockup size="sm" tagline={false} />
          </Link>
          <span className="chart-page-divider" aria-hidden="true" />
          <div className="min-w-0">
            <div className="chart-page-title">{title}</div>
            <div className="chart-page-sub">{subtitle}</div>
          </div>
        </div>

        <div className="chart-page-bar-price">
          <span className="chart-page-ltp">{price}</span>
          {change ? (
            <span className={`inline-flex items-center gap-1 text-sm font-bold ${up ? 'text-up' : 'text-down'}`}>
              {up ? <IconTrendingUp size={14} /> : <IconTrendingDown size={14} />}
              {change}
            </span>
          ) : null}
        </div>

        <Link to={backTo} className="btn btn-ghost text-xs bold row gap-sm">
          <IconArrowLeft size={14} />
          {backLabel}
        </Link>
      </header>

      <div className="chart-page-body">{children}</div>
    </div>
  )
}
