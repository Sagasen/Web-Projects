import React, { useState, useEffect } from 'react';
import { Shield, Key, Mail, Loader2, AlertCircle } from 'lucide-react';
import supabase, { isSupabaseConfigured } from '../lib/supabase';

export default function AdminLogin({ onLoginSuccess }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Handle Login submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    setErrorMsg('');

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (error) throw error;

      if (data && data.session) {
        onLoginSuccess(data.session);
      }
    } catch (err) {
      console.error('Login error:', err);
      setErrorMsg(err.message || 'Gagal login. Kredensial tidak valid.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden bg-obsidian-950">
      {/* Background Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-900/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md space-y-8 relative">
        <div className="text-center">
          <div className="inline-flex p-3 rounded-2xl bg-purple-950/40 border border-purple-500/20 text-gold-primary mb-3">
            <Shield className="w-8 h-8 animate-pulse-slow" />
          </div>
          <h2 className="font-fantasy text-2xl md:text-3xl font-extrabold text-glow-gold text-gold-light tracking-wide uppercase">
            Admin Portal login
          </h2>
          <p className="mt-2 text-xs text-slate-400 font-medium">
            Eternal Myth Studio — Payout Community
          </p>
        </div>

        <div className="glass-panel glass-panel-glow rounded-2xl p-6 md:p-8 space-y-6">
          {!isSupabaseConfigured && (
            <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 text-[11px] text-yellow-400 space-y-1 leading-relaxed">
              <span className="font-bold block flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                Offline Mode Credentials:
              </span>
              <p>Email: <code className="bg-obsidian-950 px-1.5 py-0.5 rounded text-white font-mono">admin</code></p>
              <p>Sandi: <code className="bg-obsidian-950 px-1.5 py-0.5 rounded text-white font-mono">admin</code></p>
            </div>
          )}

          {errorMsg && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3.5 flex items-start gap-2.5 text-xs text-crimson-light">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300">Email Admin</label>
              <div className="relative rounded-lg overflow-hidden border border-obsidian-border bg-obsidian-950/80 focus-within:border-gold-primary transition-all duration-300">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-4 w-4 text-purple-400" />
                </div>
                <input
                  type="text"
                  required
                  placeholder="admin@eternalmyth.studio"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-transparent text-slate-100 placeholder-purple-900/40 focus:outline-none text-sm font-medium"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold uppercase tracking-wider text-purple-300">Kata Sandi</label>
              <div className="relative rounded-lg overflow-hidden border border-obsidian-border bg-obsidian-950/80 focus-within:border-gold-primary transition-all duration-300">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Key className="h-4 w-4 text-purple-400" />
                </div>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-10 pr-3 py-3 bg-transparent text-slate-100 placeholder-purple-900/40 focus:outline-none text-sm font-medium"
                />
              </div>
            </div>

            {/* Submit */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full btn-premium-gold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer font-bold text-sm"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Memproses...</span>
                  </>
                ) : (
                  <span>Masuk Portal</span>
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="text-center">
          <a
            href="/"
            className="text-xs text-purple-400 hover:text-purple-300 hover:underline transition-all"
          >
            Kembali ke Halaman Payout Customer
          </a>
        </div>
      </div>
    </div>
  );
}
