// /api/analyze.js
// Vercel Serverless Function — analisis keuangan & penjualan berbasis AI (Claude).
// ANTHROPIC_API_KEY disimpan sebagai Environment Variable di server, tidak pernah ke browser.

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
    const { period, kpi, dailyData, topProducts, lowStock } = req.body || {}

    const dataSummary = `
Periode analisis: ${period} hari terakhir

Ringkasan KPI:
- Total Omzet: Rp${Number(kpi?.omzet || 0).toLocaleString('id-ID')}
- Estimasi Laba: Rp${Number(kpi?.laba || 0).toLocaleString('id-ID')}
- Jumlah Transaksi: ${kpi?.transaksiCount || 0}
- Rata-rata Nilai Transaksi: Rp${Number(kpi?.avgTransaksi || 0).toLocaleString('id-ID')}

Tren Pendapatan Harian (tanggal: omzet):
${(dailyData || []).map(d => `- ${d.label}: Rp${Number(d.amount).toLocaleString('id-ID')}`).join('\n') || 'Tidak ada data'}

Produk Terlaris (nama: jumlah terjual):
${(topProducts || []).map(p => `- ${p.name}: ${p.qty} terjual`).join('\n') || 'Tidak ada data'}

Produk dengan Stok Kritis (nama varian: sisa stok):
${(lowStock || []).map(s => `- ${s.name}: ${s.stock} tersisa`).join('\n') || 'Tidak ada produk dengan stok kritis'}
`.trim()

    const systemPrompt = `Kamu adalah analis bisnis untuk toko online "Bakoel Umpluk" yang menjual perlengkapan cuci rumah tangga (deterjen, sabun cuci piring, softener, pembersih lantai, dll).

Berdasarkan data keuangan & penjualan yang diberikan, buat analisis singkat dalam Bahasa Indonesia yang mencakup:
1. Ringkasan kondisi bisnis saat ini (1-2 kalimat)
2. Tren yang terlihat (naik/turun, hari ramai/sepi, dll)
3. Rekomendasi actionable (maksimal 3 poin) — misalnya soal restock, promosi produk tertentu, atau strategi harga

Format jawaban dengan heading singkat dan bullet point, total tidak lebih dari 200 kata. Gunakan nada profesional tapi mudah dipahami pemilik UMKM.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 700,
        system: systemPrompt,
        messages: [{ role: 'user', content: `Berikut data bisnis saya, tolong analisis:\n\n${dataSummary}` }]
      })
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Anthropic API error:', errText)
      return res.status(502).json({ error: 'Gagal menghubungi layanan AI' })
    }

    const data = await response.json()
    const textBlock = (data.content || []).find(c => c.type === 'text')
    const analysis = textBlock ? textBlock.text : 'Analisis tidak tersedia saat ini.'

    return res.status(200).json({ analysis })
  } catch (err) {
    console.error('Analyze handler error:', err)
    return res.status(500).json({ error: 'Terjadi kesalahan pada server' })
  }
}
