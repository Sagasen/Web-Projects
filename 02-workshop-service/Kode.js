/**
 * ============================================================
 * WORKSHOP ADMIN - SIMPLE REBUILD (v3 - header-driven writes + PDF invoice)
 * ============================================================
 */
const SPREADSHEET_ID = '1lYv5oDbkCGZTq5OXybpcZQonE1L8QOWDL8GQyuI61WE';

const SHEETS = {
  ADMINS: 'ADMINS',
  CUSTOMERS: 'CUSTOMERS',
  VEHICLES: 'VEHICLES',
  SERVICES: 'SERVICES',
  SERVICE_ITEMS: 'SERVICE_ITEMS',
  REMINDERS: 'REMINDERS',
  WA_LOG: 'WA_LOG',
  SETTINGS: 'SETTINGS',
  RINGKASAN: 'RINGKASAN'
};

// Header wajib untuk tiap sheet. Urutan di sini HANYA dipakai saat sheet baru dibuat
// dari nol. Untuk sheet yang sudah ada datanya, semua baca/tulis dilakukan berdasarkan
// NAMA kolom (bukan posisi), jadi aman walau urutan kolom asli berbeda atau ada kolom
// tambahan di tengah/pinggir.
const SCHEMA = {
  ADMINS:        ['admin_id', 'username', 'password'],
  CUSTOMERS:     ['customer_id', 'nama', 'hp', 'alamat', 'created_at'],
  VEHICLES:      ['vehicle_id', 'customer_id', 'no_polisi', 'merk', 'tipe', 'tahun', 'no_mesin', 'no_rangka', 'created_at'],
  SERVICES:      ['service_id', 'vehicle_id', 'tanggal', 'keluhan', 'pekerjaan', 'biaya_jasa', 'biaya_sparepart', 'total_biaya', 'mekanik', 'status', 'servis_berikutnya', 'created_at', 'km'],
  SERVICE_ITEMS: ['item_id', 'service_id', 'nama_sparepart', 'qty', 'harga', 'subtotal'],
  REMINDERS:     ['reminder_id', 'customer_id', 'vehicle_id', 'service_id', 'tanggal_reminder', 'pesan', 'status', 'created_at'],
  WA_LOG:        ['log_id', 'reminder_id', 'hp', 'pesan', 'tanggal_kirim'],
  SETTINGS:      ['key', 'value'],
  RINGKASAN:     ['customer_id', 'nama', 'hp', 'alamat', 'vehicle_id', 'no_polisi', 'merk', 'tipe', 'tahun']
};

/* ---------------------------- ENTRY POINT ---------------------------- */

function doGet(e) {
  ensureSheets();
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('Workshop Service')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/* ---------------------------- SETUP HELPERS ---------------------------- */

function ss_() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSheets() {
  const ss = ss_();
  Object.keys(SCHEMA).forEach(function (name) {
    let sheet = ss.getSheetByName(name);
    let justCreated = false;
    if (!sheet) {
      sheet = ss.insertSheet(name);
      sheet.appendRow(SCHEMA[name]);
      sheet.setFrozenRows(1);
      justCreated = true;
    } else if (sheet.getLastRow() === 0) {
      sheet.appendRow(SCHEMA[name]);
      sheet.setFrozenRows(1);
      justCreated = true;
    } else {
      // Sheet sudah ada isinya: tambahkan kolom yang BELUM ADA di paling kanan,
      // tanpa mengubah/menggeser kolom yang sudah ada.
      const lastCol = sheet.getLastColumn();
      const existingHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
      const missing = SCHEMA[name].filter(function (h) { return existingHeaders.indexOf(h) === -1; });
      if (missing.length) {
        sheet.getRange(1, lastCol + 1, 1, missing.length).setValues([missing]);
      }
    }
    if (name === SHEETS.SETTINGS && sheet.getLastRow() <= 1) {
      sheet.appendRow(['nama_bengkel', 'Workshop Service']);
      sheet.appendRow(['alamat_bengkel', '']);
      sheet.appendRow(['telp_bengkel', '']);
      sheet.appendRow(['jam_operasional', 'Senin - Sabtu, 08.00 - 17.00']);
    }
  });
  const ringkasan = ss.getSheetByName(SHEETS.RINGKASAN);
  if (!ringkasan || ringkasan.getLastRow() <= 1) {
    try { refreshRingkasan_(); } catch (err) { /* abaikan kalau data belum ada */ }
  }
}

function sheet_(name) {
  const sheet = ss_().getSheetByName(name);
  if (!sheet) throw new Error('Sheet ' + name + ' tidak ditemukan. Jalankan ensureSheets dulu.');
  return sheet;
}

function headers_(sheetName) {
  const sheet = sheet_(sheetName);
  const lastCol = sheet.getLastColumn();
  if (lastCol === 0) return [];
  return sheet.getRange(1, 1, 1, lastCol).getValues()[0];
}

// Ambil semua baris sebagai array of object {header: value}, pakai header row-1
function readAll_(sheetName) {
  const sheet = sheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];
  const headers = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const obj = {};
    headers.forEach(function (h, idx) { obj[h] = values[i][idx]; });
    obj._row = i + 1; // nomor baris asli di sheet (untuk update)
    rows.push(obj);
  }
  return rows;
}

function colIndex_(sheetName, header) {
  const headers = headers_(sheetName);
  return headers.indexOf(header) + 1; // 1-based, 0 kalau tidak ketemu
}

// Tambah baris baru BERDASARKAN NAMA KOLOM, bukan posisi tetap. dataObj hanya perlu
// berisi key yang relevan; kolom lain otomatis diisi kosong.
function appendRowByHeader_(sheetName, dataObj) {
  const sheet = sheet_(sheetName);
  const headers = headers_(sheetName);
  const row = headers.map(function (h) {
    const v = dataObj[h];
    return (v === undefined || v === null) ? '' : v;
  });
  sheet.appendRow(row);
  return sheet.getLastRow();
}

// Update baris yang sudah ada BERDASARKAN NAMA KOLOM. Key yang tidak disertakan di
// dataObj akan tetap memakai nilai lama (tidak ditimpa kosong).
function updateRowByHeader_(sheetName, rowNumber, dataObj) {
  const sheet = sheet_(sheetName);
  const headers = headers_(sheetName);
  const currentValues = sheet.getRange(rowNumber, 1, 1, headers.length).getValues()[0];
  const row = headers.map(function (h, idx) {
    return dataObj.hasOwnProperty(h) ? (dataObj[h] == null ? '' : dataObj[h]) : currentValues[idx];
  });
  sheet.getRange(rowNumber, 1, 1, headers.length).setValues([row]);
}

function newId_(prefix) {
  return prefix + '-' + Utilities.getUuid().substring(0, 8).toUpperCase();
}

function fmtDate_(d) {
  if (!d) return '';
  if (typeof d === 'string') return d;
  return Utilities.formatDate(new Date(d), Session.getScriptTimeZone() || 'GMT+7', 'yyyy-MM-dd');
}

// Apps Script kadang gagal mengirim balik data yang mengandung object Date "liar"
// (misalnya sel yang kebetulan berformat datetime). Fungsi ini membersihkan SEMUA
// Date jadi teks sebelum data dikirim ke browser, supaya tidak pernah jadi respons
// kosong (null) tanpa pesan error yang jelas.
function sanitizeForClient_(val) {
  if (val instanceof Date) return fmtDate_(val);
  if (Array.isArray(val)) return val.map(sanitizeForClient_);
  if (val && typeof val === 'object') {
    const out = {};
    Object.keys(val).forEach(function (k) { out[k] = sanitizeForClient_(val[k]); });
    return out;
  }
  return val;
}

// Simpan nomor HP sebagai TEKS supaya angka 0 di depan tidak hilang
function setPhoneCell_(sheetName, row, header, phone) {
  const col = colIndex_(sheetName, header);
  if (col === 0) return;
  sheet_(sheetName).getRange(row, col).setNumberFormat('@').setValue(String(phone || ''));
}

/* ---------------------------- NOMOR HP HELPERS ---------------------------- */

function normalizePhone_(phone) {
  let p = String(phone == null ? '' : phone).replace(/[^0-9]/g, '');
  if (!p) return '';
  if (p.startsWith('62')) p = '0' + p.substring(2);
  else if (!p.startsWith('0')) p = '0' + p;
  return p;
}

function toWaFormat_(phone) {
  let p = normalizePhone_(phone);
  if (p.startsWith('0')) p = '62' + p.substring(1);
  return p;
}

function normalizePlate_(plate) {
  return String(plate || '').replace(/\s+/g, '').toUpperCase();
}

/* ---------------------------- AUTH ---------------------------- */

function checkLogin(username, password) {
  const admins = readAll_(SHEETS.ADMINS);
  const found = admins.find(function (a) {
    return String(a.username).trim() === String(username).trim() &&
           String(a.password).trim() === String(password).trim();
  });
  if (!found) return { ok: false, message: 'Username atau password salah.' };
  return { ok: true, admin: { admin_id: found.admin_id, username: found.username } };
}

// Login customer tanpa password: verifikasi kombinasi No. HP + Plat Nomor
function customerLogin(noHp, plat) {
  try {
    const phoneNorm = normalizePhone_(noHp);
    const plateNorm = normalizePlate_(plat);
    if (!phoneNorm || !plateNorm) return { ok: false, message: 'No. HP dan Plat Nomor wajib diisi.' };

    const vehicles = readAll_(SHEETS.VEHICLES);
    const vehicle = vehicles.find(function (v) { return normalizePlate_(v.no_polisi) === plateNorm; });
    if (!vehicle) return { ok: false, message: 'Plat nomor tidak ditemukan.' };

    const customers = readAll_(SHEETS.CUSTOMERS);
    const customer = customers.find(function (c) { return c.customer_id === vehicle.customer_id; });
    if (!customer || normalizePhone_(customer.hp) !== phoneNorm) {
      return { ok: false, message: 'No. HP tidak cocok dengan pemilik kendaraan ini.' };
    }

    return { ok: true, detail: getCustomerDetail(customer.customer_id) };
  } catch (err) {
    return { ok: false, message: 'Terjadi error di server: ' + err.message };
  }
}

/* ---------------------------- DASHBOARD ---------------------------- */

function getDashboardStats() {
  const customers = readAll_(SHEETS.CUSTOMERS);
  const vehicles = readAll_(SHEETS.VEHICLES);
  const services = readAll_(SHEETS.SERVICES);
  const reminders = readAll_(SHEETS.REMINDERS).filter(function (r) { return r.status !== 'Selesai'; });

  const today = new Date();
  const thisMonth = today.getMonth();
  const thisYear = today.getFullYear();
  const servicesThisMonth = services.filter(function (s) {
    const d = new Date(s.tanggal);
    return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
  });
  const omzetBulanIni = servicesThisMonth.reduce(function (sum, s) {
    return sum + (Number(s.total_biaya) || 0);
  }, 0);

  const recentServices = services
    .sort(function (a, b) { return new Date(b.tanggal) - new Date(a.tanggal); })
    .slice(0, 5)
    .map(function (s) {
      const v = vehicles.find(function (x) { return x.vehicle_id === s.vehicle_id; });
      const c = v ? customers.find(function (x) { return x.customer_id === v.customer_id; }) : null;
      return {
        tanggal: fmtDate_(s.tanggal),
        pelanggan: c ? c.nama : '-',
        kendaraan: v ? (v.merk + ' ' + v.tipe + ' - ' + v.no_polisi) : '-',
        pekerjaan: s.pekerjaan,
        total: s.total_biaya
      };
    });

  return sanitizeForClient_({
    totalPelanggan: customers.length,
    totalKendaraan: vehicles.length,
    servisBulanIni: servicesThisMonth.length,
    omzetBulanIni: omzetBulanIni,
    reminderAktif: reminders.length,
    recentServices: recentServices
  });
}

/* ---------------------------- CUSTOMERS + VEHICLES (satu halaman) ---------------------------- */

function searchCustomers(query) {
  const customers = readAll_(SHEETS.CUSTOMERS);
  const q = (query || '').toString().trim().toLowerCase();
  const filtered = q
    ? customers.filter(function (c) {
        return String(c.nama).toLowerCase().indexOf(q) !== -1 ||
               String(c.hp).toLowerCase().indexOf(q) !== -1;
      })
    : customers;
  return sanitizeForClient_(filtered
    .sort(function (a, b) { return String(a.nama).localeCompare(String(b.nama)); })
    .map(function (c) {
      return { customer_id: c.customer_id, nama: c.nama, no_hp: normalizePhone_(c.hp), alamat: c.alamat };
    }));
}

function addCustomer(data) {
  const phone = normalizePhone_(data.no_hp);
  const row = appendRowByHeader_(SHEETS.CUSTOMERS, {
    customer_id: '', nama: data.nama, hp: phone, alamat: data.alamat || '', created_at: new Date()
  });
  const id = newId_('C');
  sheet_(SHEETS.CUSTOMERS).getRange(row, colIndex_(SHEETS.CUSTOMERS, 'customer_id')).setValue(id);
  setPhoneCell_(SHEETS.CUSTOMERS, row, 'hp', phone);
  refreshRingkasan_();
  return { customer_id: id, nama: data.nama, no_hp: phone, alamat: data.alamat || '' };
}

function updateCustomer(data) {
  const customers = readAll_(SHEETS.CUSTOMERS);
  const target = customers.find(function (c) { return c.customer_id === data.customer_id; });
  if (!target) throw new Error('Pelanggan tidak ditemukan.');
  const phone = normalizePhone_(data.no_hp);
  updateRowByHeader_(SHEETS.CUSTOMERS, target._row, { nama: data.nama, hp: phone, alamat: data.alamat || '' });
  setPhoneCell_(SHEETS.CUSTOMERS, target._row, 'hp', phone);
  refreshRingkasan_();
  return { ok: true };
}

// Detail satu pelanggan: data diri + daftar kendaraan + riwayat servis (+ rincian sparepart) tiap kendaraan
function getCustomerDetail(customerId) {
  const customers = readAll_(SHEETS.CUSTOMERS);
  const customer = customers.find(function (c) { return c.customer_id === customerId; });
  if (!customer) throw new Error('Pelanggan tidak ditemukan.');

  const vehicles = readAll_(SHEETS.VEHICLES).filter(function (v) { return v.customer_id === customerId; });
  const allServices = readAll_(SHEETS.SERVICES);
  const allItems = readAll_(SHEETS.SERVICE_ITEMS);

  const vehiclesWithHistory = vehicles.map(function (v) {
    const history = allServices
      .filter(function (s) { return s.vehicle_id === v.vehicle_id; })
      .sort(function (a, b) { return new Date(b.tanggal) - new Date(a.tanggal); })
      .map(function (s) {
        const items = allItems
          .filter(function (i) { return i.service_id === s.service_id; })
          .map(function (i) { return { nama_item: i.nama_sparepart || i.nama_item || i.nama || i.item_name || i.item || '', qty: i.qty, harga: i.harga, subtotal: i.subtotal }; });
        return {
          service_id: s.service_id,
          tanggal: fmtDate_(s.tanggal),
          km: s.km || '',
          keluhan: s.keluhan,
          pekerjaan: s.pekerjaan,
          items: items,
          biaya_jasa: s.biaya_jasa,
          biaya_sparepart: s.biaya_sparepart,
          total_biaya: s.total_biaya,
          mekanik: s.mekanik,
          status: s.status,
          servis_berikutnya: fmtDate_(s.servis_berikutnya)
        };
      });
    return {
      vehicle_id: v.vehicle_id,
      merk: v.merk,
      model: v.tipe,
      plat: v.no_polisi,
      tahun: (v.tahun instanceof Date) ? fmtDate_(v.tahun) : v.tahun,
      history: history
    };
  });

  return sanitizeForClient_({
    customer_id: customer.customer_id,
    nama: customer.nama,
    no_hp: normalizePhone_(customer.hp),
    alamat: customer.alamat,
    vehicles: vehiclesWithHistory
  });
}

function addVehicle(data) {
  const row = appendRowByHeader_(SHEETS.VEHICLES, {
    vehicle_id: '', customer_id: data.customer_id, no_polisi: data.plat, merk: data.merk,
    tipe: data.model, tahun: data.tahun || '', no_mesin: data.no_mesin || '', no_rangka: data.no_rangka || '',
    created_at: new Date()
  });
  const id = newId_('V');
  sheet_(SHEETS.VEHICLES).getRange(row, colIndex_(SHEETS.VEHICLES, 'vehicle_id')).setValue(id);
  refreshRingkasan_();
  return { vehicle_id: id };
}

function updateVehicle(data) {
  const vehicles = readAll_(SHEETS.VEHICLES);
  const target = vehicles.find(function (v) { return v.vehicle_id === data.vehicle_id; });
  if (!target) throw new Error('Kendaraan tidak ditemukan.');
  updateRowByHeader_(SHEETS.VEHICLES, target._row, {
    customer_id: data.customer_id, no_polisi: data.plat, merk: data.merk, tipe: data.model,
    tahun: data.tahun || '', no_mesin: data.no_mesin || '', no_rangka: data.no_rangka || ''
  });
  refreshRingkasan_();
  return { ok: true };
}

/* ---------------------------- RINGKASAN (1 sheet gabungan, biar gampang dicek manual) ---------------------------- */

function refreshRingkasan_() {
  const ss = ss_();
  let sheet = ss.getSheetByName(SHEETS.RINGKASAN);
  if (!sheet) sheet = ss.insertSheet(SHEETS.RINGKASAN);
  sheet.clear();
  sheet.appendRow(SCHEMA.RINGKASAN);
  sheet.setFrozenRows(1);

  const customers = readAll_(SHEETS.CUSTOMERS);
  const vehicles = readAll_(SHEETS.VEHICLES);
  const rows = [];
  vehicles.forEach(function (v) {
    const c = customers.find(function (x) { return x.customer_id === v.customer_id; });
    rows.push([
      c ? c.customer_id : '', c ? c.nama : '', c ? normalizePhone_(c.hp) : '', c ? c.alamat : '',
      v.vehicle_id, v.no_polisi, v.merk, v.tipe, (v.tahun instanceof Date) ? fmtDate_(v.tahun) : v.tahun
    ]);
  });
  customers.forEach(function (c) {
    const hasVehicle = vehicles.some(function (v) { return v.customer_id === c.customer_id; });
    if (!hasVehicle) rows.push([c.customer_id, c.nama, normalizePhone_(c.hp), c.alamat, '', '', '', '', '']);
  });
  if (rows.length) {
    // Paksa kolom hp (kolom ke-3) jadi format teks DULU sebelum ditulis, supaya
    // angka 0 di depan nomor HP tidak dibuang otomatis oleh Sheets.
    sheet.getRange(2, 3, rows.length, 1).setNumberFormat('@');
    sheet.getRange(2, 1, rows.length, SCHEMA.RINGKASAN.length).setValues(rows);
  }
}

function refreshRingkasan() { refreshRingkasan_(); }

// Jalankan SEKALI dari editor kalau ada nomor HP lama yang kehilangan angka 0 di depan
function fixLeadingZeroPhones() {
  const sheet = sheet_(SHEETS.CUSTOMERS);
  const hpCol = colIndex_(SHEETS.CUSTOMERS, 'hp');
  const rows = readAll_(SHEETS.CUSTOMERS);
  let fixedCount = 0;
  rows.forEach(function (r) {
    const fixed = normalizePhone_(r.hp);
    if (fixed && fixed !== String(r.hp)) {
      sheet.getRange(r._row, hpCol).setNumberFormat('@').setValue(fixed);
      fixedCount++;
    }
  });
  refreshRingkasan_();
  return { ok: true, checked: rows.length, fixed: fixedCount };
}

// Jalankan SEKALI dari editor: beberapa baris VEHICLES lama punya kolom "tahun" yang
// isinya kebetulan tanggal/waktu penuh (dari sistem lama), bukan angka tahun biasa.
function fixBrokenYearCells() {
  const sheet = sheet_(SHEETS.VEHICLES);
  const yearCol = colIndex_(SHEETS.VEHICLES, 'tahun');
  const rows = readAll_(SHEETS.VEHICLES);
  let fixedCount = 0;
  rows.forEach(function (r) {
    if (r.tahun instanceof Date) {
      const year = r.tahun.getFullYear();
      const value = (year > 1990 && year < 2100) ? String(year) : '';
      sheet.getRange(r._row, yearCol).setNumberFormat('@').setValue(value);
      fixedCount++;
    }
  });
  return { ok: true, checked: rows.length, fixed: fixedCount };
}

// Jalankan SEKALI dari editor untuk mengganti SEMUA nama, no HP, alamat, dan plat asli
// jadi data dummy/contoh — aman dipakai sebelum demo atau dijual ke orang lain.
// (Riwayat servis, biaya, dll TIDAK dihapus, cuma identitas orangnya yang diganti.)
function anonymizeTestData() {
  const custSheet = sheet_(SHEETS.CUSTOMERS);
  const customers = readAll_(SHEETS.CUSTOMERS);
  const namaDummy = ['Andi Saputra', 'Budi Santoso', 'Citra Ayu', 'Dewi Lestari', 'Eko Wijaya', 'Fitri Handayani', 'Gilang Ramadhan', 'Hesti Purnama'];
  customers.forEach(function (c, i) {
    const nama = namaDummy[i % namaDummy.length] + (i >= namaDummy.length ? ' ' + (i + 1) : '');
    const hp = '0812' + String(10000000 + i).slice(-8);
    updateRowByHeader_(SHEETS.CUSTOMERS, c._row, { nama: nama, alamat: 'Kota Contoh ' + (i + 1) });
    setPhoneCell_(SHEETS.CUSTOMERS, c._row, 'hp', hp);
  });

  const vehSheet = sheet_(SHEETS.VEHICLES);
  const vehicles = readAll_(SHEETS.VEHICLES);
  const merkDummy = [['Honda', 'Beat'], ['Honda', 'Vario 125'], ['Yamaha', 'Mio'], ['Yamaha', 'NMAX'], ['Suzuki', 'Nex']];
  vehicles.forEach(function (v, i) {
    const pick = merkDummy[i % merkDummy.length];
    const plat = 'AB' + String(1000 + i).slice(-4) + 'XX';
    updateRowByHeader_(SHEETS.VEHICLES, v._row, { no_polisi: plat, merk: pick[0], tipe: pick[1], no_mesin: '', no_rangka: '' });
  });

  refreshRingkasan_();
  return { ok: true, customers: customers.length, vehicles: vehicles.length };
}

// Jalankan SEKALI dari editor: menghapus kolom "nama_item" yang kosong (kebuat gara-gara
// salah tebak nama kolom sebelumnya) dan baris SERVICE_ITEMS yang kosong total (nama & harga
// sama-sama kosong/0 — biasanya sisa percobaan yang gagal).
function cleanupServiceItemsSheet() {
  const sheet = sheet_(SHEETS.SERVICE_ITEMS);
  const headers = headers_(SHEETS.SERVICE_ITEMS);
  const orphanCol = headers.indexOf('nama_item') + 1;
  let removedCol = false;
  if (orphanCol > 0) {
    sheet.deleteColumn(orphanCol);
    removedCol = true;
  }
  const rows = readAll_(SHEETS.SERVICE_ITEMS)
    .filter(function (r) { return !r.nama_sparepart && (Number(r.qty) || 0) === 0 && (Number(r.harga) || 0) === 0; })
    .sort(function (a, b) { return b._row - a._row; });
  rows.forEach(function (r) { sheet.deleteRow(r._row); });
  return { ok: true, removedOrphanColumn: removedCol, removedEmptyRows: rows.length };
}

// Jalankan dari editor lalu buka "Log Eksekusi" (ikon jam ⏰) untuk lihat isi asli
// sheet SERVICE_ITEMS — berguna untuk mengecek apakah nama sparepart benar tersimpan.
function debugServiceItems() {
  const sheet = sheet_(SHEETS.SERVICE_ITEMS);
  const values = sheet.getDataRange().getValues();
  Logger.log('Header (baris 1): %s', JSON.stringify(values[0]));
  Logger.log('Jumlah baris data: %s', values.length - 1);
  values.slice(1).forEach(function (row, idx) {
    Logger.log('Baris %s: %s', idx + 2, JSON.stringify(row));
  });
  return { headers: values[0], totalRows: values.length - 1 };
}

function searchVehiclesForService(query) {
  const q = (query || '').toString().trim().toLowerCase();
  if (!q) return [];
  const vehicles = readAll_(SHEETS.VEHICLES);
  const customers = readAll_(SHEETS.CUSTOMERS);
  return sanitizeForClient_(vehicles
    .filter(function (v) {
      const c = customers.find(function (x) { return x.customer_id === v.customer_id; });
      const hay = [v.no_polisi, v.merk, v.tipe, c ? c.nama : '', c ? normalizePhone_(c.hp) : ''].join(' ').toLowerCase();
      return hay.indexOf(q) !== -1;
    })
    .slice(0, 15)
    .map(function (v) {
      const c = customers.find(function (x) { return x.customer_id === v.customer_id; });
      return {
        vehicle_id: v.vehicle_id,
        plat: v.no_polisi,
        merk: v.merk,
        model: v.tipe,
        customer_id: v.customer_id,
        nama: c ? c.nama : '-',
        no_hp: c ? normalizePhone_(c.hp) : ''
      };
    }));
}

function addServiceItems_(serviceId, items) {
  if (!items || !items.length) return 0;
  let total = 0;
  items.forEach(function (it) {
    const nama = (it.nama || it.nama_item || '').toString().trim();
    if (!nama) return;
    const qty = Number(it.qty) || 1;
    const harga = Number(it.harga) || 0;
    const subtotal = qty * harga;
    total += subtotal;
    appendRowByHeader_(SHEETS.SERVICE_ITEMS, {
      item_id: newId_('SI'), service_id: serviceId, nama_sparepart: nama, qty: qty, harga: harga, subtotal: subtotal
    });
  });
  return total;
}

function deleteServiceItems_(serviceId) {
  const sheet = sheet_(SHEETS.SERVICE_ITEMS);
  const items = readAll_(SHEETS.SERVICE_ITEMS)
    .filter(function (i) { return i.service_id === serviceId; })
    .sort(function (a, b) { return b._row - a._row; });
  items.forEach(function (i) { sheet.deleteRow(i._row); });
}

function addService(data) {
  const biayaJasa = Number(data.biaya_jasa) || 0;
  const items = data.items || [];
  const biayaSparepart = items.reduce(function (s, it) { return s + (Number(it.qty) || 1) * (Number(it.harga) || 0); }, 0);
  const total = biayaJasa + biayaSparepart;

  const row = appendRowByHeader_(SHEETS.SERVICES, {
    service_id: '', vehicle_id: data.vehicle_id, tanggal: data.tanggal, km: data.km || '',
    keluhan: data.keluhan || '', pekerjaan: data.pekerjaan || '',
    biaya_jasa: biayaJasa, biaya_sparepart: biayaSparepart, total_biaya: total,
    mekanik: data.mekanik || '', status: data.status || 'Selesai',
    servis_berikutnya: data.servis_berikutnya || '', created_at: new Date()
  });
  const id = newId_('S');
  sheet_(SHEETS.SERVICES).getRange(row, colIndex_(SHEETS.SERVICES, 'service_id')).setValue(id);
  addServiceItems_(id, items);

  if (data.servis_berikutnya) {
    const vehicles = readAll_(SHEETS.VEHICLES);
    const v = vehicles.find(function (x) { return x.vehicle_id === data.vehicle_id; });
    if (v) {
      const rid = newId_('R');
      const pesan = 'Halo, sudah waktunya servis rutin untuk kendaraan ' + v.merk + ' ' + v.tipe + ' (' + v.no_polisi + '). Yuk jadwalkan servis berikutnya di bengkel kami!';
      appendRowByHeader_(SHEETS.REMINDERS, {
        reminder_id: rid, customer_id: v.customer_id, vehicle_id: v.vehicle_id, service_id: id,
        tanggal_reminder: data.servis_berikutnya, pesan: pesan, status: 'Pending', created_at: new Date()
      });
    }
  }
  return { service_id: id, total_biaya: total };
}

function updateService(data) {
  const services = readAll_(SHEETS.SERVICES);
  const target = services.find(function (s) { return s.service_id === data.service_id; });
  if (!target) throw new Error('Data servis tidak ditemukan.');
  const biayaJasa = Number(data.biaya_jasa) || 0;
  const items = data.items || [];
  deleteServiceItems_(data.service_id);
  const biayaSparepart = addServiceItems_(data.service_id, items);
  const total = biayaJasa + biayaSparepart;
  const updates = {
    vehicle_id: data.vehicle_id, tanggal: data.tanggal, km: data.km || '',
    keluhan: data.keluhan || '', pekerjaan: data.pekerjaan || '',
    biaya_jasa: biayaJasa, biaya_sparepart: biayaSparepart, total_biaya: total,
    mekanik: data.mekanik || '', status: data.status || 'Selesai'
  };
  // Cuma timpa servis_berikutnya kalau memang dikirim dari client, supaya edit cepat
  // (yang tidak punya field ini) tidak diam-diam menghapus reminder yang sudah ada.
  if (data.hasOwnProperty('servis_berikutnya')) updates.servis_berikutnya = data.servis_berikutnya || '';
  updateRowByHeader_(SHEETS.SERVICES, target._row, updates);
  return { ok: true, total_biaya: total };
}

/* ---------------------------- INVOICE PDF ---------------------------- */

// Bikin PDF invoice asli (bukan lewat dialog print) dan kirim ke browser sebagai base64.
function generateInvoicePdf(serviceId) {
  const service = readAll_(SHEETS.SERVICES).find(function (s) { return s.service_id === serviceId; });
  if (!service) throw new Error('Data servis tidak ditemukan.');
  const vehicle = readAll_(SHEETS.VEHICLES).find(function (v) { return v.vehicle_id === service.vehicle_id; });
  const customer = vehicle ? readAll_(SHEETS.CUSTOMERS).find(function (c) { return c.customer_id === vehicle.customer_id; }) : null;
  const items = readAll_(SHEETS.SERVICE_ITEMS)
    .filter(function (i) { return i.service_id === serviceId; })
    .map(function (i) { return { nama: i.nama_sparepart || i.nama_item || i.nama || i.item_name || i.item || '', qty: Number(i.qty) || 0, harga: Number(i.harga) || 0, subtotal: Number(i.subtotal) || 0 }; });
  const info = getWorkshopInfo();

  const template = HtmlService.createTemplateFromFile('InvoicePdf');
  template.data = {
    tanggalFormat: fmtDate_(service.tanggal),
    serviceId: service.service_id,
    namaBengkel: info.nama_bengkel,
    alamatBengkel: info.alamat_bengkel,
    telpBengkel: info.telp_bengkel,
    namaPelanggan: customer ? customer.nama : '-',
    hp: customer ? normalizePhone_(customer.hp) : '-',
    plat: vehicle ? vehicle.no_polisi : '-',
    merk: vehicle ? vehicle.merk : '-',
    tipe: vehicle ? vehicle.tipe : '-',
    km: service.km || '-',
    keluhan: service.keluhan || '-',
    diagnosa: service.pekerjaan || '-',
    mekanik: service.mekanik || '-',
    jasa: Number(service.biaya_jasa) || 0,
    items: items,
    totalSparepart: Number(service.biaya_sparepart) || 0,
    totalBiaya: Number(service.total_biaya) || 0
  };

  const pdfBlob = template.evaluate().getAs('application/pdf');
  return {
    ok: true,
    filename: 'Invoice-' + serviceId + '.pdf',
    base64: Utilities.base64Encode(pdfBlob.getBytes())
  };
}

/* ---------------------------- REMINDER + WHATSAPP (manual, via wa.me) ---------------------------- */

function getReminders(filterStatus) {
  const reminders = readAll_(SHEETS.REMINDERS);
  const customers = readAll_(SHEETS.CUSTOMERS);
  const vehicles = readAll_(SHEETS.VEHICLES);

  return sanitizeForClient_(reminders
    .filter(function (r) { return !filterStatus || filterStatus === 'Semua' || r.status === filterStatus; })
    .sort(function (a, b) { return new Date(a.tanggal_reminder) - new Date(b.tanggal_reminder); })
    .map(function (r) {
      const c = customers.find(function (x) { return x.customer_id === r.customer_id; });
      const v = vehicles.find(function (x) { return x.vehicle_id === r.vehicle_id; });
      return {
        reminder_id: r.reminder_id,
        tanggal_reminder: fmtDate_(r.tanggal_reminder),
        pesan: r.pesan,
        status: r.status,
        nama: c ? c.nama : '-',
        no_hp: c ? normalizePhone_(c.hp) : '',
        kendaraan: v ? (v.merk + ' ' + v.tipe + ' - ' + v.no_polisi) : '-'
      };
    }));
}

function markReminderStatus(reminderId, status) {
  const reminders = readAll_(SHEETS.REMINDERS);
  const target = reminders.find(function (r) { return r.reminder_id === reminderId; });
  if (!target) throw new Error('Reminder tidak ditemukan.');
  updateRowByHeader_(SHEETS.REMINDERS, target._row, { status: status });
  return { ok: true };
}

function sendReminderMessage(reminderId) {
  const reminders = readAll_(SHEETS.REMINDERS);
  const target = reminders.find(function (r) { return r.reminder_id === reminderId; });
  if (!target) throw new Error('Reminder tidak ditemukan.');

  const customers = readAll_(SHEETS.CUSTOMERS);
  const customer = customers.find(function (c) { return c.customer_id === target.customer_id; });
  if (!customer) throw new Error('Data pelanggan untuk reminder ini tidak ditemukan.');

  const phone = normalizePhone_(customer.hp);
  const pesan = target.pesan && String(target.pesan).trim()
    ? target.pesan
    : 'Halo ' + customer.nama + ', ini pengingat jadwal servis kendaraan Anda. Silakan hubungi kami untuk jadwal ulang.';

  if (!phone) return { ok: false, message: 'Nomor HP pelanggan ini kosong/tidak valid. Cek data di sheet CUSTOMERS.' };

  appendRowByHeader_(SHEETS.WA_LOG, { log_id: newId_('W'), reminder_id: reminderId, hp: phone, pesan: pesan, tanggal_kirim: new Date() });
  markReminderStatus(reminderId, 'Terkirim');

  return { ok: true, waLink: 'https://wa.me/' + toWaFormat_(phone) + '?text=' + encodeURIComponent(pesan) };
}

/* ---------------------------- SETTINGS ---------------------------- */

function getSettings() {
  const rows = readAll_(SHEETS.SETTINGS);
  const obj = {};
  rows.forEach(function (r) { obj[r.key] = r.value; });
  if (obj.telp_bengkel) obj.telp_bengkel = normalizePhone_(obj.telp_bengkel);
  return obj;
}

function saveSettings(data) {
  const sheet = sheet_(SHEETS.SETTINGS);
  const valueCol = colIndex_(SHEETS.SETTINGS, 'value') || 2;
  const rows = readAll_(SHEETS.SETTINGS);
  Object.keys(data).forEach(function (key) {
    let value = data[key];
    if (key === 'telp_bengkel' && value) value = normalizePhone_(value);
    const existing = rows.find(function (r) { return r.key === key; });
    if (existing) {
      sheet.getRange(existing._row, valueCol).setNumberFormat('@').setValue(value);
    } else {
      appendRowByHeader_(SHEETS.SETTINGS, { key: key, value: value });
    }
  });
  return { ok: true, saved: Object.keys(data) };
}

function getWorkshopInfo() {
  const s = getSettings();
  return {
    nama_bengkel: s.nama_bengkel || 'Workshop Service',
    alamat_bengkel: s.alamat_bengkel || '',
    telp_bengkel: s.telp_bengkel ? normalizePhone_(s.telp_bengkel) : '',
    jam_operasional: s.jam_operasional || ''
  };
}
