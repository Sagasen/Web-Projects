import React, { useState, useEffect } from 'react'
import { Header } from '../components/Header'
import { ProductCard } from '../components/ProductCard'
import { ChatWidget } from '../components/ChatWidget'
import { useToast } from '../context/ToastContext'
import { useCart } from '../context/CartContext'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../components/ProductCard'

const CATEGORY_ICONS = {
  'Deterjen Cuci':                  '🧺',
  'Sabun Cuci Piring':              '🍽️',
  'Pelembut & Pewangi Pakaian':     '🌸',
  'Pembersih Lantai & Kamar Mandi': '🧹',
  'Sabun & Perawatan Tubuh':        '🧴',
  'Lain-lain':                      '📦',
}

export const Katalog = () => {
  const { showToast } = useToast()
  const { addToCart } = useCart()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('semua')
  const [searchQuery, setSearchQuery] = useState('')
  const [bestSellerIds, setBestSellerIds] = useState([])

  useEffect(() => {
    fetchCategories()
    fetchProducts()
    fetchBestSellers()
  }, [])

  const fetchBestSellers = async () => {
    try {
      const { data, error } = await supabase.rpc('get_best_sellers', { p_limit: 6 })
      if (error) throw error
      const list = typeof data === 'string' ? JSON.parse(data) : data
      setBestSellerIds((list || []).map(item => item.product_id))
    } catch (e) {
      // Non-fatal: bestseller badge simply won't show if RPC isn't set up yet
      console.error('get_best_sellers error:', e)
    }
  }

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase.from('categories').select('name').order('name')
      if (!error && data) {
        setCategories(data)
      }
    } catch (e) {
      console.error(e)
    }
  }

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
      showToast('Gagal memuat produk', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleSearch = (val) => {
    setSearchQuery(val)
  }

  const handleCategoryClick = (catName) => {
    setActiveCategory(catName)
  }

  const filteredProducts = products.filter(p => {
    const matchesCategory = activeCategory === 'semua' || p.category === activeCategory
    const matchesSearch = !searchQuery || 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.description && p.description.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()))
    
    return matchesCategory && matchesSearch
  })

  return (
    <div>
      <Header searchQuery={searchQuery} onSearch={handleSearch} />

      <main className="main-content">
        {/* Category Pills */}
        <section className="category-section">
          <div className="category-pills" id="category-pills">
            <button
              className={`cat-pill ${activeCategory === 'semua' ? 'active' : ''}`}
              onClick={() => handleCategoryClick('semua')}
            >
              🛒 Semua
            </button>
            {categories.map((cat) => (
              <button
                key={cat.name}
                className={`cat-pill ${activeCategory === cat.name ? 'active' : ''}`}
                onClick={() => handleCategoryClick(cat.name)}
              >
                {CATEGORY_ICONS[cat.name] || '📦'} {cat.name}
              </button>
            ))}
          </div>
        </section>

        {/* Loading / Grid / Empty State */}
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Memuat produk...</p>
          </div>
        ) : filteredProducts.length > 0 ? (
          <div className="products-grid">
            {filteredProducts.map((p) => (
              <ProductCard
                key={p.id}
                product={p}
                onAddToast={(msg) => showToast(msg, 'success')}
                isBestSeller={bestSellerIds.includes(p.id)}
              />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3 className="empty-state-title">Produk tidak ditemukan</h3>
            <p className="empty-state-desc">Coba kata kunci lain atau pilih kategori yang berbeda</p>
          </div>
        )}
      </main>

      {/* AI Chat Assistant */}
      <ChatWidget products={products} />
    </div>
  )
}
