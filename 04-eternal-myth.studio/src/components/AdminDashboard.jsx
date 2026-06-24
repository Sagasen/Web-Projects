import React, { useState, useEffect } from 'react';
import { Clock, CheckCircle2, TrendingUp, Landmark, AlertCircle, RefreshCw, Sparkles, ChevronRight } from 'lucide-react';
import supabase from '../lib/supabase';
import { formatCurrency, formatDate, generateBusinessInsights } from '../lib/utils';

export default function AdminDashboard() {
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState(null);
  const [allTx, setAllTx]         = useState([]);

  const [stats, setStats] = useState({
    pendingCount:    0,
    completedCount:  0,
    earningsToday:   0,
    robuxToday:      0,
    earningsMonth:   0,
    cancelledMonth:  0
  });

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: txs, error: txsError } = await supabase
        .from('transactions')
        .select('*');
      if (txsError) throw txsError;

      const now         = new Date();
      const startToday  = new Date(now); startToday.setHours(0, 0, 0, 0);
      const startMonth  = new Date(now.getFullYear(), now.getMonth(), 1);

      let pending = 0, completed = 0, earningsToday = 0, robuxToday = 0;
      let earningsMonth = 0, cancelledMonth = 0;

      (txs || []).forEach(tx => {
        if (tx.admin_status === 'pending')    pending++;
        if (tx.admin_status === 'cancelled') {
          const d = new Date(tx.created_at);
          if (d >= startMonth) cancelledMonth++;
        }
        if (tx.admin_status === 'completed') {
          completed++;
          const completedDate = new Date(tx.completed_at || tx.created_at);
          if (completedDate >= startToday) {
            earningsToday += tx.total_price  || 0;
            robuxToday    += tx.robux_amount || 0;
          }
          if (completedDate >= startMonth) {
            earningsMonth += tx.total_price || 0;
          }
        }
      });

      setStats({ pendingCount: pending, completedCount: completed, earningsToday, robuxToday, earningsMonth, cancelledMonth });
      setAllTx(txs || []);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
      setError('Gagal memuat statistik data terbaru.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchStats(); }, []);

  // Derive insights from all data
  const completedTx  = allTx.filter(t => t.admin_status === 'completed');
  const pendingTx    = allTx.filter(t => t.admin_status === 'pending');
  const cancelledTx  = allTx.filter(t => t.admin_status === 'cancelled');

  // Dashboard uses today's completed only for quick insight
  const now         = new Date();
  const startToday  = new Date(now); startToday.setHours(0, 0, 0, 0);
  const todayDone   = completedTx.filter(t => new Date(t.completed_at || t.created_at) >= startToday);
  const insights    = generateBusinessInsights(todayDone.length > 0 ? todayDone : completedTx.slice(-20), pendingTx, cancelledTx);

  const insightTypeStyle = (type) => {
    if (type === 'warning')        return 'text-yellow-300';
    if (type === 'recommendation') return 'text-gold-light';
    return 'text-slate-300';
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center flex-col gap-3">
        <RefreshCw className="w-8 h-8 text-gold-primary animate-spin" />
        <span className="text-xs text-slate-400 font-semibold tracking-wider uppercase animate-pulse">Memuat ringkasan data...</span>
      </div>
    );
  }

  const statCards = [
    {
      title: 'Total Order Pending',
      value: stats.pendingCount,
      desc: 'Memerlukan konfirmasi admin',
      icon: Clock,
      color: 'border-yellow-500/20 bg-yellow-500/5 text-yellow-400',
    },
    {
      title: 'Total Order Selesai',
      value: stats.completedCount,
      desc: 'Transaksi berhasil diselesaikan',
      icon: CheckCircle2,
      color: 'border-emerald-500/20 bg-emerald-500/5 text-emerald-400',
    },
    {
      title: 'Pemasukan Hari Ini',
      value: formatCurrency(stats.earningsToday),
      desc: 'Pendapatan bruto hari ini',
      icon: TrendingUp,
      color: 'border-gold-primary/20 bg-gold-primary/5 text-gold-light',
    },
    {
      title: 'Robux Terjual Hari Ini',
      value: `${stats.robuxToday.toLocaleString('id-ID')} R$`,
      desc: 'Total volume payout hari ini',
      icon: Landmark,
      color: 'border-sky-500/20 bg-sky-500/5 text-sky-400',
    }
  ];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-obsidian-border/50 pb-4">
        <div>
          <h2 className="font-fantasy text-2xl font-bold tracking-wide text-glow-gold text-gold-light uppercase">Dashboard Ringkasan</h2>
          <p className="text-xs text-slate-400 mt-1">Ikhtisar data transaksi real-time komunitas</p>
        </div>
        <button onClick={fetchStats} className="btn-premium-dark p-2.5 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer font-bold">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Muat Ulang</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-2.5 text-xs text-crimson-light">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className={`glass-panel border p-6 rounded-2xl flex flex-col justify-between transition-all duration-300 hover:scale-[1.02] ${card.color}`}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs uppercase font-bold tracking-wider text-slate-400">{card.title}</span>
                <div className="p-2 rounded-lg bg-obsidian-950/40">
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div>
                <span className="text-2xl md:text-3xl font-black block tracking-wide">{card.value}</span>
                <span className="text-[10px] text-slate-500 mt-1 block font-medium">{card.desc}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Month summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div className="glass-panel p-4 rounded-xl border border-obsidian-border/40 text-center">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Pemasukan Bulan Ini</p>
          <p className="text-lg font-black text-gold-light">{formatCurrency(stats.earningsMonth)}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-obsidian-border/40 text-center">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Total Pending</p>
          <p className="text-lg font-black text-yellow-400">{stats.pendingCount}</p>
        </div>
        <div className="glass-panel p-4 rounded-xl border border-obsidian-border/40 text-center col-span-2 sm:col-span-1">
          <p className="text-[10px] uppercase font-bold tracking-wider text-slate-500 mb-1">Dibatalkan Bulan Ini</p>
          <p className="text-lg font-black text-red-400">{stats.cancelledMonth}</p>
        </div>
      </div>

      {/* AI Business Insight — Dashboard */}
      <div className="glass-panel p-6 rounded-2xl border border-gold-primary/20">
        <div className="flex items-center gap-2 mb-5 border-b border-obsidian-border/40 pb-3">
          <Sparkles className="w-4 h-4 text-gold-primary" />
          <h3 className="font-fantasy text-base font-bold text-gold-light tracking-wide">AI Business Insight</h3>
          <span className="ml-auto text-[9px] text-slate-600 font-semibold uppercase tracking-wider">Analisis otomatis berdasarkan data transaksi</span>
        </div>

        <div className="space-y-3">
          {insights.slice(0, 5).map((item, i) => (
            <div key={i} className={`flex gap-2.5 items-start text-xs ${insightTypeStyle(item.type)}`}>
              <ChevronRight className="w-3.5 h-3.5 mt-0.5 shrink-0 text-gold-dark" />
              <div>
                <span>{item.text}</span>
                {item.items && (
                  <ul className="mt-1.5 space-y-1 pl-3">
                    {item.items.map((rec, j) => (
                      <li key={j} className="text-slate-400 list-disc list-inside">{rec}</li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tips panel */}
      <div className="glass-panel p-5 rounded-2xl border border-obsidian-border/50 text-xs text-slate-400 leading-normal">
        <span className="font-bold text-gold-light block mb-1">Tips Panel Admin:</span>
        Anda dapat berpindah ke halaman <b>Daftar Orders</b> untuk menyetujui payout atau membatalkan pesanan. Setelah dikonfirmasi selesai, transaksi akan otomatis masuk ke halaman <b>Pemasukan</b>.
      </div>
    </div>
  );
}
