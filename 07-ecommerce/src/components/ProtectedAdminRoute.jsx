import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

export const ProtectedAdminRoute = ({ children }) => {
  const { admin, loading } = useAdminAuth()

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Memverifikasi sesi admin...</p>
      </div>
    )
  }

  if (!admin) {
    return <Navigate to="/admin/login" replace />
  }

  return children
}
