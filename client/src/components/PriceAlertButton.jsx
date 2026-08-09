import { useState } from 'react'
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
} from '@mui/material'
import NotificationsActiveOutlinedIcon from '@mui/icons-material/NotificationsActiveOutlined'
import { api } from '../lib/api'
import { useAppDispatch } from '../app/hooks'
import { showToast } from '../features/ui/uiSlice'

export function PriceAlertButton({ symbol, ltp }) {
  const dispatch = useAppDispatch()
  const [open, setOpen] = useState(false)
  const [direction, setDirection] = useState('above')
  const [targetPrice, setTargetPrice] = useState(ltp ? String(Number(ltp).toFixed(2)) : '')
  const [busy, setBusy] = useState(false)

  const submit = async () => {
    setBusy(true)
    try {
      await api('/alerts', {
        method: 'POST',
        body: { symbol, direction, targetPrice: Number(targetPrice) },
      })
      dispatch(showToast({ type: 'success', title: 'Alert set', message: `${symbol} ${direction} ₹${targetPrice}` }))
      setOpen(false)
    } catch (err) {
      dispatch(showToast({ type: 'error', title: 'Alert failed', message: err.message }))
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <Button
        size="small"
        variant="outlined"
        startIcon={<NotificationsActiveOutlinedIcon />}
        onClick={() => {
          setTargetPrice(ltp ? String(Number(ltp).toFixed(2)) : '')
          setOpen(true)
        }}
      >
        Set alert
      </Button>
      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Price alert · {symbol}</DialogTitle>
        <DialogContent className="space-y-3" sx={{ pt: 1 }}>
          <TextField
            select
            label="Trigger when price is"
            value={direction}
            onChange={(e) => setDirection(e.target.value)}
            sx={{ mt: 1 }}
          >
            <MenuItem value="above">At or above</MenuItem>
            <MenuItem value="below">At or below</MenuItem>
          </TextField>
          <TextField
            label="Target price (₹)"
            type="number"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submit} disabled={busy}>
            Create alert
          </Button>
        </DialogActions>
      </Dialog>
    </>
  )
}
