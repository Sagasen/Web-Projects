// src/pages/admin/AdminLoginPage.jsx
// Route: /admin  (bukan /admin/login — sesuai permintaan)
// Tidak ada link ke halaman ini dari halaman publik manapun.

import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, ShieldCheck, AlertCircle } from 'lucide-react'
import { signIn, signOut, getCurrentProfile } from '../../lib/authUtils'

export default function AdminLoginPage() {
  const navigate = useNavigate()
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

    const { error: authError } = await signIn({ email: form.email.trim(), password: form.password })
    if (authError) {
      setLoading(false)
      setError(authError.message.includes('Invalid login credentials')
        ? 'Email atau password salah.'
        : authError.message)
      return
    }

    // Wajib cek role — customer bisa login lewat Supabase Auth yang sama
    const profile = await getCurrentProfile()
    if (!profile || profile.role !== 'admin') {
      await signOut()
      setLoading(false)
      setError('Akun ini bukan admin. Hubungi pengelola Tarasari.')
      return
    }

    navigate('/admin/dashboard', { replace: true })
  }

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-green-700 rounded-2xl flex items-center justify-center mx-auto mb-3">
            <ShieldCheck size={28} className="text-white" />
          </div>
          <h1 className="text-xl font-bold text-white">Admin Tarasari</h1>
          <p className="text-sm text-gray-400 mt-1">Masuk ke panel pengelola</p>
        </div>

        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-7">
          {error && (
            <div className="flex items-start gap-3 bg-red-900/40 border border-red-700
                            text-red-300 rounded-lg px-4 py-3 mb-5 text-sm">
              <AlertCircle size={16} className="mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">Email Admin</label>
              <input id="email" name="email" type="email" autoComplete="email" required
                value={form.email} onChange={handleChange} placeholder="admin@tarasari.com"
                className="w-full px-4 py-2.5 bg-gray-700 border border-gray-600 text-white
                           rounded-lg text-sm placeholder:text-gray-500
                           focus:outline-none focus:ring-2 focus:ring-green-500 transition" />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">Password</label>
              <div className="relative">
                <input id="password" name="password" type={showPass ? 'text' : 'password'}
                  autoComplete="current-password" required
                  value={form.password} onChange={handleChange} placeholder="••••••••"
                  className="w-full px-4 py-2.5 pr-11 bg-gray-700 border border-gray-600
                             text-white rounded-lg text-sm placeholder:text-gray-500
                             focus:outline-none focus:ring-2 focus:ring-green-500 transition" />
                <button type="button" tabIndex={-1} onClick={() => setShowPass(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-200">
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-green-700 hover:bg-green-600
                         text-white font-medium py-2.5 rounded-lg transition disabled:opacity-60 text-sm mt-1">
              {loading
                ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                : <><ShieldCheck size={16} /> Masuk sebagai Admin</>
              }
            </button>
          </form>
        </div>

        <p className="text-center text-xs text-gray-600 mt-6">
          Halaman ini hanya untuk admin Tarasari.
        </p>
      </div>
    </div>
  )
}
