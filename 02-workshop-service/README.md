# Workshop Service

Workshop Service adalah aplikasi web manajemen servis bengkel berbasis Google Apps Script dan Google Sheets.

Project ini dibuat untuk membantu proses pengelolaan data pelanggan, kendaraan, servis, invoice, dan laporan servis customer.

## Fitur

- Login admin dan customer
- Dashboard admin
- Dashboard customer
- Manajemen data pelanggan
- Manajemen data kendaraan
- Input data servis
- Data sparepart
- Riwayat servis customer
- Detail invoice servis
- Export invoice ke PDF
- Laporan servis melalui WhatsApp
- Reminder servis

## Teknologi

- Google Apps Script
- HTML
- CSS
- JavaScript
- Google Sheets

## Struktur File

| File | Fungsi |
|---|---|
| `Admin.js` | Mengatur fitur utama untuk admin, seperti pengelolaan data pada dashboard admin |
| `AdminDashboard.html` | Tampilan utama dashboard admin |
| `AdminHome.html` | Tampilan halaman beranda/admin home |
| `Auth.js` | Mengatur proses login dan autentikasi admin/customer |
| `CSS.html` | Berisi styling atau tampilan CSS aplikasi |
| `Customer.js` | Mengatur fitur dan data yang berhubungan dengan customer |
| `CustomerDashboard.html` | Tampilan utama dashboard customer |
| `CustomerHistory.html` | Tampilan riwayat servis customer |
| `Dashboard.js` | Mengatur fungsi umum pada dashboard |
| `Database.js` | Mengatur koneksi, konfigurasi, dan pengambilan data dari Google Sheets |
| `Invoice.html` | Tampilan halaman invoice servis |
| `InvoicePdf.html` | Template invoice yang digunakan untuk export PDF |
| `JS.html` | Berisi script JavaScript untuk tampilan/frontend |
| `Kode.js` | File utama Apps Script untuk menjalankan fungsi web app |
| `Login.html` | Tampilan halaman login admin dan customer |
| `PDF.js` | Mengatur proses pembuatan/export invoice ke PDF |
| `README.md` | Dokumentasi project Workshop Service |
| `Reminder.js` | Mengatur fitur reminder servis |
| `Service.js` | Mengatur proses input, penyimpanan, dan pengambilan data servis |
| `ServiceForm.html` | Tampilan form input data servis |
| `Sparepart.js` | Mengatur data sparepart atau detail pengeluaran sparepart |
| `WhatsApp.js` | Mengatur pengiriman laporan servis melalui WhatsApp |
| `appsscript.json` | File manifest konfigurasi Google Apps Script |

## Alur Aplikasi

1. Admin login ke dashboard.
2. Admin mengelola data pelanggan dan kendaraan.
3. Admin menginput data servis kendaraan.
4. Data servis tersimpan ke Google Sheets.
5. Customer dapat login untuk melihat riwayat servis.
6. Customer dapat melihat detail invoice servis.
7. Sistem dapat membuat invoice dalam bentuk PDF.
8. Sistem dapat mengirim laporan servis melalui WhatsApp.

## Status Project

Project ini dibuat untuk kebutuhan magang dan masih dapat dikembangkan lebih lanjut.
