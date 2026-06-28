// src/pages/customer/DashboardPage.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { CalendarDays, Clock, Users, ChevronRight, PlusCircle } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import CustomerLayout from '../../components/layout/CustomerLayout'

// ── Status badge ──────────────────────────────────────────
const STATUS_MAP = {
  pending   : { label: 'Menunggu',   color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  confirmed : { label: 'Dikonfirmasi', color: 'bg-green-100 text-green-700 border-green-200'  },
  rejected  : { label: 'Ditolak',    color: 'bg-red-100 text-red-700 border-red-200'          },
  cancelled : { label: 'Dibatalkan', color: 'bg-gray-100 text-gray-600 border-gray-200'       },
  completed : { label: 'Selesai',    color: 'bg-blue-100 text-blue-700 border-blue-200'       },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-100 text-gray-600 border-gray-200' }
  return (
    <span className={`text-xs font-medium px-2.5 py-0.5 rounded-full border ${s.color}`}>
      {s.label}
    </span>
  )
}

// ── Booking Card ──────────────────────────────────────────
function BookingCard({ booking }) {
  const date = format(parseISO(booking.booking_date), 'EEEE, d MMMM yyyy', { locale: localeId })
  const start = booking.start_time.slice(0, 5)
  const end   = booking.end_time.slice(0, 5)

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 hover:border-sage-300
                    hover:shadow-sm transition group">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-gray-800 truncate">{booking.activity_name}</p>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <CalendarDays size={12} /> {date}
            </span>
            <span className="flex items-center gap-1">
              <Clock size={12} /> {start} – {end}
            </span>
            <span className="flex items-center gap-1">
              <Users size={12} /> {booking.participant_count} peserta
            </span>
          </div>
          {booking.admin_notes && (
            <p className="mt-2 text-xs text-gray-500 italic border-l-2 border-gray-200 pl-2">
              Catatan admin: {booking.admin_notes}
            </p>
          )}
        </div>
        <StatusBadge status={booking.status} />
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────
export default function DashboardPage() {
  const { session } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')

  useEffect(() => {
    async function fetchBookings() {
      setLoading(true)
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('customer_id', session.user.id)
        .order('booking_date', { ascending: false })
        .order('start_time',   { ascending: false })

      if (error) {
        setError('Gagal memuat data booking. Coba refresh halaman.')
      } else {
        setBookings(data)
      }
      setLoading(false)
    }

    if (session) fetchBookings()
  }, [session])

  // Kelompokkan berdasarkan status aktif vs selesai/ditolak
  const active   = bookings.filter(b => ['pending','confirmed'].includes(b.status))
  const inactive = bookings.filter(b => ['rejected','cancelled','completed'].includes(b.status))

  return (
    <CustomerLayout>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Riwayat Booking Saya</h1>
          <p className="text-sm text-gray-500 mt-0.5">Semua pengajuan booking yang pernah kamu buat</p>
        </div>
        <Link
          to="/dashboard/booking"
          className="flex items-center gap-1.5 bg-sage-600 hover:bg-sage-700 text-white
                     text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <PlusCircle size={15} />
          Booking Baru
        </Link>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-4">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="space-y-3">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-2/3" />
            </div>
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && bookings.length === 0 && !error && (
        <div className="text-center py-16">
          <CalendarDays size={48} className="text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-600 mb-1">Belum ada booking</h3>
          <p className="text-sm text-gray-400 mb-5">
            Yuk, ajukan booking pertamamu sekarang!
          </p>
          <Link
            to="/dashboard/booking"
            className="inline-flex items-center gap-1.5 bg-sage-600 hover:bg-sage-700
                       text-white text-sm font-medium px-5 py-2.5 rounded-lg transition"
          >
            <PlusCircle size={15} /> Booking Sekarang
          </Link>
        </div>
      )}

      {/* Booking aktif */}
      {!loading && active.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Booking Aktif ({active.length})
          </h2>
          <div className="space-y-3">
            {active.map(b => <BookingCard key={b.id} booking={b} />)}
          </div>
        </section>
      )}

      {/* Riwayat */}
      {!loading && inactive.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Riwayat ({inactive.length})
          </h2>
          <div className="space-y-3">
            {inactive.map(b => <BookingCard key={b.id} booking={b} />)}
          </div>
        </section>
      )}

    </CustomerLayout>
  )
}
