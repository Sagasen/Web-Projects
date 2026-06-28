// src/pages/customer/BookingFormPage.jsx
import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { AlertCircle, CalendarDays, CheckCircle2, Clock, MessageSquare, UserRound, Users } from 'lucide-react'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import CustomerLayout from '../../components/layout/CustomerLayout'
import { useAuth } from '../../lib/AuthContext'
import { supabase } from '../../lib/supabaseClient'
import { ACTIVE_STATUSES, formatTime, getConflictBooking, normalizeSupabaseError } from '../../lib/bookingUtils'
import AIBookingAssistant from '../../components/ai/AIBookingAssistant'

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function BookingFormPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { session, profile } = useAuth()

  const selectedDate = searchParams.get('date') || todayIso()
  const selectedStart = searchParams.get('start') || '08:00'
  const selectedEnd = searchParams.get('end') || '09:00'
  const selectedActivity = searchParams.get('activity') || ''
  const selectedParticipants = searchParams.get('participants') || 1

  const [form, setForm] = useState({
    customer_name: profile?.full_name || '',
    customer_phone: profile?.phone || '',
    activity_name: selectedActivity,
    participant_count: selectedParticipants,
    booking_date: selectedDate,
    start_time: selectedStart,
    end_time: selectedEnd,
    notes: '',
  })
  const [bookings, setBookings] = useState([])
  const [closedDates, setClosedDates] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      customer_name: prev.customer_name || profile?.full_name || '',
      customer_phone: prev.customer_phone || profile?.phone || '',
    }))
  }, [profile])

  useEffect(() => {
    setForm(prev => ({
      ...prev,
      booking_date: selectedDate,
      start_time: selectedStart,
      end_time: selectedEnd,
      activity_name: selectedActivity || prev.activity_name,
      participant_count: selectedParticipants || prev.participant_count,
    }))
  }, [selectedDate, selectedStart, selectedEnd, selectedActivity, selectedParticipants])

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setError('')
      const [{ data: bookingData, error: bookingError }, { data: closedData, error: closedError }] = await Promise.all([
        supabase
          .from('bookings_public')
          .select('*')
          .gte('booking_date', todayIso()),
        supabase
          .from('closed_dates')
          .select('closed_date, reason')
          .gte('closed_date', todayIso()),
      ])

      if (bookingError || closedError) {
        setError('Gagal memuat jadwal. Coba refresh halaman.')
      } else {
        setBookings(bookingData || [])
        setClosedDates(closedData || [])
      }
      setLoading(false)
    }
    fetchData()
  }, [])

  function handleChange(e) {
    const { name, value } = e.target
    setForm(prev => ({ ...prev, [name]: value }))
    setError('')
  }

  const dateBookings = useMemo(() => {
    return bookings
      .filter(b => b.booking_date === form.booking_date && ACTIVE_STATUSES.includes(b.status))
      .sort((a, b) => a.start_time.localeCompare(b.start_time))
  }, [bookings, form.booking_date])

  const closedInfo = closedDates.find(d => d.closed_date === form.booking_date)
  const conflict = getConflictBooking(
    bookings,
    form.booking_date,
    form.start_time,
    form.end_time,
  )

  function validate() {
    if (!form.customer_name.trim()) return 'Nama pemesan wajib diisi.'
    if (!form.customer_phone.trim()) return 'Nomor WhatsApp wajib diisi.'
    if (!form.activity_name.trim()) return 'Nama kegiatan wajib diisi.'
    if (!form.booking_date) return 'Tanggal booking wajib diisi.'
    if (form.booking_date < todayIso()) return 'Tanggal booking tidak boleh sebelum hari ini.'
    if (closedInfo) return 'Tanggal ini sedang tutup/libur, pilih tanggal lain.'
    if (!form.start_time || !form.end_time) return 'Jam mulai dan jam selesai wajib diisi.'
    if (form.end_time <= form.start_time) return 'Jam selesai harus lebih besar dari jam mulai.'
    if (Number(form.participant_count) < 1) return 'Jumlah peserta minimal 1 orang.'
    if (conflict) {
      return `Jam tersebut bentrok dengan ${formatTime(conflict.start_time)} – ${formatTime(conflict.end_time)}. Pilih jam kosong ya.`
    }
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validation = validate()
    if (validation) {
      setError(validation)
      return
    }

    setSaving(true)
    setError('')

    const payload = {
      customer_id: session.user.id,
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      activity_name: form.activity_name.trim(),
      participant_count: Number(form.participant_count),
      notes: form.notes.trim() || null,
      booking_date: form.booking_date,
      start_time: form.start_time,
      end_time: form.end_time,
      status: 'pending',
    }

    const { error } = await supabase.from('bookings').insert(payload)
    setSaving(false)

    if (error) {
      setError(normalizeSupabaseError(error))
      return
    }

    navigate('/dashboard/booking-success', { replace: true })
  }

  return (
    <CustomerLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-sage-900">Booking Baru</h1>
        <p className="text-sm text-sage-700/80 mt-1">
          Isi detail booking. Tanggal merah tetap bisa dipilih selama jamnya tidak bentrok.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-sage-100 shadow-sm p-5 sm:p-6 space-y-5">
          {error && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              <AlertCircle size={17} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <UserRound size={14} /> Nama Pemesan
              </label>
              <input
                name="customer_name"
                value={form.customer_name}
                onChange={handleChange}
                placeholder="Nama lengkap"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Nomor WhatsApp</label>
              <input
                name="customer_phone"
                type="tel"
                value={form.customer_phone}
                onChange={handleChange}
                placeholder="08123456789"
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <CalendarDays size={14} /> Nama Kegiatan
            </label>
            <input
              name="activity_name"
              value={form.activity_name}
              onChange={handleChange}
              placeholder="Contoh: Senam aerobik, yoga, zumba"
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Tanggal Booking</label>
              <input
                name="booking_date"
                type="date"
                min={todayIso()}
                value={form.booking_date}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
                <Clock size={14} /> Mulai
              </label>
              <input
                name="start_time"
                type="time"
                value={form.start_time}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Selesai</label>
              <input
                name="end_time"
                type="time"
                value={form.end_time}
                onChange={handleChange}
                className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
              />
            </div>
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <Users size={14} /> Jumlah Peserta
            </label>
            <input
              name="participant_count"
              type="number"
              min="1"
              value={form.participant_count}
              onChange={handleChange}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-gray-700 mb-1.5 flex items-center gap-1.5">
              <MessageSquare size={14} /> Catatan Tambahan
            </label>
            <textarea
              name="notes"
              rows="4"
              value={form.notes}
              onChange={handleChange}
              placeholder="Opsional. Contoh: butuh matras, jumlah instruktur, dll."
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-sage-400 focus:ring-2 focus:ring-sage-100"
            />
          </div>

          <button
            type="submit"
            disabled={saving || loading}
            className="inline-flex w-full sm:w-auto items-center justify-center gap-2 rounded-xl bg-sage-700 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-sage-800 disabled:opacity-60"
          >
            {saving ? 'Mengirim...' : <><CheckCircle2 size={17} /> Ajukan Booking</>}
          </button>
        </form>

        <aside className="space-y-4">
          <div className="rounded-2xl border border-sage-100 bg-white p-5 shadow-sm">
            <p className="text-sm font-bold text-sage-900 mb-1">Info Tanggal</p>
            <p className="text-sm text-gray-500">
              {form.booking_date
                ? format(parseISO(form.booking_date), 'EEEE, d MMMM yyyy', { locale: localeId })
                : 'Pilih tanggal terlebih dahulu'}
            </p>

            {closedInfo ? (
              <div className="mt-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
                <p className="font-semibold">Tempat tutup/libur.</p>
                {closedInfo.reason && <p className="mt-1 text-xs">Alasan: {closedInfo.reason}</p>}
              </div>
            ) : dateBookings.length === 0 ? (
              <div className="mt-4 rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">
                Belum ada booking di tanggal ini. Semua jam masih kosong.
              </div>
            ) : (
              <div className="mt-4 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">Jam yang sudah terisi</p>
                {dateBookings.map(b => (
                  <div key={b.id} className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm">
                    <p className="font-bold text-red-700">{formatTime(b.start_time)} – {formatTime(b.end_time)}</p>
                    <p className="text-xs text-gray-500 truncate">{b.activity_name}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          <AIBookingAssistant compact defaultOpen={false} />

          <div className="rounded-2xl border border-sage-100 bg-sage-50 p-5 text-sm text-sage-800">
            <p className="font-bold mb-1">Catatan</p>
            <p>Booking masuk sebagai <b>Menunggu</b>. Admin bisa menerima atau menolak dari panel admin.</p>
          </div>
        </aside>
      </div>
    </CustomerLayout>
  )
}
