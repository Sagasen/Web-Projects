import React from 'react'
import { Navigate } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'

export const ProtectedOwnerRoute = ({ children }) => {
    const { admin, loading, isOwner } = useAdminAuth()

    if (loading) return null

    if (!admin) {
        return <Navigate to="/admin/login" replace />
    }

    if (!isOwner) {
        return <Navigate to="/admin" replace />
    }

    return children
}