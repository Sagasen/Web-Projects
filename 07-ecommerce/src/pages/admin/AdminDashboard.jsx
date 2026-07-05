import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import { formatRupiah, getProductEmoji } from '../../components/ProductCard'
import { useToast } from '../../context/ToastContext'

const localFormatDate = (isoString) => {
  if (!isoString) return '-'
  const d = new Date(isoString)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const statusBadge = (status) => {
  const map = {
    'Pending':           { cls: 'badge-pending',    label: '⏳ Pending' },
    'Sedang Disiapkan':  { cls: 'badge-preparing',  label: '📦 Sedang Disiapkan' },
    'Sedang Dikirim':    { cls: 'badge-shipping',   label: '🚚 Sedang Dikirim' },
    'Siap Diambil':      { cls: 'badge-ready',      label: '✅ Siap Diambil' },
    'Selesai':           { cls: 'badge-done',       label: '🎉 Selesai' },
    'Ditolak':           { cls: 'badge-rejected',   label: '❌ Ditolak' },
  }
  const s = map[status] || { cls: 'badge-default', label: status }
  return <span className={`status-badge ${s.cls}`}>{s.label}</span>
}

export const AdminDashboard = () => {
  const { showToast } = useToast()
  const [stats, setStats] = useState({
    totalProducts: 0,
    pendingOrders: 0,
    revenueToday: 0,
    lowStockCount: 0
  })
  const [recentOrders, setRecentOrders] = useState([])
  const [lowStockProducts, setLowStockProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    setLoading(true)
    try {
      const todayStr = new Date().toISOString().slice(0, 10)

      const [
        productsRes,
        pendingRes,
        revenueRes,
        variantsRes,
        recentOrdersRes
      ] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }),
        supabase.from('orders').select('id', { count: 'exact', head: true }).eq('status', 'Pending'),
        supabase.from('orders').select('subtotal').gte('created_at', `${todayStr}T00:00:00`).lte('created_at', `${todayStr}T23:59:59`).neq('status', 'Ditolak'),
        supabase.from('product_variants').select('id, variant_name, stock, min_stock, products(name)'),
        supabase.from('orders').select('id, order_number, customer_name, subtotal, payment_method, status, created_at').order('created_at', { ascending: false }).limit(8)
      ])

      if (productsRes.error) throw productsRes.error
      if (pendingRes.error) throw pendingRes.error
      if (revenueRes.error) throw revenueRes.error
      if (variantsRes.error) throw variantsRes.error
      if (recentOrdersRes.error) throw recentOrdersRes.error

      const totalProd = productsRes.count || 0
      const pendingCount = pendingRes.count || 0
      const todayRev = (revenueRes.data || []).reduce((sum, o) => sum + (Number(o.subtotal) || 0), 0)

      const allVariants = variantsRes.data || []
      const lowStockList = allVariants.filter(v => v.stock <= v.min_stock)
      const lowStockCount = lowStockList.length

      setStats({
        totalProducts: totalProd,
        pendingOrders: pendingCount,
        revenueToday: todayRev,
        lowStockCount: lowStockCount
      })

      setRecentOrders(recentOrdersRes.data || [])
      // Sort low stock list by stock ascending
      setLowStockProducts(
        lowStockList
          .sort((a, b) => a.stock - b.stock)
          .slice(0, 10)
      )

    } catch (err) {
      console.error(err)
      showToast('Gagal memuat data dashboard', 'error')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Memuat ringkasan dashboard...</p>
      </div>
    )
  }

  return (
    <div>
      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon green">📦</div>
          <div className="stat-info">
            <div className="stat-label">Total Produk</div>
            <div className="stat-value">{stats.totalProducts}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon amber">⏳</div>
          <div className="stat-info">
            <div className="stat-label">Pesanan Pending</div>
            <div className="stat-value">{stats.pendingOrders}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon blue">💰</div>
          <div className="stat-info">
            <div className="stat-label">Omzet Hari Ini</div>
            <div className="stat-value">{formatRupiah(stats.revenueToday)}</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red">⚠️</div>
          <div className="stat-info">
            <div className="stat-label">Stok Kritis</div>
            <div className="stat-value">{stats.lowStockCount}</div>
          </div>
        </div>
      </div>

      {/* Recent Orders Table */}
      <div className="table-card mb-6">
        <div className="table-header">
          <span className="table-title">🧾 Pesanan Terbaru</span>
          <Link to="/admin/orders" className="btn btn-ghost btn-sm">
            Lihat Semua →
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>No. Pesanan</th>
                <th>Pelanggan</th>
                <th>Total</th>
                <th>Pembayaran</th>
                <th>Status</th>
                <th>Waktu</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.length > 0 ? (
                recentOrders.map((o) => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.order_number}</td>
                    <td>{o.customer_name}</td>
                    <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{formatRupiah(o.subtotal)}</td>
                    <td>{o.payment_method === 'tunai' ? '💵 Tunai' : o.payment_method === 'qris' ? '📱 QRIS' : '🏦 Transfer'}</td>
                    <td>{statusBadge(o.status)}</td>
                    <td style={{ color: 'var(--gray-400)', fontSize: 'var(--text-xs)' }}>
                      {localFormatDate(o.created_at)}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="6" className="text-center text-gray">
                    Belum ada pesanan
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Low Stock Table */}
      <div className="table-card">
        <div className="table-header">
          <span className="table-title">⚠️ Stok Hampir Habis</span>
          <Link to="/admin/products" className="btn btn-ghost btn-sm">
            Kelola Stok →
          </Link>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Produk</th>
                <th>Varian</th>
                <th>Stok</th>
                <th>Min. Stok</th>
              </tr>
            </thead>
            <tbody>
              {lowStockProducts.length > 0 ? (
                lowStockProducts.map((v) => (
                  <tr key={v.id}>
                    <td style={{ fontWeight: 600 }}>{v.products?.name || '-'}</td>
                    <td>{v.variant_name}</td>
                    <td>
                      <span className={v.stock === 0 ? 'stock-low' : 'text-danger'}>{v.stock}</span>
                    </td>
                    <td style={{ color: 'var(--gray-400)' }}>{v.min_stock}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="4" className="text-center" style={{ color: 'var(--green-600)' }}>
                    ✅ Semua stok aman
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
