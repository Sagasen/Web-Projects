import { jsPDF } from 'jspdf'

const formatRp = (angka) => 'Rp ' + Number(angka || 0).toLocaleString('id-ID')

const formatTanggal = (isoString) => {
  if (!isoString) return '-'
  return new Date(isoString).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const DELIVERY_LABEL = {
  diantar: 'Diantar ke rumah',
  ambil: 'Ambil sendiri di toko'
}

const PAYMENT_LABEL = {
  tunai: 'Tunai / COD',
  qris: 'QRIS / Transfer'
}

/**
 * Generate & langsung download invoice PDF untuk 1 pesanan.
 * @param {object} order - object order dari Supabase (order_number, created_at, status, items, dst)
 * @param {object} customer - { name, phone } dari CustomerAuthContext
 */
export const generateInvoicePDF = (order, customer) => {
  const doc = new jsPDF({ unit: 'pt', format: 'a4' }) // pt biar gampang atur skala teks
  const pageWidth = doc.internal.pageSize.getWidth()
  const marginX = 48
  let y = 0

  // Warna brand (samain dengan --green-600 / --green-700 di CSS)
  const green700 = [21, 128, 61]
  const green600 = [22, 163, 74]
  const gray500 = [107, 114, 128]
  const gray800 = [31, 41, 55]
  const lineGray = [229, 231, 235]

  // ===== HEADER =====
  doc.setFillColor(...green700)
  doc.rect(0, 0, pageWidth, 90, 'F')

  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.text('Mbah Win', marginX, 42)

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text('Toko Sembako', marginX, 60)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.text('INVOICE', pageWidth - marginX, 42, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.text(order.order_number || '-', pageWidth - marginX, 60, { align: 'right' })

  y = 130

  // ===== INFO PELANGGAN & PESANAN =====
  doc.setTextColor(...gray800)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.text('Ditagihkan kepada', marginX, y)
  doc.text('Detail Pesanan', pageWidth / 2 + 10, y)

  y += 16
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(10)
  doc.setTextColor(...gray500)

  const custLines = [
    customer?.name || '-',
    customer?.phone || '',
  ].filter(Boolean)
  custLines.forEach((line, i) => doc.text(line, marginX, y + i * 14))

  const orderLines = [
    `Tanggal: ${formatTanggal(order.created_at)}`,
    `Status: ${order.status || '-'}`,
    `Pengiriman: ${DELIVERY_LABEL[order.delivery_method] || order.delivery_method || '-'}`,
    `Pembayaran: ${PAYMENT_LABEL[order.payment_method] || order.payment_method || '-'}`,
  ]
  orderLines.forEach((line, i) => doc.text(line, pageWidth / 2 + 10, y + i * 14))

  y += Math.max(custLines.length, orderLines.length) * 14 + 10

  if (order.address) {
    doc.text(`Alamat: ${order.address}`, marginX, y, { maxWidth: pageWidth - marginX * 2 })
    y += 24
  }

  y += 10

  // ===== TABEL ITEM =====
  const col = {
    item: marginX,
    qty: pageWidth - 260,
    harga: pageWidth - 190,
    subtotal: pageWidth - marginX
  }

  doc.setFillColor(...green600)
  doc.rect(marginX, y, pageWidth - marginX * 2, 26, 'F')
  doc.setTextColor(255, 255, 255)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(9)
  doc.text('ITEM', col.item + 8, y + 17)
  doc.text('QTY', col.qty, y + 17, { align: 'center' })
  doc.text('HARGA', col.harga, y + 17, { align: 'right' })
  doc.text('SUBTOTAL', col.subtotal, y + 17, { align: 'right' })

  y += 26

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9.5)

  const items = order.items || []
  items.forEach((item, idx) => {
    const rowH = 28
    if (idx % 2 === 1) {
      doc.setFillColor(248, 250, 252)
      doc.rect(marginX, y, pageWidth - marginX * 2, rowH, 'F')
    }
    doc.setTextColor(...gray800)
    doc.text(item.product_name || '-', col.item + 8, y + 13)
    doc.setTextColor(...gray500)
    doc.setFontSize(8.5)
    doc.text(item.variant_name || '', col.item + 8, y + 24)
    doc.setFontSize(9.5)

    doc.setTextColor(...gray800)
    doc.text(String(item.qty), col.qty, y + 18, { align: 'center' })
    doc.text(formatRp(item.unit_price), col.harga, y + 18, { align: 'right' })
    doc.text(formatRp(item.unit_price * item.qty), col.subtotal, y + 18, { align: 'right' })

    y += rowH

    // halaman baru kalau item kepanjangan
    if (y > 700) {
      doc.addPage()
      y = 48
    }
  })

  y += 4
  doc.setDrawColor(...lineGray)
  doc.line(marginX, y, pageWidth - marginX, y)
  y += 24

  // ===== TOTAL =====
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.setTextColor(...green700)
  doc.text('TOTAL', col.harga, y, { align: 'right' })
  doc.text(formatRp(order.subtotal), col.subtotal, y, { align: 'right' })

  y += 40

  if (order.note) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(9)
    doc.setTextColor(...gray500)
    doc.text(`Catatan: ${order.note}`, marginX, y, { maxWidth: pageWidth - marginX * 2 })
    y += 24
  }

  // ===== FOOTER =====
  const pageHeight = doc.internal.pageSize.getHeight()
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(...gray500)
  doc.text('Terima kasih sudah belanja di Mbah Win Toko Sembako', pageWidth / 2, pageHeight - 40, { align: 'center' })
  doc.text('Invoice ini dibuat otomatis dan sah tanpa tanda tangan.', pageWidth / 2, pageHeight - 28, { align: 'center' })

  doc.save(`Invoice-${order.order_number || 'MbahWin'}.pdf`)
}
