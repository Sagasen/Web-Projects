import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../components/ProductCard'
import { useToast } from '../../context/ToastContext'

export const AdminProducts = () => {
  const { showToast } = useToast()

  const [activeTab, setActiveTab] = useState('products')
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [variants, setVariants] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Product Modal State
  const [showProductModal, setShowProductModal] = useState(false)
  const [editProductId, setEditProductId] = useState(null)
  const [formName, setFormName] = useState('')
  const [formCategory, setFormCategory] = useState('')
  const [formDesc, setFormDesc] = useState('')
  const [formImage, setFormImage] = useState('')
  const [formVariants, setFormVariants] = useState([])

  // Stock Modal State
  const [showStockModal, setShowStockModal] = useState(false)
  const [stockVariantId, setStockVariantId] = useState(null)
  const [stockVariantName, setStockVariantName] = useState('')
  const [stockQty, setStockQty] = useState(10)
  const [stockReason, setStockReason] = useState('')
  const [stockSubmitting, setStockSubmitting] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchProductsAndVariants()
  }, [])

  const fetchCategories = async () => {
    try {
      const { data } = await supabase.from('categories').select('name').order('name')
      if (data) setCategories(data)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchProductsAndVariants = async () => {
    setLoading(true)
    try {
      // 1. Fetch products
      const { data: productsData, error: pError } = await supabase
        .from('products')
        .select(`
          id, name, category, description, image_url,
          product_variants(id, variant_name, cost_price, sell_price, stock, min_stock)
        `)
        .order('name')

      if (pError) throw pError
      setProducts(productsData || [])

      // 2. Fetch variants for stock table
      const { data: variantsData, error: vError } = await supabase
        .from('product_variants')
        .select('id, variant_name, cost_price, sell_price, stock, min_stock, products(name)')
        .order('stock', { ascending: true })

      if (vError) throw vError
      setVariants(variantsData || [])

    } catch (err) {
      console.error(err)
      showToast('Gagal memuat produk & stok', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteProduct = async (id, name) => {
    if (!window.confirm(`Hapus produk "${name}" beserta seluruh variannya?`)) return
    try {
      const { error } = await supabase.from('products').delete().eq('id', id)
      if (error) throw error
      showToast(`Produk "${name}" berhasil dihapus`, 'success')
      fetchProductsAndVariants()
    } catch (err) {
      console.error(err)
      showToast('Gagal menghapus produk: ' + err.message, 'error')
    }
  }

  // --- Product Modal Handlers ---
  const handleOpenProductModal = (prod = null) => {
    if (prod) {
      setEditProductId(prod.id)
      setFormName(prod.name)
      setFormCategory(prod.category || '')
      setFormDesc(prod.description || '')
      setFormImage(prod.image_url || '')
      setFormVariants(
        (prod.product_variants || []).map(v => ({
          id: v.id,
          variant_name: v.variant_name,
          cost_price: v.cost_price,
          sell_price: v.sell_price,
          stock: v.stock,
          min_stock: v.min_stock
        }))
      )
    } else {
      setEditProductId(null)
      setFormName('')
      setFormCategory('')
      setFormDesc('')
      setFormImage('')
      setFormVariants([
        { id: null, variant_name: '', cost_price: 0, sell_price: 0, stock: 0, min_stock: 5 }
      ])
    }
    setShowProductModal(true)
  }

  const handleAddVariantRow = () => {
    setFormVariants(prev => [
      ...prev,
      { id: null, variant_name: '', cost_price: 0, sell_price: 0, stock: 0, min_stock: 5 }
    ])
  }

  const handleRemoveVariantRow = (index) => {
    setFormVariants(prev => prev.filter((_, idx) => idx !== index))
  }

  const handleVariantChange = (index, field, value) => {
    setFormVariants(prev =>
      prev.map((v, idx) => (idx === index ? { ...v, [field]: value } : v))
    )
  }

  const handleSaveProduct = async () => {
    if (!formName.trim()) {
      showToast('Nama produk wajib diisi', 'error')
      return
    }

    if (formVariants.length === 0) {
      showToast('Masukkan minimal satu varian', 'error')
      return
    }

    const invalidVariant = formVariants.some(v => !v.variant_name.trim())
    if (invalidVariant) {
      showToast('Nama semua varian wajib diisi', 'error')
      return
    }

    try {
      let pid = editProductId

      if (editProductId) {
        // Update product metadata
        const { error } = await supabase
          .from('products')
          .update({
            name: formName.trim(),
            category: formCategory || null,
            description: formDesc.trim() || null,
            image_url: formImage.trim() || null
          })
          .eq('id', editProductId)

        if (error) throw error
      } else {
        // Insert product
        const { data, error } = await supabase
          .from('products')
          .insert({
            name: formName.trim(),
            category: formCategory || null,
            description: formDesc.trim() || null,
            image_url: formImage.trim() || null
          })
          .select('id')
          .single()

        if (error) throw error
        pid = data.id
      }

      // Upsert Variants
      for (const v of formVariants) {
        if (v.id) {
          // Update existing variant
          const { error } = await supabase
            .from('product_variants')
            .update({
              variant_name: v.variant_name.trim(),
              cost_price: Number(v.cost_price) || 0,
              sell_price: Number(v.sell_price) || 0,
              stock: Number(v.stock) || 0,
              min_stock: Number(v.min_stock) || 5
            })
            .eq('id', v.id)

          if (error) throw error
        } else {
          // Insert new variant
          const { error } = await supabase
            .from('product_variants')
            .insert({
              product_id: pid,
              variant_name: v.variant_name.trim(),
              cost_price: Number(v.cost_price) || 0,
              sell_price: Number(v.sell_price) || 0,
              stock: Number(v.stock) || 0,
              min_stock: Number(v.min_stock) || 5
            })

          if (error) throw error
        }
      }

      showToast('Produk berhasil disimpan!', 'success')
      setShowProductModal(false)
      fetchProductsAndVariants()

    } catch (err) {
      console.error(err)
      showToast('Gagal menyimpan produk: ' + err.message, 'error')
    }
  }

  // --- Stock Modal Handlers ---
  const handleOpenStockModal = (variantId, title) => {
    setStockVariantId(variantId)
    setStockVariantName(title)
    setStockQty(10)
    setStockReason('')
    setShowStockModal(true)
  }

  const handleConfirmAddStock = async () => {
    if (stockQty <= 0) {
      showToast('Jumlah tambah stok harus lebih dari 0', 'error')
      return
    }

    setStockSubmitting(true)
    try {
      const { error } = await supabase.rpc('add_stock', {
        p_variant_id: stockVariantId,
        p_qty: Number(stockQty),
        p_reason: stockReason.trim() || 'Restock manual'
      })

      if (error) throw error

      showToast(`Stok berhasil ditambah +${stockQty}!`, 'success')
      setShowStockModal(false)
      fetchProductsAndVariants()
    } catch (err) {
      console.error(err)
      showToast('Gagal menambah stok: ' + err.message, 'error')
    } finally {
      setStockSubmitting(false)
    }
  }

  // Filter products by search query
  const filteredProducts = products.filter(
    p =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div>
      {/* Tabs */}
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'products' ? 'active' : ''}`}
          onClick={() => setActiveTab('products')}
        >
          📦 Daftar Produk
        </button>
        <button
          className={`tab-btn ${activeTab === 'stock' ? 'active' : ''}`}
          onClick={() => setActiveTab('stock')}
        >
          📊 Kelola Stok
        </button>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Memuat data produk & stok...</p>
        </div>
      ) : activeTab === 'products' ? (
        /* Products Tab */
        <div id="products-tab" className="tab-panel active">
          <div className="table-card">
            <div className="table-header">
              <span className="table-title">Semua Produk</span>
              <div className="flex gap-2">
                <input
                  id="product-search"
                  className="form-control"
                  style={{ maxWidth: '240px' }}
                  placeholder="🔍 Cari produk..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button className="btn btn-primary btn-sm" onClick={() => handleOpenProductModal(null)}>
                  + Produk
                </button>
              </div>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Kategori</th>
                    <th>Varian</th>
                    <th>Stok Total</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProducts.length > 0 ? (
                    filteredProducts.map((p) => {
                      const totalStock = (p.product_variants || []).reduce((s, v) => s + v.stock, 0)
                      const hasLow = (p.product_variants || []).some(v => v.stock <= v.min_stock)
                      return (
                        <tr key={p.id}>
                          <td>
                            <div style={{ fontWeight: 600 }}>{p.name}</div>
                            {p.description && (
                              <div style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                                {p.description.slice(0, 60)}
                                {p.description.length > 60 ? '...' : ''}
                              </div>
                            )}
                          </td>
                          <td>{p.category || '-'}</td>
                          <td>
                            {(p.product_variants || []).map((v) => (
                              <div style={{ fontSize: 'var(--text-xs)' }} key={v.id}>
                                {v.variant_name} — {formatRupiah(v.sell_price)}
                              </div>
                            ))}
                          </td>
                          <td>
                            <span className={hasLow ? 'stock-low' : 'stock-ok'}>{totalStock}</span>
                          </td>
                          <td>
                            <div className="flex gap-2">
                              <button className="btn btn-ghost btn-sm" onClick={() => handleOpenProductModal(p)}>
                                ✏️ Edit
                              </button>
                              <button
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteProduct(p.id, p.name)}
                              >
                                🗑️
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="5" className="text-center text-gray">
                        Belum ada produk
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        /* Stock Tab */
        <div id="stock-tab" className="tab-panel active">
          <div className="table-card">
            <div className="table-header">
              <span className="table-title">Semua Varian & Stok</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Produk</th>
                    <th>Varian</th>
                    <th>Stok</th>
                    <th>Min. Stok</th>
                    <th>Status</th>
                    <th>Tambah Stok</th>
                  </tr>
                </thead>
                <tbody>
                  {variants.length > 0 ? (
                    variants.map((v) => {
                      const isLow = v.stock <= v.min_stock
                      return (
                        <tr key={v.id}>
                          <td style={{ fontWeight: 600 }}>{v.products?.name || '-'}</td>
                          <td>{v.variant_name}</td>
                          <td>
                            <span className={isLow ? 'stock-low' : 'stock-ok'}>{v.stock}</span>
                          </td>
                          <td style={{ color: 'var(--gray-400)' }}>{v.min_stock}</td>
                          <td>
                            {isLow ? (
                              <span className="status-badge badge-rejected">⚠️ Kritis</span>
                            ) : (
                              <span className="status-badge badge-done">✅ Aman</span>
                            )}
                          </td>
                          <td>
                            <button
                              className="btn btn-primary btn-sm"
                              onClick={() => handleOpenStockModal(v.id, `${v.products?.name} — ${v.variant_name}`)}
                            >
                              + Stok
                            </button>
                          </td>
                        </tr>
                      )
                    })
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center text-gray">
                        Belum ada varian
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Product Modal */}
      {showProductModal && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: '720px' }}>
            <div className="modal-header">
              <h2 className="modal-title">{editProductId ? 'Edit Produk' : 'Tambah Produk'}</h2>
              <button className="modal-close" onClick={() => setShowProductModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <div className="grid-2">
                <div className="form-group">
                  <label className="form-label">
                    Nama Produk <span className="required">*</span>
                  </label>
                  <input
                    className="form-control"
                    placeholder="Contoh: Beras Premium"
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Kategori</label>
                  <select
                    className="form-control"
                    value={formCategory}
                    onChange={(e) => setFormCategory(e.target.value)}
                  >
                    <option value="">Pilih kategori...</option>
                    {categories.map((c) => (
                      <option key={c.name} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Deskripsi</label>
                <textarea
                  className="form-control"
                  rows="2"
                  placeholder="Deskripsi singkat produk"
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                ></textarea>
              </div>

              <div className="form-group">
                <label className="form-label">URL Gambar</label>
                <input
                  className="form-control"
                  placeholder="https://... (kosongkan jika pakai emoji)"
                  value={formImage}
                  onChange={(e) => setFormImage(e.target.value)}
                />
              </div>

              <hr className="divider" />
              <div className="flex justify-between items-center mb-4">
                <strong style={{ fontSize: 'var(--text-sm)' }}>Varian Produk</strong>
                <button className="btn btn-ghost btn-sm" onClick={handleAddVariantRow}>
                  + Tambah Varian
                </button>
              </div>

              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.2fr 1.2fr 80px 80px auto',
                  gap: 'var(--space-2)',
                  marginBottom: 'var(--space-2)',
                  fontSize: 'var(--text-xs)',
                  color: 'var(--gray-400)',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  padding: '0 var(--space-1)'
                }}
              >
                <span>Nama Varian</span>
                <span>Harga Beli</span>
                <span>Harga Jual</span>
                <span>Stok</span>
                <span>Min.Stok</span>
                <span></span>
              </div>

              <div id="variant-rows">
                {formVariants.map((v, idx) => (
                  <div className="variant-row" key={idx} id={`vrow-${idx}`}>
                    <input
                      className="form-control"
                      placeholder="Nama varian (mis: 1 Kg)"
                      value={v.variant_name}
                      onChange={(e) => handleVariantChange(idx, 'variant_name', e.target.value)}
                    />
                    <input
                      className="form-control"
                      type="number"
                      placeholder="Harga Beli"
                      value={v.cost_price}
                      onChange={(e) => handleVariantChange(idx, 'cost_price', Number(e.target.value))}
                    />
                    <input
                      className="form-control"
                      type="number"
                      placeholder="Harga Jual"
                      value={v.sell_price}
                      onChange={(e) => handleVariantChange(idx, 'sell_price', Number(e.target.value))}
                    />
                    <input
                      className="form-control"
                      type="number"
                      placeholder="Stok"
                      value={v.stock}
                      onChange={(e) => handleVariantChange(idx, 'stock', Number(e.target.value))}
                      disabled={!!v.id} // Don't allow changing stock directly on edit, use Restock button instead to log properly
                    />
                    <input
                      className="form-control"
                      type="number"
                      placeholder="Min"
                      value={v.min_stock}
                      onChange={(e) => handleVariantChange(idx, 'min_stock', Number(e.target.value))}
                    />
                    <button
                      className="btn btn-danger btn-sm"
                      onClick={() => handleRemoveVariantRow(idx)}
                      title="Hapus varian"
                      disabled={!!v.id} // Prevent deleting already saved variants from modal directly (better logic for DB integrity)
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowProductModal(false)}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleSaveProduct}>
                💾 Simpan Produk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Stock Modal */}
      {showStockModal && (
        <div className="modal-overlay open">
          <div className="modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header">
              <h2 className="modal-title">Tambah Stok</h2>
              <button className="modal-close" onClick={() => setShowStockModal(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <p style={{ fontWeight: 600, marginBottom: 'var(--space-4)' }}>{stockVariantName}</p>
              <div className="form-group">
                <label className="form-label">
                  Jumlah Tambah Stok <span className="required">*</span>
                </label>
                <input
                  type="number"
                  className="form-control"
                  min="1"
                  value={stockQty}
                  onChange={(e) => setStockQty(Number(e.target.value))}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Alasan (opsional)</label>
                <input
                  className="form-control"
                  placeholder="Restock dari supplier, dll."
                  value={stockReason}
                  onChange={(e) => setStockReason(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-ghost" onClick={() => setShowStockModal(false)}>
                Batal
              </button>
              <button className="btn btn-primary" onClick={handleConfirmAddStock} disabled={stockSubmitting}>
                {stockSubmitting ? 'Memproses...' : '✅ Tambah Stok'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
