import React, { useState, useRef, useEffect } from 'react'

const GREETING = 'Halo! Aku asisten belanja Bakoel Umpluk 🧼. Tanya-tanya aja soal produk deterjen, sabun cuci piring, softener, atau butuh rekomendasi buat kebutuhan cuci-cuci di rumah. Ada yang bisa dibantu?'

export const ChatWidget = ({ products = [] }) => {
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState([{ role: 'assistant', content: GREETING }])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bodyRef = useRef(null)

  useEffect(() => {
    if (bodyRef.current) {
      bodyRef.current.scrollTop = bodyRef.current.scrollHeight
    }
  }, [messages, loading, open])

  const buildProductSummary = () => {
    // Keep the payload light: name, category, price range only
    return products.slice(0, 60).map(p => {
      const variants = p.product_variants || []
      const prices = variants.map(v => Number(v.sell_price)).filter(n => !isNaN(n))
      const minP = prices.length ? Math.min(...prices) : null
      const maxP = prices.length ? Math.max(...prices) : null
      return {
        name: p.name,
        category: p.category,
        priceRange: minP ? (minP === maxP ? minP : `${minP}-${maxP}`) : null
      }
    })
  }

  const handleSend = async () => {
    const text = input.trim()
    if (!text || loading) return

    const newMessages = [...messages, { role: 'user', content: text }]
    setMessages(newMessages)
    setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          history: newMessages.slice(-8),
          products: buildProductSummary()
        })
      })

      if (!res.ok) throw new Error('Gagal menghubungi asisten AI')
      const data = await res.json()

      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || 'Maaf, aku belum bisa menjawab itu sekarang.' }])
    } catch (err) {
      console.error(err)
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Maaf, asisten AI sedang tidak bisa dihubungi. Coba lagi sebentar ya, atau hubungi kami langsung lewat WhatsApp 🙏'
      }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button className="chat-fab" onClick={() => setOpen(o => !o)} title="Tanya Asisten AI">
        {open ? '✕' : '🤖'}
      </button>

      {open && (
        <div className="chat-panel">
          <div className="chat-panel-header">
            <div>
              <div className="chat-panel-title">🤖 Asisten Belanja AI</div>
              <div className="chat-panel-sub">Bakoel Umpluk</div>
            </div>
            <button className="chat-panel-close" onClick={() => setOpen(false)}>✕</button>
          </div>

          <div className="chat-panel-body" ref={bodyRef}>
            {messages.map((m, idx) => (
              <div key={idx} className={`chat-bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
                {m.content}
              </div>
            ))}
            {loading && <div className="chat-bubble bot typing">Sedang mengetik...</div>}
          </div>

          <div className="chat-panel-footer">
            <input
              type="text"
              placeholder="Tulis pertanyaan kamu..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              disabled={loading}
            />
            <button className="chat-send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
              ➤
            </button>
          </div>
        </div>
      )}
    </>
  )
}
