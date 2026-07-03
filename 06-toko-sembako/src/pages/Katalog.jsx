import React, { useState, useEffect } from 'react'
import { Header } from '../components/Header'
import { ProductCard } from '../components/ProductCard'
import { useToast } from '../context/ToastContext'
import { useCart } from '../context/CartContext'
import { supabase } from '../lib/supabase'
import { formatRupiah } from '../components/ProductCard'

const CATEGORY_ICONS = {
  'Beras & Tepung':   '🌾',
  'Minyak & Lemak':   '🫙',
  'Gula & Pemanis':   '🍬',
  'Bumbu & Rempah':   '🌶️',
  'Minuman':          '🧃',
  'Snack & Lain-lain':'🍪',
}

const AI_KEYWORD_MAP = {
  'rendang':    ['daging', 'gula', 'garam', 'kecap', 'minyak'],
  'soto':       ['garam', 'minyak', 'bumbu'],
  'nasi goreng':['beras', 'minyak', 'garam', 'kecap', 'telur'],
  'goreng':     ['minyak', 'garam', 'tepung'],
  'tumis':      ['minyak', 'garam', 'bumbu', 'kecap'],
  'bakar':      ['garam', 'kecap', 'bumbu'],
  'rebus':      ['garam'],
  'sup':        ['garam', 'minyak'],
  'sayur':      ['garam', 'minyak', 'bumbu'],
  'sambal':     ['garam', 'minyak', 'gula'],
  'oseng':      ['minyak', 'garam', 'kecap'],
  'kue':        ['tepung', 'gula', 'minyak', 'susu'],
  'roti':       ['tepung', 'gula', 'minyak'],
  'bolu':       ['tepung', 'gula', 'minyak'],
  'biskuit':    ['tepung', 'gula', 'minyak'],
  'donat':      ['tepung', 'gula', 'minyak'],
  'gorengan':   ['tepung', 'minyak', 'garam'],
  'teh':        ['teh'],
  'kopi':       ['kopi', 'gula'],
  'susu':       ['susu', 'gula'],
  'minuman':    ['teh', 'kopi', 'gula'],
  'sarapan':    ['beras', 'teh', 'kopi', 'minyak'],
  'masak':      ['beras', 'minyak', 'garam', 'gula'],
  'masakan':    ['beras', 'minyak', 'garam', 'kecap'],
  'dapur':      ['beras', 'minyak', 'garam', 'gula', 'tepung'],
  'sehari-hari':['beras', 'minyak', 'garam', 'gula'],
  'harian':     ['beras', 'minyak', 'garam'],
}

export const Katalog = () => {
  const { showToast } = useToast()
  const { addToCart } = useCart()
  const [products, setProducts] = useState([])
  const [categories, setCategories] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeCategory, setActiveCategory] = useState('semua')
  const [searchQuery, setSearchQuery] = useState('')

  // AI assistant state
  const [aiInput, setAiInput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiResult, setAiResult] = useState([])
  const [aiHasQueried, setAiHasQueried] = useState(false)

  useEffect(() => {
    fetchCategories()
    fetchProducts()
  }, [])

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

  // AI Recommendations handler
  const handleAiAsk = async () => {
    const input = aiInput.toLowerCase().trim()
    if (!input) {
      showToast('Ceritakan dulu mau masak apa!', 'warning')
      return
    }

    setAiLoading(true)
    setAiHasQueried(true)
    setAiResult([])

    try {
      // Find matched keywords
      let matchedKeywords = new Set()
      for (const [key, words] of Object.entries(AI_KEYWORD_MAP)) {
        if (input.includes(key)) {
          words.forEach(w => matchedKeywords.add(w.toLowerCase()))
        }
      }

      // Filter local active products
      const recommended = products.filter(p => {
        const lname = p.name.toLowerCase()
        if (input.includes(lname) || lname.includes(input)) return true
        return Array.from(matchedKeywords).some(kw => lname.includes(kw))
      })

      setAiResult(recommended.slice(0, 6))
    } catch (e) {
      console.error(e)
      showToast('Gagal memproses rekomendasi AI', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  const handleAddFromAi = async (p) => {
    const availableVariants = p.product_variants.filter(v => v.stock > 0)
    if (availableVariants.length === 0) return

    // Choose the cheapest one
    const cheapest = availableVariants.reduce((a, b) => 
      Number(a.sell_price) < Number(b.sell_price) ? a : b
    )

    addToCart({
      variantId: cheapest.id,
      productName: p.name,
      variantName: cheapest.variant_name,
      price: Number(cheapest.sell_price),
      imageUrl: p.image_url || ''
    })

    showToast(`${p.name} (${cheapest.variant_name}) ditambahkan ke keranjang!`, 'success')
  }

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
              <ProductCard key={p.id} product={p} onAddToast={(msg) => showToast(msg, 'success')} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <div className="empty-state-icon">🔍</div>
            <h3 className="empty-state-title">Produk tidak ditemukan</h3>
            <p className="empty-state-desc">Coba kata kunci lain atau pilih kategori yang berbeda</p>
          </div>
        )}

        {/* AI Recommendations */}
        <section className="ai-section">
          <h2 className="ai-title">🤖 Asisten Belanja AI</h2>
          <p className="ai-subtitle">Ceritakan mau masak apa, biar aku rekomendasikan bahan-bahannya!</p>
          <div className="ai-input-wrap">
            <input
              type="text"
              placeholder="Contoh: mau bikin rendang, atau mau goreng ayam..."
              value={aiInput}
              onChange={(e) => setAiInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAiAsk()}
            />
            <button className="btn btn-primary" onClick={handleAiAsk} disabled={aiLoading}>
              Tanya
            </button>
          </div>

          {aiLoading ? (
            <div className="spinner" style={{ width: '24px', height: '24px', margin: '16px auto' }}></div>
          ) : aiHasQueried ? (
            aiResult.length > 0 ? (
              <div className="ai-result">
                {aiResult.map((p) => {
                  const availableVariants = p.product_variants.filter(v => v.stock > 0)
                  const cheapest = availableVariants.reduce((a, b) => 
                    Number(a.sell_price) < Number(b.sell_price) ? a : b
                  )
                  return (
                    <div className="ai-card" key={p.id}>
                      <div className="ai-card-name">{p.name}</div>
                      <div className="ai-card-price">Mulai {formatRupiah(cheapest.sell_price)}</div>
                      <button
                        className="btn btn-primary btn-sm btn-full"
                        onClick={() => handleAddFromAi(p)}
                      >
                        + Keranjang
                      </button>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div style={{ color: 'var(--green-100)', fontSize: 'var(--text-sm)', marginTop: '16px', textAlign: 'center' }}>
                Hmm, aku belum punya rekomendasi spesifik untuk itu.<br />
                Coba kata kunci: "goreng", "kue", "teh", atau nama bahan langsung 🙂
              </div>
            )
          ) : null}
        </section>
      </main>
    </div>
  )
}
