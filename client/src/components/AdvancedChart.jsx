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
import {
  sma,
  ema,
  bollinger,
  vwap,
  rsi,
  macd,
  stochastic,
  atr,
  adx,
  cci,
  supertrend,
  pivots,
  ichimoku,
  OVERLAY_DEFS,
  OSCILLATOR_DEFS,
  loadIndicatorPrefs,
  saveIndicatorPrefs,
} from '../lib/indicators.js'

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

const OSC_PRIORITY = ['macd', 'rsi', 'stoch', 'atr', 'adx', 'cci']

function primaryOscillator(inds) {
  return OSC_PRIORITY.find((id) => inds[id]) || null
}

function oscHint(id) {
  if (id === 'rsi') return 'Overbought 70 · Oversold 30'
  if (id === 'stoch') return '%K'
  if (id === 'macd') return 'MACD line'
  if (id === 'cci') return 'Zero line'
  return ''
}

export function AdvancedChart({ symbol, live, candlesPath }) {
  const dispatch = useAppDispatch()
  const containerRef = useRef(null)
  const oscContainerRef = useRef(null)
  const chartRef = useRef(null)
  const oscChartRef = useRef(null)
  const mainSeriesRef = useRef(null)
  const volumeSeriesRef = useRef(null)
  const overlayRefs = useRef({})
  const oscSeriesRef = useRef(null)
  const candlesRef = useRef([])
  const intervalRef = useRef(60)

  const [timeframe, setTimeframe] = useState('5m')
  const [chartType, setChartType] = useState('candle')
  const [indicators, setIndicators] = useState(() => loadIndicatorPrefs())
  const [hover, setHover] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showIndicators, setShowIndicators] = useState(false)

  const tf = useMemo(() => TIMEFRAMES.find((t) => t.id === timeframe) || TIMEFRAMES[1], [timeframe])
  const activeOsc = primaryOscillator(indicators)
  const showOsc = Boolean(activeOsc)

  const toggleIndicator = (id) => {
    setIndicators((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      saveIndicatorPrefs(next)
      return next
    })
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

    let oscChart
    if (oscContainerRef.current) {
      oscChart = createChart(oscContainerRef.current, {
        layout: {
          background: { type: ColorType.Solid, color: '#ffffff' },
          textColor: '#5b6b7c',
          fontFamily: 'IBM Plex Mono, monospace',
          fontSize: 10,
        },
        grid: { vertLines: { color: '#eef2f6' }, horzLines: { color: '#eef2f6' } },
        rightPriceScale: { borderColor: '#dce3eb' },
        timeScale: { borderColor: '#dce3eb', visible: false },
        width: oscContainerRef.current.clientWidth || 700,
        height: 120,
      })
      const oscSeries = oscChart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 2 })
      oscChartRef.current = oscChart
      oscSeriesRef.current = oscSeries
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) oscChart.timeScale().setVisibleLogicalRange(range)
      })
    }

    const ro = new ResizeObserver(() => {
      if (containerRef.current && chartRef.current) {
        chartRef.current.applyOptions({ width: containerRef.current.clientWidth })
      }
      if (oscContainerRef.current && oscChartRef.current) {
        oscChartRef.current.applyOptions({ width: oscContainerRef.current.clientWidth })
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
      oscChart?.remove()
      chartRef.current = null
      oscChartRef.current = null
      mainSeriesRef.current = null
      volumeSeriesRef.current = null
      oscSeriesRef.current = null
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

  // Resize osc pane when it becomes visible (may have been created while hidden)
  useEffect(() => {
    if (!showOsc || !oscContainerRef.current || !oscChartRef.current) return
    const width = oscContainerRef.current.clientWidth || containerRef.current?.clientWidth || 700
    oscChartRef.current.applyOptions({ width })
  }, [showOsc, activeOsc])

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
      if (!data?.length) return
      const series = chart.addSeries(LineSeries, { color, lineWidth, lastValueVisible: false, priceLineVisible: false })
      series.setData(data)
      overlayRefs.current[id] = series
    }

    const colorOf = (id, fallback) => OVERLAY_DEFS.find((d) => d.id === id)?.color || fallback

    if (inds.sma20) addLine('sma20', sma(candles, 20), colorOf('sma20', '#f59e0b'))
    if (inds.sma50) addLine('sma50', sma(candles, 50), colorOf('sma50', '#6366f1'))
    if (inds.ema20) addLine('ema20', ema(candles, 20), colorOf('ema20', '#06b6d4'))
    if (inds.ema50) addLine('ema50', ema(candles, 50), colorOf('ema50', '#0ea5e9'))
    if (inds.ema200) addLine('ema200', ema(candles, 200), colorOf('ema200', '#7c3aed'))
    if (inds.vwap) addLine('vwap', vwap(candles), colorOf('vwap', '#ec4899'))
    if (inds.bb) {
      const bb = bollinger(candles, 20, 2)
      const c = colorOf('bb', '#94a3b8')
      addLine('bbMid', bb.mid, c, 1)
      addLine('bbUp', bb.upper, c, 1)
      addLine('bbLow', bb.lower, c, 1)
    }
    if (inds.supertrend) {
      const st = supertrend(candles).map((p) => ({ time: p.time, value: p.value }))
      addLine('supertrend', st, colorOf('supertrend', '#22c55e'))
    }
    if (inds.ichimoku) {
      const ich = ichimoku(candles)
      const baseColor = colorOf('ichimoku', '#a78bfa')
      addLine('ichiConv', ich.conversion, baseColor, 1)
      addLine('ichiBase', ich.base, '#6366f1', 1)
      addLine('ichiSpanA', ich.spanA, '#22c55e', 1)
      addLine('ichiSpanB', ich.spanB, '#ef4444', 1)
    }
    if (inds.pivots) {
      const p = pivots(candles)
      const c = colorOf('pivots', '#f97316')
      addLine('pp', p.pp, c, 1)
      addLine('r1', p.r1, '#ef4444', 1)
      addLine('s1', p.s1, '#22c55e', 1)
    }

    const oscId = primaryOscillator(inds)
    if (oscId && oscSeriesRef.current) {
      const def = OSCILLATOR_DEFS.find((d) => d.id === oscId)
      let data = []
      if (oscId === 'macd') data = macd(candles).macd
      else if (oscId === 'rsi') data = rsi(candles, 14)
      else if (oscId === 'stoch') data = stochastic(candles).k
      else if (oscId === 'atr') data = atr(candles)
      else if (oscId === 'adx') data = adx(candles)
      else if (oscId === 'cci') data = cci(candles)
      oscSeriesRef.current.applyOptions({ color: def?.color || '#8b5cf6' })
      oscSeriesRef.current.setData(data)
      oscChartRef.current?.timeScale().fitContent()
    } else if (oscSeriesRef.current) {
      oscSeriesRef.current.setData([])
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
  const activeOverlays = [...OVERLAY_DEFS, ...OSCILLATOR_DEFS].filter((ind) => indicators[ind.id])
  const activeOscDef = OSCILLATOR_DEFS.find((d) => d.id === activeOsc)

  return (
    <div className="card overflow-hidden">
      <div className="row flex-wrap gap-md border px-lg py-md" style={{ borderWidth: '0 0 1px' }}>
        <div className="row gap-xs">
          {TIMEFRAMES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setTimeframe(t.id)}
              className={`btn btn-ghost text-xs bold ${timeframe === t.id ? 'ink' : 'muted'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <span className="muted" style={{ width: 1, height: 18, background: 'var(--color-line)' }} />

        <div className="row gap-xs">
          {CHART_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setChartType(t.id)}
              className={`btn btn-ghost text-xs bold ${chartType === t.id ? 'ink' : 'muted'}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="relative ml-auto">
          <button
            type="button"
            className={`btn text-xs bold row gap-sm ${showIndicators ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowIndicators((v) => !v)}
          >
            Indicators
            <span className="mono text-xs">{activeOverlays.length}</span>
          </button>

          {showIndicators && (
            <>
              <button
                type="button"
                aria-label="Close indicators"
                className="fixed"
                style={{ inset: 0, zIndex: 50, cursor: 'default', background: 'transparent', border: 0 }}
                onClick={() => setShowIndicators(false)}
              />
              <div className="menu-pop stack" style={{ maxHeight: 360, overflow: 'auto', padding: 0 }}>
                <div className="px-lg py-md text-xs bold muted uppercase">Overlays</div>
                {OVERLAY_DEFS.map((ind) => (
                  <IndicatorToggle
                    key={ind.id}
                    color={ind.color}
                    label={ind.label}
                    active={indicators[ind.id]}
                    onClick={() => toggleIndicator(ind.id)}
                  />
                ))}
                <div className="px-lg py-md text-xs bold muted uppercase border" style={{ borderWidth: '1px 0' }}>
                  Oscillators
                </div>
                {OSCILLATOR_DEFS.map((ind) => (
                  <IndicatorToggle
                    key={ind.id}
                    color={ind.color}
                    label={ind.label}
                    active={indicators[ind.id]}
                    onClick={() => toggleIndicator(ind.id)}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      <div className="row flex-wrap gap-md border px-lg py-md mono text-xs" style={{ borderWidth: '0 0 1px' }}>
        <span className="text-xs bold ink">{symbol}</span>
        <span className="muted">{tf.label}</span>
        <Ohlc label="O" value={display ? formatINR(display.open) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="H" value={display ? formatINR(display.high) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="L" value={display ? formatINR(display.low) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="C" value={display ? formatINR(display.close) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="Vol" value={display ? display.volume.toLocaleString('en-IN') : '—'} />
        {activeOverlays.length > 0 && (
          <span className="ml-auto row flex-wrap gap-sm text-xs">
            {activeOverlays.map((ind) => (
              <span key={ind.id} className="row gap-xs muted">
                <span className="rounded shrink-0" style={{ width: 8, height: 8, background: ind.color }} />
                {ind.label}
              </span>
            ))}
          </span>
        )}
      </div>

      <div className="relative">
        {loading && (
          <div className="absolute row-center w-full text-sm bold muted" style={{ inset: 0, zIndex: 2 }}>
            Loading chart…
          </div>
        )}
        <div ref={containerRef} className="w-full" />
        <div className={showOsc ? 'border' : 'hidden'} style={showOsc ? { borderWidth: '1px 0 0' } : undefined}>
          {showOsc && (
            <div className="row-between px-lg py-md text-xs bold muted uppercase">
              <span>{activeOscDef?.label || 'Oscillator'}</span>
              <span>{oscHint(activeOsc)}</span>
            </div>
          )}
          <div ref={oscContainerRef} className="w-full" />
        </div>
      </div>

      <div className="row-between border px-lg py-md text-xs muted" style={{ borderWidth: '1px 0 0' }}>
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
    <button type="button" onClick={onClick} className="menu-item row w-full gap-md">
      <span
        className="inline-flex shrink-0 items-center justify-center rounded border"
        style={{
          width: 18,
          height: 18,
          background: active ? color : 'transparent',
          borderColor: active ? 'transparent' : 'var(--color-line)',
          color: '#fff',
        }}
      >
        {active && (
          <svg viewBox="0 0 12 12" width="10" height="10" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M2.5 6.5l2.5 2.5 4.5-5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span className={active ? 'ink' : 'muted'}>{label}</span>
      <span className="ml-auto rounded shrink-0" style={{ width: 8, height: 8, background: color, opacity: active ? 1 : 0.3 }} />
    </button>
  )
}

function Ohlc({ label, value, tone }) {
  const color = tone === 'up' ? 'up' : tone === 'down' ? 'down' : 'ink'
  return (
    <span>
      <span className="muted" style={{ marginRight: 4 }}>{label}</span>
      <span className={`bold ${color}`}>{value}</span>
    </span>
  )
}
