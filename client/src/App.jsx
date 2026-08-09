import { useEffect } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { useAppDispatch } from './app/hooks'
import { fetchMe, signedOut } from './features/auth/authSlice'
import { Toast } from './components/Toast'
import { ErrorBoundary } from './components/ErrorBoundary'
import { ProtectedRoute, PublicOnly } from './components/ProtectedRoute'
import { AppShell } from './components/AppShell'
import { LandingPage } from './pages/LandingPage'
import { LoginPage, RegisterPage, ForgotPage, ResetPage } from './pages/AuthPages'
import { KycPage } from './pages/KycPage'
import { HomePage } from './pages/HomePage'
import { ExplorePage } from './pages/ExplorePage'
import { StockPage } from './pages/StockPage'
import { IndexPage } from './pages/IndexPage'
import { InvestmentsPage } from './pages/InvestmentsPage'
import { OrdersPage } from './pages/OrdersPage'
import { FundsPage } from './pages/FundsPage'
import { IpoPage } from './pages/MfIpoPages'
import { MfPage } from './pages/MfPage'
import { MfFundPage } from './pages/MfFundPage'
import { MfCalculatorPage } from './pages/MfCalculatorPage'
import { AccountPage } from './pages/AccountPage'
import { ReportsPage } from './pages/ReportsPage'

export default function App() {
  const dispatch = useAppDispatch()

  useEffect(() => {
    dispatch(fetchMe())

    const handleSignOut = () => dispatch(signedOut())
    window.addEventListener('arth:session-expired', handleSignOut)

    let channel
    try {
      channel = new BroadcastChannel('arth-auth')
      channel.onmessage = (event) => {
        if (event.data?.type === 'signed-out') handleSignOut()
      }
    } catch {
      // BroadcastChannel is not required for the current tab.
    }

    return () => {
      window.removeEventListener('arth:session-expired', handleSignOut)
      channel?.close()
    }
  }, [dispatch])

  return (
    <BrowserRouter>
      <ErrorBoundary>
      <Toast />
      <Routes>
        <Route path="/" element={<PublicOnly><LandingPage /></PublicOnly>} />
        <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
        <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
        <Route path="/forgot" element={<PublicOnly><ForgotPage /></PublicOnly>} />
        <Route path="/reset" element={<PublicOnly><ResetPage /></PublicOnly>} />

        <Route path="/kyc" element={<ProtectedRoute><KycPage /></ProtectedRoute>} />

        <Route path="/app" element={<ProtectedRoute><AppShell /></ProtectedRoute>}>
          <Route index element={<HomePage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="stocks/:symbol" element={<StockPage />} />
          <Route path="indices/:key" element={<IndexPage />} />
          <Route path="investments" element={<InvestmentsPage />} />
          <Route path="orders" element={<OrdersPage />} />
          <Route path="funds" element={<FundsPage />} />
          <Route path="mf" element={<MfPage />} />
          <Route path="mf/calculator" element={<MfCalculatorPage />} />
          <Route path="mf/:fundId" element={<MfFundPage />} />
          <Route path="ipo" element={<IpoPage />} />
          <Route path="account" element={<AccountPage />} />
          <Route path="reports" element={<ReportsPage />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      </ErrorBoundary>
    </BrowserRouter>
  )
}
