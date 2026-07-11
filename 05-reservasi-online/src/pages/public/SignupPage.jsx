// src/pages/public/SignupPage.jsx
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Eye, EyeOff, UserPlus, AlertCircle, CheckCircle2 } from 'lucide-react'
import { signUpCustomer } from '../../lib/authUtils'

export default function SignupPage() {
  const navigate = useNavigate()

  const [form, setForm] = useState({
    fullName        : '',
    email           : '',
    phone           : '',
    password        : '',
    confirmPassword : '',
  })
  const [showPass, setShowPass]         = useState(false)
  const [showConfirm, setShowConfirm]   = useState(false)
  const [loading, setLoading]           = useState(false)
  const [error, setError]               = useState('')
  const [success, setSuccess]           = useState(false)

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  function validate() {
    if (!form.fullName.trim())  return 'Nama lengkap wajib diisi.'
    if (!form.email.trim())     return 'Email wajib diisi.'
    if (!form.phone.trim())     return 'Nomor WhatsApp wajib diisi.'
    if (form.password.length < 6)
      return 'Password minimal 6 karakter.'
    if (form.password !== form.confirmPassword)
      return 'Password dan konfirmasi password tidak cocok.'
    return null
  }

  async function handleSubmit(e) {
    e.preventDefault()
    const validationError = validate()
    if (validationError) { setError(validationError); return }

    setLoading(true)
    setError('')

    const { data, error } = await signUpCustomer({
      fullName : form.fullName.trim(),
      email    : form.email.trim(),
      phone    : form.phone.trim(),
      password : form.password,
    })

    setLoading(false)

    if (error) {
      if (error.message.includes('already registered') || error.message.includes('already been registered')) {
        setError('Email ini sudah terdaftar. Coba login atau gunakan email lain.')
      } else if (error.message.includes('invalid email')) {
        setError('Format email tidak valid.')
      } else {
        setError(error.message)
      }
      return
    }

    // Supabase bisa otomatis login (jika email confirm dimatikan)
    // atau minta konfirmasi email dulu.
    if (data?.session) {
      // Langsung login → masuk ke dashboard
      navigate('/dashboard', { replace: true })
    } else {
      // Perlu konfirmasi email dulu
      setSuccess(true)
    }
  }

  // Tampilan setelah sign up berhasil & butuh konfirmasi email
  if (success) {
    return (
      <div className="min-h-screen bg-cream flex items-center justify-center px-4">
        <div className="w-full max-w-md text-center">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle2 size={28} className="text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">
              Cek Inboxmu!
            </h2>
            <p className="text-sm text-gray-500 mb-6">
              Kami sudah kirim link konfirmasi ke{' '}
              <span className="font-medium text-gray-700">{form.email}</span>.
              Klik link tersebut untuk mengaktifkan akun, lalu login.
            </p>
            <Link
              to="/login"
              className="inline-block bg-sage-600 text-white text-sm font-medium
                         px-6 py-2.5 rounded-lg hover:bg-sage-700 transition"
            >
              Pergi ke Halaman Login
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold text-sage-700 tracking-tight">Tarasari</h1>
            <p className="text-sm text-gray-500 mt-1">Booking Tempat Senam</p>
          </Link>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Buat Akun Baru</h2>

          {/* Error Banner */}
          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700
                            rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">

            {/* Nama Lengkap */}
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nama Lengkap
              </label>
              <input
                id="fullName" name="fullName" type="text"
                autoComplete="name" required
                value={form.fullName} onChange={handleChange}
                placeholder="Budi Santoso"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent
                           placeholder:text-gray-400 transition"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
                Email
              </label>
              <input
                id="email" name="email" type="email"
                autoComplete="email" required
                value={form.email} onChange={handleChange}
                placeholder="kamu@email.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent
                           placeholder:text-gray-400 transition"
              />
            </div>

            {/* No. WhatsApp */}
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1.5">
                Nomor WhatsApp
              </label>
              <input
                id="phone" name="phone" type="tel"
                autoComplete="tel" required
                value={form.phone} onChange={handleChange}
                placeholder="08123456789"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent
                           placeholder:text-gray-400 transition"
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">
                Password <span className="text-gray-400 font-normal">(min. 6 karakter)</span>
              </label>
              <div className="relative">
                <input
                  id="password" name="password"
                  type={showPass ? 'text' : 'password'}
                  autoComplete="new-password" required
                  value={form.password} onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent
                             placeholder:text-gray-400 transition"
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Konfirmasi Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1.5">
                Konfirmasi Password
              </label>
              <div className="relative">
                <input
                  id="confirmPassword" name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  autoComplete="new-password" required
                  value={form.confirmPassword} onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent
                             placeholder:text-gray-400 transition"
                />
                <button type="button" tabIndex={-1}
                  onClick={() => setShowConfirm(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-sage-600 hover:bg-sage-700
                         text-white font-medium py-2.5 rounded-lg transition disabled:opacity-60
                         disabled:cursor-not-allowed text-sm mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <UserPlus size={16} />
                  Daftar Sekarang
                </>
              )}
            </button>

          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Sudah punya akun?{' '}
            <Link to="/login" className="text-sage-600 font-medium hover:underline">
              Masuk di sini
            </Link>
          </p>
        </div>

        <p className="text-center text-sm text-gray-400 mt-5">
          <Link to="/" className="hover:text-sage-600 transition">
            ← Kembali ke kalender
          </Link>
        </p>

      </div>
    </div>
  )
}
