import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { email, loading } = useAuthStore()

  if (loading) return <div className="loading-container"><div className="spinner" /></div>
  if (!email) return <Navigate to="/login" replace />
  return <>{children}</>
}
