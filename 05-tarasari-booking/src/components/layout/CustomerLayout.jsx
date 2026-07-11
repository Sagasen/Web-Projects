// src/components/layout/CustomerLayout.jsx
import { Link, NavLink, useNavigate } from 'react-router-dom'
import { CalendarDays, ClipboardList, LogOut, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../lib/AuthContext'
import { signOut } from '../../lib/authUtils'

const navItems = [
  { to: '/dashboard',         label: 'Riwayat Booking', icon: ClipboardList, end: true },
  { to: '/dashboard/booking', label: 'Booking Baru',    icon: CalendarDays  },
]

export default function CustomerLayout({ children }) {
  const { profile } = useAuth()
  const navigate    = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    await signOut()
    navigate('/', { replace: true })
  }

  const NavItems = ({ onClick }) => (
    <>
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to} to={to} end={end}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-1.5 px-3 py-2 rounded-xl text-sm font-semibold transition
             ${isActive
               ? 'bg-white text-sage-700 shadow-sm'
               : 'text-sage-50/90 hover:bg-white/10 hover:text-white'
             }`
          }
        >
          <Icon size={15} />
          {label}
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-gradient-to-b from-sage-50 via-cream to-white flex flex-col">

      <header className="bg-sage-700 border-b border-sage-800 sticky top-0 z-30 shadow-sm">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">

          <Link to="/" className="text-xl font-extrabold text-white tracking-tight">
            Tarasari
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            <NavItems />
          </nav>

          <div className="hidden md:flex items-center gap-3">
            <span className="text-sm text-sage-50/90">
              Hai, <span className="font-semibold text-white">{profile?.full_name || 'Customer'}</span>
            </span>
            <button
              onClick={handleLogout}
              className="flex items-center gap-1.5 text-sm text-sage-50/80 hover:text-white transition"
            >
              <LogOut size={15} /> Keluar
            </button>
          </div>

          <button
            className="md:hidden p-1 text-white"
            onClick={() => setMenuOpen(v => !v)}
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden border-t border-sage-800 bg-sage-700 px-4 py-3 space-y-1">
            <NavItems onClick={() => setMenuOpen(false)} />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/90
                         hover:bg-white/10 w-full transition font-semibold"
            >
              <LogOut size={16} /> Keluar
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-6xl w-full mx-auto px-4 py-6 sm:py-8">
        {children}
      </main>
    </div>
  )
}
