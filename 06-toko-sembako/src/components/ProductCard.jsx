import React, { useState } from 'react'
import { useCart } from '../context/CartContext'

export const getProductEmoji = (name) => {
  const n = name.toLowerCase()
  if (n.includes('beras'))   return '🌾'
  if (n.includes('tepung'))  return '🥐'
  if (n.includes('minyak'))  return '🫙'
  if (n.includes('gula'))    return '🍬'
  if (n.includes('garam'))   return '🧂'
  if (n.includes('kecap'))   return '🍶'
  if (n.includes('teh'))     return '🍵'
  if (n.includes('kopi'))    return '☕'
  if (n.includes('susu'))    return '🥛'
  if (n.includes('sabun'))   return '🧼'
  return '🛒'
}

export const formatRupiah = (angka) => {
  if (isNaN(angka)) return 'Rp 0'
  return 'Rp ' + Number(angka).toLocaleString('id-ID')
}

export const ProductCard = ({ product, onAddToast }) => {
  const { addToCart } = useCart()

  // Only show variants that have stock > 0
  const availableVariants = (product.product_variants || []).filter(v => v.stock > 0)

  if (availableVariants.length === 0) return null

  const [selectedVariantId, setSelectedVariantId] = useState(availableVariants[0].id)
  const [btnText, setBtnText] = useState('🛒 Tambah')
  const [btnBg, setBtnBg] = useState('')

  const selectedVariant = availableVariants.find(v => v.id === selectedVariantId) || availableVariants[0]

  const handleSelectChange = (e) => {
    setSelectedVariantId(Number(e.target.value))
  }

  const handleAdd = () => {
    addToCart({
      variantId: selectedVariant.id,
      productName: product.name,
      variantName: selectedVariant.variant_name,
      price: Number(selectedVariant.sell_price),
      imageUrl: product.image_url || ''
    })

    if (onAddToast) {
      onAddToast(`${product.name} (${selectedVariant.variant_name}) ditambahkan ke keranjang!`)
    }

    setBtnText('✅ Ditambahkan!')
    setBtnBg('var(--green-600)')
    setTimeout(() => {
      setBtnText('🛒 Tambah')
      setBtnBg('')
    }, 1200)
  }

  const hasImage = product.image_url && product.image_url.trim() !== ''

  return (
    <div className="product-card" id={`card-${product.id}`}>
      <div className="product-img-wrap">
        {hasImage ? (
          <img
            src={product.image_url}
            alt={product.name}
            loading="lazy"
            onError={(e) => {
              e.target.style.display = 'none'
              const placeholder = e.target.nextElementSibling
              if (placeholder) placeholder.style.display = 'flex'
            }}
          />
        ) : null}
        <div className="product-img-placeholder" style={{ display: hasImage ? 'none' : 'flex' }}>
          {getProductEmoji(product.name)}
        </div>
        {product.category && <span className="cat-badge">{product.category}</span>}
      </div>

      <div className="product-body">
        <h3 className="product-name">{product.name}</h3>
        {product.description && <p className="product-desc">{product.description}</p>}

        <select className="variant-select" value={selectedVariantId} onChange={handleSelectChange}>
          {availableVariants.map(v => (
            <option key={v.id} value={v.id}>
              {v.variant_name} — {formatRupiah(v.sell_price)}
            </option>
          ))}
        </select>

        <div className="product-price">{formatRupiah(selectedVariant.sell_price)}</div>

        <button className="btn-add-cart" style={{ background: btnBg }} onClick={handleAdd}>
          {btnText}
        </button>
      </div>
    </div>
  )
}
