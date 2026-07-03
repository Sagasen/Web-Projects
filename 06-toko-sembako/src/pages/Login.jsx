import React, { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import { useToast } from '../context/ToastContext'

export const Login = () => {
  const { login } = useCustomerAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  const from = searchParams.get('from') || '/'

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!phone.trim() || !password) {
      showToast('Nomor HP dan password wajib diisi', 'error')
      return
    }

    setLoading(true)
    const res = await login(phone, password)
    setLoading(false)

    if (res.success) {
      showToast(`Login berhasil! Selamat datang, ${res.customer.name}`, 'success')
      setTimeout(() => {
        navigate(from, { replace: true })
      }, 800)
    } else {
      showToast(res.error || 'Nomor HP atau password salah', 'error')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <div className="auth-logo-icon">🌾</div>
          <h1 className="auth-title">Selamat Datang!</h1>
          <p className="auth-subtitle">Masuk ke akun Toko Sembako Mbah Win</p>
        </div>

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label" htmlFor="phone">
              Nomor HP <span className="required">*</span>
            </label>
            <input
              id="phone"
              type="tel"
              className="form-control"
              placeholder="Contoh: 08123456789"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label className="form-label" htmlFor="password">
              Password <span className="required">*</span>
            </label>
            <input
              id="password"
              type="password"
              className="form-control"
              placeholder="Masukkan password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <div className="auth-link">
          Belum punya akun? <Link to="/register">Daftar sekarang</Link>
        </div>
        <div className="auth-link" style={{ marginTop: '8px' }}>
          <Link to="/">← Kembali ke Toko</Link>
        </div>
      </div>
    </div>
  )
}
