import React, { useState } from 'react';
import {
  Shield,
  LayoutDashboard,
  ScrollText,
  Users,
  LogOut,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import supabase, { isSupabaseConfigured } from '../lib/supabase';

export default function AdminLayout({ children, session, onLogout }) {
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const email = session?.user?.email || '[admin@eternalmyth.studio](mailto:admin@eternalmyth.studio)';

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard },
    { name: 'Daftar Orders', path: '/admin/orders', icon: ScrollText },
    { name: 'Daftar Staff', path: '/admin/staff', icon: Users },
    { name: 'Pemasukan', path: '/admin/income', icon: TrendingUp },
  ];

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();


      if (error) {
        throw error;
      }

      if (typeof onLogout === 'function') {
        onLogout();
      }

      navigate('/admin/login');
    } catch (err) {
      console.error('Logout error:', err);

      if (typeof onLogout === 'function') {
        onLogout();
      }

      navigate('/admin/login');
    }


  };

  const handleNavigate = (path) => {
    navigate(path);
    setMobileMenuOpen(false);
  };

  return (
    <div
      className="text-slate-200 font-sans"
      style={{
        minHeight: '100vh',
        backgroundColor: '#0a0a0c',
      }}
    >
      {/* Mobile Header */} <header className="md:hidden sticky top-0 z-50 flex items-center justify-between px-5 py-4 bg-[#0f1013] border-b border-gold-primary/15"> <div className="flex items-center gap-2"> <Shield className="w-5 h-5 text-gold-primary" />


        <div className="leading-none">
          <span className="font-fantasy font-bold text-sm tracking-widest text-gold-light">
            EMS PORTAL
          </span>
          <span className="block text-[9px] text-gold-dark uppercase tracking-widest font-semibold">
            Admin Panel
          </span>
        </div>
      </div>

        <button
          type="button"
          onClick={() => setMobileMenuOpen((prev) => !prev)}
          className="p-2 rounded-xl border border-gold-primary/15 text-slate-400 hover:text-white hover:bg-white/5 transition"
          aria-label="Toggle admin menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </header>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <button
          type="button"
          aria-label="Close menu overlay"
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 z-30 bg-black/60 backdrop-blur-sm md:hidden"
        />
      )}

      <div className="md:flex" style={{ minHeight: '100vh' }}>
        {/* Sidebar */}
        <aside
          className={[
            'fixed md:sticky left-0 top-0 z-40',
            'w-[290px] md:w-72',
            'border-r border-gold-primary/15',
            'shadow-[8px_0_40px_rgba(0,0,0,0.28)]',
            'transition-transform duration-300',
            'overflow-y-auto',
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
          ].join(' ')}
          style={{
            minHeight: '100vh',
            height: '100vh',
            backgroundColor: '#0f1013',
          }}
        >
          <div
            className="px-6 py-7"
            style={{
              minHeight: '100vh',
              backgroundColor: '#0f1013',
            }}
          >
            {/* Logo */}
            <div className="flex items-center gap-3 border-b border-gold-primary/15 pb-6">
              <div className="w-11 h-11 rounded-2xl bg-gold-primary/10 border border-gold-primary/25 flex items-center justify-center">
                <Shield className="w-5 h-5 text-gold-primary" />
              </div>

              <div>
                <span className="font-fantasy font-bold text-lg tracking-wider text-gold-light block">
                  EMS PORTAL
                </span>
                <span className="text-[10px] text-gold-dark block tracking-widest uppercase font-semibold">
                  Admin Panel
                </span>
              </div>
            </div>

            {/* Navigation */}
            <nav className="mt-8 space-y-2">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;

                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleNavigate(item.path)}
                    className={[
                      'w-full flex items-center gap-3 px-4 py-3 rounded-2xl',
                      'text-sm font-semibold tracking-wide transition-all duration-200',
                      'border text-left',
                      isActive
                        ? 'bg-gold-primary/12 border-gold-primary/35 text-gold-light shadow-[0_0_25px_rgba(212,175,55,0.08)]'
                        : 'bg-transparent border-transparent text-slate-400 hover:text-slate-100 hover:bg-white/[0.04] hover:border-gold-primary/10',
                    ].join(' ')}
                  >
                    <Icon
                      className={[
                        'w-4 h-4 shrink-0',
                        isActive ? 'text-gold-primary' : 'text-slate-500',
                      ].join(' ')}
                    />
                    <span>{item.name}</span>
                  </button>
                );
              })}
            </nav>

            {/* Account Card */}
            <div className="mt-8 pt-6 border-t border-gold-primary/15">
              <div className="rounded-2xl border border-gold-primary/15 bg-black/20 p-4">
                <span className="block text-[10px] text-gold-dark uppercase font-bold tracking-wider">
                  Logged In As
                </span>

                <span
                  title={email}
                  className="mt-1 block text-xs font-semibold text-slate-300 break-all leading-relaxed"
                >
                  {email}
                </span>

                {!isSupabaseConfigured && (
                  <div className="mt-3 px-3 py-2 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-[10px] text-yellow-400 text-center font-bold tracking-wide">
                    OFFLINE MODE
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl border border-red-500/25 bg-red-950/10 text-red-400 text-xs font-bold hover:bg-red-950/25 hover:border-red-500/45 transition-all duration-300"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Keluar Portal</span>
                </button>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content */}
        <div
          className="flex-1 relative overflow-hidden"
          style={{
            minHeight: '100vh',
            background:
              'radial-gradient(circle at 80% -10%, rgba(212, 175, 55, 0.08), transparent 38%), #0a0a0c',
          }}
        >
          <div className="absolute -top-40 right-0 w-96 h-96 bg-gold-primary/5 rounded-full blur-3xl pointer-events-none" />

          <main className="relative z-10 w-full max-w-7xl mx-auto p-5 md:p-8">
            {children}
          </main>
        </div>
      </div>
    </div>


  );
}
