// ============================================================
// EMS Helper Utilities
// ============================================================

/**
 * Format a number as Indonesian Rupiah.
 * Returns "-" if value is null / undefined / NaN.
 */
export function formatCurrency(value) {
  const num = Number(value);
  if (value === null || value === undefined || value === '' || isNaN(num)) return '-';
  return 'Rp' + num.toLocaleString('id-ID');
}

/**
 * Format an ISO date string using Indonesian locale.
 */
export function formatDate(isoStr, opts = { dateStyle: 'medium', timeStyle: 'short' }) {
  if (!isoStr) return '-';
  try {
    return new Date(isoStr).toLocaleString('id-ID', opts);
  } catch {
    return '-';
  }
}

/**
 * Format a date for PDF labels (e.g. "21 Juni 2026").
 */
export function formatDateLong(isoStr) {
  if (!isoStr) return '-';
  return new Date(isoStr).toLocaleDateString('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric'
  });
}

/**
 * Format a date as YYYYMMDD for use in file names.
 */
export function formatDateFilename(date) {
  const d = new Date(date);
  const Y = d.getFullYear();
  const M = String(d.getMonth() + 1).padStart(2, '0');
  const D = String(d.getDate()).padStart(2, '0');
  return `${Y}${M}${D}`;
}

// ============================================================
// Date Range Helpers
// ============================================================

export function getDateRangeByFilter(filter, customStart = null, customEnd = null, selectedMonth = null, selectedDate = null) {
  const now = new Date();

  switch (filter) {
    case 'today': {
      const start = new Date(now); start.setHours(0, 0, 0, 0);
      const end   = new Date(now); end.setHours(23, 59, 59, 999);
      return { start, end, label: formatDateLong(start) };
    }
    case '7days': {
      const start = new Date(now); start.setDate(now.getDate() - 6); start.setHours(0, 0, 0, 0);
      const end   = new Date(now); end.setHours(23, 59, 59, 999);
      return { start, end, label: `${formatDateLong(start)} - ${formatDateLong(end)}` };
    }
    case 'thisMonth': {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      const end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      return {
        start, end,
        label: new Date(start).toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      };
    }
    case 'thisYear': {
      const start = new Date(now.getFullYear(), 0, 1);
      const end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return { start, end, label: `${now.getFullYear()}` };
    }
    case 'pickMonth': {
      if (!selectedMonth) return { start: null, end: null, label: '-' };
      const [y, m] = selectedMonth.split('-').map(Number);
      const start = new Date(y, m - 1, 1);
      const end   = new Date(y, m, 0, 23, 59, 59, 999);
      return {
        start, end,
        label: start.toLocaleDateString('id-ID', { month: 'long', year: 'numeric' })
      };
    }
    case 'pickDate': {
      if (!selectedDate) return { start: null, end: null, label: '-' };
      const start = new Date(selectedDate); start.setHours(0, 0, 0, 0);
      const end   = new Date(selectedDate); end.setHours(23, 59, 59, 999);
      return { start, end, label: formatDateLong(start) };
    }
    case 'custom': {
      const start = customStart ? new Date(customStart) : null;
      if (start) start.setHours(0, 0, 0, 0);
      const end = customEnd ? new Date(customEnd) : null;
      if (end) end.setHours(23, 59, 59, 999);
      const label = start && end
        ? `${formatDateLong(start)} - ${formatDateLong(end)}`
        : '-';
      return { start, end, label };
    }
    default:
      return { start: null, end: null, label: '-' };
  }
}

// ============================================================
// Income Summary
// ============================================================

export function calculateIncomeSummary(transactions) {
  const completed = transactions.filter(t => t.admin_status === 'completed');

  const totalRevenue  = completed.reduce((s, t) => s + (t.total_price  || 0), 0);
  const totalRobux    = completed.reduce((s, t) => s + (t.robux_amount || 0), 0);
  const avgTx         = completed.length ? totalRevenue / completed.length : 0;
  const staffCount    = completed.filter(t => t.category === 'Staff').length;
  const firstBuyCount = completed.filter(t => t.category === 'Pembelian Pertama').length;
  const normalCount   = completed.filter(t => t.category === 'Normal').length;

  return {
    completedCount: completed.length,
    totalRevenue,
    totalRobux,
    avgTx,
    staffCount,
    firstBuyCount,
    normalCount
  };
}

// ============================================================
// AI Business Insights (Rule-based)
// ============================================================

export function generateBusinessInsights(completedTx, pendingTx = [], cancelledTx = []) {
  const insights = [];

  const n        = completedTx.length;
  const revenue  = completedTx.reduce((s, t) => s + (t.total_price  || 0), 0);
  const robux    = completedTx.reduce((s, t) => s + (t.robux_amount || 0), 0);
  const avg      = n ? revenue / n : 0;
  const staff    = completedTx.filter(t => t.category === 'Staff').length;
  const firstBuy = completedTx.filter(t => t.category === 'Pembelian Pertama').length;
  const normal   = completedTx.filter(t => t.category === 'Normal').length;

  // 1. Revenue summary
  insights.push({
    type: 'info',
    text: n > 0
      ? `Pemasukan periode ini mencapai ${formatCurrency(revenue)} dari ${n} transaksi selesai.`
      : 'Belum ada transaksi selesai pada periode ini.'
  });

  // 2. Total robux
  if (n > 0) {
    insights.push({ type: 'info', text: `Total Robux yang terjual pada periode ini adalah ${robux.toLocaleString('id-ID')} Robux.` });
  }

  // 3. Average transaction
  if (n > 0) {
    insights.push({ type: 'info', text: `Rata-rata nilai transaksi adalah ${formatCurrency(Math.round(avg))}.` });
  }

  // 4. Dominant category
  if (n > 0) {
    const dominant = [
      { label: 'Staff', count: staff },
      { label: 'Pembelian Pertama', count: firstBuy },
      { label: 'Normal', count: normal }
    ].sort((a, b) => b.count - a.count)[0];
    insights.push({
      type: 'info',
      text: `Kategori paling dominan adalah ${dominant.label} (${dominant.count} transaksi). ${
        dominant.label === 'Pembelian Pertama'
          ? 'Ini menunjukkan banyak customer baru yang masuk.'
          : dominant.label === 'Staff'
          ? 'Pastikan pemasukan dari non-staff tetap sehat.'
          : 'Repeat order sedang berjalan baik.'
      }`
    });
  }

  // 5. First-buy vs Normal ratio
  if (n > 0) {
    const fpPct = Math.round((firstBuy / n) * 100);
    const nPct  = Math.round((normal   / n) * 100);
    insights.push({
      type: nPct < 20 ? 'warning' : 'info',
      text: `Pembelian Pertama: ${fpPct}%, Normal (repeat): ${nPct}%. ${nPct < 20 ? 'Repeat order masih perlu ditingkatkan.' : 'Repeat order dalam kondisi sehat.'}`
    });
  }

  // 6. Repeat customers
  if (n > 0) {
    const userCounts = {};
    completedTx.forEach(t => {
      const u = (t.roblox_username || '').toLowerCase();
      userCounts[u] = (userCounts[u] || 0) + 1;
    });
    const repeats = Object.values(userCounts).filter(c => c > 1).length;
    if (repeats > 0) {
      insights.push({ type: 'info', text: `Terdapat ${repeats} customer yang melakukan transaksi lebih dari satu kali.` });
    }
  }

  // 7. Highest earning day
  if (n > 0) {
    const byDay = {};
    completedTx.forEach(t => {
      const dateKey = (t.completed_at || t.created_at || '').slice(0, 10);
      if (dateKey) byDay[dateKey] = (byDay[dateKey] || 0) + (t.total_price || 0);
    });
    const sorted = Object.entries(byDay).sort((a, b) => b[1] - a[1]);
    if (sorted.length) {
      const [topDay, topAmt] = sorted[0];
      const label = formatDateLong(topDay + 'T00:00:00');
      insights.push({ type: 'info', text: `Pemasukan tertinggi terjadi pada ${label} dengan total ${formatCurrency(topAmt)}.` });
    }
  }

  // 8. Pending warning
  if (pendingTx.length > 5) {
    insights.push({
      type: 'warning',
      text: `Ada ${pendingTx.length} order pending. Sebaiknya segera follow-up agar customer tidak menunggu terlalu lama.`
    });
  }

  // 9. Cancelled warning
  const cancelledPct = n > 0 ? Math.round((cancelledTx.length / (n + cancelledTx.length)) * 100) : 0;
  if (cancelledTx.length >= 3 && cancelledPct >= 20) {
    insights.push({
      type: 'warning',
      text: `Jumlah transaksi dibatalkan cukup tinggi (${cancelledTx.length} batal, ${cancelledPct}%). Cek apakah ada masalah pembayaran atau customer tidak lanjut transfer.`
    });
  }

  // 10. Staff dominance warning
  if (n > 0 && staff / n > 0.4) {
    insights.push({
      type: 'warning',
      text: `Transaksi Staff cukup dominan (${Math.round((staff/n)*100)}%). Karena rate staff lebih rendah, pantau agar pemasukan tetap sehat.`
    });
  }

  // 11. Normal too low
  if (n > 0 && normal / n < 0.2) {
    insights.push({
      type: 'warning',
      text: `Transaksi Normal masih rendah (${Math.round((normal/n)*100)}%). Repeat order belum kuat. Pertimbangkan follow-up customer lama.`
    });
  }

  // 12. Recommendations
  const recommendations = [];
  if (pendingTx.length > 0) recommendations.push('Follow-up order pending setiap hari agar tidak menumpuk.');
  if (normal / Math.max(n, 1) < 0.3) recommendations.push('Dorong customer lama untuk repeat order.');
  recommendations.push('Pantau bukti pembayaran sebelum konfirmasi selesai.');
  recommendations.push('Pastikan username Roblox dicek ulang sebelum payout.');
  if (n >= 10) recommendations.push('Pisahkan laporan harian/mingguan/bulanan secara rutin.');
  if (normal / Math.max(n, 1) < 0.2) recommendations.push('Pertimbangkan promo repeat order kecil untuk meningkatkan Normal order.');

  if (recommendations.length) {
    insights.push({
      type: 'recommendation',
      text: 'Rekomendasi:',
      items: recommendations.slice(0, 5)
    });
  }

  return insights;
}

// ============================================================
// WhatsApp / Chat Builders
// ============================================================

export function buildWhatsAppLink(message, phoneNumber) {
  const clean = (phoneNumber || '').replace(/[^0-9]/g, '');
  return `https://wa.me/${clean}?text=${encodeURIComponent(message)}`;
}

export function buildOrderChatMessage(transaction) {
  const formatIDR = (n) => 'Rp' + (Number(n) || 0).toLocaleString('id-ID');
  return `-------------------------------------------------
*ETERNAL MYTH STUDIO*
*PAYOUT COMMUNITY*

Username: ${transaction.roblox_username || '-'}
Display Name: ${transaction.display_name || '-'}
Jumlah Robux: ${(transaction.robux_amount || 0).toLocaleString()} Robux
Verifikasi Umur/KTP: ${transaction.verification_status || 'Belum'}
Kategori: ${transaction.category || 'Normal'}
Total Harga: ${formatIDR(transaction.total_price)}
-------------------------------------------------

Catatan:
${transaction.notes ? transaction.notes.trim() : '-'}`;
}
