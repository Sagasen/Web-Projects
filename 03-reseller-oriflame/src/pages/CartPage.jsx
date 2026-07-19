import { Link } from 'react-router-dom'
import { Minus, Plus, Trash2, MessageCircle, ShoppingBag } from 'lucide-react'
import Layout from '../components/layout/Layout'
import EmptyState from '../components/common/EmptyState'
import { useCart } from '../contexts/CartContext'
import { formatCurrency } from '../utils/formatCurrency'
import { getWhatsAppUrl, buildCartOrderMessage } from '../utils/whatsapp'

export default function CartPage() {
  const { items, updateQuantity, removeFromCart, total } = useCart()

  const handleWhatsApp = () => {
    const message = buildCartOrderMessage(items, total)
    window.open(getWhatsAppUrl(message), '_blank')
  }

  if (items.length === 0) {
    return (
      <Layout>
        <EmptyState
          icon={ShoppingBag}
          title="Keranjang kosong"
          description="Belum ada produk di keranjang. Jelajahi katalog dan tambahkan produk favorit Anda."
          action={
            <Link
              to="/"
              className="inline-block bg-brand text-white font-semibold px-6 py-2.5 rounded-xl hover:bg-brand-dark transition-colors"
            >
              Lihat Katalog
            </Link>
          }
        />
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="max-w-3xl mx-auto px-4 py-6">
        <h1 className="text-2xl font-bold text-gray-800 mb-6">Keranjang Belanja</h1>

        <div className="space-y-4 mb-6">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 bg-white rounded-2xl p-4 border border-gray-100 shadow-sm"
            >
              <img
                src={item.imageUrl}
                alt={item.name}
                className="w-20 h-20 rounded-xl object-cover bg-gray-50 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-gray-800 text-sm truncate">{item.name}</h3>
                <p className="text-brand font-bold mt-1">{formatCurrency(item.price)}</p>

                <div className="flex items-center justify-between mt-3">
                  <div className="flex items-center gap-1 border border-gray-200 rounded-lg">
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      disabled={item.quantity <= 1}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 disabled:opacity-40 rounded-l-lg"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <button
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="w-8 h-8 flex items-center justify-center hover:bg-gray-50 rounded-r-lg"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-gray-700">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeFromCart(item.id)}
                      className="text-gray-400 hover:text-red-500 transition-colors"
                      aria-label="Hapus"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm sticky bottom-4">
          <div className="flex items-center justify-between mb-4">
            <span className="text-gray-600">Total ({items.length} item)</span>
            <span className="text-2xl font-bold text-brand">{formatCurrency(total)}</span>
          </div>
          <button
            onClick={handleWhatsApp}
            className="w-full flex items-center justify-center gap-2 bg-green-500 text-white font-semibold py-3.5 rounded-xl hover:bg-green-600 transition-colors"
          >
            <MessageCircle className="w-5 h-5" />
            Pesan via WhatsApp
          </button>
        </div>
      </div>
    </Layout>
  )
}
