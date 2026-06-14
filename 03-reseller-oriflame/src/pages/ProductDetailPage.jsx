import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { ArrowLeft, ShoppingCart, MessageCircle, Minus, Plus } from 'lucide-react'
import Layout from '../components/layout/Layout'
import Loading from '../components/common/Loading'
import { getProductById } from '../services/productService'
import { formatCurrency } from '../utils/formatCurrency'
import { useCart } from '../contexts/CartContext'
import { getWhatsAppUrl, buildSingleOrderMessage } from '../utils/whatsapp'

export default function ProductDetailPage() {
  const { id } = useParams()
  const [product, setProduct] = useState(null)
  const [loading, setLoading] = useState(true)
  const [quantity, setQuantity] = useState(1)
  const { addToCart } = useCart()

  useEffect(() => {
    async function load() {
      const data = await getProductById(id)
      setProduct(data)
      setLoading(false)
    }
    load()
  }, [id])

  if (loading) {
    return (
      <Layout>
        <Loading />
      </Layout>
    )
  }

  if (!product) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <p className="text-gray-500 mb-4">Produk tidak ditemukan.</p>
          <Link to="/" className="text-oriflame font-medium hover:underline">
            Kembali ke beranda
          </Link>
        </div>
      </Layout>
    )
  }

  const hasDiscount = product.discountPrice && product.discountPrice < product.price
  const displayPrice = hasDiscount ? product.discountPrice : product.price

  const handleWhatsApp = () => {
    const message = buildSingleOrderMessage({ ...product, discountPrice: displayPrice })
    window.open(getWhatsAppUrl(message), '_blank')
  }

  return (
    <Layout>
      <div className="max-w-6xl mx-auto px-4 py-6">
        <Link
          to="/"
          className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-oriflame mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Kembali
        </Link>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="flex flex-col">
            <span className="text-sm text-oriflame font-medium mb-2">{product.category}</span>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-4">{product.name}</h1>

            <div className="mb-6">
              {hasDiscount && (
                <span className="text-gray-400 line-through text-lg mr-2">
                  {formatCurrency(product.price)}
                </span>
              )}
              <span className="text-3xl font-bold text-oriflame">
                {formatCurrency(displayPrice)}
              </span>
              {hasDiscount && (
                <span className="ml-2 text-sm bg-oriflame-light text-oriflame px-2 py-0.5 rounded-full font-medium">
                  Hemat {Math.round((1 - displayPrice / product.price) * 100)}%
                </span>
              )}
            </div>

            {product.description && (
              <div className="text-gray-600 leading-relaxed mb-8 whitespace-pre-wrap">
                {product.description}
              </div>
            )}

            <div className="flex items-center gap-3 mb-6">
              <span className="text-sm text-gray-500">Jumlah:</span>
              <div className="flex items-center gap-2 border border-gray-200 rounded-lg">
                <button
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 rounded-l-lg transition-colors"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <span className="w-10 text-center font-medium">{quantity}</span>
                <button
                  onClick={() => setQuantity((q) => q + 1)}
                  className="w-9 h-9 flex items-center justify-center hover:bg-gray-50 rounded-r-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 mt-auto">
              <button
                onClick={() => addToCart(product, quantity)}
                className="flex-1 flex items-center justify-center gap-2 bg-oriflame-light text-oriflame font-semibold py-3 px-6 rounded-xl hover:bg-oriflame hover:text-white transition-colors"
              >
                <ShoppingCart className="w-5 h-5" />
                Tambah ke Keranjang
              </button>
              <button
                onClick={handleWhatsApp}
                className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white font-semibold py-3 px-6 rounded-xl hover:bg-green-600 transition-colors"
              >
                <MessageCircle className="w-5 h-5" />
                Order via WhatsApp
              </button>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  )
}
