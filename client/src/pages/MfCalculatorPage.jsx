import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { PageHeader, Screen } from '../components/Screen'
import { BreadcrumbBar } from '../components/BreadcrumbBar'
import { GrowthChart, GrowthDonut } from '../components/CalculatorWidgets'
import { FundLogo } from '../components/MfWidgets'
import { api, formatINR, formatINRShort } from '../lib/api'
import { buildProjection } from '../lib/projection'
import {
  IconCalculator,
  IconCoins,
  IconRocket,
  IconSparkles,
  IconStar,
} from '../components/Icons'

const MODES = [
  ['sip', 'Monthly SIP', IconSparkles],
  ['lumpsum', 'One-time', IconCoins],
  ['stepup', 'Step-up SIP', IconRocket],
  ['goal', 'Goal planner', IconStar],
]

export function MfCalculatorPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const fundId = searchParams.get('fund') || ''

  const [fund, setFund] = useState(null)
  const [mode, setMode] = useState('sip')
  const [amount, setAmount] = useState(5000)
  const [years, setYears] = useState(10)
  const [rate, setRate] = useState(12)
  const [stepUp, setStepUp] = useState(10)
  const [goal, setGoal] = useState(10000000)

  useEffect(() => {
    if (!fundId) {
      setFund(null)
      return undefined
    }
    let cancelled = false
    api(`/mf/${fundId}`)
      .then((data) => {
        if (cancelled) return
        setFund(data.fund)
        setRate(data.fund.returns['5y'] ?? data.fund.returns['3y'] ?? 12)
        setAmount((current) => Math.max(current, data.fund.minSip || 500))
      })
      .catch(() => {
        if (!cancelled) setFund(null)
      })
    return () => {
      cancelled = true
    }
  }, [fundId])

  const result = useMemo(
    () => buildProjection({ mode, amount, years, rate, stepUp, goal }),
    [mode, amount, years, rate, stepUp, goal],
  )

  const clearFund = () => {
    setSearchParams({}, { replace: true })
  }

  return (
    <Screen theme="mf" className="stack gap-md">
      <BreadcrumbBar
        fallback={fund ? `/app/mf/${fund.id}` : '/app/mf'}
        items={[
          { label: 'Mutual funds', to: '/app/mf' },
          ...(fund ? [{ label: fund.amcShort || fund.name, to: `/app/mf/${fund.id}` }] : []),
          { label: 'Calculator' },
        ]}
      />

      <PageHeader
        icon={IconCalculator}
        eyebrow="Planning"
        title="Investment calculator"
        subtitle="Plan SIPs, lumpsum investments and long-term financial goals"
        actions={
          fund ? (
            <button type="button" className="btn btn-ghost text-sm" onClick={clearFund}>
              Use custom rate
            </button>
          ) : (
            <Link to="/app/mf" className="btn btn-ghost text-sm">Pick a fund</Link>
          )
        }
      />

      {fund && (
        <ReturnBasisBar fund={fund} rate={rate} onRate={setRate} />
      )}

      <nav className="row gap-xs overflow-auto rounded border p-1">
        {MODES.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={`row gap-sm rounded px-lg py-md text-sm bold ${ mode === id ? 'bg-brand text-white shadow-sm' : 'text-muted hover:' }`}
            onClick={() => setMode(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <section className="card overflow-hidden">
        <div className="grid">
          <div className="stack gap-md p-xl">
            {mode === 'goal' ? (
              <Range
                label="Target corpus"
                display={`₹${formatINRShort(goal)}`}
                min={100000}
                max={100000000}
                step={100000}
                value={goal}
                onChange={setGoal}
              />
            ) : (
              <Range
                label={mode === 'lumpsum' ? 'One-time investment' : 'Monthly investment'}
                display={`₹${formatINR(amount)}`}
                min={500}
                max={mode === 'lumpsum' ? 5000000 : 200000}
                step={500}
                value={amount}
                onChange={setAmount}
              />
            )}

            {mode === 'stepup' && (
              <Range
                label="Annual step-up"
                display={`${stepUp}% per year`}
                min={0}
                max={50}
                step={1}
                value={stepUp}
                onChange={setStepUp}
              />
            )}

            <Range
              label="Expected return rate"
              display={`${rate}% p.a.`}
              min={1}
              max={30}
              step={0.1}
              value={rate}
              onChange={setRate}
            />

            <Range
              label="Investment period"
              display={`${years} ${years === 1 ? 'year' : 'years'}`}
              min={1}
              max={40}
              step={1}
              value={years}
              onChange={setYears}
            />

            {mode !== 'goal' && amount > 0 && (
              <div className="grid-3 gap-sm">
                <MiniFact label="Monthly" value={mode === 'lumpsum' ? '—' : `₹${formatINRShort(amount)}`} />
                <MiniFact label="Total invested" value={`₹${formatINRShort(result.invested)}`} />
                <MiniFact label="Wealth gained" value={`₹${formatINRShort(result.gain)}`} tone="up" />
              </div>
            )}

            <p className="rounded px-lg py-md text-xs leading-relaxed muted">
              {fund
                ? `Projections use ${fund.name}'s historical returns. Past performance does not guarantee future results and market-linked returns vary year to year.`
                : 'Projections assume a constant annual return compounded monthly. Actual mutual fund returns are market-linked, vary year to year, and are not guaranteed.'}
            </p>
          </div>

          <div className="stack px-lg py-md">
            <GrowthDonut
              invested={result.invested}
              gain={result.gain}
              variant="dark"
              caption={mode === 'goal' ? 'Target corpus' : 'Projected value'}
            />

            <div className="mt-xl stack gap-md">
              {mode === 'goal' && (
                <div className="rounded border p-md">
                  <div className="text-xs">Monthly SIP required</div>
                  <div className="mt-sm mono text-2xl bold">₹{formatINR(result.required || 0)}</div>
                </div>
              )}
              {mode === 'stepup' && result.finalMonthly && (
                <div className="row-between text-sm">
                  <span className="">Final monthly SIP</span>
                  <span className="mono bold">₹{formatINR(result.finalMonthly)}</span>
                </div>
              )}
              <div className="border-t">
                <div className="text-xs">
                  {mode === 'goal' ? 'Target corpus' : 'Projected value'}
                </div>
                <div className="mt-sm mono text-3xl bold">₹{formatINR(result.value)}</div>
                <div className="mt-sm text-xs">
                  {((result.gain / (result.invested || 1)) * 100).toFixed(1)}% wealth gain over {years} years
                </div>
              </div>
            </div>

            <Link
              to={fund ? `/app/mf/${fund.id}` : '/app/mf'}
              className="btn btn-primary mt-xl"
            >
              {fund ? `Invest in ${fund.amcShort}` : 'Explore funds to invest'}
            </Link>
          </div>
        </div>
      </section>

      <section className="card p-lg">
        <div className="mb-md row flex-wrap gap-sm">
          <h3 className="extrabold">Growth projection</h3>
          <span className="text-xs muted">
            {rate}% p.a. compounded monthly over {years} {years === 1 ? 'year' : 'years'}
          </span>
        </div>
        <GrowthChart schedule={result.schedule} />
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border px-lg py-md">
          <h3 className="extrabold">Year-by-year projection</h3>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky">
              <tr className="border-b border text-[10px] bold muted uppercase">
                <th className="px-lg py-md">Year</th>
                <th className="px-lg py-md right">Invested</th>
                <th className="px-lg py-md right">Returns</th>
                <th className="px-lg py-md right">Total value</th>
                <th className="px-lg py-md right">Growth</th>
              </tr>
            </thead>
            <tbody className="mono">
              {result.schedule.slice(1).map((row) => (
                <tr key={row.year} className="border-b border last:border-0">
                  <td className="px-lg py-md bold">Year {row.year}</td>
                  <td className="px-lg py-md right muted">₹{formatINRShort(row.invested)}</td>
                  <td className="px-lg py-md right bold up">₹{formatINRShort(row.gain)}</td>
                  <td className="px-lg py-md right bold">₹{formatINRShort(row.value)}</td>
                  <td className="px-lg py-md right muted">
                    {row.invested > 0 ? `${((row.gain / row.invested) * 100).toFixed(1)}%` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </Screen>
  )
}

/** Lets the user project using any of the fund's real historical return figures. */
function ReturnBasisBar({ fund, rate, onRate }) {
  const options = [
    ['1Y return', fund.returns['1y']],
    ['3Y CAGR', fund.returns['3y']],
    ['5Y CAGR', fund.returns['5y']],
    ['Since launch', fund.returns.all],
    ['Category avg', fund.categoryReturns?.['5y']],
    ['Benchmark', fund.benchmarkReturns?.['5y']],
  ].filter(([, value]) => Number.isFinite(value))

  return (
    <section className="card p-lg">
      <div className="row flex-wrap gap-md">
        <FundLogo name={fund.amcShort} />
        <div className="min-w-0 grow">
          <Link to={`/app/mf/${fund.id}`} className="block truncate bold">
            {fund.name}
          </Link>
          <p className="text-xs muted">
            {fund.subCategory} · Min SIP ₹{formatINR(fund.minSip)} · NAV ₹{formatINR(fund.nav)}
          </p>
        </div>
      </div>

      <div className="mt-md border-t border">
        <div className="mb-sm text-[10px] bold muted uppercase">
          Project using this fund&apos;s returns
        </div>
        <div className="row flex-wrap gap-sm">
          {options.map(([label, value]) => {
            const active = Math.abs(rate - value) < 0.05
            return (
              <button
                key={label}
                type="button"
                onClick={() => onRate(value)}
                className={`rounded border px-lg ${ active ? 'border-page-accent bg-page-tint' : 'border-line bg-surface hover:border-page-accent' }`}
              >
                <span className="block text-[10px] bold muted uppercase">{label}</span>
                <span className={`block mono text-sm bold ${value >= 0 ? '' : ''}`}>
                  {value >= 0 ? '+' : ''}{value}%
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}

function MiniFact({ label, value, tone }) {
  return (
    <div className="rounded border px-lg py-md">
      <div className="text-[10px] bold muted uppercase">{label}</div>
      <div className={`mt-sm mono text-sm bold ${tone === 'up' ? '' : ''}`}>{value}</div>
    </div>
  )
}

function Range({ label, display, min, max, step, value, onChange }) {
  return (
    <div>
      <div className="mb-sm row flex-wrap gap-sm">
        <span className="text-sm bold">{label}</span>
        <span className="rounded py-md mono text-sm bold up">{display}</span>
      </div>
      <input
        className="w-full accent-[#00a878]"
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <div className="mt-sm row text-[10px] muted">
        <span>{min >= 1000 ? `₹${formatINRShort(min)}` : min}</span>
        <span>{max >= 1000 ? `₹${formatINRShort(max)}` : max}</span>
      </div>
    </div>
  )
}
