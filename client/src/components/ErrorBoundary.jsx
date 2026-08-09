import { Component } from 'react'
import { Box, Button, Typography } from '@mui/material'

export class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <Box className="stack gap-lg page-pad center" sx={{ maxWidth: 480, mx: 'auto', mt: 8 }}>
          <Typography variant="h5" fontWeight={800}>Something went wrong</Typography>
          <Typography color="text.secondary" className="text-sm">
            {this.state.error.message || 'Unexpected client error'}
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Reload app
          </Button>
        </Box>
      )
    }
    return this.props.children
  }
}
