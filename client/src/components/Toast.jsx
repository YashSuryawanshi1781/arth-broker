import { Alert, Snackbar } from '@mui/material'
import { useAppDispatch, useAppSelector } from '../app/hooks'
import { clearToast } from '../features/ui/uiSlice'

const SEVERITY = {
  success: 'success',
  error: 'error',
  warning: 'warning',
  info: 'info',
}

export function Toast() {
  const toast = useAppSelector((s) => s.ui.toast)
  const dispatch = useAppDispatch()

  return (
    <Snackbar
      open={Boolean(toast)}
      autoHideDuration={4200}
      onClose={() => dispatch(clearToast())}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      {toast ? (
        <Alert
          onClose={() => dispatch(clearToast())}
          severity={SEVERITY[toast.type] || 'info'}
          variant="filled"
          sx={{ width: '100%', borderRadius: 2, fontWeight: 600 }}
        >
          <strong>{toast.title}</strong>
          {toast.message ? ` — ${toast.message}` : null}
        </Alert>
      ) : undefined}
    </Snackbar>
  )
}
