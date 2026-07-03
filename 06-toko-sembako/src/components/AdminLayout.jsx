import React, { useState, useEffect } from 'react'
import { Link, NavLink, useNavigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../context/AdminAuthContext'
import { supabase } from '../lib/supabase'

export const AdminLayout = ({ children }) => {
  const { admin, logoutAdmin, isOwner } = useAdminAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // Fetch pending count periodically or on mount
  useEffect(() => {
    fetchPendingCount()
    // Subscribe to real-time order updates
    const channel = supabase
      .channel('admin-orders-channel')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchPendingCount()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchPendingCount = async () => {
    try {
      const { count, error } = await supabase
        .from('orders')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'Pending')

      if (!error) {
        setPendingCount(count || 0)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleLogout = async () => {
    await logoutAdmin()
    navigate('/admin/login')
  }

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/admin':
        return 'Dashboard'
      case '/admin/products':
        return 'Produk & Stok'
      case '/admin/orders':
        return 'Pesanan'
      case '/admin/kasir':
        return 'Kasir POS'
      case '/admin/report':
        return 'Laporan Penjualan'
      default:
        return 'Admin Panel'
    }
  }

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <nav className={`admin-sidebar ${sidebarOpen ? 'open' : ''}`} id="admin-sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">🌾</div>
          <div>
            <div className="sidebar-logo-text">Mbah Win</div>
            <div className="sidebar-logo-sub">Admin Panel</div>
          </div>
        </div>
        <div className="sidebar-nav">
          <div className="sidebar-section">Menu Utama</div>
          
          <NavLink to="/admin" end className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">📊</span> Dashboard
          </NavLink>
          
          <NavLink to="/admin/products" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">📦</span> Produk & Stok
          </NavLink>
          
          <NavLink to="/admin/orders" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">🧾</span> Pesanan{' '}
            {pendingCount > 0 && <span className="sidebar-badge">{pendingCount}</span>}
          </NavLink>
          
          <NavLink to="/admin/kasir" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
            <span className="sidebar-link-icon">🧮</span> Kasir POS
          </NavLink>
          
          {isOwner && (
            <NavLink to="/admin/report" className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}>
              <span className="sidebar-link-icon">📈</span> Laporan
            </NavLink>
          )}

          <div className="sidebar-section">Akun</div>
          <Link to="/" className="sidebar-link">
            <span className="sidebar-link-icon">🏪</span> Lihat Toko
          </Link>
          <button
            className="sidebar-link"
            onClick={handleLogout}
            style={{ width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}
          >
            <span className="sidebar-link-icon">🚪</span> Logout
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="admin-main">
        <div className="admin-topbar">
          <div className="flex items-center gap-3">
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              ☰
            </button>
            <span className="admin-page-title">{getPageTitle()}</span>
          </div>
          <div className="flex items-center gap-3">
            <span style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)' }}>
              👤 <strong>{admin?.name || 'Admin'}</strong>
            </span>
          </div>
        </div>

        <div className="admin-content">{children}</div>
      </main>
    </div>
  )
}
