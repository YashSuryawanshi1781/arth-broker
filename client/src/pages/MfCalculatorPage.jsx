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
    <Screen theme="mf" className="space-y-4">
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

      <nav className="flex gap-1 overflow-x-auto rounded-xl border border-line bg-surface p-1">
        {MODES.map(([id, label, Icon]) => (
          <button
            key={id}
            type="button"
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-bold transition ${
              mode === id ? 'bg-brand text-white shadow-sm' : 'text-muted hover:bg-surface-2'
            }`}
            onClick={() => setMode(id)}
          >
            <Icon size={16} />
            {label}
          </button>
        ))}
      </nav>

      <section className="card overflow-hidden">
        <div className="grid lg:grid-cols-[1fr_0.85fr]">
          <div className="space-y-6 p-5 md:p-7">
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
              <div className="grid grid-cols-3 gap-2">
                <MiniFact label="Monthly" value={mode === 'lumpsum' ? '—' : `₹${formatINRShort(amount)}`} />
                <MiniFact label="Total invested" value={`₹${formatINRShort(result.invested)}`} />
                <MiniFact label="Wealth gained" value={`₹${formatINRShort(result.gain)}`} tone="up" />
              </div>
            )}

            <p className="rounded-xl bg-surface-2 px-3 py-2.5 text-xs leading-relaxed text-muted">
              {fund
                ? `Projections use ${fund.name}'s historical returns. Past performance does not guarantee future results and market-linked returns vary year to year.`
                : 'Projections assume a constant annual return compounded monthly. Actual mutual fund returns are market-linked, vary year to year, and are not guaranteed.'}
            </p>
          </div>

          <div className="flex flex-col justify-center bg-brand px-6 py-8 text-white md:px-8">
            <GrowthDonut
              invested={result.invested}
              gain={result.gain}
              variant="dark"
              caption={mode === 'goal' ? 'Target corpus' : 'Projected value'}
            />

            <div className="mt-6 space-y-3">
              {mode === 'goal' && (
                <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                  <div className="text-xs text-white/55">Monthly SIP required</div>
                  <div className="mt-1 font-mono text-2xl font-bold">₹{formatINR(result.required || 0)}</div>
                </div>
              )}
              {mode === 'stepup' && result.finalMonthly && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-white/65">Final monthly SIP</span>
                  <span className="font-mono font-bold">₹{formatINR(result.finalMonthly)}</span>
                </div>
              )}
              <div className="border-t border-white/15 pt-3">
                <div className="text-xs text-white/55">
                  {mode === 'goal' ? 'Target corpus' : 'Projected value'}
                </div>
                <div className="mt-1 font-mono text-3xl font-bold">₹{formatINR(result.value)}</div>
                <div className="mt-1 text-xs text-white/55">
                  {((result.gain / (result.invested || 1)) * 100).toFixed(1)}% wealth gain over {years} years
                </div>
              </div>
            </div>

            <Link
              to={fund ? `/app/mf/${fund.id}` : '/app/mf'}
              className="btn btn-primary mt-6"
            >
              {fund ? `Invest in ${fund.amcShort}` : 'Explore funds to invest'}
            </Link>
          </div>
        </div>
      </section>

      <section className="card p-4 md:p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-extrabold tracking-tight">Growth projection</h3>
          <span className="text-xs text-muted">
            {rate}% p.a. compounded monthly over {years} {years === 1 ? 'year' : 'years'}
          </span>
        </div>
        <GrowthChart schedule={result.schedule} />
      </section>

      <section className="card overflow-hidden">
        <div className="border-b border-line px-4 py-3">
          <h3 className="font-extrabold tracking-tight">Year-by-year projection</h3>
        </div>
        <div className="max-h-[420px] overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-line bg-surface-2 text-[10px] font-bold tracking-wide text-muted uppercase">
                <th className="px-4 py-2 text-left">Year</th>
                <th className="px-4 py-2 text-right">Invested</th>
                <th className="px-4 py-2 text-right">Returns</th>
                <th className="px-4 py-2 text-right">Total value</th>
                <th className="px-4 py-2 text-right">Growth</th>
              </tr>
            </thead>
            <tbody className="font-mono">
              {result.schedule.slice(1).map((row) => (
                <tr key={row.year} className="border-b border-line last:border-0">
                  <td className="px-4 py-2 font-sans font-semibold">Year {row.year}</td>
                  <td className="px-4 py-2 text-right text-muted">₹{formatINRShort(row.invested)}</td>
                  <td className="px-4 py-2 text-right font-bold text-up">₹{formatINRShort(row.gain)}</td>
                  <td className="px-4 py-2 text-right font-bold">₹{formatINRShort(row.value)}</td>
                  <td className="px-4 py-2 text-right text-muted">
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
    <section className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <FundLogo name={fund.amcShort} />
        <div className="min-w-0 flex-1">
          <Link to={`/app/mf/${fund.id}`} className="block truncate font-bold hover:text-page-accent">
            {fund.name}
          </Link>
          <p className="text-xs text-muted">
            {fund.subCategory} · Min SIP ₹{formatINR(fund.minSip)} · NAV ₹{formatINR(fund.nav)}
          </p>
        </div>
      </div>

      <div className="mt-3 border-t border-line pt-3">
        <div className="mb-2 text-[10px] font-bold tracking-wide text-muted uppercase">
          Project using this fund&apos;s returns
        </div>
        <div className="flex flex-wrap gap-2">
          {options.map(([label, value]) => {
            const active = Math.abs(rate - value) < 0.05
            return (
              <button
                key={label}
                type="button"
                onClick={() => onRate(value)}
                className={`rounded-xl border px-3 py-1.5 text-left transition ${
                  active
                    ? 'border-page-accent bg-page-tint'
                    : 'border-line bg-surface hover:border-page-accent/40'
                }`}
              >
                <span className="block text-[10px] font-bold tracking-wide text-muted uppercase">{label}</span>
                <span className={`block font-mono text-sm font-bold ${value >= 0 ? 'text-up' : 'text-down'}`}>
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
    <div className="rounded-xl border border-line px-3 py-2">
      <div className="text-[10px] font-bold tracking-wide text-muted uppercase">{label}</div>
      <div className={`mt-0.5 font-mono text-sm font-bold ${tone === 'up' ? 'text-up' : ''}`}>{value}</div>
    </div>
  )
}

function Range({ label, display, min, max, step, value, onChange }) {
  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-bold">{label}</span>
        <span className="rounded-lg bg-up-bg px-2.5 py-1 font-mono text-sm font-bold text-up">{display}</span>
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
      <div className="mt-1 flex justify-between text-[10px] text-muted">
        <span>{min >= 1000 ? `₹${formatINRShort(min)}` : min}</span>
        <span>{max >= 1000 ? `₹${formatINRShort(max)}` : max}</span>
      </div>
    </div>
  )
}
