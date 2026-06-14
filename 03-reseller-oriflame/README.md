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
- Cloudinary (upload gambar gratis)
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

Firebase config sudah dikonfigurasi di `src/config/firebase.js`.

#### a. Aktifkan Authentication

1. Buka [Firebase Console](https://console.firebase.google.com/) → project `oriflame-catalog-d7ad5`
2. **Authentication** → **Sign-in method** → aktifkan **Email/Password**
3. **Authentication** → **Users** → **Add user** → buat akun admin (email + password)

#### b. Aktifkan Firestore

1. **Firestore Database** → **Create database** → pilih mode **Production** (atau Test untuk development)
2. Deploy security rules dari file `firestore.rules`:

   ```bash
   firebase deploy --only firestore:rules
   ```

   Atau salin isi `firestore.rules` ke **Firestore** → **Rules** di Firebase Console.

#### c. Buat index (jika diminta)

Firestore mungkin meminta composite index untuk query `orderBy('createdAt')`. Klik link error di browser console untuk membuat index otomatis.

### 4. Setup Cloudinary (Gratis, Tanpa Kartu Kredit)

1. Daftar di [cloudinary.com](https://cloudinary.com/) (paket Free)
2. Di **Dashboard**, catat **Cloud Name**
3. Buka **Settings** → **Upload** → **Upload presets**
4. Klik **Add upload preset**:
   - **Signing Mode**: `Unsigned`
   - **Folder** (opsional): `oriflame`
   - Simpan dan catat nama preset-nya
5. Masukkan ke file `.env`:
   ```
   VITE_CLOUDINARY_CLOUD_NAME=...
   VITE_CLOUDINARY_UPLOAD_PRESET=...
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
