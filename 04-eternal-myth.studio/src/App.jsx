import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, Link } from 'react-router-dom';
import HeaderHero from './components/HeaderHero';
import OrderFormStep from './components/OrderFormStep';
import ChatPreviewStep from './components/ChatPreviewStep';
import AdminLogin from './components/AdminLogin';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './components/AdminDashboard';
import AdminOrders from './components/AdminOrders';
import AdminStaff from './components/AdminStaff';
import AdminIncome from './components/AdminIncome';
import supabase, { isSupabaseConfigured } from './lib/supabase';
import { Loader2, AlertCircle } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [loadingSession, setLoadingSession] = useState(true);

  // Default settings (updated with correct Discord DM URL)
  const [settings, setSettings] = useState({
    brand_name: 'Eternal Myth Studio',
    subtitle: 'Payout Community',
    whatsapp_number: '6281234567890',
    discord_url: 'https://discord.com/users/459376386671509505',
    tiktok_url: 'https://www.tiktok.com/@eternalmyth'
  });

  // Check Supabase Authentication status
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoadingSession(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load settings from Supabase app_settings table
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const { data, error } = await supabase.from('app_settings').select('*');
        if (error) throw error;
        if (data && data.length > 0) {
          const loaded = {};
          data.forEach(item => { loaded[item.key] = item.value; });
          setSettings(prev => ({ ...prev, ...loaded }));
        }
      } catch (err) {
        console.error('Failed to load settings from DB:', err);
      }
    };
    fetchSettings();
  }, []);

  if (loadingSession) {
    return (
      <div className="min-h-screen bg-obsidian-950 flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-8 h-8 text-gold-primary animate-spin" />
        <span className="text-xs text-slate-400 font-semibold tracking-widest uppercase animate-pulse">Menghubungkan Portal...</span>
      </div>
    );
  }

  // Helper: admin protected route wrapper
  const AdminRoute = ({ children }) =>
    session
      ? <AdminLayout session={session} onLogout={() => setSession(null)}>{children}</AdminLayout>
      : <Navigate to="/admin/login" replace />;

  return (
    <BrowserRouter>
      <Routes>
        {/* Customer Payout Route */}
        <Route path="/" element={<CustomerFlow settings={settings} />} />

        {/* Admin Login */}
        <Route
          path="/admin/login"
          element={session ? <Navigate to="/admin/dashboard" replace /> : <AdminLogin onLoginSuccess={(sess) => setSession(sess)} />}
        />

// Tambahkan rute ini di bawah rute Admin Login
        <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />

        {/* Admin Protected Routes */}
        <Route path="/admin/dashboard" element={<AdminRoute><AdminDashboard /></AdminRoute>} />
        <Route path="/admin/orders" element={<AdminRoute><AdminOrders /></AdminRoute>} />
        <Route path="/admin/staff" element={<AdminRoute><AdminStaff /></AdminRoute>} />
        <Route path="/admin/income" element={<AdminRoute><AdminIncome /></AdminRoute>} />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

// ── Customer Checkout Flow (Step 1 → Step 2) ─────────────────────
function CustomerFlow({ settings }) {
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [createdTransaction, setCreatedTransaction] = useState(null);

  const handleFormSubmit = async (formData) => {
    setSubmitting(true);
    setSubmitError('');

    try {
      const { data, error } = await supabase.rpc('create_order', {
        p_roblox_username: formData.username,
        p_display_name: formData.displayName,
        p_robux_amount: formData.robuxAmount,
        p_verification_status: formData.ktpVerified,
        p_notes: formData.notes,
        p_chat_channel: 'whatsapp', // default, channel selected in Step 2
        p_payment_proof_path: formData.paymentProofPath,
        p_payment_proof_url: null         // private bucket — no public URL
      });

      if (error) throw error;

      if (data) {
        const txRecord = Array.isArray(data) ? data[0] : data;
        setCreatedTransaction(txRecord);
        setStep(2);
      } else {
        throw new Error('Respons server kosong. Silakan coba lagi.');
      }
    } catch (err) {
      console.error('Error creating order:', err);
      setSubmitError(err.message || 'Gagal menyimpan transaksi ke database. Silakan coba lagi.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen pb-16 px-4 md:px-8 max-w-4xl mx-auto flex flex-col justify-between">
      {/* Gold accent top bar */}
      <div className="w-full h-[2px] bg-gradient-to-r from-transparent via-gold-primary to-transparent opacity-80 mb-8"></div>

      <HeaderHero />

      <main className="relative">
        {/* Loading overlay */}
        {submitting && (
          <div className="absolute inset-0 bg-obsidian-950/80 backdrop-blur-sm z-30 flex flex-col items-center justify-center gap-3 rounded-2xl">
            <Loader2 className="w-10 h-10 text-gold-primary animate-spin" />
            <span className="text-sm font-bold text-glow-gold text-gold-light uppercase tracking-wider animate-pulse">Menyimpan Transaksi Anda...</span>
          </div>
        )}

        {submitError && (
          <div className="mb-6 bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex items-start gap-2.5 text-xs text-crimson-light">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span className="font-semibold">{submitError}</span>
          </div>
        )}

        {step === 1 ? (
          <OrderFormStep onSubmit={handleFormSubmit} />
        ) : (
          <ChatPreviewStep
            transaction={createdTransaction}
            settings={settings}
            onBack={() => setStep(1)}
          />
        )}
      </main>

      <footer className="mt-16 text-center text-xs text-slate-600 space-y-3 border-t border-obsidian-border/30 pt-6">
        <div className="flex justify-center gap-6 font-semibold">
          <Link to="/" className="hover:text-gold-primary transition-colors">Halaman Utama</Link>
          <Link to="/admin/login" className="hover:text-gold-primary transition-colors">Portal Admin</Link>
        </div>
        <p>Eternal Myth Studio. Dibuat dengan dedikasi untuk komunitas Roblox Indonesia.</p>
      </footer>
    </div>
  );
}

export default App;
