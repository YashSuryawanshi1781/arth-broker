import { createSlice } from '@reduxjs/toolkit'

const uiSlice = createSlice({
  name: 'ui',
  initialState: { toast: null },
  reducers: {
    showToast(state, action) {
      const payload = action.payload || {}
      state.toast = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: payload.type || 'info',
        title: payload.title || 'Notice',
        message: payload.message || '',
      }
    },
    clearToast(state) {
      state.toast = null
    },
  },
})

export const { showToast, clearToast } = uiSlice.actions
export default uiSlice.reducer
