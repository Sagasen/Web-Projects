// src/pages/admin/AdminCalendarPage.jsx
import { useEffect, useMemo, useState } from 'react'
import {
  addMonths, eachDayOfInterval, endOfMonth, format, getDay,
  isSameDay, isSameMonth, isToday, parseISO, startOfMonth
} from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CalendarDays, ChevronLeft, ChevronRight, Clock, Plus, UserRound, X } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../lib/supabaseClient'
import { ACTIVE_STATUSES, formatTime, getConflictBooking, normalizeSupabaseError, StatusBadge } from '../../lib/bookingUtils'

const todayIso = () => new Date().toISOString().slice(0, 10)
const emptyForm = (date = todayIso()) => ({
  customer_name: '',
  customer_phone: '',
  activity_name: '',
  participant_count: 1,
  booking_date: date,
  start_time: '08:00',
  end_time: '09:00',
  notes: '',
})

function CalendarCell({ date, currentMonth, bookings, closedDates, onClick }) {
  const current = isSameMonth(date, currentMonth)
  const dayBookings = bookings.filter(b => isSameDay(parseISO(b.booking_date), date))
  const activeCount = dayBookings.filter(b => ACTIVE_STATUSES.includes(b.status)).length
  const closed = closedDates.find(d => isSameDay(parseISO(d.closed_date), date))
  const today = isToday(date)

  if (!current) return <div />

  let className = 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
  if (closed) className = 'border-gray-200 bg-gray-100 text-gray-400'
  else if (activeCount > 0) className = 'border-red-200 bg-red-50 hover:border-red-300'
  if (today) className += ' ring-2 ring-green-600'

  return (
    <button
      onClick={() => onClick(date)}
      className={`min-h-[92px] rounded-2xl border p-3 text-left transition ${className}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-sm font-bold ${today ? 'text-green-800' : ''}`}>{format(date, 'd')}</span>
        {closed && <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-bold text-gray-500">Tutup</span>}
        {!closed && activeCount > 0 && <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-bold text-red-700">{activeCount}×</span>}
      </div>
      <div className="mt-2 space-y-1">
        {dayBookings.slice(0, 2).map(b => (
          <p key={b.id} className="truncate rounded-lg bg-white/70 px-2 py-1 text-[11px] text-gray-600">
            {formatTime(b.start_time)} {b.activity_name}
          </p>
        ))}
        {dayBookings.length > 2 && <p className="text-[11px] text-gray-400">+{dayBookings.length - 2} lainnya</p>}
      </div>
    </button>
  )
}

function DayModal({ date, bookings, closedInfo, onClose, onAddManual, onStatus }) {
  if (!date) return null
  const sorted = [...bookings].sort((a, b) => a.start_time.localeCompare(b.start_time))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-white p-5 shadow-xl" onClick={e => e.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h3 className="font-extrabold text-gray-900">{format(date, 'EEEE, d MMMM yyyy', { locale: localeId })}</h3>
            <p className="text-sm text-gray-500">Detail jadwal pada tanggal ini</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-700"><X size={18} /></button>
        </div>

        {closedInfo && (
          <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
            <p className="font-bold">Tempat tutup/libur</p>
            {closedInfo.reason && <p className="text-xs mt-1">{closedInfo.reason}</p>}
          </div>
        )}

        {sorted.length === 0 ? (
          <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-gray-400">
            <CalendarDays size={36} className="mx-auto mb-2 opacity-50" />
            <p className="text-sm">Belum ada booking.</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
            {sorted.map(b => (
              <div key={b.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-gray-900">{b.activity_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTime(b.start_time)} – {formatTime(b.end_time)} · {b.customer_name} · {b.participant_count} peserta
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                {b.status === 'pending' && (
                  <div className="mt-3 flex gap-1.5">
                    <button onClick={() => onStatus(b.id, 'confirmed')} className="rounded-lg bg-green-700 px-3 py-1.5 text-xs font-bold text-white hover:bg-green-800">Terima</button>
                    <button onClick={() => onStatus(b.id, 'rejected')} className="rounded-lg bg-red-500 px-3 py-1.5 text-xs font-bold text-white hover:bg-red-600">Tolak</button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {!closedInfo && (
          <button onClick={() => onAddManual(date)} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800">
            <Plus size={16} /> Tambah Booking Manual
          </button>
        )}
      </div>
    </div>
  )
}

function ManualBookingForm({ form, setForm, bookings, closedDates, onSubmit, saving, error, onCancel }) {
  const closedInfo = closedDates.find(d => d.closed_date === form.booking_date)
  const conflict = getConflictBooking(bookings, form.booking_date, form.start_time, form.end_time)

  return (
    <form onSubmit={onSubmit} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-gray-900">Booking Manual Admin</h2>
          <p className="text-xs text-gray-500 mt-0.5">Untuk customer yang booking lewat chat/telepon.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100"><X size={18} /></button>
      </div>

      {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700"><UserRound size={14} /> Nama Customer</label>
          <input value={form.customer_name} onChange={e => setForm(prev => ({ ...prev, customer_name: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nomor WhatsApp</label>
          <input value={form.customer_phone} onChange={e => setForm(prev => ({ ...prev, customer_phone: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nama Kegiatan</label>
        <input value={form.activity_name} onChange={e => setForm(prev => ({ ...prev, activity_name: e.target.value }))} placeholder="Senam aerobik / yoga / zumba" className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="sm:col-span-2">
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tanggal</label>
          <input type="date" value={form.booking_date} onChange={e => setForm(prev => ({ ...prev, booking_date: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-gray-700"><Clock size={14} /> Mulai</label>
          <input type="time" value={form.start_time} onChange={e => setForm(prev => ({ ...prev, start_time: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Selesai</label>
          <input type="time" value={form.end_time} onChange={e => setForm(prev => ({ ...prev, end_time: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Jumlah Peserta</label>
        <input type="number" min="1" value={form.participant_count} onChange={e => setForm(prev => ({ ...prev, participant_count: e.target.value }))} className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Catatan</label>
        <textarea rows="3" value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
      </div>

      {closedInfo && <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">Tanggal ini sedang tutup/libur. Hapus jadwal tutup dulu kalau ingin menerima booking.</div>}
      {conflict && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">Bentrok dengan {formatTime(conflict.start_time)} – {formatTime(conflict.end_time)}.</div>}

      <button disabled={saving} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60">
        <Plus size={16} /> {saving ? 'Menyimpan...' : 'Simpan Booking Manual'}
      </button>
    </form>
  )
}

export default function AdminCalendarPage() {
  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [bookings, setBookings] = useState([])
  const [closedDates, setClosedDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [manualOpen, setManualOpen] = useState(false)
  const [manualForm, setManualForm] = useState(emptyForm())
  const [manualError, setManualError] = useState('')
  const [saving, setSaving] = useState(false)

  const monthStart = startOfMonth(currentMonth)
  const monthEnd = endOfMonth(currentMonth)
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startOffset = (getDay(monthStart) + 6) % 7

  async function fetchData() {
    setLoading(true)

    // Pakai tanggal akhir bulan asli. Jangan pakai tanggal 31 untuk semua bulan.
    const monthStartIso = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const monthEndIso   = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

    const [{ data: bData, error: bError }, { data: cData, error: cError }] = await Promise.all([
      supabase
        .from('bookings')
        .select('*')
        .gte('booking_date', monthStartIso)
        .lte('booking_date', monthEndIso)
        .order('booking_date', { ascending: true })
        .order('start_time', { ascending: true }),
      supabase
        .from('closed_dates')
        .select('*')
        .gte('closed_date', monthStartIso)
        .lte('closed_date', monthEndIso),
    ])

    if (bError || cError) {
      console.error('Gagal memuat kalender admin:', bError || cError)
    }

    setBookings(bData || [])
    setClosedDates(cData || [])
    setLoading(false)
  }

  useEffect(() => { fetchData() }, [currentMonth])

  const selectedBookings = useMemo(() => {
    if (!selectedDate) return []
    return bookings.filter(b => isSameDay(parseISO(b.booking_date), selectedDate))
  }, [bookings, selectedDate])

  const selectedClosedInfo = selectedDate
    ? closedDates.find(d => isSameDay(parseISO(d.closed_date), selectedDate))
    : null

  function openManual(date = selectedDate || new Date()) {
    const dateString = format(date, 'yyyy-MM-dd')
    setManualForm(emptyForm(dateString))
    setManualError('')
    setManualOpen(true)
    setSelectedDate(null)
  }

  function validateManual() {
    const closedInfo = closedDates.find(d => d.closed_date === manualForm.booking_date)
    const conflict = getConflictBooking(bookings, manualForm.booking_date, manualForm.start_time, manualForm.end_time)

    if (!manualForm.customer_name.trim()) return 'Nama customer wajib diisi.'
    if (!manualForm.customer_phone.trim()) return 'Nomor WhatsApp wajib diisi.'
    if (!manualForm.activity_name.trim()) return 'Nama kegiatan wajib diisi.'
    if (!manualForm.booking_date) return 'Tanggal wajib diisi.'
    if (closedInfo) return 'Tanggal ini sedang tutup/libur.'
    if (manualForm.end_time <= manualForm.start_time) return 'Jam selesai harus lebih besar dari jam mulai.'
    if (Number(manualForm.participant_count) < 1) return 'Jumlah peserta minimal 1.'
    if (conflict) return `Jam bentrok dengan ${formatTime(conflict.start_time)} – ${formatTime(conflict.end_time)}.`
    return null
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    const validation = validateManual()
    if (validation) {
      setManualError(validation)
      return
    }

    setSaving(true)
    setManualError('')
    const payload = {
      customer_id: null,
      customer_name: manualForm.customer_name.trim(),
      customer_phone: manualForm.customer_phone.trim(),
      activity_name: manualForm.activity_name.trim(),
      participant_count: Number(manualForm.participant_count),
      notes: manualForm.notes.trim() || null,
      booking_date: manualForm.booking_date,
      start_time: manualForm.start_time,
      end_time: manualForm.end_time,
      status: 'confirmed',
    }

    const { error } = await supabase.from('bookings').insert(payload)
    setSaving(false)

    if (error) {
      setManualError(normalizeSupabaseError(error))
      return
    }

    setManualOpen(false)
    setManualForm(emptyForm())
    fetchData()
  }

  async function handleStatus(id, status) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) {
      alert(normalizeSupabaseError(error))
      return
    }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
  }

  return (
    <AdminLayout>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">Kalender Admin</h1>
          <p className="text-sm text-gray-500 mt-1">
            Lihat booking per tanggal dan tambahkan booking manual dari admin.
          </p>
        </div>
        <button onClick={() => openManual(new Date())} className="inline-flex items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800">
          <Plus size={16} /> Tambah Booking Manual
        </button>
      </div>

      <div className={`grid gap-6 ${manualOpen ? 'xl:grid-cols-[1fr_420px]' : ''}`}>
        <div className="rounded-2xl border border-gray-200 bg-white p-4 sm:p-5 shadow-sm">
          <div className="mb-5 flex items-center justify-between">
            <button onClick={() => setCurrentMonth(m => addMonths(m, -1))} className="rounded-xl p-2 text-green-700 hover:bg-green-50"><ChevronLeft size={20} /></button>
            <h2 className="text-lg font-extrabold text-gray-900">{format(currentMonth, 'MMMM yyyy', { locale: localeId })}</h2>
            <button onClick={() => setCurrentMonth(m => addMonths(m, 1))} className="rounded-xl p-2 text-green-700 hover:bg-green-50"><ChevronRight size={20} /></button>
          </div>

          <div className="mb-3 grid grid-cols-7 gap-2 text-center text-xs font-bold uppercase tracking-wide text-gray-400">
            {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(day => <div key={day}>{day}</div>)}
          </div>

          {loading ? (
            <div className="grid grid-cols-7 gap-2 animate-pulse">
              {Array.from({ length: 35 }).map((_, i) => <div key={i} className="h-[92px] rounded-2xl bg-gray-200" />)}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-2">
              {Array.from({ length: startOffset }).map((_, i) => <div key={`empty-${i}`} />)}
              {days.map(day => (
                <CalendarCell
                  key={day.toISOString()}
                  date={day}
                  currentMonth={currentMonth}
                  bookings={bookings}
                  closedDates={closedDates}
                  onClick={setSelectedDate}
                />
              ))}
            </div>
          )}
        </div>

        {manualOpen && (
          <ManualBookingForm
            form={manualForm}
            setForm={setManualForm}
            bookings={bookings}
            closedDates={closedDates}
            onSubmit={handleManualSubmit}
            saving={saving}
            error={manualError}
            onCancel={() => setManualOpen(false)}
          />
        )}
      </div>

      {selectedDate && (
        <DayModal
          date={selectedDate}
          bookings={selectedBookings}
          closedInfo={selectedClosedInfo}
          onClose={() => setSelectedDate(null)}
          onAddManual={openManual}
          onStatus={handleStatus}
        />
      )}
    </AdminLayout>
  )
}
