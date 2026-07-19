const WHATSAPP_NUMBER = import.meta.env.VITE_WHATSAPP_NUMBER || '6281234567890'

export function getWhatsAppUrl(message) {
  const encoded = encodeURIComponent(message)
  return `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`
}

export function buildSingleOrderMessage(product) {
  const price = product.discountPrice ?? product.price
  return (
    `Halo, saya ingin memesan produk:\n\n` +
    `*${product.name}*\n` +
    `Kategori: ${product.category}\n` +
    `Harga: Rp ${price.toLocaleString('id-ID')}\n` +
    `Status: ${product.status || 'Ready Stock'}\n\n` +
    `Apakah produk ini tersedia?\n\n` +
    `Terima kasih!`
  )
}

export function buildCartOrderMessage(items, total) {
  const lines = items.map(
    (item, i) =>
      `${i + 1}. ${item.name} x${item.quantity} — Rp ${(
        (item.discountPrice ?? item.price) * item.quantity
      ).toLocaleString('id-ID')} (${item.status || 'Ready Stock'})`
  )

  return (
    `Halo, saya ingin memesan produk:\n\n` +
    lines.join('\n') +
    `\n\n*Total: Rp ${total.toLocaleString('id-ID')}*\n\n` +
    `Apakah produk ini tersedia?\n\n`+
    `Terima kasih!`
  )
}