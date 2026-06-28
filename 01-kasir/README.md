# 01 Kasir - Google Apps Script

Project **01 Kasir** adalah aplikasi kasir sederhana berbasis **Google Apps Script** dan **Google Spreadsheet**.
Aplikasi ini dibuat untuk membantu proses pencatatan transaksi melalui tampilan web yang terhubung langsung dengan data di Spreadsheet.

---

## Tech Stack

| Bagian          | Teknologi             |
| --------------- | --------------------- |
| Backend         | Google Apps Script    |
| Database        | Google Spreadsheet    |
| Frontend        | HTML, CSS, JavaScript |
| Version Control | Git + GitHub          |
| Sync Tool       | clasp                 |

---

## Struktur File

```text
01-kasir/
├── .clasp.json
├── appsscript.json
├── Kode.js
├── index.html
├── script.html
├── style.html
└── README.md
```

### Penjelasan File

| File              | Fungsi                                                                                                                  |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `Kode.js`         | File utama Google Apps Script, biasanya berisi fungsi server-side seperti `doGet()`, akses Spreadsheet, dan proses data |
| `index.html`      | Halaman utama aplikasi web                                                                                              |
| `script.html`     | JavaScript frontend untuk interaksi halaman                                                                             |
| `style.html`      | CSS/tampilan aplikasi                                                                                                   |
| `appsscript.json` | Konfigurasi project Apps Script                                                                                         |
| `.clasp.json`     | Konfigurasi koneksi project lokal dengan Google Apps Script                                                             |

---

## Fitur Utama

* Aplikasi kasir berbasis web
* Terhubung dengan Google Spreadsheet
* Menggunakan Google Apps Script sebagai backend
* Tampilan frontend menggunakan HTML, CSS, dan JavaScript
* Project dapat disinkronkan dengan GitHub
* Mendukung update kode menggunakan `clasp pull` dan `clasp push`

---

## Cara Menjalankan Project

Project ini berjalan melalui Google Apps Script.

1. Buka Google Spreadsheet yang terhubung dengan project ini.
2. Masuk ke menu:

```text
Extensions → Apps Script
```

3. Jalankan atau deploy sebagai Web App melalui menu:

```text
Deploy → New deployment
```

4. Pilih tipe deployment:

```text
Web app
```

5. Atur akses sesuai kebutuhan, lalu klik **Deploy**.

---

## Sinkronisasi dengan Apps Script

Project ini menggunakan `clasp` untuk menghubungkan kode lokal dengan Google Apps Script.

### Install clasp

```bash
npm install -g @google/clasp
```

### Login clasp

```bash
clasp login
```

### Ambil update dari Apps Script ke lokal

Gunakan command ini jika kamu mengedit kode langsung dari Apps Script Editor:

```bash
cd /d D:\Web-Projects\01-kasir
clasp pull
```

### Kirim update dari lokal ke Apps Script

Gunakan command ini jika kamu mengedit kode dari folder lokal:

```bash
cd /d D:\Web-Projects\01-kasir
clasp push
```

---

## Sinkronisasi dengan GitHub

Project ini berada di dalam repository:

```text
Web-Projects
```

Dengan struktur:

```text
Web-Projects/
└── 01-kasir/
```

### Upload perubahan ke GitHub

Jika ada perubahan pada project `01-kasir`, jalankan:

```bash
cd /d D:\Web-Projects
git add 01-kasir
git commit -m "update 01-kasir"
git push
```

---

## Alur Kerja yang Disarankan

### Jika mengedit dari Apps Script Editor

```text
Apps Script Editor
        ↓
clasp pull
        ↓
git add
        ↓
git commit
        ↓
git push
        ↓
GitHub update
```

Command:

```bash
cd /d D:\Web-Projects\01-kasir
clasp pull

cd /d D:\Web-Projects
git add 01-kasir
git commit -m "update 01-kasir from apps script"
git push
```

---

### Jika mengedit dari folder lokal

```text
Folder lokal
        ↓
clasp push
        ↓
Apps Script update
        ↓
git push
        ↓
GitHub update
```

Command:

```bash
cd /d D:\Web-Projects\01-kasir
clasp push

cd /d D:\Web-Projects
git add 01-kasir
git commit -m "update 01-kasir"
git push
```

---

## Auto Sync

Project ini dapat dibuat otomatis sinkron dari Apps Script ke GitHub menggunakan GitHub Actions.

Alur auto sync:

```text
Apps Script
        ↓
GitHub Actions
        ↓
clasp pull
        ↓
Auto commit
        ↓
GitHub update
```

Workflow auto sync dapat dibuat di:

```text
.github/workflows/sync-appscript.yml
```

---

## Catatan Penting

* File Spreadsheet tetap berada di Google Drive.
* Yang disimpan di GitHub adalah kode Apps Script dan file frontend.
* Jangan menghapus file `.clasp.json` karena file tersebut menghubungkan folder lokal dengan project Apps Script.
* Jangan upload file `.clasprc.json` ke GitHub karena berisi data login clasp.
* Jika mengedit dari Apps Script Editor, gunakan `clasp pull` sebelum commit ke GitHub.
* Jika mengedit dari lokal, gunakan `clasp push` agar Apps Script ikut update.

---

## Author

Project ini dibuat dan dikelola oleh **Sagasen**.
