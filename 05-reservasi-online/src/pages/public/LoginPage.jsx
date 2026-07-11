// src/pages/public/LoginPage.jsx
import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { Eye, EyeOff, LogIn, AlertCircle, X } from 'lucide-react'
import { signIn } from '../../lib/authUtils'

export default function LoginPage() {
  const navigate  = useNavigate()
  const location  = useLocation()
  const fromLocation = location.state?.from
  const from = fromLocation
    ? `${fromLocation.pathname || '/dashboard'}${fromLocation.search || ''}`
    : '/dashboard'

  const [form, setForm]         = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }))
    setError('')
  }

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError('')
    const { error } = await signIn({ email: form.email.trim(), password: form.password })
    setLoading(false)
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        setError('Email atau password salah.')
      } else if (error.message.includes('Email not confirmed')) {
        setError('Email belum dikonfirmasi. Cek inbox kamu.')
      } else {
        setError(error.message)
      }
      return
    }
    navigate(from, { replace: true })
  }

  return (
    <div className="min-h-screen bg-cream flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <Link to="/" className="inline-block">
            <h1 className="text-3xl font-bold text-sage-700">Tarasari</h1>
            <p className="text-sm text-gray-500 mt-1">Booking Tempat Senam</p>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8">
          <h2 className="text-xl font-semibold text-gray-800 mb-6">Masuk ke Akunmu</h2>

          {error && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 text-red-700
                            rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">Email</label>
              <input id="email" name="email" type="email" autoComplete="email" required
                value={form.email} onChange={handleChange} placeholder="kamu@email.com"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm
                           focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent
                           placeholder:text-gray-400 transition" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPass ? 'text' : 'password'}
                  autoComplete="current-password" required
                  value={form.password} onChange={handleChange} placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 border border-gray-300 rounded-lg text-sm
                             focus:outline-none focus:ring-2 focus:ring-sage-400 focus:border-transparent
                             placeholder:text-gray-400 transition" />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-sage-600 hover:bg-sage-700
                         text-white font-medium py-2.5 rounded-lg transition disabled:opacity-60 text-sm">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><LogIn size={16} /> Masuk</>
              }
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            Belum punya akun?{' '}
            <Link to="/signup" className="text-sage-600 font-medium hover:underline">Daftar sekarang</Link>
          </p>
        </div>

        <p className="text-center text-sm text-gray-400 mt-5">
          <Link to="/" className="hover:text-sage-600 transition">← Kembali ke kalender</Link>
        </p>
      </div>
    </div>
  )
}
