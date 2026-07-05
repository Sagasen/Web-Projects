import React, { useState, useEffect } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../components/ProductCard'
import { useToast } from '../../context/ToastContext'

const localFormatDate = (isoString) => {
  if (!isoString) return '-'
  const d = new Date(isoString)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PIE_COLORS = ['#0284c7', '#38bdf8', '#7dd3fc', '#f59e0b', '#22c55e', '#a78bfa']

export const AdminFinance = () => {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7)
  const [kpi, setKpi] = useState({ omzet: 0, laba: 0, transaksiCount: 0, avgTransaksi: 0 })
  const [dailyData, setDailyData] = useState([])
  const [recentSales, setRecentSales] = useState([])
  const [topProducts, setTopProducts] = useState([])
  const [lowStock, setLowStock] = useState([])

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState('')
  const [aiLoading, setAiLoading] = useState(false)

  useEffect(() => {
    fetchReportData()
    fetchLowStock()
    setAiAnalysis('') // Reset analysis when period changes
  }, [period])

  const fetchLowStock = async () => {
    try {
      const { data } = await supabase
        .from('product_variants')
        .select('variant_name, stock, min_stock, products(name)')
      const list = (data || [])
        .filter(v => v.stock <= v.min_stock)
        .map(v => ({ name: `${v.products?.name || ''} - ${v.variant_name}`, stock: v.stock }))
        .slice(0, 8)
      setLowStock(list)
    } catch (e) {
      console.error(e)
    }
  }

  const fetchReportData = async () => {
    setLoading(true)
    try {
      const limitDate = new Date()
      limitDate.setDate(limitDate.getDate() - period)
      const limitStr = limitDate.toISOString().slice(0, 10)

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, customer_name, subtotal, status, created_at, sale_type,
          order_items (
            id, qty, unit_price, product_name,
            product_variants ( cost_price )
          )
        `)
        .gte('created_at', `${limitStr}T00:00:00`)
        .neq('status', 'Ditolak')
        .order('created_at', { ascending: false })

      if (error) throw error
      const rawOrders = orders || []

      let omzet = 0
      let laba = 0
      const transaksiCount = rawOrders.length
      const productQtyMap = {}

      rawOrders.forEach(o => {
        const subtotal = Number(o.subtotal) || 0
        omzet += subtotal

        const items = o.order_items || []
        items.forEach(item => {
          const qty = Number(item.qty) || 0
          const unitPrice = Number(item.unit_price) || 0
          const costPrice = Number(item.product_variants?.cost_price) || 0
          laba += (unitPrice - costPrice) * qty

          productQtyMap[item.product_name] = (productQtyMap[item.product_name] || 0) + qty
        })
      })

      const avgTransaksi = transaksiCount > 0 ? omzet / transaksiCount : 0

      setKpi({ omzet, laba, transaksiCount, avgTransaksi })
      setRecentSales(rawOrders.slice(0, 10))

      const topProds = Object.entries(productQtyMap)
        .map(([name, qty]) => ({ name, qty }))
        .sort((a, b) => b.qty - a.qty)
        .slice(0, 6)
      setTopProducts(topProds)

      // Group daily revenue for chart
      const dailyMap = {}
      for (let i = period - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dStr = d.toISOString().slice(0, 10)
        dailyMap[dStr] = { label: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), amount: 0, laba: 0 }
      }

      rawOrders.forEach(o => {
        const dateStr = o.created_at.slice(0, 10)
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].amount += Number(o.subtotal) || 0
          const items = o.order_items || []
          items.forEach(item => {
            const qty = Number(item.qty) || 0
            const unitPrice = Number(item.unit_price) || 0
            const costPrice = Number(item.product_variants?.cost_price) || 0
            dailyMap[dateStr].laba += (unitPrice - costPrice) * qty
          })
        }
      })

      setDailyData(Object.keys(dailyMap).map(key => ({
        key, label: dailyMap[key].label, amount: dailyMap[key].amount, laba: dailyMap[key].laba
      })))

    } catch (err) {
      console.error(err)
      showToast('Gagal memuat data laporan', 'error')
    } finally {
      setLoading(false)
    }
  }

  const handleAiAnalysis = async () => {
    setAiLoading(true)
    setAiAnalysis('')
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, kpi, dailyData, topProducts, lowStock })
      })

      if (!res.ok) throw new Error('Gagal memuat analisis AI')
      const data = await res.json()
      setAiAnalysis(data.analysis || 'Analisis tidak tersedia.')
    } catch (err) {
      console.error(err)
      showToast('Gagal memuat analisis AI. Pastikan ANTHROPIC_API_KEY sudah diatur di server.', 'error')
    } finally {
      setAiLoading(false)
    }
  }

  return (
    <div>
      {/* Period Selection */}
      <div className="category-section">
        <div className="period-tabs">
          <button className={`period-tab ${period === 7 ? 'active' : ''}`} onClick={() => setPeriod(7)}>7 Hari Terakhir</button>
          <button className={`period-tab ${period === 30 ? 'active' : ''}`} onClick={() => setPeriod(30)}>30 Hari Terakhir</button>
          <button className={`period-tab ${period === 90 ? 'active' : ''}`} onClick={() => setPeriod(90)}>3 Bulan Terakhir</button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Memuat laporan keuangan...</p>
        </div>
      ) : (
        <>
          {/* AI Analysis Card */}
          <div className="ai-insight-card">
            <div className="ai-insight-header">
              <span className="ai-insight-title">🤖 Analisis AI Keuangan</span>
              <button className="ai-insight-btn" onClick={handleAiAnalysis} disabled={aiLoading}>
                {aiLoading ? 'Menganalisis...' : (aiAnalysis ? '🔄 Analisis Ulang' : '✨ Buat Analisis')}
              </button>
            </div>
            {aiLoading ? (
              <p className="ai-insight-placeholder">Sedang menganalisis data penjualan & keuangan kamu...</p>
            ) : aiAnalysis ? (
              <div className="ai-insight-body">{aiAnalysis}</div>
            ) : (
              <p className="ai-insight-placeholder">
                Klik "Buat Analisis" untuk mendapatkan ringkasan kondisi bisnis, tren penjualan, dan rekomendasi dari AI berdasarkan data periode ini.
              </p>
            )}
          </div>

          {/* KPI Dashboard */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-icon green">📈</div>
              <div className="stat-info">
                <div className="stat-label">Total Omzet</div>
                <div className="stat-value">{formatRupiah(kpi.omzet)}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon blue">💰</div>
              <div className="stat-info">
                <div className="stat-label">Estimasi Laba</div>
                <div className="stat-value">{formatRupiah(kpi.laba)}</div>
                <div className="stat-sub">Selisih Jual - Beli</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon green">🧾</div>
              <div className="stat-info">
                <div className="stat-label">Total Transaksi</div>
                <div className="stat-value">{kpi.transaksiCount}</div>
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-icon amber">🛍️</div>
              <div className="stat-info">
                <div className="stat-label">Rata-rata Transaksi</div>
                <div className="stat-value" style={{ fontSize: 'var(--text-lg)' }}>{formatRupiah(kpi.avgTransaksi)}</div>
              </div>
            </div>
          </div>

          {/* Revenue & Profit Trend Chart */}
          <div className="report-chart-card mb-6">
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-6)' }}>📊 Tren Omzet & Laba Harian</h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={dailyData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}jt` : v >= 1000 ? `${Math.round(v/1000)}k` : v} />
                <Tooltip formatter={(value) => formatRupiah(value)} />
                <Legend />
                <Line type="monotone" dataKey="amount" name="Omzet" stroke="#0284c7" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="laba" name="Laba" stroke="#22c55e" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="grid-2 mb-6">
            {/* Top Products Bar Chart */}
            <div className="report-chart-card">
              <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-6)' }}>🏆 Produk Terlaris</h3>
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={topProducts} layout="vertical" margin={{ left: 10, right: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={110} />
                    <Tooltip />
                    <Bar dataKey="qty" name="Terjual" fill="#0284c7" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray" style={{ padding: 'var(--space-8) 0' }}>Belum ada data penjualan</p>
              )}
            </div>

            {/* Product Mix Pie Chart */}
            <div className="report-chart-card">
              <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-6)' }}>🥧 Komposisi Penjualan</h3>
              {topProducts.length > 0 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <PieChart>
                    <Pie data={topProducts} dataKey="qty" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={{ fontSize: 10 }}>
                      {topProducts.map((entry, idx) => (
                        <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center text-gray" style={{ padding: 'var(--space-8) 0' }}>Belum ada data penjualan</p>
              )}
            </div>
          </div>

          {/* Recent Sales List */}
          <div className="table-card">
            <div className="table-header">
              <span className="table-title">🧾 Transaksi Terakhir (Maks. 10)</span>
            </div>
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>No. Pesanan</th>
                    <th>Nama Pelanggan</th>
                    <th>Subtotal</th>
                    <th>Status</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {recentSales.length > 0 ? (
                    recentSales.map(o => (
                      <tr key={o.id}>
                        <td style={{ fontWeight: 600 }}>{o.order_number}</td>
                        <td>{o.customer_name}</td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{formatRupiah(o.subtotal)}</td>
                        <td>
                          <span className="status-badge" style={{
                            background: o.status === 'Selesai' ? 'var(--green-100)' : 'var(--amber-100)',
                            color: o.status === 'Selesai' ? 'var(--green-800)' : '#92400e'
                          }}>
                            {o.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>{localFormatDate(o.created_at)}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="5" className="text-center text-gray">Tidak ada transaksi dalam periode ini</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
