import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus,
  Pencil,
  Trash2,
  LogOut,
  Package,
  Tag,
  X,
  Home,
} from 'lucide-react'
import { useAuth } from '../contexts/AuthContext'
import Loading from '../components/common/Loading'
import ProductForm from '../components/admin/ProductForm'
import PromoForm from '../components/admin/PromoForm'
import { formatCurrency } from '../utils/formatCurrency'
import { BRAND_INITIAL } from '../config/brand'
import {
  getProducts,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../services/productService'
import {
  getPromos,
  createPromo,
  updatePromo,
  deletePromo,
} from '../services/promoService'

export default function AdminDashboardPage() {
  const { logout } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState('products')
  const [products, setProducts] = useState([])
  const [promos, setPromos] = useState([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    setLoading(true)
    const [productData, promoData] = await Promise.all([getProducts(), getPromos()])
    setProducts(productData)
    setPromos(promoData)
    setLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleLogout = async () => {
    await logout()
    navigate('/admin')
  }

  const closeModal = () => setModal(null)

  const handleProductSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (modal?.type === 'edit-product') {
        await updateProduct(modal.item.id, data)
      } else {
        await createProduct(data)
      }
      await loadData()
      closeModal()
    } finally {
      setSubmitting(false)
    }
  }

  const handlePromoSubmit = async (data) => {
    setSubmitting(true)
    try {
      if (modal?.type === 'edit-promo') {
        await updatePromo(modal.item.id, data)
      } else {
        await createPromo(data)
      }
      await loadData()
      closeModal()
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteProduct = async (id) => {
    if (!confirm('Hapus produk ini?')) return
    await deleteProduct(id)
    await loadData()
  }

  const handleDeletePromo = async (id) => {
    if (!confirm('Hapus promo ini?')) return
    await deletePromo(id)
    await loadData()
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-100 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-brand flex items-center justify-center">
              <span className="text-white font-bold text-xs">{BRAND_INITIAL}</span>
            </div>
            <span className="font-bold text-gray-800">Admin Panel</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-brand px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <Home className="w-4 h-4" />
              <span className="hidden sm:inline">Katalog</span>
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-500 px-3 py-1.5 rounded-lg hover:bg-gray-50"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Keluar</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setTab('products')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'products'
                ? 'bg-brand text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-brand'
            }`}
          >
            <Package className="w-4 h-4" />
            Produk ({products.length})
          </button>
          <button
            onClick={() => setTab('promos')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              tab === 'promos'
                ? 'bg-brand text-white'
                : 'bg-white text-gray-600 border border-gray-200 hover:border-brand'
            }`}
          >
            <Tag className="w-4 h-4" />
            Promo ({promos.length})
          </button>
        </div>

        {loading ? (
          <Loading />
        ) : tab === 'products' ? (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Daftar Produk</h2>
              <button
                onClick={() => setModal({ type: 'add-product' })}
                className="flex items-center gap-2 bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Produk
              </button>
            </div>

            {products.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
                Belum ada produk. Klik "Tambah Produk" untuk memulai.
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 text-gray-500 text-left">
                      <tr>
                        <th className="px-4 py-3 font-medium">Produk</th>
                        <th className="px-4 py-3 font-medium">Kategori</th>
                        <th className="px-4 py-3 font-medium">Harga</th>
                        <th className="px-4 py-3 font-medium text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      {products.map((product) => (
                        <tr key={product.id} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={product.imageUrl}
                                alt={product.name}
                                className="w-10 h-10 rounded-lg object-cover bg-gray-100"
                              />
                              <span className="font-medium text-gray-800">{product.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-gray-500">{product.category}</td>
                          <td className="px-4 py-3">
                            <span className="font-medium text-brand">
                              {formatCurrency(product.discountPrice ?? product.price)}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => setModal({ type: 'edit-product', item: product })}
                                className="p-1.5 text-gray-400 hover:text-brand hover:bg-brand-light rounded-lg transition-colors"
                              >
                                <Pencil className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </section>
        ) : (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-800">Daftar Promo</h2>
              <button
                onClick={() => setModal({ type: 'add-promo' })}
                className="flex items-center gap-2 bg-brand text-white text-sm font-semibold px-4 py-2 rounded-lg hover:bg-brand-dark transition-colors"
              >
                <Plus className="w-4 h-4" />
                Tambah Promo
              </button>
            </div>

            {promos.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 p-12 text-center text-gray-500">
                Belum ada promo. Klik "Tambah Promo" untuk memulai.
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 gap-4">
                {promos.map((promo) => (
                  <div
                    key={promo.id}
                    className="bg-white rounded-2xl border border-gray-100 p-4 flex gap-4"
                  >
                    {promo.imageUrl && (
                      <img
                        src={promo.imageUrl}
                        alt={promo.title}
                        className="w-20 h-20 rounded-xl object-cover bg-gray-50 shrink-0"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-semibold text-gray-800 truncate">{promo.title}</h3>
                        <span
                          className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${
                            promo.active
                              ? 'bg-green-100 text-green-700'
                              : 'bg-gray-100 text-gray-500'
                          }`}
                        >
                          {promo.active ? 'Aktif' : 'Nonaktif'}
                        </span>
                      </div>
                      {promo.discount && (
                        <p className="text-brand text-sm font-medium mt-1">
                          Diskon {promo.discount}%
                        </p>
                      )}
                      <div className="flex gap-2 mt-3">
                        <button
                          onClick={() => setModal({ type: 'edit-promo', item: promo })}
                          className="text-xs text-brand hover:underline"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeletePromo(promo.id)}
                          className="text-xs text-red-500 hover:underline"
                        >
                          Hapus
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}
      </div>

      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">
                {modal.type === 'add-product' && 'Tambah Produk'}
                {modal.type === 'edit-product' && 'Edit Produk'}
                {modal.type === 'add-promo' && 'Tambah Promo'}
                {modal.type === 'edit-promo' && 'Edit Promo'}
              </h3>
              <button
                onClick={closeModal}
                className="p-1 text-gray-400 hover:text-gray-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-5">
              {(modal.type === 'add-product' || modal.type === 'edit-product') && (
                <ProductForm
                  initial={
                    modal.item
                      ? {
                          ...modal.item,
                          price: modal.item.price,
                          discountPrice: modal.item.discountPrice ?? '',
                        }
                      : undefined
                  }
                  onSubmit={handleProductSubmit}
                  onCancel={closeModal}
                  submitting={submitting}
                />
              )}
              {(modal.type === 'add-promo' || modal.type === 'edit-promo') && (
                <PromoForm
                  initial={modal.item}
                  onSubmit={handlePromoSubmit}
                  onCancel={closeModal}
                  submitting={submitting}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
