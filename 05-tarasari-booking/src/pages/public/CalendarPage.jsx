// src/pages/public/CalendarPage.jsx
import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  getDay, isSameMonth, isToday, parseISO, isSameDay
} from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { ChevronLeft, ChevronRight, Clock, X, CalendarDays } from 'lucide-react'
import { supabase } from '../../lib/supabaseClient'
import { useAuth } from '../../lib/AuthContext'
import PublicLayout from '../../components/layout/PublicLayout'
import AIBookingAssistant from '../../components/ai/AIBookingAssistant'

function CalendarDay({ date, bookings, closedDates, currentMonth, onSelect }) {
  const isCurrentMonth = isSameMonth(date, currentMonth)
  const isClosed = closedDates.some(d => isSameDay(parseISO(d.closed_date), date))
  const dayBookings = bookings.filter(b => isSameDay(parseISO(b.booking_date), date))
  const hasBooking = dayBookings.length > 0
  const today = isToday(date)

  if (!isCurrentMonth) {
    return <div />
  }

  let bg = 'white'
  let textColor = '#1f2937'
  let border = '1px solid transparent'

  if (isClosed) {
    bg = '#f3f4f6'
    textColor = '#9ca3af'
  } else if (hasBooking) {
    // Booking harus tetap terlihat merah walaupun tanggalnya adalah hari ini.
    bg = '#fee2e2'
    textColor = '#b91c1c'
    border = '2px solid #ef4444'
  } else if (today) {
    bg = '#edf7e6'
    textColor = '#315733'
    border = '2px solid #3d6e3f'
  }

  return (
    <button
      onClick={() => onSelect(date, dayBookings, isClosed)}
      className="transition hover:opacity-80"
      style={{
        aspectRatio: '1',
        borderRadius: '10px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-start',
        paddingTop: '6px',
        background: bg,
        border,
        cursor: 'pointer',
        fontSize: '13px',
        fontWeight: today ? '600' : '400',
        color: textColor,
      }}
    >
      <span>{format(date, 'd')}</span>
      {hasBooking && (
        <span style={{ fontSize: '9px', color: '#ef4444', marginTop: '1px' }}>
          {dayBookings.length}×
        </span>
      )}
      {isClosed && (
        <span style={{ fontSize: '9px', color: '#9ca3af', marginTop: '1px' }}>tutup</span>
      )}
    </button>
  )
}

function DayDetailModal({ date, bookings, isClosed, onClose, onBook }) {
  if (!date) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
         style={{ background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6"
           onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">
            {format(date, 'EEEE, d MMMM yyyy', { locale: localeId })}
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {isClosed ? (
          <div className="text-center py-6">
            <p className="text-gray-500 font-medium">Tempat tutup / libur</p>
            <p className="text-sm text-gray-400 mt-1">Tidak bisa booking di tanggal ini.</p>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-6">
            <CalendarDays size={32} className="text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500">Belum ada booking di tanggal ini.</p>
            <p className="text-sm text-gray-400 mt-1">Semua jam masih kosong!</p>
          </div>
        ) : (
          <div className="space-y-2 mb-4">
            <p className="text-xs text-gray-400 mb-2">Jam yang sudah terisi:</p>
            {bookings
              .sort((a, b) => a.start_time.localeCompare(b.start_time))
              .map(b => (
                <div key={b.id} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm"
                     style={{ background: '#fef2f2', border: '1px solid #fecaca' }}>
                  <Clock size={13} className="text-red-400 shrink-0" />
                  <span className="font-medium text-red-700">
                    {b.start_time.slice(0,5)} – {b.end_time.slice(0,5)}
                  </span>
                  <span className="text-gray-500 text-xs truncate">{b.activity_name}</span>
                </div>
              ))
            }
            <p className="text-xs text-gray-400 mt-2">
              * Merah bukan berarti penuh — kamu tetap bisa booking di jam yang kosong.
            </p>
          </div>
        )}

        {!isClosed && (
          <button onClick={() => onBook(date)} className="w-full text-white font-medium py-2.5 rounded-xl transition text-sm"
                  style={{ background: '#3d6e3f' }}>
            Booking Sekarang
          </button>
        )}
      </div>
    </div>
  )
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { isLoggedIn } = useAuth()

  const [currentMonth, setCurrentMonth] = useState(new Date())
  const [bookings, setBookings]         = useState([])
  const [closedDates, setClosedDates]   = useState([])
  const [loading, setLoading]           = useState(true)
  const [fetchError, setFetchError]     = useState('')
  const [selected, setSelected]         = useState(null)

  const errorMessage = location.state?.errorMessage

  useEffect(() => {
    async function fetchData() {
      setLoading(true)
      setFetchError('')

      // Jangan pakai `${yyyy-MM}-31`, karena bulan seperti Juni cuma sampai tanggal 30.
      // Nilai 2026-06-31 membuat query Supabase error sehingga tanggal booking tidak muncul merah.
      const monthStartIso = format(startOfMonth(currentMonth), 'yyyy-MM-dd')
      const monthEndIso   = format(endOfMonth(currentMonth), 'yyyy-MM-dd')

      const [{ data: bData, error: bError }, { data: cData, error: cError }] = await Promise.all([
        supabase.from('bookings_public').select('*')
          .gte('booking_date', monthStartIso)
          .lte('booking_date', monthEndIso),
        supabase.from('closed_dates').select('closed_date, reason')
          .gte('closed_date', monthStartIso)
          .lte('closed_date', monthEndIso),
      ])

      if (bError || cError) {
        console.error('Gagal memuat kalender:', bError || cError)
        setFetchError('Gagal memuat data kalender. Coba refresh halaman atau cek view bookings_public di Supabase.')
      }

      setBookings(bData || [])
      setClosedDates(cData || [])
      setLoading(false)
    }
    fetchData()
  }, [currentMonth])

  const monthStart  = startOfMonth(currentMonth)
  const monthEnd    = endOfMonth(currentMonth)
  const days        = eachDayOfInterval({ start: monthStart, end: monthEnd })
  const startOffset = (getDay(monthStart) + 6) % 7

  function handleBook(date = null) {
    setSelected(null)

    // Saat dipakai sebagai onClick button, React mengirim event.
    // Jadi pastikan hanya Date yang diformat, bukan event klik.
    const validDate = date instanceof Date && !Number.isNaN(date.getTime()) ? date : null
    const query = validDate ? `?date=${format(validDate, 'yyyy-MM-dd')}` : ''
    const bookingPath = `/dashboard/booking${query}`

    navigate(isLoggedIn ? bookingPath : '/login',
      isLoggedIn ? {} : { state: { from: { pathname: bookingPath } } })
  }

  return (
    <PublicLayout>
      <div className="max-w-2xl mx-auto px-4 py-8">

        {errorMessage && (
          <div className="rounded-xl px-4 py-3 mb-6 text-sm"
               style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c' }}>
            {errorMessage}
          </div>
        )}

        {fetchError && (
          <div className="rounded-xl px-4 py-3 mb-6 text-sm"
               style={{ background: '#fff7ed', border: '1px solid #fed7aa', color: '#c2410c' }}>
            {fetchError}
          </div>
        )}

        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Kalender Booking</h1>
          <p className="text-sm text-gray-500 mt-1">Klik tanggal untuk melihat jam yang sudah terisi</p>
        </div>

        {/* Legend */}
        <div className="flex items-center justify-center gap-5 mb-6 flex-wrap" style={{ fontSize: '12px', color: '#6b7280' }}>
          <span className="flex items-center gap-1.5">
            <span style={{ width:12, height:12, borderRadius:4, background:'white', border:'1px solid #d1d5db', display:'inline-block' }} />
            Kosong
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width:12, height:12, borderRadius:4, background:'#fef2f2', display:'inline-block' }} />
            Ada booking
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width:12, height:12, borderRadius:4, background:'#f3f4f6', display:'inline-block' }} />
            Tutup
          </span>
          <span className="flex items-center gap-1.5">
            <span style={{ width:12, height:12, borderRadius:4, background:'#edf7e6', border:'2px solid #3d6e3f', display:'inline-block' }} />
            Hari ini
          </span>
        </div>

        {/* Calendar card */}
        <div className="bg-white rounded-2xl p-5" style={{ border: '1px solid #d4e6c3', boxShadow: '0 1px 4px rgba(61,110,63,0.08)' }}>

          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() - 1))}
              className="p-2 rounded-lg transition hover:bg-green-50"
              style={{ color: '#3d6e3f' }}
            >
              <ChevronLeft size={18} />
            </button>
            <h2 className="font-semibold text-gray-800">
              {format(currentMonth, 'MMMM yyyy', { locale: localeId })}
            </h2>
            <button
              onClick={() => setCurrentMonth(m => new Date(m.getFullYear(), m.getMonth() + 1))}
              className="p-2 rounded-lg transition hover:bg-green-50"
              style={{ color: '#3d6e3f' }}
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {/* Day headers */}
          <div className="grid grid-cols-7 mb-2">
            {['Sen','Sel','Rab','Kam','Jum','Sab','Min'].map(d => (
              <div key={d} className="text-center py-1" style={{ fontSize: '12px', fontWeight: '500', color: '#528854' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: 35 }).map((_, i) => (
                <div key={i} style={{ aspectRatio:'1', borderRadius:10, background:'#f3f4f6' }} className="animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {Array.from({ length: startOffset }).map((_, i) => <div key={`e${i}`} />)}
              {days.map(day => (
                <CalendarDay
                  key={day.toISOString()}
                  date={day}
                  bookings={bookings}
                  closedDates={closedDates}
                  currentMonth={currentMonth}
                  onSelect={(date, b, closed) => setSelected({ date, bookings: b, isClosed: closed })}
                />
              ))}
            </div>
          )}
        </div>

        <div className="mt-6">
          <AIBookingAssistant />
        </div>

        {/* CTA */}
        <div className="text-center mt-6">
          <button onClick={() => handleBook()}
            className="text-white font-medium px-8 py-3 rounded-xl transition text-sm"
            style={{ background: '#3d6e3f', boxShadow: '0 2px 6px rgba(61,110,63,0.3)' }}
            onMouseOver={e => e.currentTarget.style.background = '#315733'}
            onMouseOut={e => e.currentTarget.style.background = '#3d6e3f'}
          >
            Booking Sekarang
          </button>
          {!isLoggedIn && (
            <p className="text-xs text-gray-400 mt-2">Kamu perlu login untuk mengajukan booking</p>
          )}
        </div>
      </div>

      {selected && (
        <DayDetailModal
          date={selected.date}
          bookings={selected.bookings}
          isClosed={selected.isClosed}
          onClose={() => setSelected(null)}
          onBook={handleBook}
        />
      )}
    </PublicLayout>
  )
}
