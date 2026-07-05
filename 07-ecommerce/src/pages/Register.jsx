import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCustomerAuth } from '../context/CustomerAuthContext'
import { useToast } from '../context/ToastContext'

export const Register = () => {
  const { register } = useCustomerAuth()
  const { showToast } = useToast()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [address, setAddress] = useState('')
  const [loading, setLoading] = useState(false)

  const handleRegister = async (e) => {
    e.preventDefault()

    if (!name || !phone || !password || !address) {
      showToast('Semua field wajib diisi', 'error')
      return
    }

    if (!/^(08|628)\d{8,11}$/.test(phone.replace(/\s/g, ''))) {
      showToast('Format nomor HP tidak valid (contoh: 08123456789)', 'error')
      return
    }

    if (password.length < 6) {
      showToast('Password minimal 6 karakter', 'error')
      return
    }

    if (password !== confirmPassword) {
      showToast('Konfirmasi password tidak cocok', 'error')
      return
    }

    setLoading(true)
    const res = await register(name, phone, password, address)
    setLoading(false)

    if (res.success) {
      showToast('Pendaftaran berhasil! Silakan login.', 'success')
      setTimeout(() => {
        navigate('/login')
      }, 1000)
    } else {
      showToast(res.error || 'Pendaftaran gagal, nomor HP mungkin sudah terdaftar.', 'error')
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '480px' }}>
        <div className="auth-logo">
          <div className="auth-logo-icon">🧼</div>
          <h1 className="auth-title">Buat Akun Baru</h1>
          <p className="auth-subtitle">Daftar untuk mulai belanja di Bakoel Umpluk</p>
        </div>

        <form onSubmit={handleRegister}>
          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Nama Lengkap <span className="required">*</span>
              </label>
              <input
                id="name"
                type="text"
                className="form-control"
                placeholder="Nama kamu"
                autoComplete="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="phone">
                Nomor HP <span className="required">*</span>
              </label>
              <input
                id="phone"
                type="tel"
                className="form-control"
                placeholder="08123456789"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
              />
            </div>
          </div>

          <div className="grid-2">
            <div className="form-group">
              <label className="form-label" htmlFor="password">
                Password <span className="required">*</span>
              </label>
              <input
                id="password"
                type="password"
                className="form-control"
                placeholder="Min. 6 karakter"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="confirm-password">
                Konfirmasi Password <span className="required">*</span>
              </label>
              <input
                id="confirm-password"
                type="password"
                className="form-control"
                placeholder="Ulangi password"
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="address">
              Alamat Pengiriman <span className="required">*</span>
            </label>
            <textarea
              id="address"
              className="form-control"
              placeholder="Jl. Merdeka No. 10, Kel. ..., Kec. ..., Kota ..."
              rows="3"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
            ></textarea>
            <p class="form-hint">Alamat ini akan menjadi alamat pengiriman utama kamu</p>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-full btn-lg"
            disabled={loading}
          >
            {loading ? 'Mendaftar...' : 'Daftar Sekarang'}
          </button>
        </form>

        <div className="auth-link">
          Sudah punya akun? <Link to="/login">Masuk di sini</Link>
        </div>
        <div className="auth-link" style={{ marginTop: '8px' }}>
          <Link to="/">← Kembali ke Toko</Link>
        </div>
      </div>
    </div>
  )
}
