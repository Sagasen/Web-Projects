# Tarasari Booking App

Aplikasi web booking tempat senam untuk **Tarasari** — dibangun dengan React + Vite + Supabase.

---

## Tech Stack

| Layer | Teknologi |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Tailwind CSS |
| Backend / DB | Supabase (PostgreSQL) |
| Auth | Supabase Auth — email + password |
| Routing | React Router v6 |
| Icon | Lucide React |
| Date utility | date-fns |

---

## Tiga Level Akses

| Level | Wajib Login? | Hak Akses |
|---|---|---|
| **Pengunjung** | Tidak | Lihat kalender, lihat detail jam per tanggal |
| **Customer** | Ya (role `customer`) | Booking baru + riwayat booking sendiri |
| **Admin** | Ya (role `admin`) | Kelola semua booking, jadwal tutup, booking manual |

> Customer dan Admin sama-sama login lewat Supabase Auth yang sama.  
> Yang membedakan hak akses adalah kolom `role` di tabel `profiles`.

---

## Setup Awal

### 1. Clone & install

```bash
git clone <repo-url>
cd tarasari-booking
npm install
```

### 2. Buat file `.env`

```bash
cp .env.example .env
```

Isi dengan nilai dari **Supabase Dashboard → Settings → API**:

```env
VITE_SUPABASE_URL=https://xxxxxxxxxxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

> ⚠️ Jangan pernah taruh `service_role` key di `.env` frontend.

### 3. Jalankan migrasi database

Buka **Supabase Dashboard → SQL Editor**, lalu copy-paste dan jalankan isi file:

```
supabase/migrations/001_init.sql
```

File ini akan membuat:
- Tabel `profiles`, `bookings`, `closed_dates`
- Fungsi `is_admin()` dan `handle_new_user()`
- Trigger otomatis saat user baru daftar
- Exclusion constraint anti-bentrok jam
- RLS (Row Level Security) untuk semua tabel
- View `bookings_public` untuk halaman kalender publik

### 4. Buat akun Admin

Lewat **Supabase Dashboard → Authentication → Add User**:
- Isi email & password
- Klik **User Metadata** → masukkan JSON:
  ```json
  { "role": "admin", "full_name": "Nama Admin" }
  ```

> Jika lupa isi metadata: buka **Table Editor → profiles** → ubah kolom `role` dari `'customer'` ke `'admin'`.

### 5. Jalankan dev server

```bash
npm run dev
```

---

## Struktur File (yang sudah dibuat)

```
tarasari-booking/
├── supabase/
│   └── migrations/
│       └── 001_init.sql              ← ⭐ jalankan ini di Supabase SQL Editor
│
├── src/
│   ├── lib/
│   │   ├── supabaseClient.js         ← inisialisasi Supabase client
│   │   ├── authUtils.js              ← signIn, signUp, signOut, getCurrentProfile
│   │   └── AuthContext.jsx           ← global auth state (session, profile, role)
│   │
│   ├── components/
│   │   └── layout/
│   │       ├── RequireAuth.jsx       ← guard: wajib login (role apapun)
│   │       ├── RequireAdminRole.jsx  ← guard: wajib login DAN role = admin ⭐
│   │       ├── CustomerLayout.jsx    ← topbar + nav untuk dashboard customer
│   │       └── AdminLayout.jsx       ← sidebar untuk semua halaman admin
│   │
│   ├── pages/
│   │   ├── public/
│   │   │   ├── CalendarPage.jsx      ← halaman utama kalender publik
│   │   │   ├── LoginPage.jsx         ← ⭐ login customer (lengkap)
│   │   │   └── SignupPage.jsx        ← ⭐ daftar customer baru (lengkap)
│   │   │
│   │   ├── customer/
│   │   │   ├── DashboardPage.jsx     ← ⭐ riwayat booking customer (lengkap)
│   │   │   ├── BookingFormPage.jsx   ← form booking customer
│   │   │   └── BookingSuccessPage.jsx
│   │   │
│   │   └── admin/
│   │       ├── AdminLoginPage.jsx    ← ⭐ login admin + validasi role (lengkap)
│   │       ├── AdminDashboardPage.jsx← ⭐ ringkasan + aksi cepat admin (lengkap)
│   │       ├── AdminBookingsPage.jsx ← tabel kelola booking
│   │       ├── AdminCalendarPage.jsx ← kalender admin + booking manual
│   │       └── AdminClosedDatesPage.jsx ← jadwal tutup (stub)
│   │
│   ├── routes/
│   │   └── AppRoutes.jsx             ← ⭐ semua route + guard terpasang
│   │
│   ├── App.jsx
│   ├── main.jsx
│   └── index.css
│
├── tailwind.config.js
├── package.json
├── .env.example
└── README.md
```

---

## Routes

| Route | Guard | Halaman |
|---|---|---|
| `/` | Publik | Kalender booking |
| `/login` | Publik | Login customer |
| `/signup` | Publik | Daftar akun baru |
| `/admin` | Publik | Login admin |
| `/dashboard` | `RequireAuth` | Riwayat booking saya |
| `/dashboard/booking` | `RequireAuth` | Form booking baru |
| `/dashboard/booking-success` | `RequireAuth` | Konfirmasi booking terkirim |
| `/admin/dashboard` | `RequireAdminRole` | Dashboard ringkasan admin |
| `/admin/bookings` | `RequireAdminRole` | Kelola semua booking |
| `/admin/calendar` | `RequireAdminRole` | Kalender admin |
| `/admin/closed-dates` | `RequireAdminRole` | Jadwal tutup/libur |

---

## Cara Kerja Guard Admin (`RequireAdminRole`)

```
User akses /admin/*
    │
    ├─ loading session? → tampil spinner
    │
    ├─ belum login?     → redirect /admin/login
    │
    ├─ sudah login tapi role ≠ admin?
    │     → signOut otomatis di AdminLoginPage
    │     → redirect / (homepage)
    │
    └─ login + role = admin → render halaman admin ✅
```

> **Penting:** Guard ini cek role dari tabel `profiles` via `AuthContext`,  
> **bukan** hanya cek apakah session ada. Ini mencegah customer masuk ke admin panel.

---

## Catatan Developer

- Validasi bentrok jam **wajib double-check** di database (exclusion constraint di `001_init.sql`), jangan hanya di frontend — dua user bisa submit bersamaan (race condition).
- View `bookings_public` tidak menyertakan `customer_name`, `customer_phone`, `customer_id` — aman untuk kalender publik tanpa login.
- Simpan semua timestamp dalam UTC di database, convert ke WIB (Asia/Jakarta) hanya saat ditampilkan.
- Booking manual oleh admin: `customer_id` boleh null, `customer_name` & `customer_phone` tetap wajib diisi manual.

---

## Fitur V1

- [x] Database schema + RLS + exclusion constraint
- [x] AuthContext (global session + profile + role)
- [x] Guard `RequireAuth` (wajib login)
- [x] Guard `RequireAdminRole` (wajib admin)
- [x] Login customer (`/login`)
- [x] Sign up customer (`/signup`)
- [x] Dashboard customer — riwayat booking (`/dashboard`)
- [x] Login admin dengan validasi role (`/admin/login`)
- [x] Dashboard admin — ringkasan + aksi cepat (`/admin`)
- [x] Routing lengkap dengan semua guard

## Fitur Berikutnya (Stub sudah ada, tinggal diisi)

- [x] Kalender publik (`CalendarPage`)
- [x] Form booking customer (`BookingFormPage`)
- [x] Tabel kelola booking admin (`AdminBookingsPage`)
- [x] Kalender admin + booking manual (`AdminCalendarPage`)
- [x] Jadwal tutup/libur (`AdminClosedDatesPage`)
- [ ] Customer batalkan booking sendiri (selama pending)
- [ ] Reset password via email
- [ ] Notifikasi WhatsApp/email saat status berubah
