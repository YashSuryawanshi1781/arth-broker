/**
 * Shared investment projection maths for the standalone calculator and the
 * per-fund calculator. Annual rates are converted to an effective monthly rate
 * so a quoted CAGR compounds to exactly that figure over a year.
 */

export const monthlyRateOf = (annualPct) => (1 + annualPct / 100) ** (1 / 12) - 1

/** Future value of a monthly SIP paid at the start of each month. */
export function sipValue(monthly, annualPct, years) {
  const months = Math.round(years * 12)
  const rate = monthlyRateOf(annualPct)
  if (!months) return 0
  if (rate === 0) return monthly * months
  return monthly * (((1 + rate) ** months - 1) / rate) * (1 + rate)
}

export function lumpsumValue(amount, annualPct, years) {
  return amount * (1 + annualPct / 100) ** years
}

/** Monthly SIP needed to reach a target corpus. */
export function sipForGoal(goal, annualPct, years) {
  const months = Math.round(years * 12)
  const rate = monthlyRateOf(annualPct)
  if (!months) return 0
  if (rate === 0) return goal / months
  return goal / ((((1 + rate) ** months - 1) / rate) * (1 + rate))
}

/**
 * Month-by-month simulation. Returns a yearly schedule plus the final totals so
 * the donut, chart and table all read from one source of truth.
 */
export function buildProjection({ mode, amount, years, rate, stepUp = 0, goal = 0 }) {
  const totalYears = Math.max(1, Math.round(years))
  const monthly = monthlyRateOf(rate)
  const schedule = [{ year: 0, invested: 0, value: 0, gain: 0 }]

  if (mode === 'lumpsum') {
    for (let year = 1; year <= totalYears; year += 1) {
      const value = lumpsumValue(amount, rate, year)
      schedule.push({ year, invested: amount, value, gain: value - amount })
    }
    const last = schedule[schedule.length - 1]
    schedule[0] = { year: 0, invested: amount, value: amount, gain: 0 }
    return { schedule, invested: last.invested, value: last.value, gain: last.gain }
  }

  const base = mode === 'goal' ? sipForGoal(goal, rate, totalYears) : amount
  let contribution = base
  let invested = 0
  let value = 0

  for (let year = 1; year <= totalYears; year += 1) {
    if (year > 1 && mode === 'stepup') contribution *= 1 + stepUp / 100
    for (let month = 0; month < 12; month += 1) {
      value = (value + contribution) * (1 + monthly)
      invested += contribution
    }
    schedule.push({ year, invested, value, gain: value - invested })
  }

  const last = schedule[schedule.length - 1]
  return {
    schedule,
    invested: last.invested,
    value: last.value,
    gain: last.gain,
    required: mode === 'goal' ? base : undefined,
    finalMonthly: mode === 'stepup' ? contribution : undefined,
  }
}
