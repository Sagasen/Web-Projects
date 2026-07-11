// src/pages/admin/AdminClosedDatesPage.jsx
import { useEffect, useState } from 'react'
import { format, parseISO } from 'date-fns'
import { id as localeId } from 'date-fns/locale'
import { CalendarOff, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { supabase } from '../../lib/supabaseClient'
import { normalizeSupabaseError } from '../../lib/bookingUtils'

const todayIso = () => new Date().toISOString().slice(0, 10)

export default function AdminClosedDatesPage() {
  const [closedDates, setClosedDates] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ closed_date: todayIso(), reason: '' })
  const [editingId, setEditingId] = useState(null)
  const [editForm, setEditForm] = useState({ closed_date: '', reason: '' })

  async function fetchClosedDates() {
    setLoading(true)
    setError('')
    const { data, error } = await supabase
      .from('closed_dates')
      .select('*')
      .order('closed_date', { ascending: true })

    if (error) setError(normalizeSupabaseError(error))
    else setClosedDates(data || [])
    setLoading(false)
  }

  useEffect(() => { fetchClosedDates() }, [])

  async function handleAdd(e) {
    e.preventDefault()
    if (!form.closed_date) {
      setError('Tanggal tutup wajib diisi.')
      return
    }

    setSaving(true)
    setError('')
    const { error } = await supabase.from('closed_dates').insert({
      closed_date: form.closed_date,
      reason: form.reason.trim() || null,
    })
    setSaving(false)

    if (error) {
      if (error.message?.includes('duplicate key')) {
        setError('Tanggal ini sudah ada di jadwal tutup.')
      } else {
        setError(normalizeSupabaseError(error))
      }
      return
    }

    setForm({ closed_date: todayIso(), reason: '' })
    fetchClosedDates()
  }

  function startEdit(item) {
    setEditingId(item.id)
    setEditForm({ closed_date: item.closed_date, reason: item.reason || '' })
  }

  function cancelEdit() {
    setEditingId(null)
    setEditForm({ closed_date: '', reason: '' })
  }

  async function handleUpdate(id) {
    if (!editForm.closed_date) {
      setError('Tanggal tutup wajib diisi.')
      return
    }

    const { error } = await supabase
      .from('closed_dates')
      .update({ closed_date: editForm.closed_date, reason: editForm.reason.trim() || null })
      .eq('id', id)

    if (error) {
      if (error.message?.includes('duplicate key')) {
        setError('Tanggal ini sudah ada di jadwal tutup.')
      } else {
        setError(normalizeSupabaseError(error))
      }
      return
    }

    cancelEdit()
    fetchClosedDates()
  }

  async function handleDelete(id) {
    const ok = window.confirm('Hapus tanggal tutup ini?')
    if (!ok) return

    const { error } = await supabase.from('closed_dates').delete().eq('id', id)
    if (error) {
      alert(normalizeSupabaseError(error))
      return
    }
    setClosedDates(prev => prev.filter(item => item.id !== id))
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Jadwal Tutup / Libur</h1>
        <p className="text-sm text-gray-500 mt-1">
          Tandai tanggal yang tutup agar tidak bisa dibooking oleh customer.
        </p>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={handleAdd} className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-2 text-gray-900">
            <CalendarOff size={19} className="text-green-700" />
            <h2 className="font-bold">Tambah Tanggal Tutup</h2>
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Tanggal</label>
            <input
              type="date"
              value={form.closed_date}
              onChange={(e) => setForm(prev => ({ ...prev, closed_date: e.target.value }))}
              className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-sm font-semibold text-gray-700">Alasan / Catatan</label>
            <textarea
              rows="4"
              value={form.reason}
              onChange={(e) => setForm(prev => ({ ...prev, reason: e.target.value }))}
              placeholder="Contoh: Libur nasional, maintenance ruangan, acara internal"
              className="w-full resize-none rounded-xl border border-gray-200 px-4 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <button
            type="submit"
            disabled={saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-green-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-green-800 disabled:opacity-60"
          >
            <Plus size={16} /> {saving ? 'Menyimpan...' : 'Tambah Jadwal Tutup'}
          </button>
        </form>

        <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-gray-100 px-5 py-4">
            <h2 className="font-bold text-gray-900">Daftar Tanggal Tutup</h2>
            <p className="text-xs text-gray-500 mt-0.5">Tanggal ini akan tampil abu-abu di kalender.</p>
          </div>

          {loading ? (
            <div className="p-5 space-y-3 animate-pulse">
              {[1,2,3].map(i => <div key={i} className="h-16 rounded-xl bg-gray-200" />)}
            </div>
          ) : closedDates.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <CalendarOff size={42} className="mx-auto mb-3 opacity-50" />
              <p className="text-sm">Belum ada jadwal tutup/libur.</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {closedDates.map(item => (
                <div key={item.id} className="p-4">
                  {editingId === item.id ? (
                    <div className="grid gap-3 md:grid-cols-[180px_1fr_auto] md:items-start">
                      <input
                        type="date"
                        value={editForm.closed_date}
                        onChange={(e) => setEditForm(prev => ({ ...prev, closed_date: e.target.value }))}
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      />
                      <input
                        value={editForm.reason}
                        onChange={(e) => setEditForm(prev => ({ ...prev, reason: e.target.value }))}
                        placeholder="Alasan"
                        className="rounded-xl border border-gray-200 px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      />
                      <div className="flex gap-1.5">
                        <button onClick={() => handleUpdate(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-green-700 px-3 py-2 text-xs font-bold text-white hover:bg-green-800">
                          <Save size={13} /> Simpan
                        </button>
                        <button onClick={cancelEdit} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200">
                          <X size={13} /> Batal
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <p className="font-bold text-gray-900">
                          {format(parseISO(item.closed_date), 'EEEE, d MMMM yyyy', { locale: localeId })}
                        </p>
                        <p className="text-sm text-gray-500 mt-0.5">{item.reason || 'Tanpa alasan khusus'}</p>
                      </div>
                      <div className="flex gap-1.5">
                        <button onClick={() => startEdit(item)} className="inline-flex items-center gap-1 rounded-lg bg-gray-100 px-3 py-2 text-xs font-bold text-gray-700 hover:bg-gray-200">
                          <Pencil size={13} /> Edit
                        </button>
                        <button onClick={() => handleDelete(item.id)} className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-100">
                          <Trash2 size={13} /> Hapus
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  )
}
