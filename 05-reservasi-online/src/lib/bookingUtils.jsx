// src/lib/bookingUtils.jsx

export const STATUS_MAP = {
  pending: {
    label: 'Menunggu',
    className: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  },
  confirmed: {
    label: 'Dikonfirmasi',
    className: 'bg-green-100 text-green-700 border-green-200',
  },
  rejected: {
    label: 'Ditolak',
    className: 'bg-red-100 text-red-700 border-red-200',
  },
  cancelled: {
    label: 'Dibatalkan',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  },
  completed: {
    label: 'Selesai',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
  },
}

export const ACTIVE_STATUSES = ['pending', 'confirmed']

export function StatusBadge({ status }) {
  const item = STATUS_MAP[status] ?? {
    label: status || '-',
    className: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  return (
    <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold ${item.className}`}>
      {item.label}
    </span>
  )
}

export function timeToMinutes(time = '00:00') {
  const [hour = '0', minute = '0'] = String(time).split(':')
  return Number(hour) * 60 + Number(minute)
}

export function formatTime(time = '') {
  return String(time).slice(0, 5)
}

export function isTimeOverlap(startA, endA, startB, endB) {
  const aStart = timeToMinutes(startA)
  const aEnd = timeToMinutes(endA)
  const bStart = timeToMinutes(startB)
  const bEnd = timeToMinutes(endB)
  return aStart < bEnd && aEnd > bStart
}

export function getConflictBooking(bookings, bookingDate, startTime, endTime, ignoreId = null) {
  return bookings.find((booking) => {
    if (ignoreId && booking.id === ignoreId) return false
    if (booking.booking_date !== bookingDate) return false
    if (!ACTIVE_STATUSES.includes(booking.status)) return false
    return isTimeOverlap(startTime, endTime, booking.start_time, booking.end_time)
  })
}

export function normalizeSupabaseError(error) {
  if (!error) return ''
  const message = error.message || ''

  if (
    message.includes('no_overlapping_bookings') ||
    message.toLowerCase().includes('conflicting key value') ||
    message.toLowerCase().includes('violates exclusion constraint')
  ) {
    return 'Jam tersebut bentrok dengan booking lain. Pilih jam yang masih kosong ya.'
  }

  if (message.toLowerCase().includes('permission denied')) {
    return 'Akses ditolak oleh database. Cek role akun dan policy Supabase.'
  }

  return message || 'Terjadi kesalahan. Coba lagi.'
}
