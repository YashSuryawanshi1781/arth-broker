import { configureStore } from '@reduxjs/toolkit'
import authReducer from '../features/auth/authSlice'
import marketReducer from '../features/market/marketSlice'
import uiReducer from '../features/ui/uiSlice'

export const store = configureStore({
  reducer: {
    auth: authReducer,
    market: marketReducer,
    ui: uiReducer,
  },
})
