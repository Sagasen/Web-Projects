// src/components/layout/PublicLayout.jsx
import { useState, useRef, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { User, LogIn, UserPlus, LogOut, LayoutDashboard, ChevronDown } from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { signOut } from '../../lib/authUtils'

export default function PublicLayout({ children }) {
  const { isLoggedIn, profile, isAdmin } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    function handler(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  async function handleLogout() {
    setOpen(false)
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#f5f7f0' }}>

      {/* Navbar hijau sage */}
      <header className="sticky top-0 z-30" style={{ background: '#3d6e3f', boxShadow: '0 1px 3px rgba(0,0,0,0.15)' }}>
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">

          <Link to="/" className="text-xl font-bold text-white tracking-tight">
            Sanggar Tarasari
          </Link>

          <div className="relative" ref={ref}>
            <button
              onClick={() => setOpen(v => !v)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-full transition"
              style={{ background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.35)' }}
            >
              <div className="w-7 h-7 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(255,255,255,0.2)' }}>
                <User size={15} className="text-white" />
              </div>
              {isLoggedIn && (
                <span className="text-sm font-medium text-white max-w-[120px] truncate hidden sm:block">
                  {profile?.full_name || 'Customer'}
                </span>
              )}
              <ChevronDown size={14} className={`text-white transition-transform ${open ? 'rotate-180' : ''}`} />
            </button>

            {open && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-lg border border-gray-100 py-2 z-50">
                {isLoggedIn ? (
                  <>
                    <div className="px-4 py-2 border-b border-gray-100 mb-1">
                      <p className="text-sm font-semibold text-gray-800 truncate">{profile?.full_name || 'Customer'}</p>
                      <p className="text-xs text-gray-400 capitalize">{profile?.role}</p>
                    </div>
                    {isAdmin ? (
                      <Link to="/admin/dashboard" onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <LayoutDashboard size={15} /> Dashboard Admin
                      </Link>
                    ) : (
                      <Link to="/dashboard" onClick={() => setOpen(false)}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                        <LayoutDashboard size={15} /> Dashboard Saya
                      </Link>
                    )}
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50 transition w-full text-left">
                      <LogOut size={15} /> Keluar
                    </button>
                  </>
                ) : (
                  <>
                    <Link to="/login" onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                      <LogIn size={15} /> Masuk
                    </Link>
                    <Link to="/signup" onClick={() => setOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition">
                      <UserPlus size={15} /> Daftar
                    </Link>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>
    </div>
  )
}
