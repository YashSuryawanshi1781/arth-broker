import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Dialog,
  DialogContent,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  Box,
  Chip,
} from '@mui/material'
import { useAppSelector } from '../app/hooks'
import { PRIMARY_NAV, DRAWER_SECTIONS } from './navConfig'

export function CommandPalette({ open, onClose }) {
  const navigate = useNavigate()
  const instruments = useAppSelector((s) => s.market.instruments) || {}
  const indices = useAppSelector((s) => s.market.indices) || {}
  const [q, setQ] = useState('')

  useEffect(() => {
    if (open) setQ('')
  }, [open])

  const pages = useMemo(() => {
    const fromPrimary = PRIMARY_NAV.map((l) => ({ type: 'Page', label: l.label, to: l.to }))
    const fromDrawer = DRAWER_SECTIONS.flatMap((sec) =>
      sec.items.map((l) => ({ type: 'Page', label: l.label, to: l.to, hint: l.hint })),
    )
    const seen = new Set()
    return [...fromPrimary, ...fromDrawer].filter((p) => {
      if (seen.has(p.to)) return false
      seen.add(p.to)
      return true
    })
  }, [])

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    const stockHits = Object.values(instruments)
      .filter((i) => !query || i.symbol.toLowerCase().includes(query) || i.name?.toLowerCase().includes(query))
      .slice(0, 8)
      .map((i) => ({
        type: 'Stock',
        label: i.symbol,
        hint: i.name,
        to: `/app/stocks/${i.symbol}`,
      }))
    const indexHits = Object.entries(indices)
      .filter(([key, idx]) => !query || key.toLowerCase().includes(query) || idx.name?.toLowerCase().includes(query))
      .map(([key, idx]) => ({
        type: 'Index',
        label: idx.name || key,
        hint: key,
        to: `/app/indices/${key}`,
      }))
    const pageHits = pages.filter(
      (p) => !query || p.label.toLowerCase().includes(query) || p.to.includes(query),
    )
    return [...pageHits.slice(0, 6), ...indexHits.slice(0, 4), ...stockHits]
  }, [q, instruments, indices, pages])

  const go = (to) => {
    onClose()
    navigate(to)
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <Box sx={{ px: 2, pt: 2 }}>
        <TextField
          autoFocus
          placeholder="Search stocks, indices, pages…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && results[0]) go(results[0].to)
          }}
        />
      </Box>
      <DialogContent sx={{ pt: 1 }}>
        {results.length === 0 ? (
          <Typography color="text.secondary" className="text-sm center" sx={{ py: 3 }}>
            No matches
          </Typography>
        ) : (
          <List dense disablePadding>
            {results.map((r) => (
              <ListItemButton key={`${r.type}-${r.to}`} onClick={() => go(r.to)} sx={{ borderRadius: 2 }}>
                <Chip label={r.type} size="small" sx={{ mr: 1.5, minWidth: 56 }} />
                <ListItemText primary={r.label} secondary={r.hint} />
              </ListItemButton>
            ))}
          </List>
        )}
      </DialogContent>
    </Dialog>
  )
}
