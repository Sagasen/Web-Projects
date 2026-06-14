import { useState } from 'react'
import { Upload, X, Loader2 } from 'lucide-react'
import { uploadToCloudinary } from '../../config/cloudinary'

const emptyForm = {
  title: '',
  description: '',
  discount: '',
  validUntil: '',
  imageUrl: '',
  active: true,
}

export default function PromoForm({ initial, onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState(
    initial
      ? {
          ...initial,
          discount: initial.discount ?? '',
          validUntil: initial.validUntil
            ? new Date(initial.validUntil).toISOString().split('T')[0]
            : '',
        }
      : emptyForm
  )
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setForm((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)
    setError('')
    try {
      const url = await uploadToCloudinary(file)
      setForm((prev) => ({ ...prev, imageUrl: url }))
    } catch (err) {
      setError(err.message)
    } finally {
      setUploading(false)
    }
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.title) {
      setError('Judul promo wajib diisi.')
      return
    }
    onSubmit({
      title: form.title,
      description: form.description,
      discount: form.discount ? Number(form.discount) : null,
      validUntil: form.validUntil ? new Date(form.validUntil).toISOString() : null,
      imageUrl: form.imageUrl,
      active: form.active,
    })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 text-red-600 text-sm px-4 py-3 rounded-lg">{error}</div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Gambar Promo (opsional)</label>
        {form.imageUrl ? (
          <div className="relative w-full h-32 rounded-xl overflow-hidden border border-gray-200">
            <img src={form.imageUrl} alt="Preview" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
              className="absolute top-2 right-2 w-6 h-6 bg-black/50 text-white rounded-full flex items-center justify-center"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <label className="flex flex-col items-center justify-center w-full h-24 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-oriflame transition-colors">
            {uploading ? (
              <Loader2 className="w-6 h-6 text-oriflame animate-spin" />
            ) : (
              <>
                <Upload className="w-6 h-6 text-gray-400 mb-1" />
                <span className="text-xs text-gray-500">Upload gambar promo</span>
              </>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              disabled={uploading}
            />
          </label>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Judul Promo</label>
        <input
          name="title"
          value={form.title}
          onChange={handleChange}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-oriflame/30 focus:border-oriflame"
          placeholder="Contoh: Diskon Skincare 20%"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Deskripsi</label>
        <textarea
          name="description"
          value={form.description}
          onChange={handleChange}
          rows={3}
          className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-oriflame/30 focus:border-oriflame resize-none"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Diskon (%)</label>
          <input
            name="discount"
            type="number"
            value={form.discount}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-oriflame/30 focus:border-oriflame"
            placeholder="20"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Berlaku Hingga</label>
          <input
            name="validUntil"
            type="date"
            value={form.validUntil}
            onChange={handleChange}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-oriflame/30 focus:border-oriflame"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          name="active"
          type="checkbox"
          checked={form.active}
          onChange={handleChange}
          className="w-4 h-4 accent-oriflame"
        />
        <span className="text-sm text-gray-700">Promo aktif</span>
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={submitting || uploading}
          className="flex-1 bg-oriflame text-white font-semibold py-2.5 rounded-lg hover:bg-oriflame-dark transition-colors disabled:opacity-50"
        >
          {submitting ? 'Menyimpan...' : 'Simpan'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Batal
          </button>
        )}
      </div>
    </form>
  )
}
