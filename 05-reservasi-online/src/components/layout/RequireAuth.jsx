// src/components/layout/RequireAuth.jsx
//
// Guard untuk route yang wajib login (customer & admin).
// Jika belum login → redirect ke /login.
// Jika masih loading session → tampil spinner.
//
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'

export default function RequireAuth() {
  const { isLoggedIn, loading } = useAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-sage-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!isLoggedIn) {
    // Simpan URL asal di state supaya setelah login bisa redirect balik
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <Outlet />
}
