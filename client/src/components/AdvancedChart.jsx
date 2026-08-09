import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AreaSeries,
  CandlestickSeries,
  ColorType,
  CrosshairMode,
  HistogramSeries,
  LineSeries,
  createChart,
} from 'lightweight-charts'
import { api, formatINR } from '../lib/api'
import { showToast } from '../features/ui/uiSlice'
import { useAppDispatch } from '../app/hooks'

const TIMEFRAMES = [
  { id: '1m', label: '1m', interval: 60, count: 180 },
  { id: '5m', label: '5m', interval: 300, count: 150 },
  { id: '15m', label: '15m', interval: 900, count: 120 },
  { id: '1H', label: '1H', interval: 3600, count: 120 },
  { id: '4H', label: '4H', interval: 14400, count: 100 },
  { id: '1D', label: '1D', interval: 86400, count: 90 },
]

const CHART_TYPES = [
  { id: 'candle', label: 'Candles' },
  { id: 'line', label: 'Line' },
  { id: 'area', label: 'Area' },
]

const INDICATOR_DEFS = [
  { id: 'sma20', label: 'SMA 20', color: '#f59e0b' },
  { id: 'sma50', label: 'SMA 50', color: '#6366f1' },
  { id: 'ema20', label: 'EMA 20', color: '#06b6d4' },
  { id: 'bb', label: 'Bollinger', color: '#94a3b8' },
  { id: 'volume', label: 'Volume', color: '#00a878' },
  { id: 'vwap', label: 'VWAP', color: '#ec4899' },
]

function sma(values, period) {
  const out = []
  let sum = 0
  for (let i = 0; i < values.length; i += 1) {
    sum += values[i].close
    if (i >= period) sum -= values[i - period].close
    if (i >= period - 1) out.push({ time: values[i].time, value: +(sum / period).toFixed(2) })
  }
  return out
}

function ema(values, period) {
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

function bollinger(values, period = 20, mult = 2) {
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

function vwap(values) {
  let cumPV = 0
  let cumV = 0
  return values.map((c) => {
    const typical = (c.high + c.low + c.close) / 3
    cumPV += typical * c.volume
    cumV += c.volume
    return { time: c.time, value: +(cumPV / Math.max(cumV, 1)).toFixed(2) }
  })
}

function rsi(values, period = 14) {
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

export function AdvancedChart({ symbol, live, candlesPath }) {
  const dispatch = useAppDispatch()
  const containerRef = useRef(null)
  const rsiContainerRef = useRef(null)
  const chartRef = useRef(null)
  const rsiChartRef = useRef(null)
  const mainSeriesRef = useRef(null)
  const volumeSeriesRef = useRef(null)
  const overlayRefs = useRef({})
  const rsiSeriesRef = useRef(null)
  const candlesRef = useRef([])
  const intervalRef = useRef(60)

  const [timeframe, setTimeframe] = useState('5m')
  const [chartType, setChartType] = useState('candle')
  const [indicators, setIndicators] = useState({
    sma20: true,
    sma50: false,
    ema20: true,
    bb: false,
    volume: true,
    vwap: false,
    rsi: true,
  })
  const [hover, setHover] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showPanels, setShowPanels] = useState({ overlays: false, oscillators: true })

  const tf = useMemo(() => TIMEFRAMES.find((t) => t.id === timeframe) || TIMEFRAMES[1], [timeframe])

  const toggleIndicator = (id) => {
    setIndicators((prev) => ({ ...prev, [id]: !prev[id] }))
  }

  // Build / rebuild charts when symbol, timeframe, or chart type changes
  useEffect(() => {
    if (!containerRef.current || !symbol) return undefined
    setLoading(true)
    intervalRef.current = tf.interval

    const chart = createChart(containerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#5b6b7c',
        fontFamily: 'IBM Plex Mono, monospace',
        fontSize: 11,
      },
      grid: {
        vertLines: { color: '#eef2f6' },
        horzLines: { color: '#eef2f6' },
      },
      crosshair: {
        mode: CrosshairMode.Normal,
        vertLine: { color: '#94a3b8', labelBackgroundColor: '#0b1b33' },
        horzLine: { color: '#94a3b8', labelBackgroundColor: '#0b1b33' },
      },
      rightPriceScale: { borderColor: '#dce3eb', scaleMargins: { top: 0.08, bottom: indicators.volume ? 0.22 : 0.08 } },
      timeScale: { borderColor: '#dce3eb', timeVisible: tf.interval < 86400, secondsVisible: false },
      width: containerRef.current.clientWidth || 700,
      height: 380,
    })

    let main
    if (chartType === 'line') {
      main = chart.addSeries(LineSeries, { color: '#00a878', lineWidth: 2 })
    } else if (chartType === 'area') {
      main = chart.addSeries(AreaSeries, {
        lineColor: '#00a878',
        topColor: 'rgba(0,168,120,0.28)',
        bottomColor: 'rgba(0,168,120,0.02)',
        lineWidth: 2,
      })
    } else {
      main = chart.addSeries(CandlestickSeries, {
        upColor: '#00a878',
        downColor: '#e5484d',
        borderVisible: false,
        wickUpColor: '#00a878',
        wickDownColor: '#e5484d',
      })
    }

    const volume = chart.addSeries(HistogramSeries, {
      priceFormat: { type: 'volume' },
      priceScaleId: 'volume',
    })
    chart.priceScale('volume').applyOptions({
      scaleMargins: { top: 0.8, bottom: 0 },
    })

    chartRef.current = chart
    mainSeriesRef.current = main
    volumeSeriesRef.current = volume
    overlayRefs.current = {}

    chart.subscribeCrosshairMove((param) => {
      if (!param?.time || !param.seriesData?.size) {
        setHover(null)
        return
      }
      const candle = candlesRef.current.find((c) => c.time === param.time)
      if (candle) setHover(candle)
    })

    let rsiChart
    if (rsiContainerRef.current) {
      rsiChart = createChart(rsiContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#5b6b7c',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
        },
        grid: { vertLines: { color: '#eef2f6' }, horzLines: { color: '#eef2f6' } },
        rightPriceScale: { borderColor: '#dce3eb' },
        timeScale: { borderColor: '#dce3eb', visible: false },
        width: rsiContainerRef.current.clientWidth || 700,
        height: 120,
      })
      const rsiSeries = rsiChart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 2 })
      rsiChartRef.current = rsiChart
      rsiSeriesRef.current = rsiSeries
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) rsiChart.timeScale().setVisibleLogicalRange(range)
      })
    }

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
      if (rsiContainerRef.current && rsiChartRef.current) {
        rsiChartRef.current.applyOptions({ width: rsiContainerRef.current.clientWidth })
      }
    })
    ro.observe(containerRef.current)

    let cancelled = false
    api(`${candlesPath || `/market/${symbol}/candles`}?interval=${tf.interval}&count=${tf.count}`)
      .then((res) => {
        if (cancelled || !mainSeriesRef.current) return
        const candles = res.candles || []
        candlesRef.current = candles
        applySeriesData(candles, chartType, indicators)
        chart.timeScale().fitContent()
        setHover(candles[candles.length - 1] || null)
        setLoading(false)
      })
      .catch((err) => {
        setLoading(false)
        dispatch(showToast({ type: 'error', title: 'Chart load failed', message: err.message }))
      })

    return () => {
      cancelled = true
      ro.disconnect()
      chart.remove()
      rsiChart?.remove()
      chartRef.current = null
      rsiChartRef.current = null
      mainSeriesRef.current = null
      volumeSeriesRef.current = null
      rsiSeriesRef.current = null
      overlayRefs.current = {}
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, timeframe, chartType, candlesPath])

  // Re-apply overlays when indicator toggles change (without full reload)
  useEffect(() => {
    if (!candlesRef.current.length || !mainSeriesRef.current) return
    applySeriesData(candlesRef.current, chartType, indicators)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators])

  function clearOverlays() {
    const chart = chartRef.current
    if (!chart) return
    Object.values(overlayRefs.current).forEach((series) => {
      try {
        chart.removeSeries(series)
      } catch {
        /* already removed */
      }
    })
    overlayRefs.current = {}
  }

  function applySeriesData(candles, type, inds) {
    const main = mainSeriesRef.current
    const volume = volumeSeriesRef.current
    const chart = chartRef.current
    if (!main || !chart) return

    if (type === 'candle') {
      main.setData(candles.map((c) => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })))
    } else {
      main.setData(candles.map((c) => ({ time: c.time, value: c.close })))
    }

    if (inds.volume && volume) {
      volume.applyOptions({ visible: true })
      volume.setData(
        candles.map((c) => ({
          time: c.time,
          value: c.volume,
          color: c.close >= c.open ? 'rgba(0,168,120,0.45)' : 'rgba(229,72,77,0.45)',
        })),
      )
    } else if (volume) {
      volume.applyOptions({ visible: false })
      volume.setData([])
    }

    clearOverlays()

    const addLine = (id, data, color, lineWidth = 2) => {
      if (!data.length) return
      const series = chart.addSeries(LineSeries, { color, lineWidth, lastValueVisible: false, priceLineVisible: false })
      series.setData(data)
      overlayRefs.current[id] = series
    }

    if (inds.sma20) addLine('sma20', sma(candles, 20), '#f59e0b')
    if (inds.sma50) addLine('sma50', sma(candles, 50), '#6366f1')
    if (inds.ema20) addLine('ema20', ema(candles, 20), '#06b6d4')
    if (inds.vwap) addLine('vwap', vwap(candles), '#ec4899')
    if (inds.bb) {
      const bb = bollinger(candles, 20, 2)
      addLine('bbMid', bb.mid, '#94a3b8', 1)
      addLine('bbUp', bb.upper, '#94a3b8', 1)
      addLine('bbLow', bb.lower, '#94a3b8', 1)
    }

    if (inds.rsi && rsiSeriesRef.current) {
      rsiSeriesRef.current.setData(rsi(candles, 14))
      rsiChartRef.current?.timeScale().fitContent()
    } else if (rsiSeriesRef.current) {
      rsiSeriesRef.current.setData([])
    }
  }

  // Live tick → update last candle
  useEffect(() => {
    if (!live?.price || !mainSeriesRef.current || !candlesRef.current.length) return
    const interval = intervalRef.current
    const bucket = Math.floor(Date.now() / 1000 / interval) * interval
    const candles = candlesRef.current
    let last = candles[candles.length - 1]
    const price = live.price

    if (last.time === bucket) {
      last = {
        ...last,
        close: price,
        high: Math.max(last.high, price),
        low: Math.min(last.low, price),
        volume: last.volume + Math.floor(Math.random() * 40),
      }
      candles[candles.length - 1] = last
    } else if (bucket > last.time) {
      last = {
        time: bucket,
        open: price,
        high: price,
        low: price,
        close: price,
        volume: Math.floor(20 + Math.random() * 200),
      }
      candles.push(last)
      if (candles.length > 400) candles.shift()
    } else {
      return
    }

    candlesRef.current = candles
    try {
      if (chartType === 'candle') {
        mainSeriesRef.current.update({
          time: last.time,
          open: last.open,
          high: last.high,
          low: last.low,
          close: last.close,
        })
      } else {
        mainSeriesRef.current.update({ time: last.time, value: last.close })
      }
      if (indicators.volume && volumeSeriesRef.current) {
        volumeSeriesRef.current.update({
          time: last.time,
          value: last.volume,
          color: last.close >= last.open ? 'rgba(0,168,120,0.45)' : 'rgba(229,72,77,0.45)',
        })
      }
      setHover(last)
    } catch {
      /* ignore */
    }
  }, [live?.price, live?.lastUpdate, chartType, indicators.volume])

  const display = hover || candlesRef.current[candlesRef.current.length - 1]
  const up = display ? display.close >= display.open : true
  const activeOverlays = [...INDICATOR_DEFS, { id: 'rsi', label: 'RSI 14', color: '#8b5cf6' }]
    .filter((ind) => indicators[ind.id])

  return (
    <div className="card overflow-hidden">
      <div className="row wrap gap-x-4 gap-y-2 border-b border px-lg py-md">
        <div className="row">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeframe(t.id)}
              className={`rounded py-md mono text-xs bold ${ timeframe === t.id ? ' text-ink' : 'text-muted hover:text-ink' }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="w-px bg-line" />

        <div className="row">
          {CHART_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setChartType(t.id)}
              className={`rounded py-md text-xs bold ${ chartType === t.id ? ' text-ink' : 'text-muted hover:text-ink' }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <button
            type="button"
            className={`row gap-sm rounded border py-md text-xs bold ${ showPanels.overlays ? 'border-accent text-accent' : 'border-line text-muted hover:' }`}
            onClick={() => setShowPanels((p) => ({ ...p, overlays: !p.overlays }))}
          >
            Indicators
            <span className="rounded px-lg mono text-[10px]">{activeOverlays.length}</span>
          </button>

          {showPanels.overlays && (
            <>
              <button
                type="button"
                aria-label="Close indicators"
                className="fixed cursor-default"
                onClick={() => setShowPanels((p) => ({ ...p, overlays: false }))}
              />
              <div className="absolute mt-sm.5 overflow-hidden rounded border )]">
                <div className="border-b border px-lg py-md text-[10px] bold muted uppercase">
                  Overlays
                </div>
                {INDICATOR_DEFS.map((ind) => (
                  <IndicatorToggle
                    key={ind.id}
                    color={ind.color}
                    label={ind.label}
                    active={indicators[ind.id]}
                    onClick={() => toggleIndicator(ind.id)}
                  />
                ))}
                <div className="border-y border px-lg py-md text-[10px] bold muted uppercase">
                  Oscillators
                </div>
                <IndicatorToggle
                  color="#8b5cf6"
                  label="RSI (14)"
                  active={indicators.rsi}
                  onClick={() => toggleIndicator('rsi')}
                />
              </div>
            </>
          )}
        </div>
      </div>

      <div className="row wrap gap-x-4 gap-y-1 border-b border px-lg py-md mono text-[11px]">
        <span className="text-xs bold ink">{symbol}</span>
        <span className="muted">{tf.label}</span>
        <Ohlc label="O" value={display ? formatINR(display.open) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="H" value={display ? formatINR(display.high) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="L" value={display ? formatINR(display.low) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="C" value={display ? formatINR(display.close) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="Vol" value={display ? display.volume.toLocaleString('en-IN') : '—'} />
        {activeOverlays.length > 0 && (
          <span className="ml-auto row wrap gap-sm text-[10px]">
            {activeOverlays.map((ind) => (
              <span key={ind.id} className="row gap-xs muted">
                <span className=".5 rounded" style={{ background: ind.color }} />
                {ind.label}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="relative">
        {loading && (
          <div className="absolute grid text-sm bold muted">
            Loading chart…
          </div>
        )}
        <div ref={containerRef} className="w-full" />
        {indicators.rsi ? (
          <div className="border-t border">
            <div className="row-between px-lg py-md text-[10px] bold muted uppercase">
              <span>RSI (14)</span>
              <span>Overbought 70 · Oversold 30</span>
            </div>
            <div ref={rsiContainerRef} className="w-full" />
          </div>
        ) : (
          <div ref={rsiContainerRef} className="hidden" />
        )}
      </div>

      <div className="row-between border-t border px-lg text-[10px] muted">
        <span>Hover the chart for OHLC values</span>
        <span className="row gap-sm">
          <span className="live-dot" />
            Streaming quotes
        </span>
      </div>
    </div>
  )
}

function IndicatorToggle({ color, label, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="row w-full gap-md px-lg py-md text-xs bold"
    >
      <span
        className={`grid shrink-0 rounded border ${ active ? 'border-transparent text-white' : 'border-line' }`}
        style={active ? { background: color } : undefined}
      >
        {active && (
          <svg viewBox="0 0 12 12" className=".5" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={active ? 'text-ink' : 'text-muted'}>{label}</span>
      <span className="ml-auto .5 rounded" style={{ background: color, opacity: active ? 1 : 0.3 }} />
    </button>
  )
}

function Ohlc({ label, value, tone }) {
  const color = tone === 'up' ? 'up' : tone === 'down' ? 'down' : 'text-ink'
  return (
    <span>
      <span className="mr-1 muted">{label}</span>
      <span className={`bold ${color}`}>{value}</span>
    </span>
  )
}
