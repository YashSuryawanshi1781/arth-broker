/** Drawing tools + per-symbol persistence for AdvancedChart. */

export const DRAW_TOOL_GROUPS = [
  {
    id: 'cursor',
    label: 'Cursor',
    tools: [
      { id: 'pan', label: 'Pan', tip: 'Pan & zoom chart' },
      { id: 'select', label: 'Select', tip: 'Select a drawing' },
    ],
  },
  {
    id: 'lines',
    label: 'Lines',
    tools: [
      { id: 'trend', label: 'Trend', tip: 'Trend line (2 clicks)' },
      { id: 'ray', label: 'Ray', tip: 'Ray from point (2 clicks)' },
      { id: 'hline', label: 'H-Line', tip: 'Horizontal line' },
      { id: 'vline', label: 'V-Line', tip: 'Vertical line' },
      { id: 'hray', label: 'H-Ray', tip: 'Horizontal ray (2 clicks)' },
      { id: 'arrow', label: 'Arrow', tip: 'Arrow (2 clicks)' },
    ],
  },
  {
    id: 'shapes',
    label: 'Shapes',
    tools: [
      { id: 'rect', label: 'Rect', tip: 'Rectangle (2 corners)' },
      { id: 'ellipse', label: 'Ellipse', tip: 'Ellipse (2 corners)' },
      { id: 'triangle', label: 'Triangle', tip: 'Triangle (3 clicks)' },
      { id: 'channel', label: 'Channel', tip: 'Parallel channel (3 clicks)' },
    ],
  },
  {
    id: 'fib',
    label: 'Fib',
    tools: [
      { id: 'fib', label: 'Fib', tip: 'Fibonacci retracement' },
      { id: 'fibext', label: 'Fib Ext', tip: 'Fibonacci extension (3 clicks)' },
    ],
  },
  {
    id: 'annotate',
    label: 'Annotate',
    tools: [
      { id: 'text', label: 'Text', tip: 'Text label (click + type)' },
      { id: 'brush', label: 'Brush', tip: 'Freehand brush (drag)' },
      { id: 'measure', label: 'Measure', tip: 'Price / time ruler (2 clicks)' },
    ],
  },
]

export const DRAW_TOOLS = DRAW_TOOL_GROUPS.flatMap((g) => g.tools)

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]
export const FIB_EXT_LEVELS = [0, 0.618, 1, 1.272, 1.618, 2, 2.618]

const PREFIX = 'arth_chart_drawings_v1:'

export function drawingsKey(symbol) {
  return `${PREFIX}${String(symbol || '').toUpperCase()}`
}

export function loadDrawings(symbol) {
  if (!symbol || typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(drawingsKey(symbol))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed.filter(isValidDrawing) : []
  } catch {
    return []
  }
}

export function saveDrawings(symbol, drawings) {
  if (!symbol || typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(drawingsKey(symbol), JSON.stringify(drawings))
  } catch {
    /* quota / private mode */
  }
}

export function clearDrawingsStorage(symbol) {
  if (!symbol || typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(drawingsKey(symbol))
  } catch {
    /* ignore */
  }
}

function isValidDrawing(d) {
  return d
    && typeof d.id === 'string'
    && typeof d.type === 'string'
    && Array.isArray(d.points)
    && d.points.length > 0
}

export function newDrawingId() {
  return `d_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`
}

export function pointsNeeded(type) {
  if (type === 'hline' || type === 'vline' || type === 'text') return 1
  if (
    type === 'trend'
    || type === 'ray'
    || type === 'hray'
    || type === 'arrow'
    || type === 'rect'
    || type === 'ellipse'
    || type === 'fib'
    || type === 'measure'
  ) return 2
  if (type === 'triangle' || type === 'channel' || type === 'fibext') return 3
  if (type === 'brush') return -1
  return 0
}

export const DRAW_COLORS = {
  trend: '#2563eb',
  ray: '#0891b2',
  hline: '#c98516',
  vline: '#64748b',
  hray: '#d97706',
  arrow: '#dc2626',
  rect: '#7c3aed',
  ellipse: '#8b5cf6',
  triangle: '#a855f7',
  channel: '#0d9488',
  fib: '#00a878',
  fibext: '#059669',
  text: '#0b1b33',
  brush: '#e11d48',
  measure: '#475569',
}
