import React, { useState, useEffect } from 'react'
import { Header } from '../components/Header'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { formatRupiah, getProductEmoji } from '../components/ProductCard'
import { generateInvoicePDF } from '../lib/invoice'

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

export const Orders = () => {
  const { customer, addresses, addAddress, deleteAddress } = useCustomerAuth()
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('orders')
  const [orders, setOrders] = useState([])
  const [loadingOrders, setLoadingOrders] = useState(true)
  const [expandedOrders, setExpandedOrders] = useState({})

  // Form state for address
  const [newLabel, setNewLabel] = useState('Rumah')
  const [newAddressText, setNewAddressText] = useState('')
  const [newIsDefault, setNewIsDefault] = useState(false)
  const [addressSubmitting, setAddressSubmitting] = useState(false)

  useEffect(() => {
    if (customer?.id) {
      fetchOrders()
    }
  }, [customer])

  const fetchOrders = async () => {
    setLoadingOrders(true)
    try {
      const { data, error } = await supabase.rpc('get_customer_orders', {
        p_customer_id: customer.id
      })
      if (error) throw error
      const list = typeof data === 'string' ? JSON.parse(data) : data
      setOrders(list || [])
    } catch (err) {
      console.error(err)
      showToast('Gagal memuat riwayat pesanan', 'error')
    } finally {
      setLoadingOrders(false)
    }
  }

  const handleDownloadInvoice = (order, e) => {
    e.stopPropagation() // biar nggak ikut toggle expand/collapse
    try {
      generateInvoicePDF(order, customer)
    } catch (err) {
      console.error(err)
      showToast('Gagal membuat invoice PDF', 'error')
    }
  }

  const toggleOrderExpand = (orderId) => {
    setExpandedOrders(prev => ({
      ...prev,
      [orderId]: !prev[orderId]
    }))
  }

  const handleAddAddress = async (e) => {
    e.preventDefault()
    if (!newAddressText.trim()) {
      showToast('Alamat tidak boleh kosong', 'error')
      return
    }

    setAddressSubmitting(true)
    const res = await addAddress(newLabel, newAddressText, newIsDefault)
    setAddressSubmitting(false)

    if (res.success) {
      showToast('Alamat berhasil ditambahkan!', 'success')
      setNewAddressText('')
      setNewLabel('Rumah')
      setNewIsDefault(false)
    } else {
      showToast(res.error || 'Gagal menambahkan alamat', 'error')
    }
  }

  const handleDeleteAddress = async (id) => {
    if (!window.confirm('Hapus alamat ini?')) return

    const res = await deleteAddress(id)
    if (res.success) {
      showToast('Alamat berhasil dihapus', 'success')
    } else {
      showToast(res.error || 'Gagal menghapus alamat', 'error')
    }
  }

  return (
    <div>
      <Header />

      <div className="orders-page">
        <h1 className="page-title">📋 Akun Saya</h1>

        {/* Tabs */}
        <div className="tabs">
          <button
            className={`tab-btn ${activeTab === 'orders' ? 'active' : ''}`}
            onClick={() => setActiveTab('orders')}
          >
            🧾 Pesanan Saya
          </button>
          <button
            className={`tab-btn ${activeTab === 'addresses' ? 'active' : ''}`}
            onClick={() => setActiveTab('addresses')}
          >
            📍 Kelola Alamat
          </button>
        </div>

        {/* Tab: Orders */}
        {activeTab === 'orders' && (
          <div className="tab-panel active">
            {loadingOrders ? (
              <div className="loading-state">
                <div className="spinner"></div>
                <p>Memuat pesanan...</p>
              </div>
            ) : orders.length > 0 ? (
              <div>
                {orders.map((order) => {
                  const isOpen = !!expandedOrders[order.id]
                  const items = order.items || []
                  return (
                    <div className="order-card" key={order.id}>
                      <div className="order-card-header" onClick={() => toggleOrderExpand(order.id)}>
                        <div>
                          <div className="order-number">📦 {order.order_number}</div>
                          <div className="order-date">{localFormatDate(order.created_at)}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          {statusBadge(order.status)}
                          <span style={{ color: 'var(--gray-400)', fontSize: '1.2rem' }}>
                            {isOpen ? '▲' : '▼'}
                          </span>
                        </div>
                      </div>

                      <div className={`order-card-body ${isOpen ? 'open' : ''}`}>
                        {items.map((item, idx) => (
                          <div className="order-item-row" key={idx}>
                            <div
                              className="order-item-img"
                              style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '1.2rem',
                                background: 'var(--green-50)'
                              }}
                            >
                              {getProductEmoji(item.product_name)}
                            </div>
                            <div style={{ flex: 1 }}>
                              <div className="order-item-name">{item.product_name}</div>
                              <div className="order-item-variant">{item.variant_name}</div>
                              <div className="order-item-qty">x{item.qty}</div>
                            </div>
                            <div className="order-item-price">{formatRupiah(item.unit_price * item.qty)}</div>
                          </div>
                        ))}

                        <div className="divider"></div>
                        <div style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-505)' }}>
                          <div>🚚 Pengiriman: {order.delivery_method === 'diantar' ? 'Diantar ke rumah' : 'Ambil sendiri di toko'}</div>
                          <div>💵 Pembayaran: {order.payment_method === 'tunai' ? 'Tunai/COD' : 'QRIS/Transfer'}</div>
                          {order.address && <div>📍 Alamat: {order.address}</div>}
                          {order.note && <div>📝 Catatan: {order.note}</div>}
                        </div>
                      </div>

                      <div className="order-footer">
                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                          {items.length} item
                        </span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={(e) => handleDownloadInvoice(order, e)}
                          >
                            📄 Unduh Invoice
                          </button>
                          <span className="order-total">{formatRupiah(order.subtotal)}</span>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="empty-state">
                <div className="empty-state-icon">🧾</div>
                <h3 className="empty-state-title">Belum ada pesanan</h3>
                <p className="empty-state-desc">Yuk mulai belanja kebutuhan dapur kamu!</p>
                <a href="/" className="btn btn-primary mt-4">
                  Mulai Belanja
                </a>
              </div>
            )}
          </div>
        )}

        {/* Tab: Addresses */}
        {activeTab === 'addresses' && (
          <div className="tab-panel active">
            <div id="address-list-section">
              {addresses.length > 0 ? (
                <div style={{ marginBottom: 'var(--space-4)' }}>
                  {addresses.map(addr => (
                    <div className={`address-card ${addr.is_default ? 'default' : ''}`} key={addr.id}>
                      <div style={{ flex: 1 }}>
                        <span className="address-label-tag">{addr.label}</span>
                        {addr.is_default && <span className="default-tag">Utama</span>}
                        <p className="address-text">{addr.address}</p>
                      </div>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDeleteAddress(addr.id)}>
                        🗑️
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: 'var(--space-8)' }}>
                  <div className="empty-state-icon">📍</div>
                  <h3 className="empty-state-title">Belum ada alamat tersimpan</h3>
                  <p className="empty-state-desc">Tambahkan alamat pengiriman kamu di bawah ini</p>
                </div>
              )}
            </div>

            <form onSubmit={handleAddAddress} className="checkout-form-card mt-4">
              <h3 className="section-title">+ Tambah Alamat Baru</h3>
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label" htmlFor="addr-label">
                    Label
                  </label>
                  <input
                    id="addr-label"
                    className="form-control"
                    placeholder="Rumah / Kantor / dll"
                    value={newLabel}
                    onChange={(e) => setNewLabel(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Jadikan Utama?</label>
                  <label
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--space-2)',
                      marginTop: '10px',
                      cursor: 'pointer'
                    }}
                  >
                    <input
                      type="checkbox"
                      id="addr-default"
                      checked={newIsDefault}
                      onChange={(e) => setNewIsDefault(e.target.checked)}
                    />{' '}
                    Set sebagai alamat utama
                  </label>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="addr-text">
                  Alamat Lengkap <span className="required">*</span>
                </label>
                <textarea
                  id="addr-text"
                  className="form-control"
                  rows="3"
                  placeholder="Jl. Merdeka No. 10, Kel. ..., Kec. ..., Kota ..."
                  value={newAddressText}
                  onChange={(e) => setNewAddressText(e.target.value)}
                ></textarea>
              </div>
              <button type="submit" className="btn btn-primary" disabled={addressSubmitting}>
                {addressSubmitting ? 'Menyimpan...' : 'Simpan Alamat'}
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
