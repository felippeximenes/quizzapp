import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { email, loading } = useAuthStore()

  if (loading) return (
    <div className="flex min-h-svh items-center justify-center">
      <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
    </div>
  )
  if (!email) return <Navigate to="/login" replace />
  return <>{children}</>
}
