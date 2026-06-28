// src/pages/admin/AdminDashboardPage.jsx
import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { format, parseISO, isToday } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import {
  ClipboardList, Clock, CheckCircle2, XCircle,
  CalendarDays, Users, ArrowRight
} from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import AdminLayout from '../../components/layout/AdminLayout'

// ── Status badge ──────────────────────────────────────────
const STATUS_MAP = {
  pending   : { label: 'Menunggu',     color: 'bg-yellow-100 text-yellow-700 border-yellow-200' },
  confirmed : { label: 'Dikonfirmasi', color: 'bg-green-100 text-green-700 border-green-200'    },
  rejected  : { label: 'Ditolak',      color: 'bg-red-100 text-red-700 border-red-200'          },
  cancelled : { label: 'Dibatalkan',   color: 'bg-gray-100 text-gray-600 border-gray-200'       },
  completed : { label: 'Selesai',      color: 'bg-blue-100 text-blue-700 border-blue-200'       },
}

function StatusBadge({ status }) {
  const s = STATUS_MAP[status] ?? { label: status, color: 'bg-gray-100 text-gray-500' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${s.color}`}>
      {s.label}
    </span>
  )
}

// ── Stat Card ─────────────────────────────────────────────
function StatCard({ label, value, icon: Icon, color }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 flex items-center gap-4">
      <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${color}`}>
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-800">{value}</p>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
    </div>
  )
}

// ── Main ──────────────────────────────────────────────────
export default function AdminDashboardPage() {
  const [bookings, setBookings]   = useState([])
  const [loading, setLoading]     = useState(true)
  const [error, setError]         = useState('')

  useEffect(() => {
    async function fetchAll() {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .order('booking_date', { ascending: false })
        .order('start_time',   { ascending: false })

      if (error) { setError('Gagal memuat data.'); console.error(error) }
      else        setBookings(data)
      setLoading(false)
    }
    fetchAll()
  }, [])

  // ── Statistik ringkas ──────────────────────────────────
  const today       = new Date().toISOString().slice(0, 10)
  const todayList   = bookings.filter(b => b.booking_date === today)
  const pendingList = bookings.filter(b => b.status === 'pending')
  const confirmedList = bookings.filter(b => b.status === 'confirmed')
  const totalAll    = bookings.length

  // 5 booking terbaru (untuk preview tabel)
  const recentBookings = bookings.slice(0, 5)

  // ── Update status langsung dari dashboard ──────────────
  async function handleStatus(id, newStatus) {
    const { error } = await supabase
      .from('bookings')
      .update({ status: newStatus })
      .eq('id', id)

    if (error) { alert('Gagal mengubah status: ' + error.message); return }

    setBookings(prev =>
      prev.map(b => b.id === id ? { ...b, status: newStatus } : b)
    )
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-800">Dashboard Admin</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {format(new Date(), "EEEE, d MMMM yyyy", { locale: localeId })}
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3 mb-5">
          {error}
        </div>
      )}

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard label="Total Semua Booking" value={loading ? '–' : totalAll}        icon={ClipboardList}  color="bg-gray-500"   />
        <StatCard label="Booking Hari Ini"    value={loading ? '–' : todayList.length} icon={CalendarDays}   color="bg-blue-500"   />
        <StatCard label="Menunggu Konfirmasi" value={loading ? '–' : pendingList.length} icon={Clock}        color="bg-yellow-500" />
        <StatCard label="Sudah Dikonfirmasi"  value={loading ? '–' : confirmedList.length} icon={CheckCircle2} color="bg-green-600" />
      </div>

      {/* ── Booking Hari Ini ── */}
      {!loading && todayList.length > 0 && (
        <section className="mb-8">
          <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-3">
            Jadwal Hari Ini ({todayList.length})
          </h2>
          <div className="space-y-2">
            {todayList
              .sort((a,b) => a.start_time.localeCompare(b.start_time))
              .map(b => (
                <div key={b.id}
                  className="bg-white border border-gray-200 rounded-xl px-4 py-3
                             flex items-center justify-between gap-3">
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{b.activity_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {b.start_time.slice(0,5)} – {b.end_time.slice(0,5)} &nbsp;·&nbsp; {b.customer_name}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <StatusBadge status={b.status} />
                    {b.status === 'pending' && (
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleStatus(b.id, 'confirmed')}
                          className="text-xs px-2 py-1 bg-green-600 hover:bg-green-700
                                     text-white rounded transition"
                        >Terima</button>
                        <button
                          onClick={() => handleStatus(b.id, 'rejected')}
                          className="text-xs px-2 py-1 bg-red-500 hover:bg-red-600
                                     text-white rounded transition"
                        >Tolak</button>
                      </div>
                    )}
                  </div>
                </div>
              ))
            }
          </div>
        </section>
      )}

      {/* ── Booking Pending ── */}
      {!loading && pendingList.length > 0 && (
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Menunggu Konfirmasi ({pendingList.length})
            </h2>
            <Link
              to="/admin/bookings"
              className="text-xs text-sage-600 hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {pendingList.slice(0, 5).map(b => (
              <div key={b.id}
                className="bg-yellow-50 border border-yellow-200 rounded-xl px-4 py-3
                           flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium text-gray-800 text-sm">{b.activity_name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {format(parseISO(b.booking_date), 'd MMM yyyy', { locale: localeId })}
                    &nbsp;·&nbsp; {b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}
                    &nbsp;·&nbsp; {b.customer_name}
                  </p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button
                    onClick={() => handleStatus(b.id, 'confirmed')}
                    className="text-xs px-3 py-1.5 bg-green-600 hover:bg-green-700
                               text-white rounded-lg transition"
                  >Terima</button>
                  <button
                    onClick={() => handleStatus(b.id, 'rejected')}
                    className="text-xs px-3 py-1.5 bg-red-500 hover:bg-red-600
                               text-white rounded-lg transition"
                  >Tolak</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Booking Terbaru ── */}
      {!loading && recentBookings.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
              Booking Terbaru
            </h2>
            <Link
              to="/admin/bookings"
              className="text-xs text-sage-600 hover:underline flex items-center gap-1"
            >
              Lihat semua <ArrowRight size={12} />
            </Link>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-xs text-gray-500 uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Nama / Kegiatan</th>
                  <th className="text-left px-4 py-3 font-medium hidden sm:table-cell">Tanggal</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Jam</th>
                  <th className="text-left px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {recentBookings.map(b => (
                  <tr key={b.id} className="hover:bg-gray-50 transition">
                    <td className="px-4 py-3">
                      <p className="font-medium text-gray-800">{b.customer_name}</p>
                      <p className="text-xs text-gray-400">{b.activity_name}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden sm:table-cell">
                      {format(parseISO(b.booking_date), 'd MMM yyyy', { locale: localeId })}
                    </td>
                    <td className="px-4 py-3 text-gray-600 hidden md:table-cell">
                      {b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={b.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Empty */}
      {!loading && bookings.length === 0 && !error && (
        <div className="text-center py-16 text-gray-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Belum ada booking sama sekali.</p>
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3 animate-pulse">
          {[1,2,3,4].map(i => (
            <div key={i} className="h-16 bg-gray-200 rounded-xl" />
          ))}
        </div>
      )}

    </AdminLayout>
  )
}
