import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAppSelector } from '../app/hooks'

export function ProtectedRoute({ children }) {
  const user = useAppSelector((s) => s.auth.user)
  const bootstrapped = useAppSelector((s) => s.auth.bootstrapped)
  const location = useLocation()

  if (!bootstrapped) {
    return (
      <div className="grid h-full muted">
        Loading Arth…
      </div>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  return children || <Outlet />
}

export function PublicOnly({ children }) {
  const user = useAppSelector((s) => s.auth.user)
  const bootstrapped = useAppSelector((s) => s.auth.bootstrapped)
  if (!bootstrapped) {
    return (
      <div className="grid h-full muted">
        Loading Arth…
      </div>
    )
  }
  if (user) return <Navigate to="/app" replace />
  return children
}
