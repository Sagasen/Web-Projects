# Eternal Myth Studio — Payout Community

Aplikasi portal order dan management payout komunitas Roblox resmi untuk **Eternal Myth Studio** dengan integrasi database, storage, dan authentikasi Supabase.

## Fitur Utama

### 1. Customer Payout Flow (Multi-Step)
* **Step 1: Order & Payment**
  * Input data Roblox (Username & Display Name).
  * Penghitungan harga satuan dan total biaya Robux secara dinamis dari server database.
  * Verifikasi KTP, catatan transaksi, scan QRIS (`public/payment-qr.png`), dan upload bukti pembayaran (JPG/PNG/WEBP).
  * Tombol **Lanjut** baru aktif setelah bukti pembayaran terunggah.
* **Step 2: Chat Preview**
  * Preview format chat otomatis sesuai standar komunitas.
  * Tombol **Copy Text Chat** untuk mempermudah penyalinan.
  * Redirect instan ke admin WhatsApp (dengan pesan teks terenkripsi), Discord, atau TikTok.

### 2. Logika Penentuan Kategori & Harga
Semua evaluasi harga dan kategori customer diproses secara aman di tingkat database (PostgreSQL RPC function):
* **Staff Member:** Terdaftar di database staff aktif $\rightarrow$ **Rp100 / Robux**.
* **Pembelian Pertama:** Username Roblox tidak terdaftar di staff dan belum memiliki riwayat transaksi dengan status `completed` $\rightarrow$ **Rp100 / Robux**.
* **Normal:** Username Roblox memiliki minimal satu transaksi dengan status `completed` $\rightarrow$ **Rp120 / Robux**.

### 3. Admin Portal Portal (Auth Protected)
* **Login Admin:** Masuk menggunakan kredensial email dan sandi administrator (terintegrasi Supabase Auth).
* **Dashboard Stats:** Menampilkan total order pending, total order selesai, total pemasukan rupiah hari ini, dan total volume Robux terjual hari ini.
* **Daftar Orders:** Tabel data order masuk lengkap dengan lightbox preview bukti transfer, tombol **Konfirmasi Selesai** (merubah status jadi `completed`), dan **Batalkan** (merubah status jadi `cancelled`).
* **Daftar Staff:** Kelola data staff (tambah username staff, aktifkan/nonaktifkan, ubah display name, hapus data staff).

---

## Cara Setup Supabase & Proyek

### Langkah 1: Jalankan SQL Schema
1. Buka console proyek Supabase Anda.
2. Buka menu **SQL Editor**.
3. Buat query baru, salin seluruh isi file [supabase/schema.sql](file:///d:/eternal-myth.studio/supabase/schema.sql), lalu klik **Run** (Jalankan).
4. Pastikan tabel `admin_users`, `staff_members`, `transactions`, `app_settings` serta function `get_order_quote` dan `create_order` berhasil dibuat.

### Langkah 2: Buat Storage Bucket
1. Buka dashboard Supabase Anda, lalu pilih menu **Storage**.
2. Klik **New Bucket**.
3. Beri nama bucket: `payment-proofs`.
4. Pastikan pilihan **Public Bucket** diaktifkan (agar foto bukti transfer dapat diakses/dilihat oleh admin pada dashboard).
5. Simpan bucket baru tersebut.

### Langkah 3: Konfigurasi Variabel Lingkungan (.env)
1. Salin file `.env.example` menjadi `.env.local` di folder root proyek:
   ```bash
   copy .env.example .env.local
   ```
2. Isi nilai url dan anon key dengan data proyek Supabase Anda:
   ```env
   VITE_SUPABASE_URL=https://your-project-id.supabase.co
   VITE_SUPABASE_ANON_KEY=your-actual-anon-public-key
   ```

---

## Offline Demo Mode (Tanpa Supabase)

Jika `.env.local` tidak diisi atau masih menggunakan placeholder:
* Aplikasi akan berjalan secara otomatis dalam **"Offline Demo Mode"**.
* Semua transaksi, upload file, autentikasi admin, dan data staff disimulasikan menggunakan `localStorage`.
* Data akan tetap tersimpan saat halaman dimuat ulang (persistent).
* **Kredensial Login Admin Demo:**
  * **Email:** `admin` atau `admin@eternalmyth.studio`
  * **Sandi:** `admin` atau `admin123`

---

## Cara Menjalankan Proyek

### Jalankan Mode Development (Lokal)
```bash
npm run dev
```
Buka peramban di [http://localhost:5173](http://localhost:5173).

### Build untuk Produksi
```bash
npm run build
```
Hasil build bundel siap pasang akan tersedia di direktori `dist`.

