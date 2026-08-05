import { createSlice } from '@reduxjs/toolkit'

const marketSlice = createSlice({
  name: 'market',
  initialState: {
    instruments: {},
    symbols: [],
    indices: {},
    connected: false,
    status: {
      provider: null,
      source: 'initialising',
      isDelayed: false,
      lastUpdated: null,
      marketState: 'UNKNOWN',
    },
  },
  reducers: {
    setSnapshot(state, action) {
      const list = action.payload.instruments || []
      state.instruments = Object.fromEntries(list.map((i) => [i.symbol, i]))
      state.symbols = list.map((i) => i.symbol)
      state.indices = action.payload.indices || {}
      if (action.payload.marketStatus) state.status = action.payload.marketStatus
      state.connected = true
    },
    applyTicks(state, action) {
      for (const tick of action.payload.ticks || []) {
        const row = state.instruments[tick.symbol]
        if (!row) continue
        row.price = tick.price
        row.volume = tick.volume
        row.change = tick.change
        row.changePct = tick.changePct
        row.lastUpdate = tick.ts
        row.high = tick.high ?? Math.max(row.high || tick.price, tick.price)
        row.low = tick.low ?? Math.min(row.low || tick.price, tick.price)
        if (tick.dataSource) row.dataSource = tick.dataSource
      }
      if (action.payload.indices) state.indices = action.payload.indices
      if (action.payload.marketStatus) state.status = action.payload.marketStatus
    },
    setMarketStatus(state, action) {
      state.status = action.payload
    },
    setConnected(state, action) {
      state.connected = action.payload
    },
  },
})

export const { setSnapshot, applyTicks, setMarketStatus, setConnected } = marketSlice.actions
export default marketSlice.reducer
