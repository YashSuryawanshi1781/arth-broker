export function sma(values, period) {
  const out = []
  let sum = 0
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i].close
    if (i >= period) sum -= values[i - period].close
    if (i >= period - 1) out.push({ time: values[i].time, value: +(sum / period).toFixed(2) })
  }
  return out
}

export function ema(values, period) {
  const out = []
  const k = 2 / (period + 1)
  let prev
  for (let i = 0; i < values.length; i += 1) {
    const price = values[i].close
    prev = prev == null ? price : price * k + prev * (1 - k)
    if (i >= period - 1) out.push({ time: values[i].time, value: +prev.toFixed(2) })
  }
  return out
}

export function bollinger(values, period = 20, mult = 2) {
  const mid = []
  const upper = []
  const lower = []
  for (let i = period - 1; i < values.length; i += 1) {
    const slice = values.slice(i - period + 1, i + 1).map((c) => c.close)
    const mean = slice.reduce((a, b) => a + b, 0) / period
    const variance = slice.reduce((a, b) => a + (b - mean) ** 2, 0) / period
    const sd = Math.sqrt(variance)
    const t = values[i].time
    mid.push({ time: t, value: +mean.toFixed(2) })
    upper.push({ time: t, value: +(mean + mult * sd).toFixed(2) })
    lower.push({ time: t, value: +(mean - mult * sd).toFixed(2) })
  }
  return { mid, upper, lower }
}

export function vwap(values) {
  let cumPV = 0
  let cumV = 0
  return values.map((c) => {
    const typical = (c.high + c.low + c.close) / 3
    cumPV += typical * c.volume
    cumV += c.volume
    return { time: c.time, value: +(cumPV / Math.max(cumV, 1)).toFixed(2) }
  })
}

export function rsi(values, period = 14) {
  const out = []
  let gains = 0
  let losses = 0
  for (let i = 1; i < values.length; i += 1) {
    const diff = values[i].close - values[i - 1].close
    const gain = Math.max(diff, 0)
    const loss = Math.max(-diff, 0)
    if (i <= period) {
      gains += gain
      losses += loss
      if (i === period) {
        let avgGain = gains / period
        let avgLoss = losses / period
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        out.push({ time: values[i].time, value: +(100 - 100 / (1 + rs)).toFixed(2) })
        for (let j = i + 1; j < values.length; j += 1) {
          const d = values[j].close - values[j - 1].close
          avgGain = (avgGain * (period - 1) + Math.max(d, 0)) / period
          avgLoss = (avgLoss * (period - 1) + Math.max(-d, 0)) / period
          const r = avgLoss === 0 ? 100 : avgGain / avgLoss
          out.push({ time: values[j].time, value: +(100 - 100 / (1 + r)).toFixed(2) })
        }
        break
      }
    }
  }
  return out
}

export function macd(values, fast = 12, slow = 26, signal = 9) {
  const emaFast = ema(values, fast)
  const emaSlow = ema(values, slow)
  const byTime = new Map(emaSlow.map((p) => [p.time, p.value]))
  const line = []
  for (const p of emaFast) {
    if (!byTime.has(p.time)) continue
    line.push({ time: p.time, value: +(p.value - byTime.get(p.time)).toFixed(4) })
  }
  const signalLine = ema(
    line.map((p) => ({ close: p.value, time: p.time, high: p.value, low: p.value, volume: 1 })),
    signal,
  )
  const sigMap = new Map(signalLine.map((p) => [p.time, p.value]))
  const hist = line
    .filter((p) => sigMap.has(p.time))
    .map((p) => ({ time: p.time, value: +(p.value - sigMap.get(p.time)).toFixed(4) }))
  return { macd: line, signal: signalLine, hist }
}

export function stochastic(values, kPeriod = 14, dPeriod = 3) {
  const k = []
  for (let i = kPeriod - 1; i < values.length; i += 1) {
    const slice = values.slice(i - kPeriod + 1, i + 1)
    const high = Math.max(...slice.map((c) => c.high))
    const low = Math.min(...slice.map((c) => c.low))
    const denom = high - low || 1
    k.push({ time: values[i].time, value: +(((values[i].close - low) / denom) * 100).toFixed(2) })
  }
  const d = sma(
    k.map((p) => ({ close: p.value, time: p.time, high: p.value, low: p.value, volume: 1 })),
    dPeriod,
  )
  return { k, d }
}

export function atr(values, period = 14) {
  const trs = []
  for (let i = 0; i < values.length; i += 1) {
    if (i === 0) {
      trs.push(values[i].high - values[i].low)
      continue
    }
    const prev = values[i - 1].close
    trs.push(Math.max(values[i].high - values[i].low, Math.abs(values[i].high - prev), Math.abs(values[i].low - prev)))
  }
  const out = []
  let sum = 0
  for (let i = 0; i < trs.length; i += 1) {
    sum += trs[i]
    if (i >= period) sum -= trs[i - period]
    if (i >= period - 1) out.push({ time: values[i].time, value: +(sum / period).toFixed(2) })
  }
  return out
}

export function adx(values, period = 14) {
  // Simplified ADX from directional movement
  const plusDM = []
  const minusDM = []
  const tr = []
  for (let i = 1; i < values.length; i += 1) {
    const up = values[i].high - values[i - 1].high
    const down = values[i - 1].low - values[i].low
    plusDM.push(up > down && up > 0 ? up : 0)
    minusDM.push(down > up && down > 0 ? down : 0)
    const prev = values[i - 1].close
    tr.push(Math.max(values[i].high - values[i].low, Math.abs(values[i].high - prev), Math.abs(values[i].low - prev)))
  }
  const out = []
  let atrSum = 0
  let plusSum = 0
  let minusSum = 0
  for (let i = 0; i < tr.length; i += 1) {
    atrSum += tr[i]
    plusSum += plusDM[i]
    minusSum += minusDM[i]
    if (i >= period) {
      atrSum -= tr[i - period]
      plusSum -= plusDM[i - period]
      minusSum -= minusDM[i - period]
    }
    if (i >= period - 1) {
      const atrV = atrSum / period || 1
      const pdi = (plusSum / period / atrV) * 100
      const mdi = (minusSum / period / atrV) * 100
      const dx = (Math.abs(pdi - mdi) / (pdi + mdi || 1)) * 100
      out.push({ time: values[i + 1].time, value: +dx.toFixed(2) })
    }
  }
  return out
}

export function cci(values, period = 20) {
  const out = []
  for (let i = period - 1; i < values.length; i += 1) {
    const slice = values.slice(i - period + 1, i + 1)
    const tp = slice.map((c) => (c.high + c.low + c.close) / 3)
    const mean = tp.reduce((a, b) => a + b, 0) / period
    const mad = tp.reduce((a, b) => a + Math.abs(b - mean), 0) / period || 1
    out.push({ time: values[i].time, value: +((tp[tp.length - 1] - mean) / (0.015 * mad)).toFixed(2) })
  }
  return out
}

export function supertrend(values, period = 10, mult = 3) {
  const atrVals = atr(values, period)
  const atrMap = new Map(atrVals.map((p) => [p.time, p.value]))
  const out = []
  let prevUpper
  let prevLower
  let trend = 1
  for (let i = 0; i < values.length; i += 1) {
    const a = atrMap.get(values[i].time)
    if (a == null) continue
    const hl2 = (values[i].high + values[i].low) / 2
    let upper = hl2 + mult * a
    let lower = hl2 - mult * a
    if (prevUpper != null) {
      upper = values[i - 1]?.close < prevUpper ? Math.min(upper, prevUpper) : upper
      lower = values[i - 1]?.close > prevLower ? Math.max(lower, prevLower) : lower
    }
    if (prevLower != null && values[i].close > prevUpper) trend = 1
    else if (prevUpper != null && values[i].close < prevLower) trend = -1
    const value = trend === 1 ? lower : upper
    out.push({ time: values[i].time, value: +value.toFixed(2), trend })
    prevUpper = upper
    prevLower = lower
  }
  return out
}

export function pivots(values) {
  if (values.length < 2) return { pp: [], r1: [], s1: [] }
  const prev = values[values.length - 2]
  const pp = (prev.high + prev.low + prev.close) / 3
  const r1 = 2 * pp - prev.low
  const s1 = 2 * pp - prev.high
  return {
    pp: values.map((c) => ({ time: c.time, value: +pp.toFixed(2) })),
    r1: values.map((c) => ({ time: c.time, value: +r1.toFixed(2) })),
    s1: values.map((c) => ({ time: c.time, value: +s1.toFixed(2) })),
  }
}

export function ichimoku(values, tenkan = 9, kijun = 26, senkou = 52) {
  const mid = (slice) => {
    const high = Math.max(...slice.map((c) => c.high))
    const low = Math.min(...slice.map((c) => c.low))
    return (high + low) / 2
  }
  const conversion = []
  const base = []
  for (let i = 0; i < values.length; i += 1) {
    if (i >= tenkan - 1) {
      conversion.push({ time: values[i].time, value: +mid(values.slice(i - tenkan + 1, i + 1)).toFixed(2) })
    }
    if (i >= kijun - 1) {
      base.push({ time: values[i].time, value: +mid(values.slice(i - kijun + 1, i + 1)).toFixed(2) })
    }
  }
  // Span A approx average of conversion/base aligned to conversion times
  const baseMap = new Map(base.map((p) => [p.time, p.value]))
  const spanA = conversion
    .filter((p) => baseMap.has(p.time))
    .map((p) => ({ time: p.time, value: +((p.value + baseMap.get(p.time)) / 2).toFixed(2) }))
  const spanB = []
  for (let i = senkou - 1; i < values.length; i += 1) {
    spanB.push({ time: values[i].time, value: +mid(values.slice(i - senkou + 1, i + 1)).toFixed(2) })
  }
  return { conversion, base, spanA, spanB }
}

export const OVERLAY_DEFS = [
  { id: 'sma20', label: 'SMA 20', color: '#f59e0b', group: 'overlay' },
  { id: 'sma50', label: 'SMA 50', color: '#6366f1', group: 'overlay' },
  { id: 'ema20', label: 'EMA 20', color: '#06b6d4', group: 'overlay' },
  { id: 'ema50', label: 'EMA 50', color: '#0ea5e9', group: 'overlay' },
  { id: 'ema200', label: 'EMA 200', color: '#7c3aed', group: 'overlay' },
  { id: 'bb', label: 'Bollinger', color: '#94a3b8', group: 'overlay' },
  { id: 'vwap', label: 'VWAP', color: '#ec4899', group: 'overlay' },
  { id: 'supertrend', label: 'Supertrend', color: '#22c55e', group: 'overlay' },
  { id: 'ichimoku', label: 'Ichimoku', color: '#a78bfa', group: 'overlay' },
  { id: 'pivots', label: 'Pivots', color: '#f97316', group: 'overlay' },
  { id: 'volume', label: 'Volume', color: '#00a878', group: 'overlay' },
]

export const OSCILLATOR_DEFS = [
  { id: 'rsi', label: 'RSI 14', color: '#8b5cf6', group: 'osc' },
  { id: 'macd', label: 'MACD', color: '#2563eb', group: 'osc' },
  { id: 'stoch', label: 'Stochastic', color: '#db2777', group: 'osc' },
  { id: 'atr', label: 'ATR 14', color: '#ca8a04', group: 'osc' },
  { id: 'adx', label: 'ADX', color: '#0891b2', group: 'osc' },
  { id: 'cci', label: 'CCI', color: '#65a30d', group: 'osc' },
]

export const DEFAULT_INDICATORS = {
  sma20: true,
  sma50: false,
  ema20: true,
  ema50: false,
  ema200: false,
  bb: false,
  volume: true,
  vwap: false,
  supertrend: false,
  ichimoku: false,
  pivots: false,
  rsi: true,
  macd: false,
  stoch: false,
  atr: false,
  adx: false,
  cci: false,
}

const STORAGE_KEY = 'arth_chart_indicators'

export function loadIndicatorPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { ...DEFAULT_INDICATORS }
    return { ...DEFAULT_INDICATORS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULT_INDICATORS }
  }
}

export function saveIndicatorPrefs(prefs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch {
    /* ignore */
  }
}
