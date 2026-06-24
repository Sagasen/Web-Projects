import React, { useState, useEffect } from 'react';
import { RefreshCw, Search, Check, X, FileText, AlertCircle, CheckCircle2, Coins } from 'lucide-react';
import supabase from '../lib/supabase';
import { formatCurrency, formatDate } from '../lib/utils';

export default function AdminOrders() {
  const [orders, setOrders]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [error, setError]             = useState(null);
  const [search, setSearch]           = useState('');
  const [actionMsg, setActionMsg]     = useState('');
  const [actionId, setActionId]       = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('transactions')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching transactions:', err);
      setError('Gagal memuat daftar pesanan.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleUpdateStatus = async (id, status) => {
    setActionId(id);
    const isCompleted = status === 'completed';
    const fieldsToUpdate = {
      admin_status:  status,
      completed_at:  isCompleted ? new Date().toISOString() : null,
      cancelled_at: !isCompleted ? new Date().toISOString() : null
    };

    try {
      const { error: updateErr } = await supabase
        .from('transactions')
        .update(fieldsToUpdate)
        .eq('id', id);

      if (updateErr) throw updateErr;

      setOrders(prev => prev.map(o => o.id === id ? { ...o, ...fieldsToUpdate } : o));
      setActionMsg(isCompleted ? 'Order berhasil dikonfirmasi selesai.' : 'Order berhasil dibatalkan.');
      setTimeout(() => setActionMsg(''), 3000);
    } catch (err) {
      console.error(`Error updating transaction status to ${status}:`, err);
      setActionMsg(`Gagal merubah status: ${err.message}`);
      setTimeout(() => setActionMsg(''), 4000);
    } finally {
      setActionId(null);
    }
  };

  const filteredOrders = orders.filter(o =>
    o.roblox_username?.toLowerCase().includes(search.toLowerCase()) ||
    o.display_name?.toLowerCase().includes(search.toLowerCase()) ||
    o.order_code?.toLowerCase().includes(search.toLowerCase())
  );

  const statusStyle = (s) => {
    if (s === 'completed') return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20';
    if (s === 'cancelled') return 'text-red-400 bg-red-500/10 border-red-500/20';
    return 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20';
  };

  const categoryStyle = (c) => {
    if (c === 'Staff')              return 'text-sky-400';
    if (c === 'Pembelian Pertama')  return 'text-emerald-400';
    return 'text-gold-light';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-obsidian-border/50 pb-4">
        <div>
          <h2 className="font-fantasy text-2xl font-bold tracking-wide text-glow-gold text-gold-light uppercase">Daftar Orders</h2>
          <p className="text-xs text-slate-400 mt-1">Kelola status dan validasi payout Robux customer</p>
        </div>
        <button onClick={fetchOrders} className="btn-premium-dark p-2.5 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer font-bold self-start sm:self-auto">
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Segarkan Data</span>
        </button>
      </div>

      {error && (
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-2.5 text-xs text-crimson-light">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span className="font-semibold">{error}</span>
        </div>
      )}

      {actionMsg && (
        <div className={`rounded-xl p-3.5 text-xs font-semibold flex items-center gap-2 ${
          actionMsg.startsWith('Gagal')
            ? 'bg-red-500/10 border border-red-500/20 text-crimson-light'
            : 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400'
        }`}>
          {actionMsg.startsWith('Gagal')
            ? <AlertCircle className="w-4 h-4 shrink-0" />
            : <CheckCircle2 className="w-4 h-4 shrink-0" />}
          {actionMsg}
        </div>
      )}

      {/* Search */}
      <div className="relative rounded-lg overflow-hidden border border-obsidian-border bg-obsidian-900 focus-within:border-gold-primary transition-all duration-300 max-w-md">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="h-4 w-4 text-slate-500" />
        </div>
        <input
          type="text"
          placeholder="Cari Username, Display Name, atau Kode Order..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="block w-full pl-10 pr-3 py-2.5 bg-transparent text-slate-100 placeholder-slate-600 focus:outline-none text-xs font-semibold"
        />
      </div>

      {loading ? (
        <div className="h-64 flex items-center justify-center flex-col gap-3">
          <RefreshCw className="w-8 h-8 text-gold-primary animate-spin" />
          <span className="text-xs text-slate-400 font-semibold tracking-wider animate-pulse">Memproses order...</span>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="glass-panel p-12 text-center rounded-2xl border border-obsidian-border/50 text-slate-400 text-sm">
          Tidak ditemukan data transaksi.
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-obsidian-border/50 overflow-hidden">
          <div className="overflow-x-auto w-full">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-obsidian-950/80 border-b border-obsidian-border/50 text-gold-dark font-bold uppercase tracking-wider text-[10px]">
                  <th className="py-4 px-4">Order Code</th>
                  <th className="py-4 px-4">Tanggal</th>
                  <th className="py-4 px-4">Username Roblox</th>
                  <th className="py-4 px-4">Robux</th>
                  <th className="py-4 px-4">Kategori</th>
                  <th className="py-4 px-4">Total Biaya</th>
                  <th className="py-4 px-4">Bukti Bayar</th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-obsidian-border/30">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-obsidian-900/30 transition-colors">
                    <td className="py-4 px-4 font-mono font-bold text-slate-100 whitespace-nowrap">{order.order_code}</td>
                    <td className="py-4 px-4 text-slate-400 font-medium whitespace-nowrap">{formatDate(order.created_at)}</td>
                    <td className="py-4 px-4">
                      <div className="font-semibold text-slate-200">{order.roblox_username}</div>
                      <div className="text-[10px] text-slate-500 font-medium">DN: {order.display_name}</div>
                    </td>
                    <td className="py-4 px-4 font-bold text-slate-200">{order.robux_amount?.toLocaleString()}</td>
                    <td className={`py-4 px-4 font-semibold ${categoryStyle(order.category)}`}>{order.category}</td>
                    <td className="py-4 px-4 font-extrabold text-gold-light text-glow-gold whitespace-nowrap">{formatCurrency(order.total_price)}</td>
                    <td className="py-4 px-4">
                      {order.payment_proof_path ? (
                        <span className="text-[10px] text-gold-primary font-bold flex items-center gap-1">
                          <FileText className="w-3 h-3" />
                          <span className="font-mono truncate max-w-[100px]">
                            {order.payment_proof_path.split('/').pop() || 'bukti'}
                          </span>
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-600">Tidak Ada</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold border ${statusStyle(order.admin_status)}`}>
                        {order.admin_status}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center justify-center gap-1.5">
                        {order.admin_status === 'pending' ? (
                          <>
                            <button
                              type="button"
                              disabled={actionId === order.id}
                              onClick={() => handleUpdateStatus(order.id, 'completed')}
                              className="p-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-emerald-400 hover:text-emerald-300 transition-all duration-200 cursor-pointer disabled:opacity-50"
                              title="Konfirmasi Selesai"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              disabled={actionId === order.id}
                              onClick={() => handleUpdateStatus(order.id, 'cancelled')}
                              className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-all duration-200 cursor-pointer disabled:opacity-50"
                              title="Batalkan Transaksi"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <span className="text-[10px] text-slate-500 italic font-semibold">Terkunci</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
