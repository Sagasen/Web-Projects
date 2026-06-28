import { useEffect, useMemo, useRef, useState } from 'react'
import { Bot, CalendarCheck2, Loader2, SendHorizonal, Sparkles, Wand2 } from 'lucide-react'
import { addDays, format } from 'date-fns'
import { supabase } from '../../lib/supabaseClient'
import { buildBookingSearchParams, createAIBookingReply } from '../../lib/aiBookingAgent'
import { useAuth } from '../../lib/AuthContext'
import { useNavigate } from 'react-router-dom'

const EXAMPLES = [
  'Ada jadwal Zumba?',
  'Besok jam 4 sore kosong nggak?',
  'Cari jadwal kosong minggu ini',
  'Aku mau booking Sabtu jam 15.00 untuk 10 orang',
]

function todayIso() {
  return format(new Date(), 'yyyy-MM-dd')
}

function nextRangeIso() {
  return format(addDays(new Date(), 60), 'yyyy-MM-dd')
}

export default function AIBookingAssistant({ compact = false, defaultOpen = true }) {
  const navigate = useNavigate()
  const { isLoggedIn } = useAuth()
  const bottomRef = useRef(null)

  const [open, setOpen] = useState(defaultOpen)
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(true)
  const [thinking, setThinking] = useState(false)
  const [bookings, setBookings] = useState([])
  const [closedDates, setClosedDates] = useState([])
  const [error, setError] = useState('')
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      content: 'Halo, aku AI Booking Assistant Tarasari. Aku bisa cek jadwal kosong, deteksi bentrok, dan bantu isi form booking.',
      actions: [],
    },
  ])

  useEffect(() => {
    let alive = true

    async function fetchSchedule() {
      setLoading(true)
      setError('')

      const [{ data: bookingData, error: bookingError }, { data: closedData, error: closedError }] = await Promise.all([
        supabase
          .from('bookings_public')
          .select('*')
          .gte('booking_date', todayIso())
          .lte('booking_date', nextRangeIso()),
        supabase
          .from('closed_dates')
          .select('closed_date, reason')
          .gte('closed_date', todayIso())
          .lte('closed_date', nextRangeIso()),
      ])

      if (!alive) return

      if (bookingError || closedError) {
        console.error('Gagal memuat data AI assistant:', bookingError || closedError)
        setError('AI belum bisa membaca jadwal. Coba refresh halaman.')
      } else {
        setBookings(bookingData || [])
        setClosedDates(closedData || [])
      }

      setLoading(false)
    }

    fetchSchedule()
    return () => { alive = false }
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, thinking])

  const helperText = useMemo(() => {
    if (loading) return 'Lagi membaca jadwal Tarasari...'
    if (error) return error
    return `${bookings.length} booking aktif terbaca • ${closedDates.length} tanggal tutup`
  }, [bookings.length, closedDates.length, error, loading])

  function runAgent(text) {
    if (!text.trim()) return

    const userText = text.trim()
    setMessage('')
    setMessages(prev => [...prev, { role: 'user', content: userText, actions: [] }])
    setThinking(true)

    window.setTimeout(() => {
      const reply = createAIBookingReply(userText, bookings, closedDates)
      setMessages(prev => [...prev, { role: 'assistant', ...reply }])
      setThinking(false)
    }, 250)
  }

  function handleSubmit(e) {
    e.preventDefault()
    if (loading || thinking) return
    runAgent(message)
  }

  function handleAction(action) {
    const search = buildBookingSearchParams(action)
    const pathname = '/dashboard/booking'
    const target = `${pathname}${search ? `?${search}` : ''}`

    if (isLoggedIn) {
      navigate(target)
      return
    }

    navigate('/login', {
      state: { from: { pathname, search: search ? `?${search}` : '' } },
    })
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-2xl bg-sage-700 px-4 py-3 text-sm font-bold text-white shadow-lg transition hover:bg-sage-800"
      >
        <Sparkles size={17} /> Tanya AI Jadwal
      </button>
    )
  }

  return (
    <section className={`rounded-3xl border border-sage-100 bg-white shadow-sm ${compact ? 'p-4' : 'p-5'}`}>
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-sage-700 text-white shadow-sm">
            <Bot size={20} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-extrabold text-sage-900">AI Booking Assistant</h2>
              <span className="rounded-full bg-sage-50 px-2 py-0.5 text-[11px] font-bold text-sage-700 border border-sage-100">
                Agentic
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-1">{helperText}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="text-xs font-semibold text-gray-400 hover:text-sage-700"
        >
          Tutup
        </button>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-gradient-to-b from-sage-50/70 to-white p-3">
        <div className={`${compact ? 'max-h-64' : 'max-h-80'} overflow-y-auto pr-1 space-y-3`}>
          {messages.map((item, index) => (
            <div key={`${item.role}-${index}`} className={item.role === 'user' ? 'text-right' : 'text-left'}>
              <div
                className={`inline-block max-w-[92%] whitespace-pre-line rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                  item.role === 'user'
                    ? 'bg-sage-700 text-white rounded-br-md'
                    : 'bg-white text-gray-700 border border-sage-100 rounded-bl-md shadow-sm'
                }`}
              >
                {item.content}
              </div>

              {item.actions?.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {item.actions.map((action, actionIndex) => (
                    <button
                      type="button"
                      key={`${action.date}-${action.start}-${actionIndex}`}
                      onClick={() => handleAction(action)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-sage-200 bg-white px-3 py-2 text-xs font-bold text-sage-700 transition hover:bg-sage-50"
                    >
                      <CalendarCheck2 size={14} /> {action.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}

          {thinking && (
            <div className="inline-flex items-center gap-2 rounded-2xl rounded-bl-md border border-sage-100 bg-white px-4 py-3 text-sm text-gray-500 shadow-sm">
              <Loader2 size={15} className="animate-spin" /> AI sedang cek jadwal...
            </div>
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {EXAMPLES.map(example => (
          <button
            key={example}
            type="button"
            disabled={loading || thinking}
            onClick={() => runAgent(example)}
            className="rounded-full border border-sage-100 bg-sage-50 px-3 py-1.5 text-[11px] font-semibold text-sage-700 transition hover:bg-sage-100 disabled:opacity-50"
          >
            {example}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex gap-2">
        <input
          value={message}
          onChange={event => setMessage(event.target.value)}
          disabled={loading || thinking}
          placeholder="Tanya: Jumat jam 4 sore kosong nggak?"
          className="min-w-0 flex-1 rounded-2xl border border-gray-200 px-4 py-3 text-sm outline-none transition focus:border-sage-400 focus:ring-2 focus:ring-sage-100 disabled:bg-gray-50"
        />
        <button
          type="submit"
          disabled={loading || thinking || !message.trim()}
          className="inline-flex items-center justify-center rounded-2xl bg-sage-700 px-4 py-3 text-white transition hover:bg-sage-800 disabled:opacity-50"
          aria-label="Kirim pertanyaan ke AI"
        >
          {thinking ? <Wand2 size={18} /> : <SendHorizonal size={18} />}
        </button>
      </form>
    </section>
  )
}
