import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Header } from '../components/Header'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../components/ProductCard'

const WA_NUMBER = '6285742860240'

export const Checkout = () => {
  const { customer, addresses } = useCustomerAuth()
  const { cart, getCartTotal, clearCart } = useCart()
  const { showToast } = useToast()
  const navigate = useNavigate()

  // Form state
  const [selectedAddressId, setSelectedAddressId] = useState(null)
  const [newAddress, setNewAddress] = useState('')
  const [deliveryMethod, setDeliveryMethod] = useState('diantar')
  const [paymentMethod, setPaymentMethod] = useState('tunai')
  const [note, setNote] = useState('')

  // Upload state
  const [uploading, setUploading] = useState(false)
  const [proofUrl, setProofUrl] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  // Set default address on load
  useEffect(() => {
    if (addresses.length > 0) {
      const defaultAddr = addresses.find(a => a.is_default) || addresses[0]
      setSelectedAddressId(defaultAddr.id)
    }
  }, [addresses])

  const handleProofUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    // Show local preview
    setPreviewUrl(URL.createObjectURL(file))
    setUploading(true)

    try {
      const fileName = `proof-${Date.now()}-${file.name.replace(/\s/g, '_')}`
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file, { upsert: true })

      if (error) throw error

      const { data: urlData } = supabase.storage.from('payment-proofs').getPublicUrl(fileName)
      setProofUrl(urlData.publicUrl)
      showToast('Bukti pembayaran berhasil diupload! ✅', 'success')
    } catch (err) {
      console.error(err)
      showToast('Gagal upload: ' + err.message, 'error')
      setProofUrl(null)
      setPreviewUrl(null)
    } finally {
      setUploading(false)
    }
  }

  const getFinalAddress = () => {
    if (deliveryMethod === 'ambil') return 'Ambil Sendiri di Toko'
    if (newAddress.trim()) return newAddress.trim()

    const selected = addresses.find(a => a.id === selectedAddressId)
    return selected ? selected.address : ''
  }

  const generateOrderNumber = () => {
    const now = new Date()
    const ymd = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `ORD-${ymd}-${rand}`
  }

  const handleSubmit = async () => {
    const address = getFinalAddress()
    const subtotal = getCartTotal()

    if (cart.length === 0) {
      showToast('Keranjang kosong!', 'error')
      return
    }
    if (deliveryMethod === 'diantar' && !address) {
      showToast('Pilih atau masukkan alamat pengiriman!', 'error')
      return
    }
    if (paymentMethod === 'qris' && !proofUrl) {
      showToast('Upload bukti pembayaran QRIS dulu!', 'error')
      return
    }

    setSubmitting(true)
    const orderNumber = generateOrderNumber()

    // Map items for database insertion
    const items = cart.map(item => ({
      variant_id: item.variantId,
      product_name: item.productName,
      variant_name: item.variantName,
      qty: item.qty,
      unit_price: item.price
    }))

    try {
      const { data, error } = await supabase.rpc('create_order', {
        p_order_number: orderNumber,
        p_sale_type: 'online_wa',
        p_customer_id: customer.id,
        p_customer_name: customer.name,
        p_customer_phone: customer.phone,
        p_address: address,
        p_delivery_method: deliveryMethod,
        p_payment_method: paymentMethod,
        p_payment_proof_url: proofUrl || null,
        p_note: note.trim() || null,
        p_status: 'Pending',
        p_subtotal: subtotal,
        p_items: items
      })

      if (error) throw error

      const result = typeof data === 'string' ? JSON.parse(data) : data
      if (!result.success) throw new Error('Gagal menyimpan transaksi')

      // Generate WA Message
      const waMsg = generateWAMessage({
        orderNumber,
        customerName: customer.name,
        customerPhone: customer.phone,
        address,
        cart,
        subtotal,
        paymentMethod,
        note
      })

      clearCart()
      showToast('Pesanan berhasil dibuat! Membuka WhatsApp...', 'success')

      setTimeout(() => {
        window.open(`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(waMsg)}`, '_blank')
        navigate('/orders')
      }, 800)

    } catch (err) {
      console.error(err)
      showToast('Gagal membuat pesanan: ' + (err.message || 'Coba lagi'), 'error')
    } finally {
      setSubmitting(false)
    }
  }

  const generateWAMessage = ({ orderNumber, customerName, customerPhone, address, cart, subtotal, paymentMethod, note }) => {
    let itemLines = ''
    cart.forEach((item, idx) => {
      const itemTotal = item.price * item.qty
      itemLines += `${idx + 1}. ${item.productName} (Varian: ${item.variantName})\n`
      itemLines += `   [ ${item.qty} pcs x ${formatRupiah(item.price)} ] = ${formatRupiah(itemTotal)}\n`
    })

    const payLabel = paymentMethod === 'qris' ? 'QRIS' : 'Cash'
    const noteSection = note ? `\n*Catatan Tambahan:*\n"${note}"\n` : ''

    return `*🛒 PESANAN BARU - TOKO SEMBAKO MBAH WIN*
----------------------------------------
*Detail Pelanggan:*
👤 Nama : ${customerName}
📞 No. HP: ${customerPhone}
📍 Alamat: ${address}

*Daftar Belanjaan:*
${itemLines}----------------------------------------
*💰 TOTAL PEMBAYARAN:* ${formatRupiah(subtotal)}
💵 Metode Pembayaran: ${payLabel}
${noteSection}----------------------------------------
Mohon ditunggu konfirmasinya untuk total ongkir dan kesediaan barang ya kak! 🙏`
  }

  const subtotal = getCartTotal()

  return (
    <div>
      <Header />

      <div className="checkout-page">
        <h1 className="page-title">💳 Checkout</h1>

        <div className="checkout-grid">
          {/* Form Kiri */}
          <div>
            {/* Alamat Section */}
            <div className="checkout-form-card mb-6">
              <h2 className="section-title">📍 Alamat Pengiriman</h2>
              {addresses.length > 0 && (
                <div id="address-list">
                  <p className="form-label">Pilih Alamat Tersimpan:</p>
                  {addresses.map(addr => (
                    <div
                      key={addr.id}
                      className={`address-card ${selectedAddressId === addr.id ? 'default' : ''}`}
                      onClick={() => setSelectedAddressId(addr.id)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div>
                        <span className="address-label-tag">{addr.label}</span>
                        {addr.is_default && <span className="default-tag">Utama</span>}
                        <p className="address-text">{addr.address}</p>
                      </div>
                      <input
                        type="radio"
                        name="selected-address"
                        value={addr.id}
                        checked={selectedAddressId === addr.id}
                        onChange={() => setSelectedAddressId(addr.id)}
                        style={{ flexShrink: 0 }}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="form-group mt-4">
                <label className="form-label">Atau gunakan alamat baru:</label>
                <textarea
                  id="new-address"
                  className="form-control"
                  rows="3"
                  placeholder="Tulis alamat lengkap..."
                  value={newAddress}
                  onChange={(e) => setNewAddress(e.target.value)}
                ></textarea>
              </div>
            </div>

            {/* Metode Pengiriman */}
            <div className="checkout-form-card mb-6">
              <h2 className="section-title">🚚 Metode Pengiriman</h2>
              <div className="delivery-options">
                <label
                  className={`delivery-option ${deliveryMethod === 'diantar' ? 'selected' : ''}`}
                  onClick={() => setDeliveryMethod('diantar')}
                >
                  <input
                    type="radio"
                    name="delivery"
                    value="diantar"
                    checked={deliveryMethod === 'diantar'}
                    onChange={() => setDeliveryMethod('diantar')}
                  />
                  <div className="delivery-option-icon">🏠</div>
                  <div className="delivery-option-label">Diantar ke Rumah</div>
                </label>
                <label
                  className={`delivery-option ${deliveryMethod === 'ambil' ? 'selected' : ''}`}
                  onClick={() => setDeliveryMethod('ambil')}
                >
                  <input
                    type="radio"
                    name="delivery"
                    value="ambil"
                    checked={deliveryMethod === 'ambil'}
                    onChange={() => setDeliveryMethod('ambil')}
                  />
                  <div className="delivery-option-icon">🏪</div>
                  <div className="delivery-option-label">Ambil Sendiri di Toko</div>
                </label>
              </div>
            </div>

            {/* Metode Pembayaran */}
            <div className="checkout-form-card mb-6">
              <h2 className="section-title">💵 Metode Pembayaran</h2>
              <div className="payment-options">
                <label
                  className={`payment-option ${paymentMethod === 'tunai' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('tunai')}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="tunai"
                    checked={paymentMethod === 'tunai'}
                    onChange={() => setPaymentMethod('tunai')}
                  />
                  <div className="payment-option-icon">💵</div>
                  <div className="payment-option-label">Tunai / COD</div>
                </label>
                <label
                  className={`payment-option ${paymentMethod === 'qris' ? 'selected' : ''}`}
                  onClick={() => setPaymentMethod('qris')}
                >
                  <input
                    type="radio"
                    name="payment"
                    value="qris"
                    checked={paymentMethod === 'qris'}
                    onChange={() => setPaymentMethod('qris')}
                  />
                  <div className="payment-option-icon">📱</div>
                  <div className="payment-option-label">QRIS / Transfer</div>
                </label>
              </div>

              {/* QR Section */}
              <div className={`qr-container ${paymentMethod === 'qris' ? 'visible' : ''}`} id="qr-section">
                <p style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 'var(--space-3)' }}>
                  Scan QRIS untuk Pembayaran
                </p>
                <img src="/payment-qr.png" alt="QRIS Toko Sembako Mbah Win" className="qr-img" />
                <p className="qr-note">
                  Scan QR di atas menggunakan aplikasi DANA, OVO, GoPay, atau mobile banking apapun
                </p>

                <div
                  style={{
                    background: 'var(--green-50)',
                    border: '1px dashed var(--primary)',
                    borderRadius: 'var(--radius, 12px)',
                    padding: 'var(--space-3)',
                    margin: '16px 0',
                    textAlign: 'center'
                  }}
                >
                  <p style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '6px', fontSize: 'var(--text-sm)' }}>
                    Atau Transfer Manual ke Rekening
                  </p>
                  <p style={{ fontSize: 'var(--text-lg)', fontWeight: 800, color: 'var(--gray-800)', margin: '4px 0' }}>
                    BNI &middot; 1234567890 (Contoh/Dummy)
                  </p>
                  <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-500)' }}>
                    a.n. Toko Sembako Mbah Win
                  </p>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    style={{ marginTop: '8px' }}
                    onClick={() => {
                      navigator.clipboard.writeText('1234567890')
                      showToast('Nomor rekening disalin!', 'success')
                    }}
                  >
                    📋 Salin Nomor Rekening
                  </button>
                </div>

                <div
                  className={`upload-area ${previewUrl ? 'uploaded' : ''}`}
                  id="upload-area"
                  onClick={() => document.getElementById('proof-input').click()}
                >
                  <input
                    type="file"
                    id="proof-input"
                    accept="image/*"
                    style={{ display: 'none' }}
                    onChange={handleProofUpload}
                  />
                  {!previewUrl ? (
                    <div id="upload-placeholder">
                      <div style={{ fontSize: '2rem', marginBottom: 'var(--space-2)' }}>📤</div>
                      <p style={{ fontWeight: 600, color: 'var(--gray-700)' }}>Upload Bukti Pembayaran</p>
                      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: '4px' }}>
                        Klik atau drag foto bukti transfer di sini
                      </p>
                    </div>
                  ) : (
                    <img id="upload-preview" className="upload-preview" src={previewUrl} alt="Preview" />
                  )}
                </div>

                {uploading && <p style={{ fontSize: 'var(--text-xs)', marginTop: '8px', color: 'var(--primary)' }}>Mengupload...</p>}

                {!proofUrl && (
                  <div className="alert alert-warning mt-4" id="proof-warning">
                    ⚠️ Tombol kirim pesanan akan aktif setelah bukti pembayaran berhasil diunggah.
                  </div>
                )}
              </div>
            </div>

            {/* Catatan */}
            <div className="checkout-form-card mb-6">
              <h2 className="section-title">📝 Catatan Tambahan</h2>
              <textarea
                id="note"
                className="form-control"
                rows="3"
                placeholder="Misal: tolong bungkus rapi, atau ada alergen tertentu..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
              ></textarea>
            </div>

            <button
              id="btn-submit"
              className="btn btn-primary btn-full btn-lg"
              onClick={handleSubmit}
              disabled={submitting || (paymentMethod === 'qris' && !proofUrl)}
            >
              {submitting ? '⏳ Memproses...' : '📱 Kirim Pesanan via WhatsApp'}
            </button>
            <p style={{ textAlign: 'center', fontSize: 'var(--text-xs)', color: 'var(--gray-400)', marginTop: 'var(--space-3)' }}>
              Pesanan akan disimpan dan kamu akan diarahkan ke WhatsApp untuk konfirmasi
            </p>
          </div>

          {/* Ringkasan Kanan */}
          <div>
            <div className="checkout-summary-card" style={{ position: 'sticky', top: '80px' }}>
              <h2 className="section-title">🛒 Ringkasan Pesanan</h2>
              <div id="order-summary-items">
                {cart.map((item) => (
                  <div className="order-item-row" key={item.variantId}>
                    {item.imageUrl ? (
                      <img src={item.imageUrl} alt={item.productName} className="order-item-img" />
                    ) : (
                      <div className="order-item-img" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem', background: 'var(--green-50)' }}>
                        🛒
                      </div>
                    )}
                    <div style={{ flex: 1 }}>
                      <div className="order-item-name">{item.productName}</div>
                      <div className="order-item-variant">{item.variantName}</div>
                      <div className="order-item-qty">
                        x{item.qty} × {formatRupiah(item.price)}
                      </div>
                    </div>
                    <div className="order-item-price">{formatRupiah(item.price * item.qty)}</div>
                  </div>
                ))}
              </div>
              <div className="divider"></div>
              <div className="cart-summary-row">
                <span>Subtotal</span>
                <span id="summary-subtotal" style={{ fontWeight: 700 }}>
                  {formatRupiah(subtotal)}
                </span>
              </div>
              <div className="cart-summary-row">
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>Ongkir</span>
                <span style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>Dikonfirmasi setelah pesan</span>
              </div>
              <div className="cart-total-row">
                <span className="cart-total-label">Total</span>
                <span className="cart-total-value" id="summary-total">
                  {formatRupiah(subtotal)}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
