import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useToast } from '../../context/ToastContext'

export const AdminSettings = () => {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)

  const [qrisUrl, setQrisUrl] = useState('')
  const [bankName, setBankName] = useState('BNI')
  const [bankNumber, setBankNumber] = useState('')
  const [bankHolder, setBankHolder] = useState('')
  const [waNumber, setWaNumber] = useState('')

  useEffect(() => {
    fetchSettings()
  }, [])

  const fetchSettings = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.from('store_settings').select('key, value')
      if (error) throw error
      const map = {}
      ;(data || []).forEach(row => { map[row.key] = row.value })
      setQrisUrl(map.qris_image_url || '')
      setBankName(map.bank_name || 'BNI')
      setBankNumber(map.bank_number || '')
      setBankHolder(map.bank_holder || '')
      setWaNumber(map.wa_number || '')
    } catch (err) {
      console.error(err)
      showToast('Gagal memuat pengaturan toko', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleQrisUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploading(true)
    try {
      const fileName = `qris-${Date.now()}-${file.name.replace(/\s/g, '_')}`
      const { error } = await supabase.storage.from('store-assets').upload(fileName, file, { upsert: true })
      if (error) throw error
      const { data: urlData } = supabase.storage.from('store-assets').getPublicUrl(fileName)
      setQrisUrl(urlData.publicUrl)
      showToast('Gambar QRIS berhasil diupload! Jangan lupa klik Simpan.', 'success')
    } catch (err) {
      console.error(err)
      showToast('Gagal upload gambar: ' + err.message, 'error')
    } finally {
      setUploading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const rows = [
        { key: 'qris_image_url', value: qrisUrl || '' },
        { key: 'bank_name', value: bankName || '' },
        { key: 'bank_number', value: bankNumber || '' },
        { key: 'bank_holder', value: bankHolder || '' },
        { key: 'wa_number', value: waNumber || '' },
      ]
      const { error } = await supabase.from('store_settings').upsert(rows, { onConflict: 'key' })
      if (error) throw error
      showToast('Pengaturan berhasil disimpan!', 'success')
    } catch (err) {
      console.error(err)
      showToast('Gagal menyimpan pengaturan: ' + err.message, 'error')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="loading-state">
        <div className="spinner"></div>
        <p>Memuat pengaturan...</p>
      </div>
    )
  }

  return (
    <div>
      {/* QRIS Settings */}
      <div className="settings-card">
        <h2 className="section-title">📱 Gambar QRIS / E-Wallet</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', marginBottom: 'var(--space-4)' }}>
          Gambar ini akan ditampilkan ke pelanggan saat memilih metode pembayaran QRIS/E-Wallet di halaman checkout.
        </p>

        <div className="image-upload-box" onClick={() => document.getElementById('qris-input').click()}>
          <input id="qris-input" type="file" accept="image/*" style={{ display: 'none' }} onChange={handleQrisUpload} />
          {qrisUrl ? (
            <img src={qrisUrl} alt="QRIS" />
          ) : (
            <div className="upload-hint">📤 Klik untuk upload gambar QRIS</div>
          )}
          <div className="upload-hint">{uploading ? 'Mengupload...' : 'Klik untuk ganti gambar'}</div>
        </div>
      </div>

      {/* Bank Transfer Settings */}
      <div className="settings-card">
        <h2 className="section-title">🏦 Info Transfer Bank</h2>
        <div className="form-group">
          <label className="form-label">Nama Bank</label>
          <input className="form-control" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="Contoh: BNI" />
        </div>
        <div className="form-group">
          <label className="form-label">Nomor Rekening</label>
          <input className="form-control" value={bankNumber} onChange={(e) => setBankNumber(e.target.value)} placeholder="0244501044" />
        </div>
        <div className="form-group">
          <label className="form-label">Atas Nama</label>
          <input className="form-control" value={bankHolder} onChange={(e) => setBankHolder(e.target.value)} placeholder="Silvia" />
        </div>
      </div>

      {/* WhatsApp Settings */}
      <div className="settings-card">
        <h2 className="section-title">💬 Nomor WhatsApp Toko</h2>
        <p style={{ fontSize: 'var(--text-sm)', color: 'var(--gray-500)', marginBottom: 'var(--space-4)' }}>
          Nomor ini dipakai untuk menerima notifikasi pesanan baru dari pelanggan via WhatsApp.
        </p>
        <div className="form-group">
          <label className="form-label">Nomor WhatsApp (format: 62812xxxxxxx)</label>
          <input className="form-control" value={waNumber} onChange={(e) => setWaNumber(e.target.value)} placeholder="6285742860240" />
        </div>
      </div>

      <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
        {saving ? 'Menyimpan...' : '💾 Simpan Pengaturan'}
      </button>
    </div>
  )
}
