import React from 'react'
import { Link } from 'react-router-dom'
import { Header } from '../components/Header'
import { useCart } from '../context/CartContext'
import { useToast } from '../context/ToastContext'
import { formatRupiah } from '../components/ProductCard'

export const Cart = () => {
  const { cart, updateQty, removeItem, getCartTotal } = useCart()
  const { showToast } = useToast()

  const handleRemove = (variantId, name) => {
    removeItem(variantId)
    showToast(`${name} dihapus dari keranjang`, 'info')
  }

  const handleQtyChange = (variantId, currentQty, amount) => {
    updateQty(variantId, currentQty + amount)
  }

  const total = getCartTotal()
  const cartIsEmpty = cart.length === 0

  return (
    <div>
      <Header />

      <div className="cart-page">
        <h1 className="page-title">🛒 Keranjang Belanja</h1>

        {cartIsEmpty ? (
          <div id="cart-empty" className="cart-empty">
            <div className="cart-empty-icon">🛒</div>
            <p className="cart-empty-text">Keranjang kamu masih kosong</p>
            <Link to="/" className="btn btn-primary mt-4">
              Mulai Belanja
            </Link>
          </div>
        ) : (
          <>
            <div id="cart-items" className="cart-table">
              {cart.map((item) => {
                const hasImg = item.imageUrl && item.imageUrl.trim() !== ''
                return (
                  <div className="cart-item" key={item.variantId}>
                    <div>
                      {hasImg ? (
                        <img
                          src={item.imageUrl}
                          alt={item.productName}
                          className="cart-item-img"
                          onError={(e) => {
                            e.target.style.display = 'none'
                            const placeholder = e.target.nextElementSibling
                            if (placeholder) placeholder.style.display = 'flex'
                          }}
                        />
                      ) : null}
                      <div className="cart-item-img-placeholder" style={{ display: hasImg ? 'none' : 'flex' }}>
                        🛒
                      </div>
                    </div>
                    <div className="cart-item-info">
                      <div className="cart-item-name">{item.productName}</div>
                      <div className="cart-item-variant">{item.variantName}</div>
                      <div className="cart-item-price">{formatRupiah(item.price)}</div>
                    </div>
                    <div className="qty-stepper">
                      <button className="qty-btn" onClick={() => handleQtyChange(item.variantId, item.qty, -1)}>
                        −
                      </button>
                      <span className="qty-display">{item.qty}</span>
                      <button className="qty-btn" onClick={() => handleQtyChange(item.variantId, item.qty, 1)}>
                        +
                      </button>
                    </div>
                    <div className="cart-item-subtotal">{formatRupiah(item.price * item.qty)}</div>
                    <button
                      className="btn-remove"
                      title="Hapus"
                      onClick={() => handleRemove(item.variantId, item.productName)}
                    >
                      🗑️
                    </button>
                  </div>
                )
              })}
            </div>

            <div id="cart-summary" className="cart-summary">
              <div className="cart-summary-row">
                <span>{cart.length} produk</span>
                <span style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{formatRupiah(total)}</span>
              </div>
              <div className="cart-summary-row" style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                <span>Ongkir</span>
                <span>Ditentukan saat konfirmasi</span>
              </div>
              <div className="cart-total-row">
                <span className="cart-total-label">Total Belanja</span>
                <span className="cart-total-value">{formatRupiah(total)}</span>
              </div>
              <div className="flex gap-3 mt-4">
                <Link to="/" className="btn btn-ghost" style={{ flex: 1 }}>
                  ← Lanjut Belanja
                </Link>
                <Link to="/checkout" className="btn btn-primary" style={{ flex: 2 }}>
                  Lanjut Checkout →
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
