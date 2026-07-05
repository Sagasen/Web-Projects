import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import { useCart } from '../context/CartContext'

export const Header = ({ searchQuery, onSearch }) => {
  const { customer, logout } = useCustomerAuth()
  const { getCartCount } = useCart()
  const navigate = useNavigate()

  const cartCount = getCartCount()

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  return (
    <header className="site-header">
      <div className="header-inner">
        <Link to="/" className="logo">
          <div className="logo-icon">🧼</div>
          <div>
            Bakoel Umpluk
            <span style={{ display: 'block', fontSize: '0.7rem', color: 'var(--gray-400)', fontWeight: 400 }}>
              Detergen & Perlengkapan Cuci
            </span>
          </div>
        </Link>

        <div className="header-search">
          {onSearch ? (
            <div className="search-wrap">
              <span className="search-icon">🔍</span>
              <input
                id="search-input"
                type="search"
                placeholder="Cari produk... (misal: deterjen, sabun cuci piring)"
                value={searchQuery || ''}
                onChange={(e) => onSearch(e.target.value)}
              />
            </div>
          ) : (
            <div className="search-wrap" onClick={() => navigate('/')} style={{ cursor: 'pointer' }}>
              <span className="search-icon">🔍</span>
              <input
                id="search-input"
                type="search"
                placeholder="Cari produk... (misal: deterjen, sabun cuci piring)"
                readOnly
              />
            </div>
          )}
        </div>

        <div className="header-actions">
          <Link to="/cart" className="cart-btn">
            🛒 <span className="cart-text">Keranjang</span>
            {cartCount > 0 && (
              <span className="cart-badge" id="cart-badge-header">
                {cartCount}
              </span>
            )}
          </Link>

          <div id="user-section">
            {customer ? (
              <div className="flex items-center gap-2">
                <Link to="/orders" className="user-btn">
                  👤 {customer.name.split(' ')[0]}
                </Link>
                <button className="user-btn" onClick={handleLogout}>
                  Keluar
                </button>
              </div>
            ) : (
              <Link to="/login" className="user-btn btn-login-header">
                Masuk
              </Link>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}
