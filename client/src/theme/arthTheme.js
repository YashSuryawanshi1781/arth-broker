import { createTheme } from '@mui/material/styles'

const fonts = {
  sans: '"Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif',
  mono: '"IBM Plex Mono", ui-monospace, monospace',
}

export function createArthTheme(mode = 'light') {
  const dark = mode === 'dark'
  return createTheme({
    palette: {
      mode,
      primary: { main: '#00a878', dark: '#01966b', light: '#34d9a4', contrastText: '#fff' },
      secondary: { main: '#16325c', dark: '#0b1b33', light: '#1b3c6d', contrastText: '#fff' },
      success: { main: '#00a878' },
      error: { main: '#e5484d' },
      warning: { main: '#c98516' },
      info: { main: '#2563eb' },
      background: {
        default: dark ? '#0a1220' : '#fbfcfd',
        paper: dark ? '#121c2e' : '#ffffff',
      },
      text: {
        primary: dark ? '#e8eef7' : '#0b1b33',
        secondary: dark ? '#9aabbd' : '#5b6b7c',
      },
      divider: dark ? '#243247' : '#dce3eb',
    },
    typography: {
      fontFamily: fonts.sans,
      button: { textTransform: 'none', fontWeight: 700 },
      h1: { fontWeight: 800, letterSpacing: '-0.03em' },
      h2: { fontWeight: 800, letterSpacing: '-0.03em' },
      h3: { fontWeight: 800, letterSpacing: '-0.02em' },
      h4: { fontWeight: 800 },
      h5: { fontWeight: 800 },
      h6: { fontWeight: 700 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { borderRadius: 12, padding: '0.55rem 1.05rem', boxShadow: 'none' },
          containedPrimary: {
            background: 'linear-gradient(180deg, #00b984 0%, #00a878 100%)',
            '&:hover': { background: '#01966b', boxShadow: 'none' },
          },
        },
      },
      MuiPaper: {
        styleOverrides: {
          root: { backgroundImage: 'none' },
          rounded: { borderRadius: 18 },
        },
      },
      MuiTextField: {
        defaultProps: { size: 'small', fullWidth: true },
      },
      MuiOutlinedInput: {
        styleOverrides: {
          root: { borderRadius: 12, backgroundColor: dark ? '#0f1828' : '#fff' },
        },
      },
      MuiChip: {
        styleOverrides: { root: { fontWeight: 700 } },
      },
      MuiDialog: {
        styleOverrides: { paper: { borderRadius: 18 } },
      },
      MuiDrawer: {
        styleOverrides: { paper: { borderRadius: 0 } },
      },
      MuiCssBaseline: {
        styleOverrides: {
          body: {
            fontFamily: fonts.sans,
          },
        },
      },
    },
  })
}
