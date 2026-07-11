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

const RECIPE_MAP = {
  'rendang': {
    title: 'Rendang Daging',
    steps: [
      'Haluskan bumbu: bawang merah, bawang putih, cabai, lengkuas, jahe, dan kunyit.',
      'Tumis bumbu halus dengan sedikit minyak hingga harum.',
      'Masukkan daging, aduk rata sampai berubah warna.',
      'Tuang santan, masak dengan api kecil sambil sesekali diaduk agar santan tidak pecah.',
      'Tambahkan garam, gula, daun jeruk, daun salam, dan serai.',
      'Masak terus dengan api kecil hingga santan mengental dan berwarna cokelat, sekitar 2-3 jam, aduk sesekali agar tidak gosong di dasar wajan.'
    ]
  },
  'nasi goreng': {
    title: 'Nasi Goreng Sederhana',
    steps: [
      'Panaskan minyak, tumis bawang putih cincang hingga harum.',
      'Masukkan telur, orak-arik sebentar.',
      'Masukkan nasi putih (sebaiknya nasi dingin/nasi kemarin), aduk rata.',
      'Tambahkan kecap manis dan garam secukupnya, aduk hingga tercampur rata.',
      'Masak sambil sesekali diaduk hingga nasi terlihat kering dan harum, angkat dan sajikan.'
    ]
  },
  'soto': {
    title: 'Soto Ayam',
    steps: [
      'Rebus ayam bersama air hingga matang, sisihkan kaldunya.',
      'Tumis bumbu halus (bawang merah, bawang putih, kunyit, jahe) hingga harum.',
      'Masukkan tumisan bumbu ke dalam kaldu ayam, masak dengan api kecil.',
      'Tambahkan garam dan penyedap secukupnya, masak hingga bumbu meresap.',
      'Suwir ayam yang sudah direbus, sajikan bersama kuah soto, taburan bawang goreng, dan pelengkap sesuai selera.'
    ]
  },
  'sambal': {
    title: 'Sambal Terasi',
    steps: [
      'Rebus/kukus cabai, bawang merah, dan bawang putih sebentar hingga layu.',
      'Haluskan bersama sedikit terasi dan garam menggunakan cobek atau blender.',
      'Panaskan sedikit minyak, tumis sambal yang sudah dihaluskan hingga harum dan matang.',
      'Tambahkan gula sedikit untuk menyeimbangkan rasa, aduk rata, angkat.'
    ]
  },
  'kue': {
    title: 'Bolu Kukus Sederhana',
    steps: [
      'Campur tepung terigu, gula, dan sedikit garam dalam satu wadah.',
      'Kocok telur, lalu campurkan ke dalam adonan tepung sedikit demi sedikit.',
      'Tambahkan minyak, aduk hingga adonan licin dan tidak bergerindil.',
      'Tuang adonan ke dalam cetakan, kukus dengan api sedang selama 15-20 menit.',
      'Cek kematangan dengan tusuk gigi, jika sudah bersih berarti bolu sudah matang.'
    ]
  },
  'donat': {
    title: 'Donat Sederhana',
    steps: [
      'Campur tepung terigu, gula, dan ragi instan, aduk rata.',
      'Tambahkan telur dan sedikit air/susu, uleni hingga kalis.',
      'Masukkan margarin/minyak, uleni kembali hingga elastis, diamkan 30-45 menit hingga mengembang.',
      'Bentuk adonan menjadi bulat berlubang di tengah, diamkan lagi 15 menit.',
      'Goreng dengan minyak panas api sedang hingga kuning kecokelatan, angkat dan tiriskan.'
    ]
  },
  'teh': {
    title: 'Teh Manis Hangat',
    steps: [
      'Didihkan air.',
      'Masukkan teh celup atau teh seduh ke dalam gelas, tuang air panas.',
      'Diamkan 2-3 menit agar warna dan rasa teh keluar.',
      'Tambahkan gula secukupnya, aduk rata, sajikan hangat.'
    ]
  },
  'kopi': {
    title: 'Kopi Hitam Sederhana',
    steps: [
      'Didihkan air.',
      'Masukkan kopi bubuk secukupnya ke dalam gelas.',
      'Tuang air panas sedikit demi sedikit sambil diaduk.',
      'Tambahkan gula sesuai selera, aduk rata, sajikan.'
    ]
  }
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
  const [aiRecipe, setAiRecipe] = useState(null)
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

  // AI Recommendations handler — bahan dari produk toko, resep dari TheMealDB (gratis, tanpa API key)
  const handleAiAsk = async () => {
    const input = aiInput.toLowerCase().trim()
    if (!input) {
      showToast('Ceritakan dulu mau masak apa!', 'warning')
      return
    }

    setAiLoading(true)
    setAiHasQueried(true)
    setAiResult([])
    setAiRecipe(null)

    try {
      // --- 1. Coba ambil resep dari TheMealDB (free API, tanpa key) ---
      // Ekstrak kata kunci masakan (kata paling bermakna)
      const searchTerms = input
        .replace(/^(mau|bikin|masak|buat|cara|resep|aku|ingin|pengen|gimana)\s+/gi, '')
        .trim()

      let foundRecipe = null
      try {
        const res = await fetch(
          `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(searchTerms)}`,
          { signal: AbortSignal.timeout(5000) }
        )
        const json = await res.json()
        if (json.meals && json.meals.length > 0) {
          const meal = json.meals[0]
          // Kumpulkan bahan dari TheMealDB (strIngredient1..20)
          const ingredients = []
          for (let i = 1; i <= 20; i++) {
            const ing = meal[`strIngredient${i}`]
            const measure = meal[`strMeasure${i}`]
            if (ing && ing.trim()) {
              ingredients.push(measure && measure.trim() ? `${measure.trim()} ${ing.trim()}` : ing.trim())
            }
          }
          // Ubah instruksi jadi array langkah bernomor
          const steps = (meal.strInstructions || '')
            .split(/\r?\n/)
            .map(s => s.replace(/^STEP\s*\d+\.?\s*/i, '').trim())
            .filter(s => s.length > 10)
            .slice(0, 8)

          foundRecipe = {
            title: meal.strMeal,
            source: 'TheMealDB',
            ingredients,
            steps
          }
        }
      } catch (fetchErr) {
        console.warn('TheMealDB fetch gagal, fallback ke lokal:', fetchErr.message)
      }

      // Fallback: pakai resep lokal kalau TheMealDB tidak ketemu
      if (!foundRecipe) {
        const matchedKey = Object.keys(RECIPE_MAP).find(key => input.includes(key))
        if (matchedKey) {
          foundRecipe = { ...RECIPE_MAP[matchedKey], source: 'lokal' }
        }
      }

      setAiRecipe(foundRecipe)

      // --- 2. Rekomendasi bahan dari produk toko (tidak berubah) ---
      let matchedKeywords = new Set()
      for (const [key, words] of Object.entries(AI_KEYWORD_MAP)) {
        if (input.includes(key)) {
          words.forEach(w => matchedKeywords.add(w.toLowerCase()))
        }
      }
      // Tambah pencocokan dari nama bahan resep TheMealDB
      if (foundRecipe?.ingredients) {
        foundRecipe.ingredients.forEach(ing => {
          const ingLower = ing.toLowerCase()
          products.forEach(p => {
            if (ingLower.includes(p.name.toLowerCase()) || p.name.toLowerCase().split(' ').some(w => ingLower.includes(w))) {
              matchedKeywords.add(p.name.toLowerCase())
            }
          })
        })
      }

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
            aiResult.length > 0 || aiRecipe ? (
              <>
                {aiRecipe && (
                  <div
                    style={{
                      background: 'rgba(255,255,255,0.12)',
                      borderRadius: 'var(--radius, 12px)',
                      padding: 'var(--space-4)',
                      marginTop: '16px',
                      marginBottom: '16px',
                      color: 'white'
                    }}
                  >
                    <p style={{ fontWeight: 800, fontSize: 'var(--text-base)', marginBottom: '8px' }}>
                      📖 {aiRecipe.title}
                      {aiRecipe.source === 'TheMealDB' && (
                        <span style={{ fontSize: '10px', fontWeight: 400, opacity: 0.75, marginLeft: '8px' }}>
                          via TheMealDB
                        </span>
                      )}
                    </p>

                    {aiRecipe.ingredients && aiRecipe.ingredients.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: '4px', opacity: 0.9 }}>
                          🧂 Bahan-bahan:
                        </p>
                        <ul style={{ paddingLeft: '20px', margin: 0, lineHeight: 1.6, fontSize: 'var(--text-sm)' }}>
                          {aiRecipe.ingredients.slice(0, 10).map((ing, i) => (
                            <li key={i}>{ing}</li>
                          ))}
                          {aiRecipe.ingredients.length > 10 && (
                            <li style={{ opacity: 0.7 }}>... dan {aiRecipe.ingredients.length - 10} bahan lainnya</li>
                          )}
                        </ul>
                      </div>
                    )}

                    {aiRecipe.steps && aiRecipe.steps.length > 0 && (
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 'var(--text-sm)', marginBottom: '4px', opacity: 0.9 }}>
                          👨‍🍳 Cara Memasak:
                        </p>
                        <ol style={{ paddingLeft: '20px', margin: 0, lineHeight: 1.7, fontSize: 'var(--text-sm)' }}>
                          {aiRecipe.steps.map((step, idx) => (
                            <li key={idx} style={{ marginBottom: '4px' }}>{step}</li>
                          ))}
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {aiResult.length > 0 && (
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
                )}
              </>
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
