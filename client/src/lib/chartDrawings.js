/** Drawing tools + per-symbol persistence for AdvancedChart. */

export const DRAW_TOOLS = [
  { id: 'pan', label: 'Pan', tip: 'Pan & zoom chart' },
  { id: 'select', label: 'Select', tip: 'Select a drawing' },
  { id: 'trend', label: 'Trend', tip: 'Trend line (2 clicks)' },
  { id: 'hline', label: 'H-Line', tip: 'Horizontal line' },
  { id: 'ray', label: 'Ray', tip: 'Price ray (2 clicks)' },
  { id: 'rect', label: 'Rect', tip: 'Rectangle (2 corners)' },
  { id: 'fib', label: 'Fib', tip: 'Fibonacci retracement' },
]

export const FIB_LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1]

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
  if (type === 'hline') return 1
  if (type === 'trend' || type === 'ray' || type === 'rect' || type === 'fib') return 2
  return 0
}

export const DRAW_COLORS = {
  trend: '#2563eb',
  hline: '#c98516',
  ray: '#0891b2',
  rect: '#7c3aed',
  fib: '#00a878',
}
