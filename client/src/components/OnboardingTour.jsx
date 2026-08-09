import { useEffect, useState } from 'react'
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography, Stepper, Step, StepLabel } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'

const STEPS = [
  { label: 'Wallet', body: 'Your paper cash lives in Funds. Add money anytime — it is simulated.', to: '/app/funds' },
  { label: 'Explore', body: 'Browse live (delayed) NSE names, sectors and watchlists.', to: '/app/explore' },
  { label: 'Buy', body: 'Open a stock, pick CNC or MIS, preview charges, then place a paper order.', to: '/app/explore' },
  { label: 'Orders', body: 'Track open limits, fills and cancels in the order book.', to: '/app/orders' },
  { label: 'Portfolio', body: 'See live P&L, XIRR and sector exposure on Investments.', to: '/app/investments' },
]

const KEY = 'arth_onboarding_done'

export function OnboardingTour() {
  const user = useAppSelector((s) => s.auth.user)
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)

  useEffect(() => {
    if (!user?.learningMode) return
    try {
      if (!localStorage.getItem(KEY)) setOpen(true)
    } catch {
      setOpen(true)
    }
  }, [user?.learningMode, user?.id])

  const finish = () => {
    try {
      localStorage.setItem(KEY, '1')
    } catch {
      /* ignore */
    }
    setOpen(false)
  }

  const next = () => {
    if (active >= STEPS.length - 1) {
      finish()
      navigate('/app/learn')
      return
    }
    setActive((a) => a + 1)
  }

  if (!open) return null

  const step = STEPS[active]

  return (
    <Dialog open={open} onClose={finish} fullWidth maxWidth="sm">
      <DialogTitle>Welcome to paper trading</DialogTitle>
      <DialogContent className="stack gap-lg">
        <Typography color="text.secondary">
          Arth is a learning brokerage. No real money moves — practice orders, SIPs and risk habits safely.
        </Typography>
        <Stepper activeStep={active} alternativeLabel>
          {STEPS.map((s) => (
            <Step key={s.label}><StepLabel>{s.label}</StepLabel></Step>
          ))}
        </Stepper>
        <div className="card p-lg stack gap-sm">
          <Typography fontWeight={800}>{step.label}</Typography>
          <Typography variant="body2" color="text.secondary">{step.body}</Typography>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={finish}>Skip</Button>
        <Button variant="outlined" onClick={() => navigate(step.to)}>Open {step.label}</Button>
        <Button variant="contained" onClick={next}>
          {active >= STEPS.length - 1 ? 'Go to Learn' : 'Next'}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
