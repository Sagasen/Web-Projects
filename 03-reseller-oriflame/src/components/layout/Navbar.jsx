import { Link, useLocation } from 'react-router-dom'
import { ShoppingBag, Tag, Home, Shield } from 'lucide-react'
import { useCart } from '../../contexts/CartContext'

const navLinks = [
  { to: '/', label: 'Beranda', icon: Home },
  { to: '/promo', label: 'Promo', icon: Tag },
  { to: '/keranjang', label: 'Keranjang', icon: ShoppingBag },
]

export default function Navbar() {
  const { itemCount } = useCart()
  const location = useLocation()

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-oriflame flex items-center justify-center">
            <span className="text-white font-bold text-sm">O</span>
          </div>
          <div>
            <span className="font-bold text-oriflame text-lg leading-none block">Oriflame</span>
            <span className="text-xs text-gray-400 leading-none">Katalog Produk</span>
          </div>
        </Link>

        <nav className="flex items-center gap-1">
          {navLinks.map(({ to, label, icon: Icon }) => {
            const isActive = location.pathname === to
            const isCart = to === '/keranjang'
            return (
              <Link
                key={to}
                to={to}
                className={`relative flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-oriflame-light text-oriflame'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-oriflame'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
                {isCart && itemCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-oriflame text-white text-xs rounded-full flex items-center justify-center font-bold">
                    {itemCount > 9 ? '9+' : itemCount}
                  </span>
                )}
              </Link>
            )
          })}
          <Link
            to="/admin"
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-gray-400 hover:text-oriflame hover:bg-gray-50 transition-colors"
            title="Admin"
          >
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">Admin</span>
          </Link>
        </nav>
      </div>
    </header>
  )
}
