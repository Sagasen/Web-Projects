import React, { useState, useEffect } from 'react';
import { User, Shield, Compass, Upload, CheckCircle2, AlertCircle, Coins, Loader2 } from 'lucide-react';
import supabase, { isSupabaseConfigured } from '../lib/supabase';
import { formatCurrency } from '../lib/utils';

export default function OrderFormStep({ onSubmit }) {
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [robuxAmount, setRobuxAmount] = useState('');
  const [ktpVerified, setKtpVerified] = useState('Belum');
  const [notes, setNotes] = useState('');

  // Pricing
  const [quote, setQuote] = useState(null);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  // Upload
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploadedPath, setUploadedPath] = useState('');
  const [uploadError, setUploadError] = useState('');

  // ── Fetch Pricing Quote ────────────────────────────────────────
  useEffect(() => {
    const fetchQuote = async () => {
      const parsedRobux = parseInt(robuxAmount);
      if (!username.trim() || isNaN(parsedRobux) || parsedRobux <= 0) {
        setQuote(null);
        setQuoteError(null);
        return;
      }

      setLoadingQuote(true);
      setQuoteError(null);
      try {
        const { data, error } = await supabase.rpc('get_order_quote', {
          p_roblox_username: username.trim(),
          p_robux_amount: parsedRobux
        });

        if (error) throw error;

        if (data) {
          const q = Array.isArray(data) ? data[0] : data;
          if (q) {
            setQuote({
              category: q.category,
              price_per_robux: q.price_per_robux,
              total_price: q.total_price
            });
          } else {
            setQuote(null);
          }
        } else {
          setQuote(null);
        }
      } catch (err) {
        console.error('Error fetching pricing quote:', err);
        setQuoteError('Gagal mengambil tarif dari server. Menggunakan estimasi lokal.');
        const rate = 120;
        setQuote({ category: 'Normal', price_per_robux: rate, total_price: parsedRobux * rate });
      } finally {
        setLoadingQuote(false);
      }
    };

    const timer = setTimeout(fetchQuote, 400);
    return () => clearTimeout(timer);
  }, [username, robuxAmount]);

  // ── File Upload ────────────────────────────────────────────────
  const handleFileUpload = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(selectedFile.type)) {
      setUploadError('File harus berupa JPEG, PNG, atau WebP.');
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      setUploadError('Ukuran file maksimal 5MB.');
      return;
    }

    setUploadError('');
    setUploading(true);
    setUploadProgress(10);
    setUploadedPath('');
    setUploadedUrl('');

    try {
      if (isSupabaseConfigured) {
        // Safe file name — no special characters
        const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const filePath = `${Date.now()}-${crypto.randomUUID()}-${safeFileName}`;

        setUploadProgress(30);
        const { data, error: uploadErr } = await supabase.storage
          .from('payment-proofs')
          .upload(filePath, selectedFile, {
            cacheControl: '3600',
            upsert: false,
            contentType: selectedFile.type
          });

        if (uploadErr) {
          console.error('Payment proof upload error:', uploadErr);
          throw uploadErr;
        }

        setUploadProgress(90);
        setUploadedPath(data.path);
        // Use local object URL for preview — bucket is private
        setUploadedUrl(URL.createObjectURL(selectedFile));
      } else {
        // Offline mock
        await new Promise(r => setTimeout(r, 1200));
        const safeFileName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        setUploadedPath(`mock/${Date.now()}-${safeFileName}`);
        setUploadedUrl(URL.createObjectURL(selectedFile));
      }
      setUploadProgress(100);
    } catch (err) {
      console.error('Payment proof upload error:', err);
      setUploadError(`Gagal mengunggah bukti pembayaran: ${err.message}`);
      setUploadedPath('');
      setUploadedUrl('');
      setUploadProgress(0);
    } finally {
      setUploading(false);
    }
  };

  // ── Submit ─────────────────────────────────────────────────────
  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!username || !displayName || !uploadedPath) return;

    onSubmit({
      username,
      displayName,
      robuxAmount,
      ktpVerified,
      notes,
      paymentProofPath: uploadedPath,
      paymentProofUrl: null // private bucket
    });
  };

  // ── Derived state ──────────────────────────────────────────────
  const isQuoteValid =
    quote &&
    typeof quote.price_per_robux === 'number' && quote.price_per_robux > 0 &&
    typeof quote.total_price === 'number' && quote.total_price > 0;

  const isFormValid =
    username.trim() !== '' &&
    displayName.trim() !== '' &&
    robuxAmount !== '' && parseInt(robuxAmount) > 0 &&
    ktpVerified !== '' &&
    uploadedPath !== '' &&
    isQuoteValid &&
    !loadingQuote;

  // ── Render ─────────────────────────────────────────────────────
  return (
    <form onSubmit={handleFormSubmit} className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
      {/* Decorative glow */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-gold-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Offline warning */}
      {!isSupabaseConfigured && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-yellow-400">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Offline Demo Mode:</span> Database Supabase belum dikonfigurasi. Upload file dan pendaftaran transaksi akan disimulasikan secara lokal.
          </div>
        </div>
      )}

      {/* Title */}
      <div className="flex items-center gap-3 border-b border-obsidian-border pb-4">
        <Compass className="w-6 h-6 text-gold-primary animate-pulse-slow" />
        <h2 className="font-fantasy text-xl font-semibold text-glow-gold text-gold-light">Form Order &amp; Pembayaran</h2>
      </div>

      {/* Username + Display Name */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Username Roblox</label>
          <div className="relative rounded-lg overflow-hidden border border-obsidian-border bg-obsidian-950/80 focus-within:border-gold-primary transition-all duration-300">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-slate-500" />
            </div>
            <input
              type="text"
              required
              placeholder="Username Roblox Anda"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none text-sm font-medium"
            />
          </div>
        </div>

        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Display Name Roblox</label>
          <div className="relative rounded-lg overflow-hidden border border-obsidian-border bg-obsidian-950/80 focus-within:border-gold-primary transition-all duration-300">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-slate-500 opacity-60" />
            </div>
            <input
              type="text"
              required
              placeholder="Display Name Roblox Anda"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="block w-full pl-10 pr-3 py-3 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none text-sm font-medium"
            />
          </div>
        </div>
      </div>

      {/* Jumlah Robux + Pricing */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Jumlah Robux</label>
        <div className="relative rounded-lg overflow-hidden border border-obsidian-border bg-obsidian-950/80 focus-within:border-gold-primary transition-all duration-300">
          <input
            type="number"
            min="100"
            step="100"
            required
            value={robuxAmount}
            onChange={(e) => {
              const val = e.target.value;
              // Izinkan kosong (saat user hapus semua), atau angka positif tanpa leading zero
              if (val === '' || (/^\d+$/.test(val) && parseInt(val) > 0)) {
                setRobuxAmount(val === '' ? '' : parseInt(val).toString());
              }
            }}
            className="block w-full px-4 py-3 bg-transparent text-slate-100 focus:outline-none text-center font-bold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-slate-500 pointer-events-none">Robux</span>
        </div>

        {/* Pricing Summary */}
        <div className="grid grid-cols-2 gap-4 bg-obsidian-950/60 p-4 rounded-xl border border-obsidian-border mt-3">
          <div className="space-y-1">
            <span className="flex items-center gap-1 text-[10px] uppercase font-bold tracking-wider text-slate-500">
              <Coins className="w-3.5 h-3.5 text-gold-dark" />
              Harga Satuan
            </span>
            <div className="flex items-center gap-2 min-h-[28px]">
              {loadingQuote ? (
                <span className="text-sm font-semibold text-slate-400">Menghitung...</span>
              ) : (!username.trim() || !robuxAmount || robuxAmount <= 0) ? (
                <span className="text-xs text-slate-500 leading-tight">Lengkapi username dan jumlah Robux</span>
              ) : (!quote || !quote.price_per_robux) ? (
                <span className="text-sm font-semibold text-slate-400">Menghitung...</span>
              ) : (
                <span className="text-lg font-extrabold text-white">
                  {formatCurrency(quote.price_per_robux)} <span className="text-xs text-slate-500 font-normal">/ Robux</span>
                </span>
              )}
            </div>
          </div>
          <div className="space-y-1">
            <span className="block text-[10px] uppercase font-bold tracking-wider text-slate-500">Total Biaya</span>
            <div className="flex items-center min-h-[28px]">
              {loadingQuote ? (
                <span className="text-sm font-semibold text-slate-400">Menghitung...</span>
              ) : (!username.trim() || !robuxAmount || robuxAmount <= 0) ? (
                <span className="text-xs text-slate-500 leading-tight">Lengkapi username dan jumlah Robux</span>
              ) : (!quote || !quote.total_price) ? (
                <span className="text-sm font-semibold text-slate-400">Menghitung...</span>
              ) : (
                <span className="text-lg font-extrabold text-gold-light text-glow-gold">
                  {formatCurrency(quote.total_price)}
                </span>
              )}
            </div>
          </div>
        </div>

        {quoteError && (
          <div className="text-[11px] text-yellow-400 font-semibold flex items-center gap-1.5 mt-2 px-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{quoteError}</span>
          </div>
        )}
      </div>

      {/* Verifikasi Umur / KTP */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Verifikasi Umur / KTP (18+)</label>
        <div className="flex gap-4">
          {['Sudah', 'Belum'].map((opt) => {
            const isSelected = ktpVerified === opt;
            return (
              <label
                key={opt}
                className={`flex-1 flex items-center justify-between p-3.5 rounded-lg border transition-all duration-300 cursor-pointer ${isSelected
                    ? 'bg-gold-primary/10 border-gold-primary text-gold-light'
                    : 'bg-obsidian-950/40 border-obsidian-border text-slate-400 hover:border-gold-dark/40 hover:text-slate-300'
                  }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${isSelected ? 'text-gold-primary' : 'text-slate-500'}`} />
                  <span className="text-sm font-semibold">{opt} Verifikasi</span>
                </div>
                <input
                  type="radio"
                  name="ktpVerified"
                  value={opt}
                  checked={isSelected}
                  onChange={() => setKtpVerified(opt)}
                  className="w-4 h-4 accent-gold-primary cursor-pointer"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Catatan Tambahan */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Catatan Tambahan (Opsional)</label>
        <div className="rounded-lg overflow-hidden border border-obsidian-border bg-obsidian-950/80 focus-within:border-gold-primary transition-all duration-300">
          <textarea
            rows="2"
            placeholder="Tulis instruksi khusus atau catatan tambahan di sini..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="block w-full p-4 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none text-sm font-medium resize-none"
          />
        </div>
      </div>

      {/* QR Code Pembayaran */}
      <div className="space-y-4 p-5 md:p-6 rounded-xl border border-obsidian-border bg-obsidian-950/50">
        <label className="block text-xs font-semibold uppercase tracking-wider text-gold-light text-center">Payment QR Code</label>
        <div className="flex flex-col items-center gap-6 justify-center py-2">
          <div className="w-full max-w-[320px] sm:max-w-[380px] md:max-w-[420px] aspect-square rounded-2xl overflow-hidden bg-white p-3 border-2 border-gold-primary/45 shadow-[0_0_20px_rgba(212,175,55,0.15)] flex items-center justify-center relative group">
            {/* Scanner line */}
            <div className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-gold-primary to-transparent animate-[bounce_3s_infinite] shadow-[0_0_8px_rgba(212,175,55,0.6)] pointer-events-none"></div>
            <img
              src="/payment-qr.png"
              alt="Payment QRIS"
              className="w-full h-full object-contain rounded-xl"
              onError={(e) => {
                e.target.style.display = 'none';
                const svgElem = e.target.nextSibling;
                if (svgElem) svgElem.removeAttribute('style');
              }}
            />
            {/* Fallback SVG QR */}
            <svg className="w-full h-full select-none" style={{ display: 'none' }} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
              <rect x="0" y="0" width="25" height="25" fill="#0a0a0c" />
              <rect x="3" y="3" width="19" height="19" fill="#ffffff" />
              <rect x="6" y="6" width="13" height="13" fill="#d4af37" />
              <rect x="75" y="0" width="25" height="25" fill="#0a0a0c" />
              <rect x="78" y="3" width="19" height="19" fill="#ffffff" />
              <rect x="81" y="6" width="13" height="13" fill="#d4af37" />
              <rect x="0" y="75" width="25" height="25" fill="#0a0a0c" />
              <rect x="3" y="78" width="19" height="19" fill="#ffffff" />
              <rect x="6" y="81" width="13" height="13" fill="#d4af37" />
              <path d="M 30,5 H 40 V 10 H 30 Z M 45,0 H 55 V 5 H 45 Z M 60,5 H 70 V 15 H 60 Z" fill="#0a0a0c" />
              <path d="M 35,20 H 45 V 30 H 35 Z M 50,15 H 65 V 20 H 50 Z M 70,20 H 75 V 35 H 70 Z" fill="#7f1d1d" />
              <rect x="38" y="38" width="24" height="24" rx="4" fill="#0a0a0c" />
              <rect x="40" y="40" width="20" height="20" rx="3" fill="#d4af37" />
              <path d="M 44,54 V 46 L 50,50 L 56,46 V 54" stroke="#06040a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </div>

          <div className="w-full max-w-[420px] space-y-2 text-slate-300 text-xs bg-obsidian-950/40 p-4 rounded-xl border border-obsidian-border/50">
            <span className="block font-bold text-slate-100 text-center sm:text-left">Instruksi Pembayaran:</span>
            <ol className="list-decimal pl-4 space-y-1 text-slate-400">
              <li>Scan QRIS di atas dengan aplikasi e-wallet Anda.</li>
              <li>Pastikan nominal transfer sesuai dengan <b>Total Biaya</b> di atas.</li>
              <li>Ambil screenshot bukti transfer berhasil.</li>
              <li>Upload screenshot bukti transfer pada kolom di bawah.</li>
            </ol>
          </div>
        </div>
      </div>

      {/* Upload Bukti Pembayaran */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Upload Bukti Pembayaran</label>

        <div className="relative border-2 border-dashed border-obsidian-border rounded-xl bg-obsidian-950/40 p-5 flex flex-col items-center justify-center transition-all duration-300 hover:border-gold-dark/40">
          <input
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            onChange={handleFileUpload}
            disabled={uploading}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          />

          {uploadedUrl ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-full text-emerald-400">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <span className="block text-sm font-bold text-emerald-400">Bukti Pembayaran Terunggah!</span>
                <span className="text-[10px] text-slate-400 block max-w-xs truncate mt-1">{uploadedPath.split('/').pop()}</span>
              </div>
              <img src={uploadedUrl} alt="preview" className="max-h-32 rounded-lg border border-obsidian-border object-contain" />
            </div>
          ) : uploading ? (
            <div className="flex flex-col items-center gap-3 text-center">
              <Loader2 className="w-6 h-6 text-gold-primary animate-spin" />
              <div className="w-48 bg-obsidian-900 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-gold-primary h-1.5 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <span className="text-xs text-slate-400">Mengunggah file... {uploadProgress}%</span>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-3 text-center">
              <Upload className="w-8 h-8 text-slate-500" />
              <div>
                <span className="block text-sm font-bold text-slate-300">Klik atau seret file ke sini</span>
                <span className="text-[10px] text-slate-500 block mt-1">Menerima JPG, JPEG, PNG, WEBP — Maks 5MB</span>
              </div>
            </div>
          )}
        </div>

        {uploadError && (
          <div className="text-xs text-crimson-light font-bold flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </div>

      {/* Submit */}
      <div className="pt-4">
        <button
          type="submit"
          disabled={!isFormValid || loadingQuote || uploading}
          className={`w-full py-4 rounded-xl text-center text-sm font-bold tracking-widest uppercase transition-all duration-300 ${isFormValid && !uploading
              ? 'btn-premium-gold cursor-pointer shadow-[0_0_15px_rgba(212,175,55,0.25)]'
              : 'bg-slate-800 border border-slate-700/50 text-slate-500 cursor-not-allowed opacity-50'
            }`}
        >
          {loadingQuote ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Menghitung Tarif...
            </span>
          ) : uploading ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Mengunggah Bukti Pembayaran...
            </span>
          ) : (
            'Lanjut ke Preview Chat'
          )}
        </button>
      </div>
    </form>
  );
}
