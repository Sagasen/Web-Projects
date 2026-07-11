import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../components/ProductCard'
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

const toWaLink = (phone) => {
  if (!phone) return null
  const digits = phone.replace(/\D/g, '')
  const international = digits.startsWith('0') ? '62' + digits.slice(1) : digits
  return `https://wa.me/${international}`
}

export const AdminOrders = () => {
  const { showToast } = useToast()
  const [orders, setOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeFilter, setActiveFilter] = useState('Semua')

  // Detail Modal State
  const [showDetailModal, setShowDetailModal] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedOrderItems, setSelectedOrderItems] = useState([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [updatingStatus, setUpdatingStatus] = useState(false)

  const filters = ['Semua', 'Pending', 'Sedang Disiapkan', 'Sedang Dikirim', 'Siap Diambil', 'Selesai', 'Ditolak']

  useEffect(() => {
    fetchOrders()

    // Realtime subscription
    const channel = supabase
      .channel('admin-orders-page')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'orders' },
        () => {
          fetchOrders()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      setOrders(data || [])
    } catch (err) {
      console.error(err)
      showToast('Gagal memuat pesanan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleOpenDetail = async (order) => {
    setSelectedOrder(order)
    setShowDetailModal(true)
    setLoadingItems(true)
    setSelectedOrderItems([])

    try {
      const { data, error } = await supabase
        .from('order_items')
        .select('*')
        .eq('order_id', order.id)

      if (error) throw error
      setSelectedOrderItems(data || [])
    } catch (err) {
      console.error(err)
      showToast('Gagal memuat item pesanan', 'error')
    } finally {
      setLoadingItems(false)
    }
  }

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdatingStatus(true)
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId)

      if (error) throw error

      showToast(`Status pesanan diperbarui menjadi "${newStatus}"`, 'success')

      // Update local modal state if active
      if (selectedOrder && selectedOrder.id === orderId) {
        setSelectedOrder(prev => ({ ...prev, status: newStatus }))
      }

      fetchOrders()
    } catch (err) {
      console.error(err)
      showToast('Gagal memperbarui status: ' + err.message, 'error')
    } finally {
      setUpdatingStatus(false)
    }
  }

  const filteredOrders = orders.filter(o => {
    if (activeFilter === 'Semua') return true
    return o.status === activeFilter
  })

  return (
    <div>
      {/* Filters */}
      <div className="category-section">
        <div className="category-pills">
          {filters.map(f => (
            <button
              key={f}
              className={`cat-pill ${activeFilter === f ? 'active' : ''}`}
              onClick={() => setActiveFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Memuat daftar pesanan...</p>
        </div>
      ) : (
        <div className="table-card">
          <div className="table-header">
            <span className="table-title">Daftar Pesanan ({filteredOrders.length})</span>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>No. Pesanan</th>
                  <th>Pelanggan</th>
                  <th>Total</th>
                  <th>Metode</th>
                  <th>Status</th>
                  <th>Waktu</th>
                  <th>Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredOrders.length > 0 ? (
                  filteredOrders.map(o => (
                    <tr key={o.id}>
                      <td style={{ fontWeight: 600 }}>{o.order_number}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{o.customer_name}</div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
                          {o.customer_phone || '-'}
                        </div>
                        <div
                          style={{
                            fontSize: 'var(--text-xs)',
                            color: 'var(--gray-400)',
                            maxWidth: '180px',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}
                          title={o.address || ''}
                        >
                          📍 {o.address || '-'}
                        </div>
                      </td>
                      <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>
                        {formatRupiah(o.subtotal)}
                      </td>
                      <td>
                        <div style={{ fontSize: 'var(--text-xs)' }}>
                          📦 {o.delivery_method === 'diantar' ? 'Diantar' : 'Ambil'}
                        </div>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                          💳 {o.payment_method === 'tunai' ? 'Tunai' : 'QRIS'}
                        </div>
                      </td>
                      <td>{statusBadge(o.status)}</td>
                      <td style={{ color: 'var(--gray-400)', fontSize: 'var(--text-xs)' }}>
                        {localFormatDate(o.created_at)}
                      </td>
                      <td>
                        <button className="btn btn-ghost btn-sm" onClick={() => handleOpenDetail(o)}>
                          👁️ Detail
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7" className="text-center text-gray">
                      Tidak ada pesanan
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedOrder && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: '600px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Detail Pesanan: {selectedOrder.order_number}</h2>
              <button className="modal-close" onClick={() => setShowDetailModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              {/* Customer Info */}
              <div style={{ marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)', color: 'var(--gray-700)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 'var(--space-2)' }}>
                  <p>👤 <strong>Pelanggan:</strong> {selectedOrder.customer_name} ({selectedOrder.customer_phone || '-'})</p>
                  {selectedOrder.customer_phone && (
                    <a
                      href={toWaLink(selectedOrder.customer_phone)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm"
                      style={{ whiteSpace: 'nowrap', flexShrink: 0 }}
                    >
                      💬 Chat via WA
                    </a>
                  )}
                </div>
                <p>🏠 <strong>Alamat:</strong> {selectedOrder.address || '-'}</p>
                <p>🚚 <strong>Metode Pengiriman:</strong> {selectedOrder.delivery_method === 'diantar' ? 'Diantar ke rumah' : 'Ambil sendiri di toko'}</p>
                <p>💳 <strong>Metode Pembayaran:</strong> {selectedOrder.payment_method === 'tunai' ? 'Tunai/COD' : 'QRIS/Transfer'}</p>
                <p>📅 <strong>Waktu Pesan:</strong> {localFormatDate(selectedOrder.created_at)}</p>
                {selectedOrder.note && <p>📝 <strong>Catatan:</strong> "{selectedOrder.note}"</p>}
                <p style={{ marginTop: 'var(--space-2)' }}>
                  <strong>Status Saat Ini:</strong> {statusBadge(selectedOrder.status)}
                </p>
              </div>

              <div className="divider"></div>

              {/* Order Items */}
              <p style={{ fontWeight: 700, marginBottom: 'var(--space-2)' }}>Daftar Belanjaan:</p>
              {loadingItems ? (
                <div className="spinner" style={{ width: '24px', height: '24px', margin: '8px auto' }}></div>
              ) : (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  {selectedOrderItems.map(item => (
                    <div
                      key={item.id}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '6px 0',
                        fontSize: 'var(--text-sm)'
                      }}
                    >
                      <span>
                        {item.product_name} ({item.variant_name}) x<strong>{item.qty}</strong>
                      </span>
                      <span style={{ fontWeight: 600 }}>{formatRupiah(item.unit_price * item.qty)}</span>
                    </div>
                  ))}
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontWeight: 800,
                      marginTop: '8px',
                      fontSize: 'var(--text-base)',
                      borderTop: '1px dashed var(--gray-200)',
                      paddingTop: '8px'
                    }}
                  >
                    <span>Total Pembayaran</span>
                    <span style={{ color: 'var(--primary-dark)' }}>{formatRupiah(selectedOrder.subtotal)}</span>
                  </div>
                </div>
              )}

              {/* QRIS Proof Image Preview */}
              {selectedOrder.payment_method === 'qris' && selectedOrder.payment_proof_url && (
                <div style={{ marginTop: 'var(--space-4)', textAlign: 'center' }}>
                  <p style={{ fontWeight: 700, marginBottom: '8px', fontSize: 'var(--text-sm)' }}>
                    Bukti Pembayaran QRIS:
                  </p>
                  <img
                    src={selectedOrder.payment_proof_url}
                    alt="Bukti Transfer"
                    style={{
                      maxWidth: '100%',
                      maxHeight: '260px',
                      borderRadius: 'var(--radius)',
                      boxShadow: 'var(--shadow-md)'
                    }}
                    onClick={() => window.open(selectedOrder.payment_proof_url, '_blank')}
                  />
                  <p style={{ fontSize: '10px', color: 'var(--gray-400)', marginTop: '4px' }}>
                    Klik gambar untuk membuka di tab baru
                  </p>
                </div>
              )}

              <div className="divider"></div>

              {/* Status Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)' }}>Pembaruan Status Pesanan:</p>

                {/* Pending Actions */}
                {selectedOrder.status === 'Pending' && (
                  <div className="flex gap-2">
                    <button
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'Sedang Disiapkan')}
                      disabled={updatingStatus}
                    >
                      👍 Terima & Siapkan
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{ flex: 1 }}
                      onClick={() => handleUpdateStatus(selectedOrder.id, 'Ditolak')}
                      disabled={updatingStatus}
                    >
                      ❌ Tolak Pesanan
                    </button>
                  </div>
                )}

                {/* Preparing Action */}
                {selectedOrder.status === 'Sedang Disiapkan' && (
                  <div>
                    {selectedOrder.delivery_method === 'diantar' ? (
                      <button
                        className="btn btn-primary btn-full"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'Sedang Dikirim')}
                        disabled={updatingStatus}
                      >
                        🚚 Kirim Pesanan
                      </button>
                    ) : (
                      <button
                        className="btn btn-primary btn-full"
                        onClick={() => handleUpdateStatus(selectedOrder.id, 'Siap Diambil')}
                        disabled={updatingStatus}
                      >
                        🏪 Siap Diambil di Toko
                      </button>
                    )}
                  </div>
                )}

                {/* Shipping / Ready Actions */}
                {(selectedOrder.status === 'Sedang Dikirim' || selectedOrder.status === 'Siap Diambil') && (
                  <button
                    className="btn btn-primary btn-full"
                    onClick={() => handleUpdateStatus(selectedOrder.id, 'Selesai')}
                    disabled={updatingStatus}
                  >
                    🎉 Selesaikan Transaksi
                  </button>
                )}

                {/* Completed / Rejected Alert */}
                {(selectedOrder.status === 'Selesai' || selectedOrder.status === 'Ditolak') && (
                  <div className="alert alert-info text-center" style={{ margin: 0 }}>
                    Transaksi ini sudah selesai/ditutup.
                  </div>
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost btn-full" onClick={() => setShowDetailModal(false)}>
                Tutup Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
