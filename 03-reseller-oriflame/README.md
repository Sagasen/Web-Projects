# Oriflame Catalog

Aplikasi web katalog produk Oriflame dengan React + Vite + Tailwind CSS, Firebase Firestore, Cloudinary, dan Firebase Authentication.

## Fitur

- **Beranda** — Banner promo + grid produk (foto, nama, kategori, harga)
- **Filter kategori** — Skincare, Makeup, Parfum, Hair Care, Body Care
- **Detail produk** — Tombol "Order via WhatsApp" dengan pesan otomatis
- **Keranjang belanja** — Quantity control + pesan WhatsApp dengan total harga
- **Halaman promo/diskon** — Daftar promo aktif dan sebelumnya
- **Admin panel** — Login email/password, CRUD produk & promo, upload foto via Cloudinary

## Tech Stack

- React 19 + Vite 8
- Tailwind CSS 4
- Firebase Firestore & Authentication
- Cloudinary
- React Router DOM
- Lucide React (ikon)

---

## Cara Menjalankan

### 1. Install dependensi

```bash
npm install
```

### 2. Buat file `.env`

Salin dari `.env.example`:

```bash
cp .env.example .env
```

Isi nilai berikut:

```env
VITE_CLOUDINARY_CLOUD_NAME=nama_cloud_anda
VITE_CLOUDINARY_UPLOAD_PRESET=nama_upload_preset_anda
VITE_WHATSAPP_NUMBER=6281234567890
```

> **WhatsApp Number**: Format tanpa `+`, contoh `6281234567890` untuk nomor Indonesia.

### 3. Setup Firebase

Project ini menggunakan Firebase Authentication untuk login admin dan Firestore sebagai database produk serta promo.

Langkah setup:

1. Buat project di Firebase Console.
2. Aktifkan **Authentication** dengan metode **Email/Password**.
3. Buat akun admin melalui menu **Authentication → Users**.
4. Aktifkan **Firestore Database**.
5. Terapkan rules dari file `firestore.rules`.

Jika Firestore meminta composite index, ikuti link error yang muncul di browser console untuk membuat index secara otomatis.

### 4. Setup Cloudinary

Project ini menggunakan Cloudinary untuk upload gambar produk dan promo.

Langkah setup:

1. Buat akun Cloudinary.
2. Catat **Cloud Name** dari dashboard.
3. Buat **Unsigned Upload Preset**.
4. Masukkan konfigurasi Cloudinary ke file `.env`.

Contoh:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_upload_preset
VITE_WHATSAPP_NUMBER=6281234567890
```

### 5. Jalankan development server

```bash
npm run dev
```

Buka `http://localhost:5173`

### 6. Build untuk production

```bash
npm run build
npm run preview
```

---

## Struktur Proyek

```
src/
├── config/
│   ├── firebase.js       # Konfigurasi Firebase
│   └── cloudinary.js     # Upload gambar ke Cloudinary
├── constants/
│   └── categories.js     # Daftar kategori produk
├── contexts/
│   ├── AuthContext.jsx   # State autentikasi admin
│   └── CartContext.jsx   # State keranjang (localStorage)
├── services/
│   ├── productService.js # CRUD produk Firestore
│   └── promoService.js   # CRUD promo Firestore
├── components/
│   ├── admin/            # Form & proteksi admin
│   ├── common/           # Banner, Loading, EmptyState
│   ├── layout/           # Navbar, Footer, Layout
│   └── product/          # ProductCard, Grid, Filter
├── pages/
│   ├── HomePage.jsx
│   ├── ProductDetailPage.jsx
│   ├── CartPage.jsx
│   ├── PromoPage.jsx
│   ├── AdminLoginPage.jsx
│   └── AdminDashboardPage.jsx
└── utils/
    ├── formatCurrency.js
    └── whatsapp.js
```

## Koleksi Firestore

### `products`
```json
{
  "name": "Optimals Hydra Radiance",
  "category": "Skincare",
  "price": 150000,
  "discountPrice": 120000,
  "description": "Pelembab wajah untuk kulit kering",
  "imageUrl": "https://res.cloudinary.com/...",
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

### `promos`
```json
{
  "title": "Diskon Skincare 20%",
  "description": "Berlaku untuk semua produk skincare",
  "discount": 20,
  "validUntil": "2026-12-31T00:00:00.000Z",
  "imageUrl": "https://res.cloudinary.com/...",
  "active": true,
  "createdAt": "timestamp",
  "updatedAt": "timestamp"
}
```

## Rute Aplikasi

| Rute | Halaman |
|------|---------|
| `/` | Beranda (katalog produk) |
| `/produk/:id` | Detail produk |
| `/keranjang` | Keranjang belanja |
| `/promo` | Promo & diskon |
| `/admin` | Login admin |
| `/admin/dashboard` | Panel admin (protected) |

## Warna Tema

- Primary: `#C84B8A` (Oriflame Pink)
- Dark: `#A83A72`
- Light: `#F5E6EE`

## Catatan

- Keranjang disimpan di `localStorage` browser
- Upload gambar admin memerlukan Cloudinary unsigned upload preset
- Pastikan security rules Firestore sudah di-deploy sebelum production
- Untuk deploy ke Vercel/Netlify, tambahkan environment variables yang sama di dashboard hosting
