import { useState, useEffect } from 'react'
import Layout from '../components/layout/Layout'
import Banner from '../components/common/Banner'
import CategoryFilter from '../components/product/CategoryFilter'
import ProductGrid from '../components/product/ProductGrid'
import Loading from '../components/common/Loading'
import { getProducts } from '../services/productService'
import { getPromos } from '../services/promoService'

export default function HomePage() {
  const [products, setProducts] = useState([])
  const [promos, setPromos] = useState([])
  const [category, setCategory] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [productData, promoData] = await Promise.all([getProducts(), getPromos()])
        setProducts(productData)
        setPromos(promoData)
      } catch {
        setError('Gagal memuat data. Periksa koneksi dan konfigurasi Supabase.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  const filtered = category
    ? products.filter((p) => p.category === category)
    : products

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Banner promos={promos} />

        <div className="mb-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Katalog Produk</h2>
          <CategoryFilter selected={category} onChange={setCategory} />
        </div>

        {loading ? (
          <Loading />
        ) : error ? (
          <div className="text-center py-16 text-red-500">{error}</div>
        ) : (
          <>
            <p className="text-sm text-gray-500 mb-4">
              Menampilkan {filtered.length} produk
              {category && ` dalam kategori "${category}"`}
            </p>
            <ProductGrid products={filtered} />
          </>
        )}
      </div>
    </Layout>
  )
}
