import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../components/ProductCard'
import { useToast } from '../../context/ToastContext'

export const AdminKasir = () => {
  const { showToast } = useToast()
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [cart, setCart] = useState([])
  const [submitting, setSubmitting] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('tunai')

  useEffect(() => {
    fetchProducts()
  }, [])

  const fetchProducts = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id, name, category, description, image_url,
          product_variants (
            id, variant_name, sell_price, stock
          )
        `)
        .order('name')

      if (error) throw error

      // Filter only products that have variants with stock > 0
      const activeProducts = (data || []).filter(p =>
        p.product_variants && p.product_variants.some(v => v.stock > 0)
      )
      setProducts(activeProducts)
    } catch (err) {
      console.error(err)
      showToast('Gagal memuat produk kasir', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToCart = (product, variant) => {
    const existing = cart.find(item => item.variantId === variant.id)
    if (existing) {
      if (existing.qty >= variant.stock) {
        showToast(`Stok tidak mencukupi! Maksimal: ${variant.stock}`, 'warning')
        return
      }
      setCart(prev =>
        prev.map(item =>
          item.variantId === variant.id ? { ...item, qty: item.qty + 1 } : item
        )
      )
    } else {
      setCart(prev => [
        ...prev,
        {
          variantId: variant.id,
          productName: product.name,
          variantName: variant.variant_name,
          price: Number(variant.sell_price),
          qty: 1,
          stock: variant.stock
        }
      ])
    }
  }

  const handleQtyChange = (variantId, newQty, stock) => {
    if (newQty > stock) {
      showToast(`Stok tidak mencukupi! Maksimal: ${stock}`, 'warning')
      return
    }
    if (newQty <= 0) {
      setCart(prev => prev.filter(item => item.variantId !== variantId))
    } else {
      setCart(prev =>
        prev.map(item =>
          item.variantId === variantId ? { ...item, qty: newQty } : item
        )
      )
    }
  }

  const handleRemoveItem = (variantId) => {
    setCart(prev => prev.filter(item => item.variantId !== variantId))
  }

  const getCartTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  }

  const generateOrderNumber = () => {
    const now = new Date()
    const ymd = now.getFullYear() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0')
    const rand = Math.floor(1000 + Math.random() * 9000)
    return `POS-${ymd}-${rand}`
  }

  const handleSaveTransaction = async () => {
    if (cart.length === 0) {
      showToast('Keranjang kasir masih kosong!', 'warning')
      return
    }

    setSubmitting(true)
    const orderNumber = generateOrderNumber()
    const total = getCartTotal()

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
        p_sale_type: 'pos',
        p_customer_id: null,
        p_customer_name: 'Offline POS',
        p_customer_phone: null,
        p_address: null,
        p_delivery_method: 'ambil',
        p_payment_method: paymentMethod,
        p_payment_proof_url: null,
        p_note: 'Transaksi Kasir Offline',
        p_status: 'Selesai',
        p_subtotal: total,
        p_items: items
      })

      if (error) throw error

      const result = typeof data === 'string' ? JSON.parse(data) : data
      if (!result.success) throw new Error('Gagal menyimpan transaksi')

      showToast('Transaksi berhasil disimpan! ✅', 'success')
      setCart([])
      fetchProducts() // reload stock
    } catch (err) {
      console.error(err)
      showToast('Gagal menyimpan transaksi: ' + err.message, 'error')
    } finally {
      setSubmitting(false)
    }
  }

  // Filter products / variants by search input
  const displayVariants = []
  products.forEach(p => {
    p.product_variants.forEach(v => {
      if (v.stock > 0) {
        const matchesName = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            v.variant_name.toLowerCase().includes(searchQuery.toLowerCase())
        if (matchesName) {
          displayVariants.push({
            product: p,
            variant: v
          })
        }
      }
    })
  })

  return (
    <div className="kasir-layout">
      {/* Kiri: Katalog Kasir */}
      <div className="kasir-products">
        <div style={{ marginBottom: 'var(--space-4)' }}>
          <input
            type="search"
            className="form-control"
            placeholder="🔍 Cari nama produk atau varian..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Memuat produk...</p>
          </div>
        ) : displayVariants.length > 0 ? (
          <div className="kasir-products-grid">
            {displayVariants.map(({ product, variant }) => (
              <div
                className="kasir-product-card"
                key={variant.id}
                onClick={() => handleAddToCart(product, variant)}
              >
                <div className="kasir-product-name">{product.name}</div>
                <div className="kasir-variant-name">{variant.variant_name}</div>
                <div className="kasir-price">{formatRupiah(variant.sell_price)}</div>
                <div className="kasir-stock">Stok: {variant.stock}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3 className="empty-state-title">Produk tidak ditemukan</h3>
            <p className="empty-state-desc">Pastikan kata kunci benar dan stok tersedia</p>
          </div>
        )}
      </div>

      {/* Kanan: Kasir Cart */}
      <div className="kasir-cart">
        <div className="kasir-cart-header">🛒 Keranjang Kasir</div>

        <div className="kasir-cart-items">
          {cart.length > 0 ? (
            cart.map(item => (
              <div className="kasir-cart-item" key={item.variantId}>
                <div className="kasir-item-info">
                  <div className="kasir-item-name">{item.productName}</div>
                  <div className="kasir-item-variant">{item.variantName}</div>
                  <div className="kasir-item-price">{formatRupiah(item.price)}</div>
                </div>
                <div className="qty-stepper">
                  <button
                    className="qty-btn"
                    onClick={() => handleQtyChange(item.variantId, item.qty - 1, item.stock)}
                  >
                    −
                  </button>
                  <span className="qty-display">{item.qty}</span>
                  <button
                    className="qty-btn"
                    onClick={() => handleQtyChange(item.variantId, item.qty + 1, item.stock)}
                  >
                    +
                  </button>
                </div>
                <button
                  className="btn-remove"
                  onClick={() => handleRemoveItem(item.variantId)}
                  style={{ marginLeft: 'var(--space-2)' }}
                >
                  ✕
                </button>
              </div>
            ))
          ) : (
            <div className="text-center text-gray" style={{ marginTop: 'var(--space-12)' }}>
              Keranjang masih kosong.<br />Klik produk di kiri untuk menambah.
            </div>
          )}
        </div>

        <div className="kasir-cart-footer">
          <div className="form-group">
            <label className="form-label" style={{ fontSize: 'var(--text-xs)' }}>Metode Pembayaran:</label>
            <select
              className="form-control"
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ padding: '6px 12px', fontSize: 'var(--text-sm)' }}
            >
              <option value="tunai">Tunai / Cash</option>
              <option value="qris">QRIS Offline</option>
            </select>
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '12px' }}>
            <span className="kasir-total-label">Total Belanja</span>
            <span className="kasir-total-value" style={{ margin: 0 }}>{formatRupiah(getCartTotal())}</span>
          </div>

          <button
            className="btn btn-primary btn-full btn-lg"
            onClick={handleSaveTransaction}
            disabled={submitting || cart.length === 0}
          >
            {submitting ? 'Menyimpan...' : '💾 Simpan Transaksi (POS)'}
          </button>
        </div>
      </div>
    </div>
  )
}
