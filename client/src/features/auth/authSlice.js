import { createSlice, createAsyncThunk } from '@reduxjs/toolkit'
import { api } from '../../lib/api'

function broadcastSignOut() {
  try {
    const channel = new BroadcastChannel('arth-auth')
    channel.postMessage({ type: 'signed-out' })
    channel.close()
  } catch {
    // Other tabs will naturally recover on their next authenticated request.
  }
}

export const fetchMe = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    const data = await api('/auth/me')
    return data.user
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const login = createAsyncThunk('auth/login', async (payload, { rejectWithValue }) => {
  try {
    const data = await api('/auth/login', { method: 'POST', body: payload })
    return data.user
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const register = createAsyncThunk('auth/register', async (payload, { rejectWithValue }) => {
  try {
    const data = await api('/auth/register', { method: 'POST', body: payload })
    return data.user
  } catch (err) {
    return rejectWithValue(err.message)
  }
})

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api('/auth/logout', { method: 'POST', skipRefresh: true })
  } catch {
    /* ignore */
  }
  broadcastSignOut()
})

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    status: 'idle',
    error: null,
    bootstrapped: false,
  },
  reducers: {
    setUser(state, action) {
      state.user = action.payload
    },
    clearError(state) {
      state.error = null
    },
    markBootstrapped(state) {
      state.bootstrapped = true
    },
    signedOut(state) {
      state.user = null
      state.status = 'idle'
      state.error = null
      state.bootstrapped = true
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.user = action.payload
        state.bootstrapped = true
        state.status = 'succeeded'
      })
      .addCase(fetchMe.rejected, (state) => {
        state.user = null
        state.bootstrapped = true
        state.status = 'succeeded'
      })
      .addCase(login.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(login.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = 'succeeded'
      })
      .addCase(login.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(register.pending, (state) => {
        state.status = 'loading'
        state.error = null
      })
      .addCase(register.fulfilled, (state, action) => {
        state.user = action.payload
        state.status = 'succeeded'
      })
      .addCase(register.rejected, (state, action) => {
        state.status = 'failed'
        state.error = action.payload
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null
      })
  },
})

export const { setUser, clearError, markBootstrapped, signedOut } = authSlice.actions
export default authSlice.reducer
