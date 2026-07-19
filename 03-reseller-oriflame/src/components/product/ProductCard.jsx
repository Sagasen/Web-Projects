import { Link } from 'react-router-dom'
import { ShoppingCart } from 'lucide-react'
import { formatCurrency } from '../../utils/formatCurrency'
import { useCart } from '../../contexts/CartContext'

export default function ProductCard({ product }) {
  const { addToCart } = useCart()
  const hasDiscount = product.discountPrice && product.discountPrice < product.price
  const displayPrice = hasDiscount ? product.discountPrice : product.price
  const isPreOrder = product.status === 'Pre Order'

  const handleAddToCart = (e) => {
    e.preventDefault()
    addToCart(product)
  }

  return (
    <Link
      to={`/produk/${product.id}`}
      className="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md border border-gray-100 transition-all duration-300 flex flex-col"
    >
      <div className="relative aspect-square overflow-hidden bg-gray-50">
        <img
          src={product.imageUrl}
          alt={product.name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {hasDiscount && (
            <span className="bg-brand text-white text-xs font-bold px-2 py-1 rounded-full">
              Diskon
            </span>
          )}
          <span className={`text-xs font-bold px-2 py-1 rounded-full ${
            isPreOrder
              ? 'bg-orange-100 text-orange-600'
              : 'bg-green-100 text-green-600'
          }`}>
            {isPreOrder ? 'Pre Order' : 'Ready Stock'}
          </span>
        </div>
      </div>

      <div className="p-4 flex flex-col flex-1">
        <span className="text-xs text-brand font-medium mb-1">{product.category}</span>
        <h3 className="font-semibold text-gray-800 text-sm leading-snug mb-2 line-clamp-2 flex-1">
          {product.name}
        </h3>
        <div className="flex items-center justify-between mt-auto">
          <div>
            {hasDiscount && (
              <span className="text-xs text-gray-400 line-through block">
                {formatCurrency(product.price)}
              </span>
            )}
            <span className="font-bold text-brand">{formatCurrency(displayPrice)}</span>
          </div>
          <button
            onClick={handleAddToCart}
            className="w-8 h-8 rounded-full bg-brand-light text-brand flex items-center justify-center hover:bg-brand hover:text-white transition-colors"
            aria-label="Tambah ke keranjang"
          >
            <ShoppingCart className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Link>
  )
}