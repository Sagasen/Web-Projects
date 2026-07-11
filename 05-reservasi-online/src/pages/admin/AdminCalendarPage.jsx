// src/pages/admin/AdminCalendarPage.jsx
import { useEffect, useMemo, useState, useCallback } from 'react'
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

// ── Cell desktop: tinggi penuh, tampilkan preview nama kegiatan ──
function CalendarCellDesktop({ date, currentMonth, bookings, closedDates, onClick }) {
  const current = isSameMonth(date, currentMonth)
  const dayBookings = bookings.filter(b => isSameDay(parseISO(b.booking_date), date))
  const activeCount = dayBookings.filter(b => ACTIVE_STATUSES.includes(b.status)).length
  const closed = closedDates.find(d => isSameDay(parseISO(d.closed_date), date))
  const today = isToday(date)

  if (!current) return <div />

  let cls = 'border-gray-200 bg-white hover:border-green-300 hover:bg-green-50'
  if (closed) cls = 'border-gray-200 bg-gray-100 text-gray-400 cursor-default'
  else if (activeCount > 0) cls = 'border-red-200 bg-red-50 hover:border-red-300'
  if (today) cls += ' ring-2 ring-green-600'

  return (
    <button
      onClick={() => onClick(date)}
      className={`min-h-[88px] rounded-2xl border p-2.5 text-left transition w-full ${cls}`}
    >
      <div className="flex items-start justify-between gap-1">
        <span className={`text-sm font-bold ${today ? 'text-green-800' : ''}`}>{format(date, 'd')}</span>
        {closed && <span className="rounded-full bg-gray-200 px-1.5 py-0.5 text-[9px] font-bold text-gray-500">Tutup</span>}
        {!closed && activeCount > 0 && (
          <span className="rounded-full bg-red-100 px-1.5 py-0.5 text-[9px] font-bold text-red-700">{activeCount}×</span>
        )}
      </div>
      <div className="mt-1.5 space-y-1">
        {dayBookings.slice(0, 2).map(b => (
          <p key={b.id} className="truncate rounded bg-white/70 px-1.5 py-0.5 text-[10px] text-gray-600">
            {formatTime(b.start_time)} {b.activity_name}
          </p>
        ))}
        {dayBookings.length > 2 && (
          <p className="text-[10px] text-gray-400">+{dayBookings.length - 2} lainnya</p>
        )}
      </div>
    </button>
  )
}

// ── Cell mobile: compact, hanya angka + dot indikator ──
function CalendarCellMobile({ date, currentMonth, bookings, closedDates, onClick }) {
  const current = isSameMonth(date, currentMonth)
  const dayBookings = bookings.filter(b => isSameDay(parseISO(b.booking_date), date))
  const activeCount = dayBookings.filter(b => ACTIVE_STATUSES.includes(b.status)).length
  const closed = closedDates.find(d => isSameDay(parseISO(d.closed_date), date))
  const today = isToday(date)

  if (!current) return <div />

  let containerCls = 'flex flex-col items-center justify-center rounded-xl border transition cursor-pointer select-none overflow-hidden relative'
  let numCls = 'text-sm font-semibold'

  if (closed) {
    containerCls += ' bg-gray-100 border-gray-200 cursor-default'
    numCls += ' text-gray-400'
  } else if (today) {
    containerCls += ' bg-green-700 border-green-700'
    numCls += ' text-white'
  } else if (activeCount > 0) {
    containerCls += ' bg-red-50 border-red-200 hover:bg-red-100'
    numCls += ' text-red-700'
  } else {
    containerCls += ' bg-white border-gray-200 hover:bg-green-50 hover:border-green-300'
    numCls += ' text-gray-800'
  }

  return (
    <button
      onClick={() => onClick(date)}
      className={containerCls}
      style={{ aspectRatio: '1' }}
    >
      <span className={numCls}>{format(date, 'd')}</span>
      {/* Dot indikator booking */}
      {!closed && activeCount > 0 && (
        <span
          className="mt-0.5 rounded-full"
          style={{
            width: 5, height: 5,
            background: today ? 'white' : '#ef4444',
            display: 'block',
          }}
        />
      )}
      {closed && (
        <span style={{ fontSize: 8, color: '#9ca3af', marginTop: 1 }}>tutup</span>
      )}
    </button>
  )
}

// ── Modal detail hari (dipakai di mobile dan desktop) ──
function DayModal({ date, bookings, closedInfo, onClose, onAddManual, onStatus, isMobile }) {
  if (!date) return null
  const sorted = [...bookings].sort((a, b) => a.start_time.localeCompare(b.start_time))

  return (
    <div
      className={`fixed inset-0 z-50 flex justify-center bg-black/40 ${isMobile ? 'items-end p-0' : 'items-center p-4'}`}
      onClick={onClose}
    >
      <div
        className={`w-full max-w-lg bg-white shadow-xl ${isMobile ? 'rounded-t-2xl' : 'rounded-2xl'}`}
        style={{ maxHeight: '85vh', display: 'flex', flexDirection: 'column' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar mobile */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-gray-300" />
        </div>

        <div className="px-5 pt-3 pb-2 flex items-start justify-between gap-3 border-b border-gray-100">
          <div>
            <h3 className="font-extrabold text-gray-900 text-base">
              {format(date, 'EEEE, d MMMM yyyy', { locale: localeId })}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Detail jadwal</p>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          {closedInfo && (
            <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 text-sm text-gray-600">
              <p className="font-bold">Tempat tutup / libur</p>
              {closedInfo.reason && <p className="text-xs mt-1 text-gray-400">{closedInfo.reason}</p>}
            </div>
          )}

          {sorted.length === 0 ? (
            <div className="rounded-xl border border-dashed border-gray-300 py-10 text-center text-gray-400">
              <CalendarDays size={32} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Belum ada booking.</p>
            </div>
          ) : (
            sorted.map(b => (
              <div key={b.id} className="rounded-xl border border-gray-200 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-gray-900 truncate">{b.activity_name}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {formatTime(b.start_time)} – {formatTime(b.end_time)}
                    </p>
                    <p className="text-xs text-gray-400">
                      {b.customer_name} · {b.participant_count} peserta
                    </p>
                  </div>
                  <StatusBadge status={b.status} />
                </div>
                {b.status === 'pending' && (
                  <div className="mt-3 flex gap-2">
                    <button
                      onClick={() => onStatus(b.id, 'confirmed')}
                      className="flex-1 rounded-lg bg-green-700 py-2 text-xs font-bold text-white hover:bg-green-800"
                    >
                      Terima
                    </button>
                    <button
                      onClick={() => onStatus(b.id, 'rejected')}
                      className="flex-1 rounded-lg bg-red-500 py-2 text-xs font-bold text-white hover:bg-red-600"
                    >
                      Tolak
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {!closedInfo && (
          <div className="px-5 py-4 border-t border-gray-100">
            <button
              onClick={() => onAddManual(date)}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl
                         bg-green-700 px-4 py-3 text-sm font-bold text-white hover:bg-green-800"
            >
              <Plus size={16} /> Tambah Booking Manual
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Form booking manual ──
function ManualBookingForm({ form, setForm, bookings, closedDates, onSubmit, saving, error, onCancel }) {
  const closedInfo = closedDates.find(d => d.closed_date === form.booking_date)
  const conflict = getConflictBooking(bookings, form.booking_date, form.start_time, form.end_time)
  const inp = 'w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100'

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-extrabold text-gray-900">Booking Manual</h2>
          <p className="text-xs text-gray-500 mt-0.5">Untuk customer yang booking lewat chat/telepon.</p>
        </div>
        <button type="button" onClick={onCancel} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100">
          <X size={18} />
        </button>
      </div>

      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-gray-700">
            <UserRound size={13} /> Nama Customer
          </label>
          <input value={form.customer_name}
            onChange={e => setForm(p => ({ ...p, customer_name: e.target.value }))}
            className={inp} placeholder="Nama lengkap" />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nomor WhatsApp</label>
          <input value={form.customer_phone}
            onChange={e => setForm(p => ({ ...p, customer_phone: e.target.value }))}
            className={inp} placeholder="08xxxxxxxxxx" />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Nama Kegiatan</label>
        <input value={form.activity_name}
          onChange={e => setForm(p => ({ ...p, activity_name: e.target.value }))}
          className={inp} placeholder="Senam aerobik / yoga / zumba" />
      </div>

      <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
        <div className="col-span-2">
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tanggal</label>
          <input type="date" value={form.booking_date}
            onChange={e => setForm(p => ({ ...p, booking_date: e.target.value }))}
            className={inp} />
        </div>
        <div>
          <label className="mb-1.5 flex items-center gap-1 text-sm font-semibold text-gray-700">
            <Clock size={13} /> Mulai
          </label>
          <input type="time" value={form.start_time}
            onChange={e => setForm(p => ({ ...p, start_time: e.target.value }))}
            className={inp} />
        </div>
        <div>
          <label className="mb-1.5 block text-sm font-semibold text-gray-700">Selesai</label>
          <input type="time" value={form.end_time}
            onChange={e => setForm(p => ({ ...p, end_time: e.target.value }))}
            className={inp} />
        </div>
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Jumlah Peserta</label>
        <input type="number" min="1" value={form.participant_count}
          onChange={e => setForm(p => ({ ...p, participant_count: e.target.value }))}
          className={inp} />
      </div>

      <div>
        <label className="mb-1.5 block text-sm font-semibold text-gray-700">Catatan</label>
        <textarea rows="2" value={form.notes}
          onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
          className={inp + ' resize-none'} />
      </div>

      {closedInfo && (
        <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Tanggal ini sedang tutup/libur.
        </div>
      )}
      {conflict && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          Bentrok dengan {formatTime(conflict.start_time)} – {formatTime(conflict.end_time)}.
        </div>
      )}

      <button
        disabled={saving}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl
                   bg-green-700 px-4 py-2.5 text-sm font-bold text-white
                   hover:bg-green-800 disabled:opacity-60"
      >
        <Plus size={16} /> {saving ? 'Menyimpan...' : 'Simpan Booking Manual'}
      </button>
    </form>
  )
}

// ── Main ──
// Hook deteksi mobile via JS (tidak bergantung Tailwind purge)
function useIsMobile(breakpoint = 640) {
  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth < breakpoint : false
  )
  useEffect(() => {
    const handler = () => setIsMobile(window.innerWidth < breakpoint)
    window.addEventListener('resize', handler)
    return () => window.removeEventListener('resize', handler)
  }, [breakpoint])
  return isMobile
}

export default function AdminCalendarPage() {
  const isMobile = useIsMobile(640)

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [bookings, setBookings]         = useState([])
  const [closedDates, setClosedDates]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [selectedDate, setSelectedDate] = useState(null)
  const [manualOpen, setManualOpen]     = useState(false)
  const [manualForm, setManualForm]     = useState(emptyForm())
  const [manualError, setManualError]   = useState('')
  const [saving, setSaving]             = useState(false)

  const monthStart  = startOfMonth(currentMonth)
  const monthEnd    = endOfMonth(currentMonth)
  const days        = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startOffset = (getDay(monthStart) + 6) % 7

  async function fetchData() {
    setLoading(true)
    const monthStartIso = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
    const monthEndIso   = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

    const [{ data: bData, error: bError }, { data: cData, error: cError }] = await Promise.all([
      supabase
        .from('bookings')
        .select('*')
        .gte('booking_date', monthStartIso)
        .lte('booking_date', monthEndIso)
        .order('booking_date', { ascending: true })
        .order('start_time',   { ascending: true }),
      supabase
        .from('closed_dates')
        .select('*')
        .gte('closed_date', monthStartIso)
        .lte('closed_date', monthEndIso),
    ])

    if (bError || cError) console.error('Gagal memuat kalender admin:', bError || cError)
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
    const conflict   = getConflictBooking(bookings, manualForm.booking_date, manualForm.start_time, manualForm.end_time)
    if (!manualForm.customer_name.trim())  return 'Nama customer wajib diisi.'
    if (!manualForm.customer_phone.trim()) return 'Nomor WhatsApp wajib diisi.'
    if (!manualForm.activity_name.trim())  return 'Nama kegiatan wajib diisi.'
    if (!manualForm.booking_date)          return 'Tanggal wajib diisi.'
    if (closedInfo)                        return 'Tanggal ini sedang tutup/libur.'
    if (manualForm.end_time <= manualForm.start_time) return 'Jam selesai harus lebih besar dari jam mulai.'
    if (Number(manualForm.participant_count) < 1)     return 'Jumlah peserta minimal 1.'
    if (conflict) return `Jam bentrok dengan ${formatTime(conflict.start_time)} – ${formatTime(conflict.end_time)}.`
    return null
  }

  async function handleManualSubmit(e) {
    e.preventDefault()
    const validation = validateManual()
    if (validation) { setManualError(validation); return }

    setSaving(true)
    setManualError('')

    const { error } = await supabase.from('bookings').insert({
      customer_id       : null,
      customer_name     : manualForm.customer_name.trim(),
      customer_phone    : manualForm.customer_phone.trim(),
      activity_name     : manualForm.activity_name.trim(),
      participant_count : Number(manualForm.participant_count),
      notes             : manualForm.notes.trim() || null,
      booking_date      : manualForm.booking_date,
      start_time        : manualForm.start_time,
      end_time          : manualForm.end_time,
      status            : 'confirmed',
    })

    setSaving(false)
    if (error) { setManualError(normalizeSupabaseError(error)); return }

    setManualOpen(false)
    setManualForm(emptyForm())
    fetchData()
  }

  async function handleStatus(id, status) {
    const { error } = await supabase.from('bookings').update({ status }).eq('id', id)
    if (error) { alert(normalizeSupabaseError(error)); return }
    setBookings(prev => prev.map(b => b.id === id ? { ...b, status } : b))
    setSelectedDate(null)
  }

  // Grid kalender — shared antara mobile & desktop
  const CalendarGrid = ({ isMobile }) => (
    <div className={`grid grid-cols-7 ${isMobile ? 'gap-1' : 'gap-2'}`}>
      {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
      {days.map(day =>
        isMobile ? (
          <CalendarCellMobile
            key={day.toISOString()}
            date={day}
            currentMonth={currentMonth}
            bookings={bookings}
            closedDates={closedDates}
            onClick={setSelectedDate}
          />
        ) : (
          <CalendarCellDesktop
            key={day.toISOString()}
            date={day}
            currentMonth={currentMonth}
            bookings={bookings}
            closedDates={closedDates}
            onClick={setSelectedDate}
          />
        )
      )}
    </div>
  )

  return (
    <AdminLayout>
      {/* Header */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-gray-900">Kalender Admin</h1>
          <p className="text-sm text-gray-500 mt-0.5">Lihat booking per tanggal dan tambah booking manual.</p>
        </div>
        <button
          onClick={() => openManual(new Date())}
          className="inline-flex items-center justify-center gap-2 rounded-xl
                     bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800 w-full sm:w-auto"
        >
          <Plus size={16} /> Tambah Booking Manual
        </button>
      </div>

      <div className={`grid gap-5 ${manualOpen ? 'xl:grid-cols-[1fr_420px]' : ''}`}>

        {/* Kalender card */}
        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          {/* Nav bulan */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, -1))}
              className="rounded-xl p-2 text-green-700 hover:bg-green-50"
            >
              <ChevronLeft size={20} />
            </button>
            <h2 className="text-base font-extrabold text-gray-900">
              {format(currentMonth, 'MMMM yyyy', { locale: localeId })}
            </h2>
            <button
              onClick={() => setCurrentMonth(m => addMonths(m, 1))}
              className="rounded-xl p-2 text-green-700 hover:bg-green-50"
            >
              <ChevronRight size={20} />
            </button>
          </div>

          {/* Header hari */}
          <div className="grid grid-cols-7 border-b border-gray-100 px-3 py-2">
            {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d => (
              <div key={d} className="text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">
                {d}
              </div>
            ))}
          </div>

          {/* Grid — mobile compact, desktop full */}
          <div className="p-3">
            {loading ? (
              <div className="grid grid-cols-7 gap-1 animate-pulse">
                {Array.from({ length: 35 }).map((_, i) => (
                  <div key={i} className="aspect-square rounded-xl bg-gray-200" />
                ))}
              </div>
            ) : (
              <CalendarGrid isMobile={isMobile} />
            )}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap items-center gap-3 border-t border-gray-100 px-4 py-3 text-xs text-gray-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-red-100 border border-red-200" />
              Ada booking
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-gray-200" />
              Tutup
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-3 h-3 rounded-full bg-green-700" />
              Hari ini
            </span>
          </div>
        </div>

        {/* Form manual booking (muncul di sebelah kanan di desktop, di bawah di mobile) */}
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

      {/* Modal detail hari — bottom sheet di mobile, center di desktop */}
      {selectedDate && (
        <DayModal
          date={selectedDate}
          bookings={selectedBookings}
          closedInfo={selectedClosedInfo}
          onClose={() => setSelectedDate(null)}
          onAddManual={openManual}
          onStatus={handleStatus}
          isMobile={isMobile}
        />
      )}
    </AdminLayout>
  )
}
