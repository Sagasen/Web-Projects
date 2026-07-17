// Asisten resep berbasis Gemini API (Google) — menjawab pakai pengetahuan bawaan modelnya sendiri
// (fitur pencarian internet/grounding dimatikan karena kuotanya sangat kecil di free tier),
//
// Butuh API key gratis dari https://aistudio.google.com/apikey
// Simpan di file .env sebagai: VITE_GEMINI_API_KEY=xxxxxxxx
//
// CATATAN KEAMANAN:
// Karena ini dipanggil langsung dari browser (client-side), API key ini akan
// ikut ter-bundle dan bisa dilihat orang yang iseng buka DevTools/Network tab.
// Untuk skala kecil/demo/warung ini biasanya masih aman & wajar dipakai,
// tapi kalau nanti trafficnya besar, sebaiknya pindahkan pemanggilan ini ke
// Supabase Edge Function (backend), supaya API key tidak pernah sampai ke browser.

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY
const GEMINI_MODEL = 'gemini-2.0-flash'
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`

const SYSTEM_PROMPT = `Kamu adalah asisten belanja untuk toko sembako online bernama "Mbah Win".
Tugasmu: kalau user cerita mau masak apa, berikan 1 resep yang paling cocok dan populer
berdasarkan pengetahuanmu, lalu balas HANYA dengan JSON valid seperti
format di bawah ini, TANPA teks lain, TANPA markdown code block, dan SELALU dalam
Bahasa Indonesia (termasuk nama bahan dan langkah memasak), bahasa yang sederhana dan
mudah dimengerti karena banyak penggunanya orang tua:

{"title":"Nama Resep","ingredients":["bahan 1","bahan 2"],"steps":["langkah 1","langkah 2"]}

Batasi maksimal 12 bahan dan 8 langkah, ringkas tapi jelas.`

/**
 * Minta rekomendasi resep ke Gemini (dengan akses internet via grounding search).
 * @param {string} userInput - misal "mau bikin ayam goreng"
 * @returns {Promise<{title:string, source:string, ingredients:string[], steps:string[]}|null>}
 */
export const fetchAiRecipeFromGemini = async (userInput) => {
  if (!GEMINI_API_KEY) {
    // Belum ada API key, biar caller fallback ke cara lama
    return null
  }

  try {
    const res = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(15000),
      body: JSON.stringify({
        contents: [
          { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nUser mau masak: "${userInput}"` }] }
        ],
        tools: [], // grounding (google_search) dimatikan dulu — kuotanya sangat kecil di free tier & sering kena 429.
                   // Gemini tetap jawab pakai pengetahuan bawaannya sendiri (masih cukup andal untuk resep umum).
        generationConfig: { temperature: 0.4 }
      })
    })

    if (!res.ok) throw new Error(`Gemini API error: ${res.status}`)

    const data = await res.json()
    const rawText = data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text || '')
      .join('') || ''

    const cleaned = rawText.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(cleaned)

    if (!parsed.title) return null

    return {
      title: parsed.title,
      source: 'AI (Gemini)',
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : [],
      steps: Array.isArray(parsed.steps) ? parsed.steps : []
    }
  } catch (err) {
    console.warn('Gemini fetch gagal, fallback ke sumber lain:', err.message)
    return null
  }
}
