// src/components/layout/AdminLayout.jsx
import { NavLink, useNavigate } from 'react-router-dom'
import { useState } from 'react'
import {
  LayoutDashboard, CalendarDays, ClipboardList,
  CalendarOff, LogOut, Menu, X, ShieldCheck
} from 'lucide-react'
import { useAuth } from '../../lib/AuthContext'
import { signOut } from '../../lib/authUtils'

const navItems = [
  { to: '/admin/dashboard',    label: 'Dashboard',      icon: LayoutDashboard, end: true },
  { to: '/admin/bookings',     label: 'Kelola Booking', icon: ClipboardList                },
  { to: '/admin/calendar',     label: 'Kalender',       icon: CalendarDays                 },
  { to: '/admin/closed-dates', label: 'Jadwal Tutup',   icon: CalendarOff                  },
]

export default function AdminLayout({ children }) {
  const { profile }   = useAuth()
  const navigate      = useNavigate()
  const [open, setOpen] = useState(false)

  async function handleLogout() {
    await signOut()
    navigate('/admin', { replace: true })
  }

  const NavItems = ({ onClick }) => (
    <>
      {navItems.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to} to={to} end={end}
          onClick={onClick}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition
             ${isActive
               ? 'bg-green-700 text-white shadow-sm shadow-green-900/20'
               : 'text-gray-300 hover:bg-gray-800 hover:text-white'
             }`
          }
        >
          <Icon size={17} />
          {label}
        </NavLink>
      ))}
    </>
  )

  return (
    <div className="min-h-screen bg-gray-50 flex">

      <aside className="hidden md:flex flex-col w-60 bg-gray-950 fixed inset-y-0 left-0">
        <div className="flex items-center gap-2 px-5 h-16 border-b border-gray-800">
          <ShieldCheck size={21} className="text-green-400" />
          <span className="font-bold text-white text-lg tracking-tight">Admin Panel</span>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1.5">
          <NavItems />
        </nav>

        <div className="px-3 py-4 border-t border-gray-800">
          <p className="text-xs text-gray-400 mb-1 truncate px-1">
            {profile?.full_name || 'Admin Tarasari'}
          </p>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400
                       px-3 py-2 w-full rounded-lg hover:bg-gray-800 transition"
          >
            <LogOut size={15} /> Keluar
          </button>
        </div>
      </aside>

      <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-gray-950 border-b border-gray-800">
        <div className="flex items-center justify-between px-4 h-14">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-green-400" />
            <span className="font-bold text-white text-sm">Admin Panel</span>
          </div>
          <button onClick={() => setOpen(v => !v)} className="text-gray-400">
            {open ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {open && (
          <div className="bg-gray-950 border-t border-gray-800 px-3 pb-4 space-y-1">
            <NavItems onClick={() => setOpen(false)} />
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-sm text-gray-400 hover:text-red-400
                         px-3 py-2 w-full rounded-lg hover:bg-gray-800 transition mt-2"
            >
              <LogOut size={15} /> Keluar
            </button>
          </div>
        )}
      </div>

      <main className="flex-1 md:ml-60 pt-14 md:pt-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
          {children}
        </div>
      </main>

    </div>
  )
}
