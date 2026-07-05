# Bakoel Umpluk 🧼

E-commerce sederhana untuk UMKM penjual perlengkapan cuci rumah tangga (deterjen, sabun cuci piring, softener, dll), dibangun dengan **React + Vite + Supabase**, dan fitur **AI (Claude)** untuk chat asisten belanja & analisis keuangan.

## ✨ Fitur

**Customer**
- Katalog produk responsif (mobile & desktop), dengan filter kategori & pencarian
- Badge "🔥 Terlaris" otomatis berdasarkan produk paling banyak dipesan
- Wajib login/daftar (nama, no. HP, alamat) sebelum bisa menambah ke keranjang
- Checkout dengan 3 metode pembayaran: **Tunai**, **QRIS/E-Wallet**, **Transfer Bank**
  - QRIS & Transfer Bank wajib upload bukti pembayaran sebelum bisa memesan
  - Tunai bisa langsung klik pesan
- Notifikasi pesanan otomatis terkirim ke WhatsApp toko
- Riwayat & tracking status pesanan
- **Chat AI** (asisten belanja) mengambang di halaman katalog — tanya rekomendasi produk, cara pakai, dll

**Admin**
- Dashboard ringkasan (omzet, pesanan pending, stok kritis)
- Kelola produk & varian, termasuk **upload gambar produk** langsung dari dashboard (bukan URL)
- Kelola pesanan masuk (ubah status, lihat bukti pembayaran)
- **Keuangan**: grafik omzet & laba harian, produk terlaris, komposisi penjualan (recharts) + **Analisis AI** otomatis
- **Pengaturan**: upload gambar QRIS, atur nomor rekening bank, nomor WhatsApp toko — tanpa perlu deploy ulang

## 🧱 Struktur Proyek

```
├── api/                  # Vercel Serverless Functions (proxy aman ke Claude API)
│   ├── chat.js           # Chat AI asisten belanja customer
│   └── analyze.js        # Analisis AI keuangan (admin)
├── src/
│   ├── components/       # Header, ProductCard, ChatWidget, AdminLayout, dll
│   ├── context/          # Cart, CustomerAuth, AdminAuth, Toast
│   ├── pages/             # Katalog, Cart, Checkout, Orders, Login, Register
│   └── pages/admin/       # Dashboard, Products, Orders, Finance, Settings
├── supabase_migration.sql # Skema database lengkap + sample data
├── vercel.json
└── package.json
```

## 🚀 Cara Setup

### 1. Setup Database (Supabase)

1. Buat project baru di [supabase.com](https://supabase.com)
2. Buka **SQL Editor** → jalankan seluruh isi file `supabase_migration.sql`
3. Ini akan membuat semua tabel, RLS policy, storage bucket (`payment-proofs`, `product-images`, `store-assets`), fungsi `get_best_sellers`, dan data contoh produk

4. Buat akun admin:
   - Buka **Authentication → Users → Add User**, isi email & password admin
   - Copy UUID user yang baru dibuat
   - Jalankan query berikut di SQL Editor (ganti UUID & data):
     ```sql
     INSERT INTO admin_profiles (id, name, email, role)
     VALUES ('UUID-DISINI', 'Nama Admin', 'admin@email.com', 'owner');
     ```
     Gunakan `role = 'owner'` supaya bisa akses halaman **Keuangan** & **Pengaturan**.

### 2. Environment Variables

Salin `.env.example` menjadi `.env` lalu isi:

```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=xxxxx
```

Ambil dari **Supabase Dashboard → Project Settings → API**.

### 3. Install & Jalankan Lokal

```bash
npm install
npm run dev
```

Buka `http://localhost:5173` untuk halaman customer, dan `http://localhost:5173/admin/login` untuk login admin.

> Catatan: fitur AI (`/api/chat` & `/api/analyze`) hanya berjalan setelah di-deploy ke Vercel (atau dijalankan dengan `vercel dev`), karena keduanya adalah Serverless Function.

### 4. Deploy ke Vercel

1. Push kode ini ke GitHub repo baru
2. Import repo di [vercel.com](https://vercel.com)
3. Di **Project Settings → Environment Variables**, tambahkan:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
   - `ANTHROPIC_API_KEY` ← dapatkan dari [console.anthropic.com](https://console.anthropic.com) (untuk fitur Chat AI & Analisis AI keuangan). **Jangan** diberi prefix `VITE_` supaya key ini tetap rahasia di server dan tidak ikut terkirim ke browser.
4. Deploy!

### 5. Atur QRIS & Bank di Dashboard

Setelah deploy, login sebagai admin (role owner) → menu **⚙️ Pengaturan**:
- Upload gambar QRIS toko
- Isi nama bank, nomor rekening, dan atas nama (default: BNI, 0244501044, a.n. Silvia — bisa diganti kapan saja tanpa deploy ulang)
- Isi nomor WhatsApp toko untuk menerima notifikasi pesanan

## 🎨 Tema Warna

Biru muda & putih — bisa disesuaikan lewat CSS variables di `src/styles/index.css` (`--primary`, `--green-*`, dll).

## ⚠️ Catatan Penting soal Fitur AI

- Chat AI & Analisis AI Keuangan memanggil model **Claude (claude-sonnet-4-6)** lewat Anthropic API menggunakan `ANTHROPIC_API_KEY` yang disimpan aman di server (Vercel Environment Variables), tidak pernah dikirim ke browser pelanggan.
- Jika `ANTHROPIC_API_KEY` belum diatur, fitur chat & analisis akan menampilkan pesan error yang ramah, tapi seluruh fitur e-commerce lainnya tetap berjalan normal.
- Biaya pemakaian API mengikuti [harga resmi Anthropic](https://www.anthropic.com/pricing) — pantau pemakaian di [console.anthropic.com](https://console.anthropic.com).
