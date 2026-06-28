// src/pages/admin/AdminBookingsPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CalendarDays, Check, ClipboardList, Filter, Search, Trash2, X } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../lib/supabaseClient'
import { formatTime, normalizeSupabaseError, StatusBadge } from '../../lib/bookingUtils'

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua Status' },
  { value: 'pending', label: 'Menunggu' },
  { value: 'confirmed', label: 'Dikonfirmasi' },
  { value: 'rejected', label: 'Ditolak' },
  { value: 'cancelled', label: 'Dibatalkan' },
  { value: 'completed', label: 'Selesai' },
]

function BookingRow({ booking, onStatus, onDelete }) {
  return (
    <tr className="border-b border-gray-100 hover:bg-gray-50 align-top">
      <td className="px-4 py-4">
        <p className="font-semibold text-gray-900">{booking.customer_name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{booking.customer_phone}</p>
        {booking.notes && <p className="text-xs text-gray-400 mt-2 line-clamp-2">Catatan: {booking.notes}</p>}
      </td>
      <td className="px-4 py-4">
        <p className="font-semibold text-gray-800">{booking.activity_name}</p>
        <p className="text-xs text-gray-500 mt-0.5">{booking.participant_count} peserta</p>
      </td>
      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-600">
        <p>{format(parseISO(booking.booking_date), 'd MMM yyyy', { locale: localeId })}</p>
        <p className="text-xs text-gray-400 mt-0.5">{formatTime(booking.start_time)} – {formatTime(booking.end_time)}</p>
      </td>
      <td className="px-4 py-4 whitespace-nowrap">
        <StatusBadge status={booking.status} />
      </td>
      <td className="px-4 py-4">
        <div className="flex flex-wrap gap-1.5">
          {booking.status !== 'confirmed' && (
            <button onClick={() => onStatus(booking.id, 'confirmed')}
              className="inline-flex items-center gap-1 rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-green-700">
              <Check size={13} /> Terima
            </button>
          )}
          {booking.status !== 'rejected' && booking.status !== 'completed' && (
            <button onClick={() => onStatus(booking.id, 'rejected')}
              className="inline-flex items-center gap-1 rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-600">
              <X size={13} /> Tolak
            </button>
          )}
          {booking.status !== 'cancelled' && booking.status !== 'completed' && (
            <button onClick={() => onStatus(booking.id, 'cancelled')}
              className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700 hover:bg-gray-200">
              Batalkan
            </button>
          )}
          {booking.status !== 'completed' && (
            <button onClick={() => onStatus(booking.id, 'completed')}
              className="rounded-lg bg-blue-100 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-200">
              Selesai
            </button>
          )}
          <button onClick={() => onDelete(booking.id)}
            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100">
            <Trash2 size={13} /> Hapus
          </button>
        </div>
      </td>
    </tr>
  )
}

function BookingCard({ booking, onStatus, onDelete }) {
  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-gray-900">{booking.customer_name}</p>
          <p className="text-xs text-gray-500">{booking.customer_phone}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>
      <div className="mt-3 rounded-xl bg-gray-50 p-3 text-sm">
        <p className="font-semibold text-gray-800">{booking.activity_name}</p>
        <p className="text-xs text-gray-500 mt-1">
          {format(parseISO(booking.booking_date), 'EEEE, d MMM yyyy', { locale: localeId })} · {formatTime(booking.start_time)} – {formatTime(booking.end_time)} · {booking.participant_count} peserta
        </p>
      </div>
      {booking.notes && <p className="mt-3 text-xs text-gray-500">Catatan: {booking.notes}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {booking.status !== 'confirmed' && <button onClick={() => onStatus(booking.id, 'confirmed')} className="rounded-lg bg-green-600 px-2.5 py-1.5 text-xs font-semibold text-white">Terima</button>}
        {booking.status !== 'rejected' && booking.status !== 'completed' && <button onClick={() => onStatus(booking.id, 'rejected')} className="rounded-lg bg-red-500 px-2.5 py-1.5 text-xs font-semibold text-white">Tolak</button>}
        {booking.status !== 'cancelled' && booking.status !== 'completed' && <button onClick={() => onStatus(booking.id, 'cancelled')} className="rounded-lg bg-gray-100 px-2.5 py-1.5 text-xs font-semibold text-gray-700">Batalkan</button>}
        {booking.status !== 'completed' && <button onClick={() => onStatus(booking.id, 'completed')} className="rounded-lg bg-blue-100 px-2.5 py-1.5 text-xs font-semibold text-blue-700">Selesai</button>}
        <button onClick={() => onDelete(booking.id)} className="rounded-lg bg-red-50 px-2.5 py-1.5 text-xs font-semibold text-red-600">Hapus</button>
      </div>
    </div>
  )
}

export default function AdminBookingsPage() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filters, setFilters] = useState({ status: 'all', date: '', search: '' })

  async function fetchBookings() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('booking_date', { ascending: false })
      .order('start_time', { ascending: false })

    if (error) setError(normalizeSupabaseError(error))
    else setBookings(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchBookings() }, [])

  const filteredBookings = useMemo(() => {
    const q = filters.search.trim().toLowerCase()
    return bookings.filter((booking) => {
      const statusOk = filters.status === 'all' || booking.status === filters.status
      const dateOk = !filters.date || booking.booking_date === filters.date
      const searchOk = !q || [
        booking.customer_name,
        booking.customer_phone,
        booking.activity_name,
        booking.notes,
      ].some(value => String(value || '').toLowerCase().includes(q))
      return statusOk && dateOk && searchOk
    })
  }, [bookings, filters])

  async function handleStatus(id, status) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) {
      alert(normalizeSupabaseError(error))
      return
    }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  async function handleDelete(id) {
    const ok = window.confirm('Yakin ingin menghapus booking ini?')
    if (!ok) return

    const { error } = await supabase.from('bookings').delete().eq('id', id)
    if (error) {
      alert(normalizeSupabaseError(error))
      return
    }
    setBookings(prev => prev.filter(b => b.id !== id))
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Kelola Booking</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lihat semua booking, filter data, lalu terima / tolak / batalkan / hapus.
          </p>
        </div>
        <button onClick={fetchBookings} className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50">
          Refresh Data
        </button>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-5 rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="grid gap-3 md:grid-cols-[1fr_180px_180px]">
          <label className="relative block">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              placeholder="Cari nama, WA, kegiatan, catatan..."
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </label>
          <label className="relative block">
            <Filter size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="w-full appearance-none rounded-xl border border-gray-200 bg-white py-2.5 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            >
              {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
            </select>
          </label>
          <label className="relative block">
            <CalendarDays size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="date"
              value={filters.date}
              onChange={(e) => setFilters(prev => ({ ...prev, date: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </label>
        </div>
      </div>

      <div className="mb-3 flex items-center gap-2 text-sm text-gray-500">
        <ClipboardList size={16} />
        <span>{loading ? 'Memuat data...' : `${filteredBookings.length} booking ditemukan`}</span>
      </div>

      {loading ? (
        <div className="space-y-3 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-gray-200" />)}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-gray-300 bg-white py-16 text-center text-gray-400">
          <ClipboardList size={42} className="mx-auto mb-3 opacity-50" />
          <p className="text-sm">Belum ada booking sesuai filter.</p>
        </div>
      ) : (
        <>
          <div className="hidden overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm lg:block">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-xs uppercase tracking-wide text-gray-500">
                <tr>
                  <th className="px-4 py-3 text-left font-semibold">Customer</th>
                  <th className="px-4 py-3 text-left font-semibold">Kegiatan</th>
                  <th className="px-4 py-3 text-left font-semibold">Tanggal & Jam</th>
                  <th className="px-4 py-3 text-left font-semibold">Status</th>
                  <th className="px-4 py-3 text-left font-semibold">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {filteredBookings.map(booking => (
                  <BookingRow key={booking.id} booking={booking} onStatus={handleStatus} onDelete={handleDelete} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="grid gap-3 lg:hidden">
            {filteredBookings.map(booking => (
              <BookingCard key={booking.id} booking={booking} onStatus={handleStatus} onDelete={handleDelete} />
            ))}
          </div>
        </>
      )}
    </AdminLayout>
  )
}
