import React, { useState, useEffect } from 'react';
import { RefreshCw, UserPlus, Trash2, Edit, Check, X, AlertCircle, CheckCircle2, ToggleLeft, ToggleRight } from 'lucide-react';
import supabase from '../lib/supabase';

export default function AdminStaff() {
  const [staff, setStaff] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Form states for adding/editing staff
  const [usernameInput, setUsernameInput] = useState('');
  const [displayNameInput, setDisplayNameInput] = useState('');
  const [noteInput, setNoteInput] = useState('');
  const [editingId, setEditingId] = useState(null);
  
  // States for toggle operation loader
  const [updatingId, setUpdatingId] = useState(null);

  const fetchStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: fetchErr } = await supabase
        .from('staff_members')
        .select('*')
        .order('created_at', { ascending: false });

      if (fetchErr) throw fetchErr;
      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff list:', err);
      setError('Gagal memuat daftar staff.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const [successMsg, setSuccessMsg] = useState('');

  const handleAddStaff = async (e) => {
    e.preventDefault();
    const cleanUsername    = usernameInput.trim();
    const cleanDisplayName = displayNameInput.trim() || cleanUsername;
    const cleanNote        = noteInput.trim();
    if (!cleanUsername) return;

    setError(null);
    setSuccessMsg('');
    try {
      // Do NOT include roblox_username_lower — it is a GENERATED column in Postgres
      const { error: addErr } = await supabase
        .from('staff_members')
        .insert({
          roblox_username: cleanUsername,
          display_name:   cleanDisplayName,
          note:           cleanNote,
          active:         true
        });

      if (addErr) throw addErr;

      setUsernameInput('');
      setDisplayNameInput('');
      setNoteInput('');
      setSuccessMsg(`Staff "${cleanUsername}" berhasil ditambahkan.`);
      setTimeout(() => setSuccessMsg(''), 3500);
      fetchStaff();
    } catch (err) {
      console.error('Error adding staff member:', err);
      const isDuplicate = err.message?.includes('unique') || err.message?.includes('duplicate');
      setError(isDuplicate ? 'Username staff sudah terdaftar.' : (err.message || 'Gagal menambahkan data staff baru.'));
    }
  };

  const handleToggleActive = async (id, currentStatus) => {
    setUpdatingId(id);
    try {
      const { error: toggleErr } = await supabase
        .from('staff_members')
        .update({ active: !currentStatus })
        .eq('id', id);

      if (toggleErr) throw toggleErr;

      // Update state locally
      setStaff(prev => prev.map(st => st.id === id ? { ...st, active: !currentStatus } : st));
    } catch (err) {
      console.error('Error toggling staff status:', err);
      alert('Gagal merubah status keaktifan staff.');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteStaff = async (id) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus anggota staff ini?')) return;

    try {
      const { error: deleteErr } = await supabase
        .from('staff_members')
        .delete()
        .eq('id', id);

      if (deleteErr) throw deleteErr;

      // Update state locally
      setStaff(prev => prev.filter(st => st.id !== id));
    } catch (err) {
      console.error('Error deleting staff:', err);
      alert('Gagal menghapus anggota staff.');
    }
  };

  const handleStartEdit = (member) => {
    setEditingId(member.id);
    setDisplayNameInput(member.display_name || '');
    setNoteInput(member.note || '');
  };

  const handleSaveEdit = async (id) => {
    try {
      const { error: editErr } = await supabase
        .from('staff_members')
        .update({
          display_name: displayNameInput.trim(),
          note: noteInput.trim()
        })
        .eq('id', id);

      if (editErr) throw editErr;

      // Update locally
      setStaff(prev => prev.map(st => st.id === id ? { ...st, display_name: displayNameInput.trim(), note: noteInput.trim() } : st));
      setEditingId(null);
      setDisplayNameInput('');
      setNoteInput('');
    } catch (err) {
      console.error('Error editing staff detail:', err);
      alert('Gagal mengubah data detail staff.');
    }
  };

  return (
    <div className="space-y-8">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-obsidian-border/50 pb-4">
        <div>
          <h2 className="font-fantasy text-2xl font-bold tracking-wide text-glow-gold text-gold-light uppercase">Daftar Staff</h2>
          <p className="text-xs text-slate-400 mt-1">Daftarkan username staff aktif untuk mendapatkan potongan tarif khusus (Rp100/Robux)</p>
        </div>
        <button
          onClick={fetchStaff}
          className="btn-premium-dark p-2.5 rounded-lg flex items-center gap-1.5 text-xs cursor-pointer font-bold self-start sm:self-auto"
        >
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

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3.5 flex items-center gap-2 text-xs text-emerald-400 font-semibold">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side Form: Add Staff */}
        <div className="lg:col-span-4 glass-panel p-6 rounded-2xl border border-obsidian-border/50 space-y-4">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-gold-primary" />
            Tambah Staff Baru
          </h3>
          
          <form onSubmit={handleAddStaff} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gold-dark">Username Roblox</label>
              <input
                type="text"
                required
                placeholder="Username Roblox Staff"
                value={usernameInput}
                onChange={(e) => setUsernameInput(e.target.value)}
                className="block w-full px-3 py-2.5 rounded-lg border border-obsidian-border bg-obsidian-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-gold-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gold-dark">Display Name Staff</label>
              <input
                type="text"
                placeholder="Display Name Staff (Opsional)"
                value={displayNameInput}
                onChange={(e) => setDisplayNameInput(e.target.value)}
                className="block w-full px-3 py-2.5 rounded-lg border border-obsidian-border bg-obsidian-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-gold-primary"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[10px] font-bold uppercase tracking-wider text-gold-dark">Catatan / Peran</label>
              <textarea
                rows="2"
                placeholder="e.g. Lead Moderator"
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="block w-full p-3 rounded-lg border border-obsidian-border bg-obsidian-950 text-xs text-slate-100 placeholder-slate-700 focus:outline-none focus:border-gold-primary resize-none"
              />
            </div>

            <button
              type="submit"
              disabled={!usernameInput.trim()}
              className="w-full btn-premium-gold py-2.5 rounded-xl font-bold text-xs cursor-pointer text-center"
            >
              Simpan Staff
            </button>
          </form>
        </div>

        {/* Right Side Table: Staff List */}
        <div className="lg:col-span-8 glass-panel rounded-2xl border border-obsidian-border/50 overflow-hidden">
          {loading ? (
            <div className="h-64 flex items-center justify-center flex-col gap-3">
              <RefreshCw className="w-8 h-8 text-gold-primary animate-spin" />
              <span className="text-xs text-slate-400 font-semibold tracking-wider animate-pulse">Memuat staff...</span>
            </div>
          ) : staff.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-xs font-semibold">
              Tidak ada anggota staff yang terdaftar.
            </div>
          ) : (
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-obsidian-950/80 border-b border-obsidian-border/50 text-gold-dark font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-4">Username Roblox</th>
                    <th className="py-4 px-4">Display Name</th>
                    <th className="py-4 px-4">Catatan</th>
                    <th className="py-4 px-4 text-center">Status</th>
                    <th className="py-4 px-4 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-obsidian-border/30">
                  {staff.map((member) => (
                    <tr key={member.id} className="hover:bg-obsidian-900/30 transition-colors">
                      {/* Roblox Username */}
                      <td className="py-4 px-4 font-mono font-bold text-slate-200">{member.roblox_username}</td>
                      
                      {/* Display Name */}
                      <td className="py-4 px-4">
                        {editingId === member.id ? (
                          <input
                            type="text"
                            value={displayNameInput}
                            onChange={(e) => setDisplayNameInput(e.target.value)}
                            className="bg-obsidian-950 border border-gold-primary rounded px-2 py-1 text-slate-100 focus:outline-none w-full"
                          />
                        ) : (
                          <span className="font-semibold text-slate-300">{member.display_name || '-'}</span>
                        )}
                      </td>

                      {/* Notes */}
                      <td className="py-4 px-4">
                        {editingId === member.id ? (
                          <input
                            type="text"
                            value={noteInput}
                            onChange={(e) => setNoteInput(e.target.value)}
                            className="bg-obsidian-950 border border-gold-primary rounded px-2 py-1 text-slate-100 focus:outline-none w-full"
                          />
                        ) : (
                          <span className="text-slate-400 font-medium">{member.note || '-'}</span>
                        )}
                      </td>

                      {/* Active Status Toggle */}
                      <td className="py-4 px-4 text-center">
                        <button
                          type="button"
                          disabled={updatingId === member.id}
                          onClick={() => handleToggleActive(member.id, member.active)}
                          className="focus:outline-none text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
                        >
                          {member.active ? (
                            <ToggleRight className="w-7 h-7 text-emerald-400" />
                          ) : (
                            <ToggleLeft className="w-7 h-7 text-slate-600" />
                          )}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-4">
                        <div className="flex items-center justify-center gap-1.5">
                          {editingId === member.id ? (
                            <>
                              <button
                                onClick={() => handleSaveEdit(member.id)}
                                className="p-1.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20 transition-all cursor-pointer"
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setEditingId(null)}
                                className="p-1.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 transition-all cursor-pointer"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={() => handleStartEdit(member)}
                                className="p-1.5 rounded bg-obsidian-950 hover:bg-obsidian-800 text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
                                title="Edit Detail"
                              >
                                <Edit className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteStaff(member.id)}
                                className="p-1.5 rounded bg-red-950/10 hover:bg-red-950/20 border border-red-500/10 hover:border-red-500/30 text-red-400 hover:text-red-300 transition-all cursor-pointer"
                                title="Hapus Anggota"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
