import React from 'react';
import { User, Shield, Compass, MessageSquare, Plus, Minus } from 'lucide-react';

export default function OrderForm({ formData, setFormData }) {
  const handleChange = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const adjustRobux = (amount) => {
    const current = parseInt(formData.robuxAmount) || 0;
    const nextValue = Math.max(0, current + amount);
    handleChange('robuxAmount', nextValue);
  };

  const categories = [
    { id: 'Normal', name: 'Normal', rate: 120, desc: 'Tarif standard komunitas' },
    { id: 'Pembelian Pertama', name: 'First Buy', rate: 100, desc: 'Diskon khusus pesanan perdana' },
    { id: 'Staff', name: 'Staff Member', rate: 100, desc: 'Harga khusus internal staff' }
  ];

  const adminChats = [
    { id: 'WhatsApp', name: 'WhatsApp', color: 'hover:border-emerald-500/50 hover:bg-emerald-500/5 text-emerald-400 border-emerald-500/20' },
    { id: 'Discord', name: 'Discord', color: 'hover:border-indigo-500/50 hover:bg-indigo-500/5 text-indigo-400 border-indigo-500/20' },
    { id: 'TikTok', name: 'TikTok', color: 'hover:border-pink-500/50 hover:bg-pink-500/5 text-pink-400 border-pink-500/20' }
  ];

  return (
    <div className="glass-panel rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
      {/* Mystical decorative light glow */}
      <div className="absolute -top-12 -left-12 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="flex items-center gap-3 border-b border-obsidian-border pb-4">
        <Compass className="w-6 h-6 text-gold-primary animate-pulse-slow" />
        <h2 className="font-fantasy text-xl font-semibold text-glow-gold text-gold-light">Community Order Form</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Username Roblox */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300">Roblox Username</label>
          <div className="relative rounded-lg overflow-hidden border border-obsidian-border bg-obsidian-950/80 focus-within:border-gold-primary transition-all duration-300">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-purple-400" />
            </div>
            <input
              type="text"
              required
              placeholder="e.g. MythicPlayer"
              value={formData.username}
              onChange={(e) => handleChange('username', e.target.value)}
              className="block w-full pl-10 pr-3 py-3 bg-transparent text-slate-100 placeholder-purple-900/60 focus:outline-none text-sm font-medium"
            />
          </div>
        </div>

        {/* Display Name Roblox */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300">Roblox Display Name</label>
          <div className="relative rounded-lg overflow-hidden border border-obsidian-border bg-obsidian-950/80 focus-within:border-gold-primary transition-all duration-300">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <User className="h-4 w-4 text-purple-400 opacity-60" />
            </div>
            <input
              type="text"
              required
              placeholder="e.g. EternalKnight"
              value={formData.displayName}
              onChange={(e) => handleChange('displayName', e.target.value)}
              className="block w-full pl-10 pr-3 py-3 bg-transparent text-slate-100 placeholder-purple-900/60 focus:outline-none text-sm font-medium"
            />
          </div>
        </div>
      </div>

      {/* Jumlah Robux */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300">Jumlah Robux</label>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => adjustRobux(-100)}
            className="btn-premium-dark p-3 rounded-lg flex items-center justify-center cursor-pointer min-w-[44px]"
            title="Minus 100 Robux"
          >
            <Minus className="w-4 h-4" />
          </button>
          
          <div className="relative flex-1 rounded-lg overflow-hidden border border-obsidian-border bg-obsidian-950/80 focus-within:border-gold-primary transition-all duration-300">
            <input
              type="number"
              min="0"
              required
              value={formData.robuxAmount}
              onChange={(e) => handleChange('robuxAmount', Math.max(0, parseInt(e.target.value) || 0))}
              className="block w-full px-4 py-3 bg-transparent text-slate-100 focus:outline-none text-center font-bold text-lg [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-purple-400 pointer-events-none">R$</span>
          </div>

          <button
            type="button"
            onClick={() => adjustRobux(100)}
            className="btn-premium-dark p-3 rounded-lg flex items-center justify-center cursor-pointer min-w-[44px]"
            title="Plus 100 Robux"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {/* Helper Quick Select buttons */}
        <div className="flex flex-wrap gap-2 pt-1">
          {[500, 1000, 2000, 5000, 10000].map((val) => (
            <button
              key={val}
              type="button"
              onClick={() => handleChange('robuxAmount', val)}
              className={`text-xs px-3 py-1.5 rounded-md font-semibold transition-all duration-200 cursor-pointer ${
                formData.robuxAmount === val
                  ? 'bg-purple-900/60 border border-gold-primary/50 text-gold-light'
                  : 'bg-obsidian-950/50 border border-obsidian-border text-slate-400 hover:text-slate-100 hover:border-purple-800'
              }`}
            >
              +{val.toLocaleString()} R$
            </button>
          ))}
        </div>
      </div>

      {/* Kategori Customer */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300">Kategori Customer</label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {categories.map((cat) => {
            const isSelected = formData.category === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleChange('category', cat.id)}
                className={`flex flex-col text-left p-4 rounded-xl border transition-all duration-300 cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'bg-purple-950/30 border-gold-primary shadow-[0_0_15px_rgba(212,175,55,0.08)]'
                    : 'bg-obsidian-950/40 border-obsidian-border hover:border-purple-800/60'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-2.5 h-2.5 bg-gold-primary rounded-bl-lg"></div>
                )}
                <span className={`font-bold text-sm ${isSelected ? 'text-gold-light' : 'text-slate-300'}`}>
                  {cat.name}
                </span>
                <span className="text-xs text-purple-400 mt-1 font-semibold">
                  Rp{cat.rate} / Robux
                </span>
                <span className="text-[10px] text-slate-500 mt-2 line-clamp-1">
                  {cat.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Verifikasi Umur/KTP */}
      <div className="space-y-3">
        <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300">Verifikasi Umur / KTP (18+)</label>
        <div className="flex gap-4">
          {['Sudah', 'Belum'].map((opt) => {
            const isSelected = formData.ktpVerified === opt;
            return (
              <label
                key={opt}
                className={`flex-1 flex items-center justify-between p-3.5 rounded-lg border transition-all duration-300 cursor-pointer ${
                  isSelected
                    ? 'bg-purple-950/20 border-purple-500 text-purple-200'
                    : 'bg-obsidian-950/40 border-obsidian-border text-slate-400 hover:border-purple-800/40 hover:text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Shield className={`w-4 h-4 ${isSelected ? 'text-purple-400' : 'text-slate-500'}`} />
                  <span className="text-sm font-semibold">{opt} Verifikasi</span>
                </div>
                <input
                  type="radio"
                  name="ktpVerified"
                  value={opt}
                  checked={isSelected}
                  onChange={() => handleChange('ktpVerified', opt)}
                  className="w-4 h-4 accent-purple-500 cursor-pointer"
                />
              </label>
            );
          })}
        </div>
      </div>

      {/* Catatan Tambahan (Opsional) */}
      <div className="space-y-2">
        <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300">Catatan Tambahan (Opsional)</label>
        <div className="rounded-lg overflow-hidden border border-obsidian-border bg-obsidian-950/80 focus-within:border-gold-primary transition-all duration-300">
          <textarea
            rows="3"
            placeholder="Tulis instruksi khusus atau catatan tambahan di sini..."
            value={formData.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            className="block w-full p-4 bg-transparent text-slate-100 placeholder-purple-900/60 focus:outline-none text-sm font-medium resize-none"
          />
        </div>
      </div>

      {/* Pilihan Chat Admin */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-purple-400" />
          <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300">Metode Chat Admin Utama</label>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          {adminChats.map((chat) => {
            const isSelected = formData.adminChat === chat.id;
            return (
              <button
                key={chat.id}
                type="button"
                onClick={() => handleChange('adminChat', chat.id)}
                className={`py-3 rounded-lg border text-center text-xs font-bold tracking-wide transition-all duration-300 cursor-pointer ${chat.color} ${
                  isSelected
                    ? 'bg-purple-950/20 border-purple-500/80 text-white shadow-md'
                    : 'bg-obsidian-950/40 text-slate-400'
                }`}
              >
                {chat.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
