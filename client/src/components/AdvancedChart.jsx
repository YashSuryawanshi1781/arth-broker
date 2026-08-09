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
import {
  DRAW_COLORS,
  DRAW_TOOLS,
  FIB_LEVELS,
  clearDrawingsStorage,
  loadDrawings,
  newDrawingId,
  pointsNeeded,
  saveDrawings,
} from '../lib/chartDrawings.js'
import { IconMaximize, IconTrash } from './Icons'

export function chartPagePath({ symbol, candlesPath }) {
  if (candlesPath && candlesPath.includes('/indices/')) {
    const key = String(symbol || '').trim()
    return key ? `/app/chart/index/${encodeURIComponent(key)}` : '/app'
  }
  const sym = String(symbol || '').toUpperCase()
  return sym ? `/app/chart/${encodeURIComponent(sym)}` : '/app'
}

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

export function AdvancedChart({ symbol, live, candlesPath, variant = 'embedded' }) {
  const dispatch = useAppDispatch()
  const isPage = variant === 'page'
  const shellRef = useRef(null)
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
  const drawingsRef = useRef([])
  const draftRef = useRef(null)

  const [timeframe, setTimeframe] = useState('5m')
  const [chartType, setChartType] = useState('candle')
  const [indicators, setIndicators] = useState(() => loadIndicatorPrefs())
  const [hover, setHover] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showIndicators, setShowIndicators] = useState(false)
  const [showTools, setShowTools] = useState(isPage)
  const [drawTool, setDrawTool] = useState('pan')
  const [drawings, setDrawings] = useState(() => loadDrawings(symbol))
  const [draft, setDraft] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [drawVersion, setDrawVersion] = useState(0)
  const [chartHeight, setChartHeight] = useState(isPage ? 560 : 380)

  const tf = useMemo(() => TIMEFRAMES.find((t) => t.id === timeframe) || TIMEFRAMES[1], [timeframe])
  const activeOsc = primaryOscillator(indicators)
  const showOsc = Boolean(activeOsc)

  drawingsRef.current = drawings
  draftRef.current = draft

  const persistDrawings = (next, { toast = false } = {}) => {
    setDrawings(next)
    saveDrawings(symbol, next)
    if (toast) {
      dispatch(showToast({ type: 'success', title: 'Drawings saved', message: `${next.length} object(s) kept for ${symbol}` }))
    }
  }

  const toggleIndicator = (id) => {
    setIndicators((prev) => {
      const next = { ...prev, [id]: !prev[id] }
      saveIndicatorPrefs(next)
      return next
    })
  }

  // Reload drawings when symbol changes
  useEffect(() => {
    setDrawings(loadDrawings(symbol))
    setDraft(null)
    setSelectedId(null)
    setDrawTool('pan')
  }, [symbol])

  function resizeChart() {
    const shell = shellRef.current
    const container = containerRef.current
    const chart = chartRef.current
    if (!container || !chart) return

    let height = 380
    if (isPage && shell) {
      const toolbar = showTools ? 168 : 118
      const osc = showOsc ? 156 : 0
      height = Math.max(420, shell.clientHeight - toolbar - osc)
    }
    setChartHeight(height)
    chart.applyOptions({
      width: container.clientWidth,
      height,
    })
    if (oscContainerRef.current && oscChartRef.current) {
      oscChartRef.current.applyOptions({
        width: oscContainerRef.current.clientWidth,
        height: isPage ? 140 : 120,
      })
    }
    setDrawVersion((v) => v + 1)
  }

  function openFullChartTab() {
    const path = chartPagePath({ symbol, candlesPath })
    const opened = window.open(path, '_blank', 'noopener,noreferrer')
    if (!opened) {
      dispatch(showToast({
        type: 'warning',
        title: 'Pop-up blocked',
        message: 'Allow pop-ups to open the full chart in a new tab',
      }))
    }
  }

  // Build / rebuild charts when symbol, timeframe, or chart type changes
  useEffect(() => {
    if (!containerRef.current || !symbol) return undefined
    setLoading(true)
    intervalRef.current = tf.interval

    const height = isPage && shellRef.current
      ? Math.max(420, shellRef.current.clientHeight - (showOsc ? 320 : 168))
      : 380
    setChartHeight(height)

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
      height,
      handleScroll: true,
      handleScale: true,
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

    const bumpDraw = () => setDrawVersion((v) => v + 1)
    chart.timeScale().subscribeVisibleLogicalRangeChange(bumpDraw)
    chart.subscribeCrosshairMove(bumpDraw)

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
        height: isPage ? 140 : 120,
      })
      const oscSeries = oscChart.addSeries(LineSeries, { color: '#8b5cf6', lineWidth: 2 })
      oscChartRef.current = oscChart
      oscSeriesRef.current = oscSeries
      chart.timeScale().subscribeVisibleLogicalRangeChange((range) => {
        if (range) oscChart.timeScale().setVisibleLogicalRange(range)
      })
    }

    const ro = new ResizeObserver(() => resizeChart())
    ro.observe(containerRef.current)
    if (shellRef.current) ro.observe(shellRef.current)

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
        setDrawVersion((v) => v + 1)
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

  useEffect(() => {
    if (!candlesRef.current.length || !mainSeriesRef.current) return
    applySeriesData(candlesRef.current, chartType, indicators)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [indicators])

  useEffect(() => {
    if (!showOsc || !oscContainerRef.current || !oscChartRef.current) return
    const width = oscContainerRef.current.clientWidth || containerRef.current?.clientWidth || 700
    oscChartRef.current.applyOptions({ width })
  }, [showOsc, activeOsc])

  useEffect(() => {
    if (!isPage) return
    requestAnimationFrame(() => resizeChart())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPage, showTools, showOsc])

  // Disable chart pan while drawing / select tools are active
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return
    const interactive = drawTool !== 'pan'
    chart.applyOptions({
      handleScroll: !interactive,
      handleScale: !interactive,
      crosshair: {
        mode: interactive ? CrosshairMode.Hidden : CrosshairMode.Normal,
      },
    })
  }, [drawTool, symbol, timeframe, chartType])

  // Keyboard: Escape cancels draft / exits tool; Delete removes selection
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setDraft(null)
        setDrawTool('pan')
        setSelectedId(null)
      }
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedId && !e.target.closest('input, textarea')) {
        e.preventDefault()
        persistDrawings(drawingsRef.current.filter((d) => d.id !== selectedId))
        setSelectedId(null)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, symbol])

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

  function eventToPoint(e) {
    const chart = chartRef.current
    const series = mainSeriesRef.current
    const el = containerRef.current
    if (!chart || !series || !el) return null
    const rect = el.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const time = chart.timeScale().coordinateToTime(x)
    const price = series.coordinateToPrice(y)
    if (time == null || price == null || Number.isNaN(price)) return null
    return { time, price: Number(price) }
  }

  function pointToXY(point) {
    const chart = chartRef.current
    const series = mainSeriesRef.current
    if (!chart || !series || !point) return null
    const x = chart.timeScale().timeToCoordinate(point.time)
    const y = series.priceToCoordinate(point.price)
    if (x == null || y == null) return null
    return { x, y }
  }

  function onOverlayPointerDown(e) {
    if (drawTool === 'pan') return

    if (drawTool === 'select') {
      const hit = hitTestDrawing(e)
      setSelectedId(hit)
      return
    }

    const point = eventToPoint(e)
    if (!point) return
    e.preventDefault()

    const need = pointsNeeded(drawTool)
    if (need === 1) {
      const drawing = {
        id: newDrawingId(),
        type: drawTool,
        points: [point],
        color: DRAW_COLORS[drawTool] || '#2563eb',
      }
      persistDrawings([...drawingsRef.current, drawing])
      setSelectedId(drawing.id)
      setDraft(null)
      return
    }

    if (!draft || draft.type !== drawTool) {
      setDraft({ type: drawTool, points: [point], color: DRAW_COLORS[drawTool] || '#2563eb' })
      return
    }

    const drawing = {
      id: newDrawingId(),
      type: drawTool,
      points: [draft.points[0], point],
      color: draft.color,
    }
    persistDrawings([...drawingsRef.current, drawing])
    setSelectedId(drawing.id)
    setDraft(null)
  }

  function onOverlayPointerMove(e) {
    if (!draft) return
    const point = eventToPoint(e)
    if (!point) return
    setDraft((prev) => (prev ? { ...prev, hover: point } : prev))
  }

  function hitTestDrawing(e) {
    const point = eventToPoint(e)
    if (!point) return null
    const xy = pointToXY(point)
    if (!xy) return null
    let best = null
    let bestDist = 14
    for (const d of drawingsRef.current) {
      const coords = d.points.map(pointToXY).filter(Boolean)
      if (!coords.length) continue
      if (d.type === 'hline') {
        const y = coords[0].y
        const dist = Math.abs(xy.y - y)
        if (dist < bestDist) {
          bestDist = dist
          best = d.id
        }
      } else if (d.type === 'rect' && coords.length >= 2) {
        const minX = Math.min(coords[0].x, coords[1].x)
        const maxX = Math.max(coords[0].x, coords[1].x)
        const minY = Math.min(coords[0].y, coords[1].y)
        const maxY = Math.max(coords[0].y, coords[1].y)
        if (xy.x >= minX - 4 && xy.x <= maxX + 4 && xy.y >= minY - 4 && xy.y <= maxY + 4) {
          const edge = Math.min(xy.x - minX, maxX - xy.x, xy.y - minY, maxY - xy.y)
          if (edge < bestDist) {
            bestDist = edge
            best = d.id
          }
        }
      } else if (coords.length >= 2) {
        const dist = distToSegment(xy, coords[0], coords[1])
        if (dist < bestDist) {
          bestDist = dist
          best = d.id
        }
      }
    }
    return best
  }

  function undoDrawing() {
    if (!drawings.length) return
    persistDrawings(drawings.slice(0, -1))
    setSelectedId(null)
  }

  function clearAllDrawings() {
    persistDrawings([])
    clearDrawingsStorage(symbol)
    setSelectedId(null)
    setDraft(null)
    dispatch(showToast({ type: 'success', title: 'Drawings cleared', message: `Removed saved drawings for ${symbol}` }))
  }

  function deleteSelected() {
    if (!selectedId) return
    persistDrawings(drawings.filter((d) => d.id !== selectedId))
    setSelectedId(null)
  }

  const display = hover || candlesRef.current[candlesRef.current.length - 1]
  const up = display ? display.close >= display.open : true
  const activeOverlays = [...OVERLAY_DEFS, ...OSCILLATOR_DEFS].filter((ind) => indicators[ind.id])
  const activeOscDef = OSCILLATOR_DEFS.find((d) => d.id === activeOsc)
  const preview = draft
    ? { ...draft, points: draft.hover ? [...draft.points, draft.hover] : draft.points }
    : null

  // touch drawVersion so SVG remaps after pan/zoom
  void drawVersion

  return (
    <div
      ref={shellRef}
      className={`card overflow-hidden chart-shell${isPage ? ' is-page' : ''}`}
    >
      <div className="chart-toolbar">
        <div className="chart-toolbar-group">
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

        <span className="chart-toolbar-sep" aria-hidden="true" />

        <div className="chart-toolbar-group">
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

        <div className="chart-toolbar-actions">
          <button
            type="button"
            className={`btn text-xs bold ${showTools ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setShowTools((v) => !v)}
          >
            Tools
          </button>

          <div className="relative">
            <button
              type="button"
              className={`btn text-xs bold row gap-sm ${showIndicators ? 'btn-primary' : 'btn-ghost'}`}
              onClick={() => setShowIndicators((v) => !v)}
            >
              Indicators
              {activeOverlays.length > 0 && (
                <span className="mono text-xs">{activeOverlays.length}</span>
              )}
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

          {!isPage && (
            <button
              type="button"
              className="btn btn-ghost text-xs bold row gap-sm"
              onClick={openFullChartTab}
              title="Open full chart in a new tab"
            >
              <IconMaximize size={15} />
              Full
            </button>
          )}
        </div>
      </div>

      {showTools && (
        <div className="chart-tools-bar">
          <div className="row flex-wrap gap-xs">
            {DRAW_TOOLS.map((tool) => (
              <button
                key={tool.id}
                type="button"
                title={tool.tip}
                className={`btn text-xs bold ${drawTool === tool.id ? 'btn-primary' : 'btn-ghost'}`}
                onClick={() => {
                  setDrawTool(tool.id)
                  setDraft(null)
                  if (tool.id === 'pan') setSelectedId(null)
                }}
              >
                {tool.label}
              </button>
            ))}
          </div>
          <div className="row flex-wrap gap-xs">
            <button type="button" className="btn btn-ghost text-xs bold" onClick={undoDrawing} disabled={!drawings.length}>
              Undo
            </button>
            <button
              type="button"
              className="btn btn-ghost text-xs bold row gap-sm"
              onClick={deleteSelected}
              disabled={!selectedId}
              title="Delete selected"
            >
              <IconTrash size={14} />
              Delete
            </button>
            <button type="button" className="btn btn-ghost text-xs bold" onClick={clearAllDrawings} disabled={!drawings.length}>
              Clear
            </button>
            <button
              type="button"
              className="btn btn-dark text-xs bold"
              onClick={() => persistDrawings(drawings, { toast: true })}
            >
              Save drawings
            </button>
          </div>
        </div>
      )}

      <div className="chart-ohlc">
        <span className="bold ink">{symbol}</span>
        <span className="muted">{tf.label}</span>
        <Ohlc label="O" value={display ? formatINR(display.open) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="H" value={display ? formatINR(display.high) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="L" value={display ? formatINR(display.low) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="C" value={display ? formatINR(display.close) : '—'} tone={up ? 'up' : 'down'} />
        <Ohlc label="Vol" value={display ? display.volume.toLocaleString('en-IN') : '—'} />
        {drawTool !== 'pan' ? (
          <span className="ml-auto muted font-sans text-[11px] font-bold">
            {DRAW_TOOLS.find((t) => t.id === drawTool)?.tip}
          </span>
        ) : drawings.length > 0 ? (
          <span className="ml-auto muted font-sans text-[11px] font-bold">
            {drawings.length} saved
          </span>
        ) : null}
      </div>

      <div className="relative">
        {loading && (
          <div className="absolute row-center w-full text-sm bold muted" style={{ inset: 0, zIndex: 2 }}>
            Loading chart…
          </div>
        )}
        <div ref={containerRef} className="w-full" style={{ height: chartHeight }} />
        <svg
          className={`chart-draw-layer${drawTool !== 'pan' ? ' is-drawing' : ''}`}
          style={{ height: chartHeight }}
          onPointerDown={onOverlayPointerDown}
          onPointerMove={onOverlayPointerMove}
        >
          {[...drawings, ...(preview ? [{ ...preview, id: 'draft' }] : [])].map((d) => (
            <DrawingShape
              key={d.id}
              drawing={d}
              toXY={pointToXY}
              selected={d.id === selectedId}
              width={containerRef.current?.clientWidth || 700}
            />
          ))}
        </svg>
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
        <span className="truncate">
          {showTools
            ? 'Draw · auto-saves per symbol · Esc cancels · Del deletes selection'
            : 'Hover for OHLC · Tools for drawings · Full for fullscreen'}
        </span>
        <span className="row gap-sm shrink-0">
          <span className="live-dot" />
          Live
        </span>
      </div>
    </div>
  )
}

function DrawingShape({ drawing, toXY, selected, width }) {
  const color = drawing.color || '#2563eb'
  const stroke = selected ? '#0b1b33' : color
  const widthStroke = selected ? 2.4 : 1.6
  const pts = drawing.points.map(toXY).filter(Boolean)

  if (drawing.type === 'hline' && pts[0]) {
    return (
      <g>
        <line x1={0} y1={pts[0].y} x2={width} y2={pts[0].y} stroke={stroke} strokeWidth={widthStroke} strokeDasharray="6 4" />
        <circle cx={24} cy={pts[0].y} r={3.5} fill={color} />
      </g>
    )
  }

  if ((drawing.type === 'trend' || drawing.type === 'ray') && pts.length >= 2) {
    let x1 = pts[0].x
    let y1 = pts[0].y
    let x2 = pts[1].x
    let y2 = pts[1].y
    if (drawing.type === 'ray') {
      const dx = x2 - x1
      const dy = y2 - y1
      if (Math.abs(dx) > 0.001) {
        const t = (width + 40 - x1) / dx
        x2 = x1 + dx * Math.max(t, 1)
        y2 = y1 + dy * Math.max(t, 1)
      }
    }
    return (
      <g>
        <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth={widthStroke} />
        <circle cx={pts[0].x} cy={pts[0].y} r={3.5} fill={color} />
        <circle cx={pts[1].x} cy={pts[1].y} r={3.5} fill={color} />
      </g>
    )
  }

  if (drawing.type === 'rect' && pts.length >= 2) {
    const x = Math.min(pts[0].x, pts[1].x)
    const y = Math.min(pts[0].y, pts[1].y)
    const w = Math.abs(pts[1].x - pts[0].x)
    const h = Math.abs(pts[1].y - pts[0].y)
    return (
      <g>
        <rect x={x} y={y} width={w} height={h} fill={`${color}22`} stroke={stroke} strokeWidth={widthStroke} />
      </g>
    )
  }

  if (drawing.type === 'fib' && pts.length >= 2) {
    const y1 = pts[0].y
    const y2 = pts[1].y
    const xLeft = Math.min(pts[0].x, pts[1].x)
    const xRight = Math.max(pts[0].x, pts[1].x, xLeft + 80)
    return (
      <g>
        {FIB_LEVELS.map((level) => {
          const y = y1 + (y2 - y1) * level
          return (
            <g key={level}>
              <line x1={xLeft} y1={y} x2={xRight} y2={y} stroke={stroke} strokeWidth={1.2} strokeOpacity={0.85} />
              <text x={xRight + 4} y={y + 3} fontSize="10" fill={stroke} fontFamily="IBM Plex Mono, monospace">
                {level.toFixed(3)}
              </text>
            </g>
          )
        })}
        <line x1={pts[0].x} y1={pts[0].y} x2={pts[1].x} y2={pts[1].y} stroke={stroke} strokeWidth={1} strokeDasharray="4 3" strokeOpacity={0.5} />
      </g>
    )
  }

  if (pts[0]) {
    return <circle cx={pts[0].x} cy={pts[0].y} r={4} fill={color} />
  }
  return null
}

function distToSegment(p, a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  if (dx === 0 && dy === 0) return Math.hypot(p.x - a.x, p.y - a.y)
  const t = Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy)))
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy))
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
