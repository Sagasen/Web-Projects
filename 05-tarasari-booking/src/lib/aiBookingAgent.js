import { addDays, format, isBefore, isSameDay, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { ACTIVE_STATUSES, isTimeOverlap, timeToMinutes } from './bookingUtils.jsx'

const WORK_START = '07:00'
const WORK_END = '22:00'
const DEFAULT_DURATION_MINUTES = 60

const DAY_NAMES = {
  minggu: 0,
  ahad: 0,
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  jumaat: 5,
  "jum'at": 5,
  sabtu: 6,
}

const MONTH_NAMES = {
  januari: 0,
  jan: 0,
  februari: 1,
  feb: 1,
  maret: 2,
  mar: 2,
  april: 3,
  apr: 3,
  mei: 4,
  juni: 5,
  jun: 5,
  juli: 6,
  jul: 6,
  agustus: 7,
  agu: 7,
  agt: 7,
  september: 8,
  sep: 8,
  oktober: 9,
  okt: 9,
  november: 10,
  nov: 10,
  desember: 11,
  des: 11,
}

function cleanText(text = '') {
  return String(text).toLowerCase().replace(/\s+/g, ' ').trim()
}

function todayStart() {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

function toIsoDate(date) {
  return format(date, 'yyyy-MM-dd')
}

function safeParseIsoDate(isoDate) {
  if (!isoDate) return null
  const parsed = parseISO(isoDate)
  return Number.isNaN(parsed.getTime()) ? null : parsed
}

function normalizeTime(hour, minute = 0, period = '') {
  let h = Number(hour)
  const m = Number(minute || 0)
  const p = String(period || '').toLowerCase()

  if (p.includes('sore') && h < 12) h += 12
  if (p.includes('malam') && h < 12) h += 12
  if (p.includes('siang') && h < 11) h += 12
  if (p.includes('pagi') && h === 12) h = 0

  if (h < 0 || h > 23 || m < 0 || m > 59) return null
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
}

function addMinutesToTime(time, minutes) {
  return minutesToTime(timeToMinutes(time) + minutes)
}

function formatDateHuman(isoDate) {
  const date = safeParseIsoDate(isoDate)
  if (!date) return isoDate
  return format(date, 'EEEE, d MMMM yyyy', { locale: localeId })
}

function parseDateFromText(text) {
  const now = todayStart()

  if (/\bhari ini\b|\bsekarang\b/.test(text)) return toIsoDate(now)
  if (/\bbesok\b/.test(text)) return toIsoDate(addDays(now, 1))
  if (/\blusa\b/.test(text)) return toIsoDate(addDays(now, 2))

  const isoMatch = text.match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/)
  if (isoMatch) {
    const date = new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
    return toIsoDate(date)
  }

  const slashMatch = text.match(/\b(\d{1,2})[/-](\d{1,2})(?:[/-](20\d{2}))?\b/)
  if (slashMatch) {
    const day = Number(slashMatch[1])
    const month = Number(slashMatch[2]) - 1
    const year = slashMatch[3] ? Number(slashMatch[3]) : now.getFullYear()
    const date = new Date(year, month, day)
    if (date < now && !slashMatch[3]) date.setFullYear(date.getFullYear() + 1)
    return toIsoDate(date)
  }

  const dateNameMatch = text.match(/(?:tanggal\s*)?(\d{1,2})\s+(januari|jan|februari|feb|maret|mar|april|apr|mei|juni|jun|juli|jul|agustus|agu|agt|september|sep|oktober|okt|november|nov|desember|des)(?:\s+(20\d{2}))?\b/)
  if (dateNameMatch) {
    const day = Number(dateNameMatch[1])
    const month = MONTH_NAMES[dateNameMatch[2]]
    const year = dateNameMatch[3] ? Number(dateNameMatch[3]) : now.getFullYear()
    const date = new Date(year, month, day)
    if (date < now && !dateNameMatch[3]) date.setFullYear(date.getFullYear() + 1)
    return toIsoDate(date)
  }

  const simpleDateMatch = text.match(/\btanggal\s+(\d{1,2})\b/)
  if (simpleDateMatch) {
    const day = Number(simpleDateMatch[1])
    const date = new Date(now.getFullYear(), now.getMonth(), day)
    if (date < now) date.setMonth(date.getMonth() + 1)
    return toIsoDate(date)
  }

  const nextDay = Object.entries(DAY_NAMES).find(([name]) => text.includes(name))
  if (nextDay) {
    const targetDay = nextDay[1]
    const currentDay = now.getDay()
    let diff = (targetDay - currentDay + 7) % 7
    if (diff === 0 || text.includes('depan')) diff += 7
    return toIsoDate(addDays(now, diff))
  }

  return null
}

function parseTimeFromText(text) {
  const explicit = text.match(/(?:jam|pukul)\s*(\d{1,2})(?:[:.](\d{2}))?\s*(pagi|siang|sore|malam)?\b/)
  if (explicit) return normalizeTime(explicit[1], explicit[2] || 0, explicit[3] || '')

  const compact = text.match(/\b(\d{1,2})[:.](\d{2})\s*(pagi|siang|sore|malam)?\b/)
  if (compact) return normalizeTime(compact[1], compact[2], compact[3] || '')

  return null
}

function parseDurationFromText(text) {
  const hourMatch = text.match(/(\d+)\s*(?:jam|hour)/)
  if (hourMatch) return Math.max(30, Number(hourMatch[1]) * 60)

  const minuteMatch = text.match(/(\d+)\s*(?:menit|minute)/)
  if (minuteMatch) return Math.max(30, Number(minuteMatch[1]))

  return DEFAULT_DURATION_MINUTES
}

function parseParticipantsFromText(text) {
  const match = text.match(/(\d+)\s*(?:orang|peserta|member|anggota)/)
  return match ? Number(match[1]) : ''
}

function titleCase(value = '') {
  return String(value)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function parseActivityFromText(text) {
  const activities = [
    'senam aerobik',
    'body combat',
    'pound fit',
    'aerobik',
    'pilates',
    'zumba',
    'yoga',
    'dance',
    'senam',
    'latihan',
  ]

  const found = activities.find(activity => text.includes(activity))
  if (found) {
    if (found === 'aerobik') return 'Senam Aerobik'
    return titleCase(found)
  }

  // Fallback untuk nama kegiatan custom, misalnya:
  // "jadwal pound fit kapan?", "ada kelas cardio?"
  const customMatch = text.match(/(?:jadwal|kelas|kegiatan|acara)\s+([a-z0-9][a-z0-9\s-]{1,40})/i)
  if (!customMatch) return ''

  const cleaned = customMatch[1]
    .replace(/\b(kapan|tanggal|hari|jam|berapa|kosong|tersedia|ada|nggak|tidak|besok|lusa|minggu|bulan|ini|depan|untuk|orang|peserta)\b.*$/i, '')
    .replace(/[^a-z0-9\s-]/gi, '')
    .trim()

  if (!cleaned || cleaned.length < 3) return ''
  if (['kosong', 'tersedia', 'booking', 'baru'].includes(cleaned)) return ''
  return titleCase(cleaned)
}

function isClosedDate(closedDates, isoDate) {
  return closedDates.find(item => item.closed_date === isoDate)
}

function activeBookingsForDate(bookings, isoDate) {
  return (bookings || [])
    .filter(item => item.booking_date === isoDate && ACTIVE_STATUSES.includes(item.status))
    .sort((a, b) => String(a.start_time).localeCompare(String(b.start_time)))
}

function normalizeSearchText(value = '') {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function isActivityScheduleQuestion(text, activity) {
  if (!activity) return false

  // Kalau user bilang "kosong / mau booking", artinya dia ingin cek ketersediaan slot,
  // bukan bertanya jadwal kegiatan yang sudah tercatat.
  if (/\b(kosong|tersedia|slot|mau|ingin|pengen|buat|booking|book|pesan|reservasi)\b/.test(text)) {
    return false
  }

  return /\b(jadwal|kelas|kegiatan|kapan|tanggal|hari apa|jam berapa|ada)\b/.test(text)
}

function activityBookings(bookings, activity, isoDate = null, limit = 8) {
  const keyword = normalizeSearchText(activity)
  if (!keyword) return []

  return (bookings || [])
    .filter(item => ACTIVE_STATUSES.includes(item.status))
    .filter(item => !isoDate || item.booking_date === isoDate)
    .filter(item => normalizeSearchText(item.activity_name).includes(keyword))
    .sort((a, b) => {
      const dateSort = String(a.booking_date).localeCompare(String(b.booking_date))
      if (dateSort !== 0) return dateSort
      return String(a.start_time).localeCompare(String(b.start_time))
    })
    .slice(0, limit)
}

function bookingLine(item, index) {
  return `${index + 1}. ${formatDateHuman(item.booking_date)} jam ${String(item.start_time).slice(0, 5)}–${String(item.end_time).slice(0, 5)}${item.activity_name ? ` (${item.activity_name})` : ''}`
}

function makeActivityScheduleReply(activity, matches, date, alternatives = []) {
  if (matches.length > 0) {
    const dateText = date ? ` di ${formatDateHuman(date)}` : ''
    return {
      content: `Ada. Jadwal ${activity}${dateText} yang sudah tercatat:\n${matches.map(bookingLine).join('\n')}`,
      actions: [],
    }
  }

  const dateText = date ? ` pada ${formatDateHuman(date)}` : ' dalam 60 hari ke depan'
  return {
    content: `Aku belum menemukan jadwal ${activity}${dateText}. Kalau kamu mau membuat booking ${activity}, ini beberapa slot kosong yang bisa dipilih:\n${alternatives.length ? alternatives.map((slot, index) => `${index + 1}. ${slotLabel(slot)}`).join('\n') : 'Belum ada slot kosong yang terbaca.'}`,
    actions: alternatives.slice(0, 3).map(slot => makeBookingAction(slot, { activity })),
  }
}

function findConflict(bookings, isoDate, startTime, endTime) {
  return activeBookingsForDate(bookings, isoDate).find(item => (
    isTimeOverlap(startTime, endTime, item.start_time, item.end_time)
  ))
}

function findFreeSlotsForDate(bookings, closedDates, isoDate, durationMinutes = DEFAULT_DURATION_MINUTES, limit = 4) {
  if (!isoDate || isClosedDate(closedDates, isoDate)) return []

  const slots = []
  const workStart = timeToMinutes(WORK_START)
  const workEnd = timeToMinutes(WORK_END)
  const step = 30
  const dayBookings = activeBookingsForDate(bookings, isoDate)

  for (let start = workStart; start + durationMinutes <= workEnd; start += step) {
    const startTime = minutesToTime(start)
    const endTime = minutesToTime(start + durationMinutes)
    const conflict = dayBookings.find(item => isTimeOverlap(startTime, endTime, item.start_time, item.end_time))
    if (!conflict) {
      slots.push({ date: isoDate, start: startTime, end: endTime })
      if (slots.length >= limit) break
    }
  }

  return slots
}

function findUpcomingFreeSlots(bookings, closedDates, durationMinutes = DEFAULT_DURATION_MINUTES, limit = 5) {
  const slots = []
  const startDate = todayStart()

  for (let i = 0; i < 30 && slots.length < limit; i += 1) {
    const isoDate = toIsoDate(addDays(startDate, i))
    const daySlots = findFreeSlotsForDate(bookings, closedDates, isoDate, durationMinutes, limit - slots.length)
    slots.push(...daySlots)
  }

  return slots
}

function slotLabel(slot) {
  return `${formatDateHuman(slot.date)} jam ${slot.start}–${slot.end}`
}

function makeBookingAction(slot, intent = {}) {
  return {
    label: `Isi form: ${slot.start}–${slot.end}`,
    date: slot.date,
    start: slot.start,
    end: slot.end,
    activity: intent.activity || '',
    participants: intent.participants || '',
  }
}

export function buildBookingSearchParams(action = {}) {
  const params = new URLSearchParams()
  if (action.date) params.set('date', action.date)
  if (action.start) params.set('start', action.start)
  if (action.end) params.set('end', action.end)
  if (action.activity) params.set('activity', action.activity)
  if (action.participants) params.set('participants', String(action.participants))
  return params.toString()
}

export function createAIBookingReply(message, bookings = [], closedDates = []) {
  const text = cleanText(message)
  const date = parseDateFromText(text)
  const startTime = parseTimeFromText(text)
  const durationMinutes = parseDurationFromText(text)
  const endTime = startTime ? addMinutesToTime(startTime, durationMinutes) : null
  const intent = {
    activity: parseActivityFromText(text),
    participants: parseParticipantsFromText(text),
  }

  const wantsSuggestion = /kosong|tersedia|jadwal|rekomendasi|saran|bisa|booking/.test(text)

  if (isActivityScheduleQuestion(text, intent.activity)) {
    const matches = activityBookings(bookings, intent.activity, date, 8)
    const alternatives = date
      ? findFreeSlotsForDate(bookings, closedDates, date, durationMinutes, 4)
      : findUpcomingFreeSlots(bookings, closedDates, durationMinutes, 4)
    return makeActivityScheduleReply(intent.activity, matches, date, alternatives)
  }

  if (!text) {
    return {
      content: 'Tulis pertanyaan jadwalnya dulu ya. Contoh: “Besok jam 4 sore kosong nggak?”',
      actions: [],
    }
  }

  if (!date && !startTime && !wantsSuggestion) {
    return {
      content: 'Aku bisa bantu cek jadwal Tarasari. Coba tanya seperti “Sabtu sore kosong nggak?” atau “Aku mau booking besok jam 15.00”.',
      actions: [],
    }
  }

  if (!date) {
    const upcoming = findUpcomingFreeSlots(bookings, closedDates, durationMinutes, 5)
    if (upcoming.length === 0) {
      return {
        content: 'Aku belum menemukan slot kosong dalam 30 hari ke depan. Coba pilih tanggal tertentu atau hubungi admin Tarasari.',
        actions: [],
      }
    }

    return {
      content: `Ini beberapa slot kosong terdekat yang bisa kamu pilih:\n${upcoming.map((slot, index) => `${index + 1}. ${slotLabel(slot)}`).join('\n')}`,
      actions: upcoming.slice(0, 3).map(slot => makeBookingAction(slot, intent)),
    }
  }

  const parsedDate = safeParseIsoDate(date)
  if (parsedDate && isBefore(parsedDate, todayStart()) && !isSameDay(parsedDate, todayStart())) {
    return {
      content: 'Tanggal itu sudah lewat, jadi tidak bisa dipakai untuk booking. Coba pilih tanggal hari ini atau setelahnya ya.',
      actions: [],
    }
  }

  const closedInfo = isClosedDate(closedDates, date)
  if (closedInfo) {
    const alternatives = findUpcomingFreeSlots(bookings, closedDates, durationMinutes, 3)
    return {
      content: `${formatDateHuman(date)} sedang ditandai tutup/libur${closedInfo.reason ? ` karena ${closedInfo.reason}` : ''}. ${alternatives.length ? `Alternatif terdekat:\n${alternatives.map((slot, index) => `${index + 1}. ${slotLabel(slot)}`).join('\n')}` : 'Belum ada alternatif kosong yang terbaca.'}`,
      actions: alternatives.map(slot => makeBookingAction(slot, intent)),
    }
  }

  const dayBookings = activeBookingsForDate(bookings, date)

  if (startTime && endTime) {
    const conflict = findConflict(bookings, date, startTime, endTime)
    if (!conflict) {
      const slot = { date, start: startTime, end: endTime }
      return {
        content: `Bisa. ${slotLabel(slot)} masih kosong. Aku bisa bantu isi form booking dengan jadwal ini, nanti kamu tinggal cek lalu submit.`,
        actions: [makeBookingAction(slot, intent)],
      }
    }

    const alternatives = findFreeSlotsForDate(bookings, closedDates, date, durationMinutes, 4)
    return {
      content: `Jam ${startTime}–${endTime} bentrok dengan booking ${String(conflict.start_time).slice(0, 5)}–${String(conflict.end_time).slice(0, 5)} (${conflict.activity_name || 'kegiatan'}). ${alternatives.length ? `Slot kosong lain di tanggal itu:\n${alternatives.map((slot, index) => `${index + 1}. ${slot.start}–${slot.end}`).join('\n')}` : 'Sepertinya tanggal itu cukup penuh untuk durasi tersebut.'}`,
      actions: alternatives.slice(0, 3).map(slot => makeBookingAction(slot, intent)),
    }
  }

  const freeSlots = findFreeSlotsForDate(bookings, closedDates, date, durationMinutes, 5)
  const bookedText = dayBookings.length
    ? `Jam yang sudah terisi: ${dayBookings.map(item => `${String(item.start_time).slice(0,5)}–${String(item.end_time).slice(0,5)}`).join(', ')}.`
    : 'Belum ada booking di tanggal itu.'

  return {
    content: `${formatDateHuman(date)} bisa dicek. ${bookedText} ${freeSlots.length ? `Slot kosong yang tersedia:\n${freeSlots.map((slot, index) => `${index + 1}. ${slot.start}–${slot.end}`).join('\n')}` : 'Aku belum menemukan slot kosong untuk durasi tersebut.'}`,
    actions: freeSlots.slice(0, 3).map(slot => makeBookingAction(slot, intent)),
  }
}
