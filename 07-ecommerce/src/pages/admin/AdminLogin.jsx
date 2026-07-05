import React, { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAdminAuth } from '../../context/AdminAuthContext'
import { useToast } from '../../context/ToastContext'

export const AdminLogin = () => {
  const { admin, loginAdmin } = useAdminAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  // Redirect if already logged in as admin
  useEffect(() => {
    if (admin) {
      navigate('/admin')
    }
  }, [admin, navigate])

  const handleLogin = async (e) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      showToast('Email dan password wajib diisi', 'error')
      return
    }

    setLoading(true)
    const res = await loginAdmin(email, password)
    setLoading(false)

    if (res.success) {
      showToast(`Login berhasil! Selamat datang, ${res.admin.name}`, 'success')
      setTimeout(() => {
        navigate('/admin')
      }, 800)
    } else {
      showToast(res.error || 'Login gagal', 'error')
    }
  }

  return (
    <div className="admin-login-page">
      {/* Left panel (hero) */}
      <div className="admin-login-left">
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: '5rem', marginBottom: '1.5rem' }}>🧼</div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', lineHeight: '1.3' }}>
            Bakoel Umpluk
          </h1>
          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '1.1rem', marginTop: '1rem' }}>Dashboard Admin</p>
          <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '0.75rem', textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
              <span>📦</span> Kelola Produk & Stok
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
              <span>🧾</span> Pantau Pesanan Masuk
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
              <span>💰</span> Keuangan & Analisis AI
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: 'rgba(255,255,255,0.85)' }}>
              <span>🤖</span> Chat AI untuk Pelanggan
            </div>
          </div>
        </div>
      </div>

      {/* Right panel (form) */}
      <div className="admin-login-right">
        <div className="admin-login-card">
          <div style={{ marginBottom: '2rem' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                background: 'linear-gradient(135deg, var(--green-500), var(--green-700))',
                borderRadius: 'var(--radius-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                marginBottom: '1rem'
              }}
            >
              🔐
            </div>
            <h1 style={{ fontSize: 'var(--text-2xl)', fontWeight: 800, color: 'white', marginBottom: '0.25rem' }}>
              Masuk Admin
            </h1>
            <p style={{ color: 'var(--gray-400)', fontSize: 'var(--text-sm)' }}>
              Gunakan akun admin yang sudah terdaftar
            </p>
          </div>

          <form onSubmit={handleLogin}>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-email">
                Email
              </label>
              <input
                id="admin-email"
                type="email"
                className="form-control"
                placeholder="admin@contoh.com"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="admin-password">
                Password
              </label>
              <input
                id="admin-password"
                type="password"
                className="form-control"
                placeholder="Password akun Supabase"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-full btn-lg"
              disabled={loading}
              style={{ marginTop: '0.5rem' }}
            >
              {loading ? 'Memproses...' : 'Masuk ke Dashboard'}
            </button>
          </form>

          <p style={{ marginTop: '1.5rem', fontSize: 'var(--text-xs)', color: 'var(--gray-600)', textAlign: 'center' }}>
            Halaman ini khusus untuk admin toko. Pelanggan dapat berbelanja di{' '}
            <Link to="/" style={{ color: 'var(--green-400)' }}>
              halaman utama
            </Link>
            .
          </p>
        </div>
      </div>
    </div>
  )
}
