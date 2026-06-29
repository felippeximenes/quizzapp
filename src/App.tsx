import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Home } from './pages/Home'
import { Quiz } from './pages/Quiz'
import { Result } from './pages/Result'
import { History } from './pages/History'
import { Login } from './pages/Login'
import { Landing } from './pages/Landing'
import { Subscription } from './pages/Subscription'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuthStore } from './store/authStore'

export function App() {
  const init = useAuthStore((s) => s.init)

  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login />} />
        <Route path="/app" element={<ProtectedRoute><Home /></ProtectedRoute>} />
        <Route path="/quiz" element={<ProtectedRoute><Quiz /></ProtectedRoute>} />
        <Route path="/resultado" element={<ProtectedRoute><Result /></ProtectedRoute>} />
        <Route path="/historico" element={<ProtectedRoute><History /></ProtectedRoute>} />
        <Route path="/assinatura" element={<ProtectedRoute><Subscription /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/app" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
