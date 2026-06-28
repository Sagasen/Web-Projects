// src/components/layout/RequireAdminRole.jsx
// Guard untuk /admin/dashboard, /admin/bookings, dll.
// /admin itu sendiri = halaman login admin (tidak perlu guard).

import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../../lib/AuthContext'

export default function RequireAdminRole() {
  const { isLoggedIn, isAdmin, loading } = useAuth()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-green-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-400">Memeriksa akses…</p>
        </div>
      </div>
    )
  }

  if (!isLoggedIn) return <Navigate to="/admin" replace />
  if (!isAdmin)    return <Navigate to="/" state={{ errorMessage: 'Akses ditolak. Halaman ini hanya untuk admin.' }} replace />

  return <Outlet />
}
