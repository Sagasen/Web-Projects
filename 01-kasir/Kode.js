/**
 * SISTEM KASIR UMKM MODERN - BACKEND (Code.gs)
 */

function doGet() {
  return HtmlService.createTemplateFromFile('index')
    .evaluate()
    .setTitle('Kasir UMKM Modern')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(x) {
  return HtmlService.createHtmlOutputFromFile(x).getContent();
}

// ================= AMBIL DATA PRODUK =================
function getProduk() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("produk");
  if (!sheet) return [];
  return sheet.getDataRange().getValues();
}

// ================= SIMPAN TRANSAKSI MASSAAL =================
function simpanTransaksi(data) {
  const ss = SpreadsheetApp.getActive();
  const trxSheet = ss.getSheetByName("transaksi");
  const produkSheet = ss.getSheetByName("produk");
  if (!trxSheet || !produkSheet) {
    throw new Error("Sheet 'transaksi' atau 'produk' tidak ditemukan!");
  }
  const id = "TRX-" + new Date().getTime();
  const tanggal = new Date();
  const produkRange = produkSheet.getDataRange();
  const produkData = produkRange.getValues();
  const rowsToAppend = [];

  data.items.forEach(item => {
    rowsToAppend.push([
      id,
      tanggal,
      item.nama,
      Number(item.qty),
      Number(item.harga),
      Number(item.qty) * Number(item.harga),
      data.metode
    ]);
    for (let i = 1; i < produkData.length; i++) {
      if (produkData[i][1] === item.nama) {
        let stokLama = Number(produkData[i][3]);
        let stokBaru = stokLama - Number(item.qty);
        produkData[i][3] = stokBaru;
        cekStokDanKirimEmail(item.nama, stokBaru);
        break;
      }
    }
  });
  trxSheet.getRange(trxSheet.getLastRow() + 1, 1, rowsToAppend.length, rowsToAppend[0].length).setValues(rowsToAppend);
  produkRange.setValues(produkData);
  return id;
}

// ================= EMAIL NOTIFIKASI STOK =================
function cekStokDanKirimEmail(namaProduk, stok) {
  if (stok <= 5) {
    try {
      MailApp.sendEmail({
        to: Session.getActiveUser().getEmail(),
        subject: "⚠️ Stok Hampir Habis: " + namaProduk,
        htmlBody: `<h3>Peringatan Stok Minim</h3><p>Produk <b>${namaProduk}</b> tersisa: <b>${stok}</b>.</p>`
      });
    } catch (e) {
      Logger.log("Gagal mengirim email: " + e.message);
    }
  }
}

// ================= DATA TRANSAKSI TABLE =================
function getTransaksi() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("transaksi");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  data.shift(); // Buang header
  return data.map(row => {
    return row.map((cell, index) => {
      if (index === 1 && cell instanceof Date) {
        return Utilities.formatDate(cell, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
      }
      return cell;
    });
  });
}

// ================= SIMPAN INPUT PENGELUARAN BARU =================
function tambahPengeluaran(kategori, catatan, nominal) {
  const ss = SpreadsheetApp.getActive();
  let sheet = ss.getSheetByName("pengeluaran");
  if (!sheet) {
    sheet = ss.insertSheet("pengeluaran");
    sheet.appendRow(["ID", "Tanggal", "Kategori", "Catatan", "Nominal"]);
  }
  const id = "OUT-" + new Date().getTime();
  const tanggal = new Date();
  sheet.appendRow([id, tanggal, kategori, catatan, Number(nominal)]);
  return true;
}

// ================= TABEL HISTORY PENGELUARAN BARU =================
function getHistoryPengeluaranRaw() {
  const sheet = SpreadsheetApp.getActive().getSheetByName("pengeluaran");
  if (!sheet) return [];
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  data.shift(); // Buang header
  return data.map(row => {
    return row.map((cell, index) => {
      if (index === 1 && cell instanceof Date) {
        return Utilities.formatDate(cell, Session.getScriptTimeZone(), "yyyy-MM-dd HH:mm");
      }
      return cell;
    });
  });
}

// ================= DASHBOARD REKAP FINANSIAL DATA (DENGAN FILTER WAKTU) =================
function getRekapDetailFiltered(filterType) {
  const ss = SpreadsheetApp.getActive();
  const trxSheet = ss.getSheetByName("transaksi");
  const expSheet = ss.getSheetByName("pengeluaran");
  const trxData = trxSheet ? trxSheet.getDataRange().getValues() : [];
  const expData = expSheet ? expSheet.getDataRange().getValues() : [];
  let rekap = { pemasukan: 0, pengeluaran: 0, laba: 0, rugi: 0, history: {} };
  const timeZone = Session.getScriptTimeZone();
  const sekarang = new Date();
  const hariIniStr = Utilities.formatDate(sekarang, timeZone, "yyyy-MM-dd");
  const tahunSekarang = Urban = sekarang.getFullYear();
  const bulanSekarang = sekarang.getMonth();
  const d = new Date(sekarang);
  const day = d.getDay();
  const diff = d.getDate() - day + (day == 0 ? -6 : 1);
  const awalMingguIni = new Date(d.setDate(diff));
  awalMingguIni.setHours(0,0,0,0);

  function apakahMasukFilter(targetDate) {
    if (!(targetDate instanceof Date)) return false;
    const targetStr = Utilities.formatDate(targetDate, timeZone, "yyyy-MM-dd");
    const targetTahun = targetDate.getFullYear();
    const targetBulan = targetDate.getMonth();
    switch(filterType) {
      case 'hari': return targetStr === hariIniStr;
      case 'minggu': return targetDate >= awalMingguIni;
      case 'bulan': return targetTahun === tahunSekarang && targetBulan === bulanSekarang;
      case 'tahun': return targetTahun === tahunSekarang;
      case '2025': return targetTahun === 2025;
      case '2026': return targetTahun === 2026;
      default: return true;
    }
  }

  for (let i = 1; i < trxData.length; i++) {
    let tglData = new Date(trxData[i][1]);
    if (apakahMasukFilter(tglData)) {
      let tglStr = Utilities.formatDate(tglData, timeZone, "yyyy-MM-dd");
      let total = Number(trxData[i][5]);
      rekap.pemasukan += total;
      rekap.history[tglStr] = (rekap.history[tglStr] || 0) + total;
    }
  }
  for (let i = 1; i < expData.length; i++) {
    let tglData = new Date(expData[i][1]);
    if (apakahMasukFilter(tglData)) {
      rekap.pengeluaran += Number(expData[i][4]);
    }
  }
  let selisih = rekap.pemasukan - rekap.pengeluaran;
  if (selisih >= 0) {
    rekap.laba = selisih;
    rekap.rugi = 0;
  } else {
    rekap.laba = 0;
    rekap.rugi = Math.abs(selisih);
  }
  return rekap;
}

// ================= INTELLIGENCE ANALYSIS (AI) TERFILTER =================
function getAIAnalysisFiltered(filterType) {
  const rekap = getRekapDetailFiltered(filterType);
  const historyValues = Object.values(rekap.history);
  let prediksi = 0;
  if (historyValues.length >= 1) {
    let lastData = historyValues.slice(-3);
    prediksi = Math.round(lastData.reduce((a, b) => a + b, 0) / lastData.length);
  }
  let pesanAnalisis = "";
  if (rekap.pemasukan > rekap.pengeluaran) {
    pesanAnalisis = "Kondisi finansial pada periode ini sehat. Profit bersih berhasil dipertahankan dengan baik.";
  } else if (rekap.pemasukan < rekap.pengeluaran) {
    pesanAnalisis = "Peringatan Terdeteksi: Pengeluaran operasional membengkak melebihi omset pendapatan harian Anda.";
  } else {
    pesanAnalisis = "Kondisi Keuangan Seimbang (Break Even). Pendapatan pas menutupi pengeluaran yang terjadi.";
  }
  return { analisis: pesanAnalisis, prediksiBesok: prediksi };
}

// ================= LAPORAN PDF DOKUMEN KOMPREHENSIF & DINAMIS =================
function exportPDF(filterType) {
  const rekap = getRekapDetailFiltered(filterType);
  const ss = SpreadsheetApp.getActive();
  const trxSheet = ss.getSheetByName("transaksi");
  const expSheet = ss.getSheetByName("pengeluaran");
  const trxData = trxSheet ? trxSheet.getDataRange().getValues() : [];
  const expData = expSheet ? expSheet.getDataRange().getValues() : [];
  let teksRentang = "Semua Periode";
  if (filterType === "hari") teksRentang = "Hari Ini";
  else if (filterType === "minggu") teksRentang = "Seminggu Terakhir";
  else if (filterType === "bulan") teksRentang = "Sebulan Terakhir";
  else if (filterType === "tahun") teksRentang = "Setahun Terakhir";
  else if (filterType === "2025") teksRentang = "Tahun 2025";
  else if (filterType === "2026") teksRentang = "Tahun 2026";

  let rincianProduk = {};
  const timeZone = Session.getScriptTimeZone();
  const sekarang = new Date();
  const hariIniStr = Utilities.formatDate(sekarang, timeZone, "yyyy-MM-dd");
  const tahunSekarang = sekarang.getFullYear();
  const bulanSekarang = sekarang.getMonth();
  const d = new Date(sekarang);
  const diff = d.getDate() - d.getDay() + (d.getDay() == 0 ? -6 : 1);
  const awalMingguIni = new Date(d.setDate(diff));
  awalMingguIni.setHours(0,0,0,0);

  function cekValidFilter(targetDate) {
    if (!(targetDate instanceof Date)) return false;
    const targetStr = Utilities.formatDate(targetDate, timeZone, "yyyy-MM-dd");
    const targetTahun = targetDate.getFullYear();
    const targetBulan = targetDate.getMonth();
    if (filterType === "hari") return targetStr === hariIniStr;
    if (filterType === "minggu") return targetDate >= awalMingguIni;
    if (filterType === "bulan") return targetTahun === tahunSekarang && targetBulan === bulanSekarang;
    if (filterType === "tahun") return targetTahun === tahunSekarang;
    if (filterType === "2025") return targetTahun === 2025;
    if (filterType === "2026") return targetTahun === 2026;
    return true;
  }

  for (let i = 1; i < trxData.length; i++) {
    let tglData = new Date(trxData[i][1]);
    if (cekValidFilter(tglData)) {
      let namaProd = trxData[i][2];
      let qty = Number(trxData[i][3]);
      let totalHarga = Number(trxData[i][5]);
      if (!rincianProduk[namaProd]) {
        rincianProduk[namaProd] = { qty: 0, nominal: 0 };
      }
      rincianProduk[namaProd].qty += qty;
      rincianProduk[namaProd].nominal += totalHarga;
    }
  }

  let rincianKategori = {};
  for (let i = 1; i < expData.length; i++) {
    let tglData = new Date(expData[i][1]);
    if (cekValidFilter(tglData)) {
      let kat = expData[i][2];
      let nom = Number(expData[i][4]);
      if (!rincianKategori[kat]) {
        rincianKategori[kat] = 0;
      }
      rincianKategori[kat] += nom;
    }
  }

  let htmlBody = `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; color: #333; padding: 10px; }
        .header { text-align: center; margin-bottom: 25px; border-bottom: 2px solid #333; padding-bottom: 10px; }
        .header h2 { margin: 0; text-transform: uppercase; color: #1e3a8a; }
        .header p { margin: 5px 0 0 0; font-size: 13px; color: #666; }
        .section-title { font-size: 14px; font-weight: bold; background-color: #f1f5f9; padding: 6px; margin-top: 20px; margin-bottom: 10px; border-left: 4px solid #1e3a8a; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 15px; font-size: 12px; }
        th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
        th { background-color: #f8fafc; font-weight: bold; }
        .text-right { text-align: right; }
        .grand-total { font-weight: bold; background-color: #f8fafc; }
        .summary-box { display: flex; margin-top: 25px; border: 1px solid #cbd5e1; background-color: #fafafa; padding: 12px; }
        .summary-item { width: 25%; text-align: center; }
        .summary-item span { font-size: 11px; color: #666; display: block; }
        .summary-item h3 { margin: 5px 0 0 0; font-size: 15px; }
      </style>
    </head>
    <body>
      <div class="header">
        <h2>Laporan Finansial Kasir UMKM</h2>
        <p>Periode Rekap: <b>${teksRentang}</b> | Diunduh pada: ${Utilities.formatDate(sekarang, timeZone, "dd MMMM yyyy HH:mm")}</p>
      </div>
      <div class="section-title">IKHTISAR UTAMA LABA RUGI</div>
      <table>
        <thead>
          <tr>
            <th>Komponen Keuangan</th>
            <th class="text-right">Jumlah Nominal</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>Total Pemasukan Kotor (Omset)</td>
            <td class="text-right">Rp ${rekap.pemasukan.toLocaleString('id-ID')}</td>
          </tr>
          <tr>
            <td>Total Pengeluaran Operasional</td>
            <td class="text-right" style="color: #c53030;">Rp ${rekap.pengeluaran.toLocaleString('id-ID')}</td>
          </tr>
          <tr class="grand-total">
            <td>TOTAL LABA BERSIH (PROFIT)</td>
            <td class="text-right" style="color: #2f855a;">Rp ${rekap.laba.toLocaleString('id-ID')}</td>
          </tr>
          <tr class="grand-total">
            <td>TOTAL RUGI</td>
            <td class="text-right" style="color: #c53030;">Rp ${rekap.rugi.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>
      <div class="section-title">RINCIAN PENJUALAN PER PRODUK (PEMASUKAN)</div>
      <table>
        <thead>
          <tr>
            <th>Nama Produk</th>
            <th class="text-right" style="width: 15%;">Kuantitas (Qty)</th>
            <th class="text-right" style="width: 30%;">Total Pendapatan</th>
          </tr>
        </thead>
        <tbody>`;

  let keysProduk = Object.keys(rincianProduk);
  if (keysProduk.length === 0) {
    htmlBody += `<tr><td colspan="3" style="text-align:center; color:#999;">Tidak ada transaksi pada periode ini</td></tr>`;
  } else {
    keysProduk.forEach(prod => {
      htmlBody += `
        <tr>
          <td>${prod}</td>
          <td class="text-right">${rincianProduk[prod].qty} pcs</td>
          <td class="text-right">Rp ${rincianProduk[prod].nominal.toLocaleString('id-ID')}</td>
        </tr>`;
    });
  }

  htmlBody += `
        <tr class="grand-total">
          <td colspan="2">TOTAL PEMASUKAN</td>
          <td class="text-right">Rp ${rekap.pemasukan.toLocaleString('id-ID')}</td>
        </tr>
      </tbody>
    </table>
    <div class="section-title">RINCIAN ALOKASI BIAYA (PENGELUARAN)</div>
    <table>
      <thead>
        <tr>
          <th>Kategori Pengeluaran</th>
          <th class="text-right" style="width: 30%;">Total Biaya</th>
        </tr>
      </thead>
      <tbody>`;

  let keysKategori = Object.keys(rincianKategori);
  if (keysKategori.length === 0) {
    htmlBody += `<tr><td colspan="2" style="text-align:center; color:#999;">Tidak ada pengeluaran dicatat pada periode ini</td></tr>`;
  } else {
    keysKategori.forEach(kat => {
      htmlBody += `
        <tr>
          <td>${kat}</td>
          <td class="text-right">Rp ${rincianKategori[kat].toLocaleString('id-ID')}</td>
        </tr>`;
    });
  }

  htmlBody += `
          <tr class="grand-total">
            <td>TOTAL PENGELUARAN</td>
            <td class="text-right">Rp ${rekap.pengeluaran.toLocaleString('id-ID')}</td>
          </tr>
        </tbody>
      </table>
      <p style="font-size:10px; color:#888; text-align:center; margin-top:50px;">Laporan ini dibuat otomatis secara sah oleh Sistem Aplikasi Kasir UMKM Digital.</p>
    </body>
    </html>`;

  const htmlBlob = HtmlService.createHtmlOutput(htmlBody).getAs('application/pdf');
  return Utilities.base64Encode(htmlBlob.getBytes());
}