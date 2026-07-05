// /api/chat.js
// Vercel Serverless Function — proxy aman ke Anthropic Claude API.
// ANTHROPIC_API_KEY disimpan sebagai Environment Variable di Vercel
// (Project Settings → Environment Variables), TIDAK pernah dikirim ke browser.

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return res.status(500).json({
      error: 'ANTHROPIC_API_KEY belum diatur di environment variables server.'
    })
  }

  try {
    const { message, history = [], products = [] } = req.body || {}

    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Pesan tidak boleh kosong' })
    }

    const catalogText = products.length
      ? products
          .map(p => `- ${p.name}${p.category ? ` (${p.category})` : ''}${p.priceRange ? ` — mulai Rp${p.priceRange}` : ''}`)
          .join('\n')
      : 'Belum ada data produk.'

    const systemPrompt = `Kamu adalah asisten belanja AI untuk toko online "Bakoel Umpluk", toko yang menjual perlengkapan cuci rumah tangga seperti deterjen, sabun cuci piring, softener/pelembut pakaian, pembersih lantai & kamar mandi, dan sabun perawatan tubuh.

Tugasmu:
- Menjawab pertanyaan pelanggan tentang produk, cara pakai, rekomendasi produk sesuai kebutuhan (misal: "pakaian bayi", "cucian bau apek", "lantai licin habis pel").
- Merekomendasikan produk yang ADA di katalog toko di bawah ini saja. Jangan mengarang produk yang tidak ada di daftar.
- Jika pelanggan bertanya di luar topik toko/kebersihan rumah, jawab singkat lalu arahkan kembali ke topik belanja.
- Gunakan Bahasa Indonesia yang ramah, santai, dan singkat (maksimal 3-4 kalimat, atau daftar poin singkat).
- Jangan mengarang harga pasti; kamu hanya tahu kisaran harga dari katalog.
- Kamu tidak bisa langsung menambahkan barang ke keranjang; sarankan pelanggan mencari nama produk tersebut di katalog dan menekan tombol "Tambah".

Katalog produk yang tersedia saat ini:
${catalogText}`

    const anthropicMessages = [
      ...history
        .filter(m => m.role === 'user' || m.role === 'assistant')
        .map(m => ({ role: m.role, content: m.content })),
    ]

    // Ensure the latest user message is included
    if (anthropicMessages.length === 0 || anthropicMessages[anthropicMessages.length - 1].content !== message) {
      anthropicMessages.push({ role: 'user', content: message })
    }

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 500,
        system: systemPrompt,
        messages: anthropicMessages
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', errText)
      return res.status(502).json({ error: 'Gagal menghubungi layanan AI' })
    }

    const data = await response.json()
    const textBlock = (data.content || []).find(c => c.type === 'text')
    const reply = textBlock ? textBlock.text : 'Maaf, aku belum bisa menjawab itu sekarang.'

    return res.status(200).json({ reply })
  } catch (err) {
    console.error('Chat handler error:', err)
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' })
  }
}
