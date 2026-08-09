import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { CssBaseline, ThemeProvider } from '@mui/material'
import { createArthTheme } from './arthTheme'

const ThemeModeContext = createContext({
  mode: 'light',
  toggleMode: () => {},
  setMode: () => {},
})

const STORAGE_KEY = 'arth_theme_mode'

export function ThemeModeProvider({ children }) {
  const [mode, setModeState] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved === 'dark' ? 'dark' : 'light'
    } catch {
      return 'light'
    }
  })

  const setMode = (next) => {
    const value = next === 'dark' ? 'dark' : 'light'
    setModeState(value)
    try {
      localStorage.setItem(STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
  }

  const toggleMode = () => setMode(mode === 'dark' ? 'light' : 'dark')

  useEffect(() => {
    document.documentElement.dataset.theme = mode
  }, [mode])

  const theme = useMemo(() => createArthTheme(mode), [mode])
  const value = useMemo(() => ({ mode, toggleMode, setMode }), [mode])

  return (
    <ThemeModeContext.Provider value={value}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        {children}
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

export function useThemeMode() {
  return useContext(ThemeModeContext)
}
