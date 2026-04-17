import { BrowserRouter, HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useEffect } from 'react'
import { AuthProvider, useAuth } from './context/AuthContext'
import { isTauri, isServerConfigured } from './utils/platform'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Files from './pages/Files'
import Shared from './pages/Shared'
import Admin from './pages/Admin'
import Logs from './pages/Logs'
import Layout from './components/Layout'
import ServerConfig from './pages/ServerConfig'

const Router = isTauri() ? HashRouter : BrowserRouter

// Redireciona para /setup se estiver em Tauri sem servidor configurado
function SetupGuard({ children }) {
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (isTauri() && !isServerConfigured() && location.pathname !== '/setup') {
      navigate('/setup', { replace: true })
    }
  }, [navigate, location.pathname])

  return children
}

function PrivateRoute({ children, adminOnly = false }) {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-primary-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        <p className="text-gray-500 text-sm">Carregando...</p>
      </div>
    </div>
  )
  if (!user) return <Navigate to="/login" replace />
  if (adminOnly && user.role !== 'admin') return <Navigate to="/" replace />
  return children
}

export default function App() {
  return (
    <Router>
      <AuthProvider>
        <SetupGuard>
          <Routes>
            <Route path="/setup" element={<ServerConfig />} />
            <Route path="/login" element={<Login />} />
            <Route path="/" element={
              <PrivateRoute><Layout /></PrivateRoute>
            }>
              <Route index element={<Dashboard />} />
              <Route path="files" element={<Files />} />
              <Route path="shared" element={<Shared />} />
              <Route path="admin" element={
                <PrivateRoute adminOnly><Admin /></PrivateRoute>
              } />
              <Route path="logs" element={<Logs />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SetupGuard>
      </AuthProvider>
    </Router>
  )
}
