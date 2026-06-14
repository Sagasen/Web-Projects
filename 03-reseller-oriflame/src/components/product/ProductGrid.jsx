import ProductCard from './ProductCard'
import EmptyState from '../common/EmptyState'
import { Package } from 'lucide-react'

export default function ProductGrid({ products }) {
  if (products.length === 0) {
    return (
      <EmptyState
        icon={Package}
        title="Belum ada produk"
        description="Produk untuk kategori ini belum tersedia. Coba kategori lain atau kembali lagi nanti."
      />
    )
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  )
}
