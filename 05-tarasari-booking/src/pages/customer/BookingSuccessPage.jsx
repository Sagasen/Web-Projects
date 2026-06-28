// src/pages/customer/BookingSuccessPage.jsx
import { Link } from 'react-router-dom'
import { CheckCircle2 } from 'lucide-react'
import CustomerLayout from '../../components/layout/CustomerLayout'

export default function BookingSuccessPage() {
  return (
    <CustomerLayout>
      <div className="max-w-md mx-auto text-center py-16">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle2 size={32} className="text-green-600" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 mb-2">Booking Terkirim!</h1>
        <p className="text-sm text-gray-500 mb-6">
          Pengajuan bookingmu sudah diterima. Admin akan segera mengkonfirmasi.
          Kamu bisa memantau status di halaman riwayat booking.
        </p>
        <Link
          to="/dashboard"
          className="inline-block bg-sage-600 text-white text-sm font-medium
                     px-6 py-2.5 rounded-lg hover:bg-sage-700 transition"
        >
          Lihat Riwayat Booking
        </Link>
      </div>
    </CustomerLayout>
  )
}
