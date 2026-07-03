import React from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useCustomerAuth } from '../context/CustomerAuthContext'

export const ProtectedCustomerRoute = ({ children }) => {
  const { customer, loading } = useCustomerAuth()
  const location = useLocation()

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Memverifikasi sesi pelanggan...</p>
      </div>
    )
  }

  if (!customer) {
    // Redirect to login but save the current location they were trying to access
    return <Navigate to={`/login?from=${encodeURIComponent(location.pathname)}`} replace />
  }

  return children
}
