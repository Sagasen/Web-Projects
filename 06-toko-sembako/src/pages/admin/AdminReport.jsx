import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { formatRupiah } from '../../components/ProductCard'
import { useToast } from '../../context/ToastContext'

const localFormatDate = (isoString) => {
  if (!isoString) return '-'
  const d = new Date(isoString)
  return d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  })
}

export const AdminReport = () => {
  const { showToast } = useToast()
  const [loading, setLoading] = useState(true)
  const [period, setPeriod] = useState(7) // 7 days, 30 days, or 365 days
  const [kpi, setKpi] = useState({
    omzet: 0,
    laba: 0,
    transaksiCount: 0,
    avgTransaksi: 0
  })
  const [dailyData, setDailyData] = useState([])
  const [recentSales, setRecentSales] = useState([])

  useEffect(() => {
    fetchReportData()
  }, [period])

  const fetchReportData = async () => {
    setLoading(true)
    try {
      // Calculate date boundary
      const limitDate = new Date()
      limitDate.setDate(limitDate.getDate() - period)
      const limitStr = limitDate.toISOString().slice(0, 10)

      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          id, order_number, customer_name, subtotal, status, created_at, sale_type,
          order_items (
            id, qty, unit_price,
            product_variants (
              cost_price
            )
          )
        `)
        .gte('created_at', `${limitStr}T00:00:00`)
        .neq('status', 'Ditolak')
        .order('created_at', { ascending: false })

      if (error) throw error

      const rawOrders = orders || []

      // Calculate KPI stats
      let omzet = 0
      let laba = 0
      const transaksiCount = rawOrders.length

      rawOrders.forEach(o => {
        const subtotal = Number(o.subtotal) || 0
        omzet += subtotal

        // Calculate profit (laba) from items
        const items = o.order_items || []
        items.forEach(item => {
          const qty = Number(item.qty) || 0
          const unitPrice = Number(item.unit_price) || 0
          const costPrice = Number(item.product_variants?.cost_price) || 0
          laba += (unitPrice - costPrice) * qty
        })
      })

      const avgTransaksi = transaksiCount > 0 ? omzet / transaksiCount : 0

      setKpi({
        omzet,
        laba,
        transaksiCount,
        avgTransaksi
      })

      setRecentSales(rawOrders.slice(0, 10))

      // Group daily revenue for chart
      const dailyMap = {}
      // Initialize map with empty values for each day in range
      for (let i = period - 1; i >= 0; i--) {
        const d = new Date()
        d.setDate(d.getDate() - i)
        const dStr = d.toISOString().slice(0, 10)
        dailyMap[dStr] = { dateLabel: d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short' }), amount: 0 }
      }

      rawOrders.forEach(o => {
        const dateStr = o.created_at.slice(0, 10)
        if (dailyMap[dateStr]) {
          dailyMap[dateStr].amount += Number(o.subtotal) || 0
        }
      })

      setDailyData(Object.keys(dailyMap).map(key => ({
        key,
        label: dailyMap[key].dateLabel,
        amount: dailyMap[key].amount
      })))

    } catch (err) {
      console.error(err)
      showToast('Gagal memuat data laporan', 'error')
    } finally {
      setLoading(false)
    }
  }

  // Calculate highest revenue in daily data to scale chart bars
  const maxDailyRevenue = dailyData.reduce((max, d) => d.amount > max ? d.amount : max, 100000)

  return (
    <div>
      {/* Period Selection */}
      <div className="category-section">
        <div className="period-tabs">
          <button className={`period-tab ${period === 7 ? 'active' : ''}`} onClick={() => setPeriod(7)}>
            7 Hari Terakhir
          </button>
          <button className={`period-tab ${period === 30 ? 'active' : ''}`} onClick={() => setPeriod(30)}>
            30 Hari Terakhir
          </button>
          <button className={`period-tab ${period === 90 ? 'active' : ''}`} onClick={() => setPeriod(90)}>
            3 Bulan Terakhir
          </button>
        </div>
      </div>

      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Memuat laporan penjualan...</p>
        </div>
      ) : (
        <>
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
                <div className="stat-value" style={{ fontSize: 'var(--text-lg)' }}>
                  {formatRupiah(kpi.avgTransaksi)}
                </div>
              </div>
            </div>
          </div>

          {/* Revenue Chart */}
          <div className="report-chart-card mb-6">
            <h3 style={{ fontWeight: 700, marginBottom: 'var(--space-6)' }}>📊 Grafik Pendapatan Harian</h3>
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                height: '240px',
                gap: '12px',
                borderBottom: '2px solid var(--gray-200)',
                paddingBottom: '8px',
                overflowX: 'auto'
              }}
            >
              {dailyData.map(d => {
                const heightPx = Math.max((d.amount / maxDailyRevenue) * 200, d.amount > 0 ? 4 : 0)
                return (
                  <div
                    key={d.key}
                    style={{
                      flex: 1,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      height: '100%',
                      minWidth: '36px',
                      paddingBottom: '4px'
                    }}
                  >
                    <div
                      style={{
                        fontSize: '9px',
                        fontWeight: '700',
                        color: 'var(--primary-dark)',
                        marginBottom: '4px',
                        visibility: d.amount > 0 ? 'visible' : 'hidden'
                      }}
                    >
                      {d.amount > 1000000
                        ? `${(d.amount / 1000000).toFixed(1)}jt`
                        : d.amount > 1000 ? `${Math.round(d.amount / 1000)}k` : d.amount}
                    </div>
                    <div
                      style={{
                        width: '100%',
                        height: `${heightPx}px`,
                        background: 'linear-gradient(to top, var(--green-600), var(--green-400))',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease',
                        minHeight: d.amount > 0 ? '4px' : '0'
                      }}
                      title={`${d.key}: ${formatRupiah(d.amount)}`}
                    ></div>
                    <div style={{ fontSize: '9px', color: 'var(--gray-500)', marginTop: '6px', whiteSpace: 'nowrap' }}>
                      {d.label}
                    </div>
                  </div>
                )
              })}
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
                    <th>Tipe Penjualan</th>
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
                        <td>
                          <span className="status-badge" style={{ background: 'var(--gray-100)', color: 'var(--gray-700)' }}>
                            {o.sale_type === 'pos' ? '🧮 POS Kasir' : '📱 Online WA'}
                          </span>
                        </td>
                        <td style={{ fontWeight: 700, color: 'var(--primary-dark)' }}>{formatRupiah(o.subtotal)}</td>
                        <td>
                          <span
                            className="status-badge"
                            style={{
                              background: o.status === 'Selesai' ? 'var(--green-100)' : 'var(--amber-100)',
                              color: o.status === 'Selesai' ? 'var(--green-800)' : '#92400e'
                            }}
                          >
                            {o.status}
                          </span>
                        </td>
                        <td style={{ fontSize: 'var(--text-xs)', color: 'var(--gray-400)' }}>
                          {localFormatDate(o.created_at)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6" className="text-center text-gray">
                        Tidak ada transaksi dalam periode ini
                      </td>
                    </tr>
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
