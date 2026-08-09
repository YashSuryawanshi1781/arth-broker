import { useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField, Typography } from '@mui/material'
import { api } from '../lib/api'
import { useAppSelector } from '../app/hooks'

const STORAGE_KEY = 'arth_pin_ok'

export function PinLock({ children }) {
  const user = useAppSelector((s) => s.auth.user)
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [ok, setOk] = useState(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  if (!user?.hasPin || ok) return children

  const verify = async (e) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await api('/auth/pin/verify', { method: 'POST', body: { pin } })
      localStorage.setItem(STORAGE_KEY, '1')
      setOk(true)
      setPin('')
    } catch (err) {
      setError(err.message || 'Incorrect PIN')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <div aria-hidden style={{ filter: 'blur(4px)', pointerEvents: 'none' }}>{children}</div>
      <Dialog open disableEscapeKeyDown>
        <form onSubmit={verify}>
          <DialogTitle>Enter app PIN</DialogTitle>
          <DialogContent className="stack gap-md" style={{ paddingTop: 8 }}>
            <Typography variant="body2" color="text.secondary">
              Your account has a PIN. Enter it to unlock this session.
            </Typography>
            <TextField
              autoFocus
              label="PIN"
              type="password"
              inputProps={{ inputMode: 'numeric', maxLength: 6 }}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
              error={!!error}
              helperText={error}
              fullWidth
              margin="dense"
            />
          </DialogContent>
          <DialogActions>
            <Button type="submit" variant="contained" disabled={busy || pin.length < 4}>
              Unlock
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </>
  )
}
