import React from 'react';
import { CreditCard, QrCode, ShieldCheck, Info } from 'lucide-react';

export default function PaymentQr() {
  return (
    <div className="glass-panel glass-panel-glow rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden flex flex-col justify-between h-full">
      {/* Decorative glows */}
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-obsidian-border pb-4">
          <QrCode className="w-6 h-6 text-gold-primary" />
          <h2 className="font-fantasy text-xl font-semibold text-glow-gold text-gold-light">Payment Gateway</h2>
        </div>

        <p className="text-xs text-slate-400 leading-relaxed">
          Pindai kode QRIS di bawah ini dengan aplikasi dompet digital Anda (GoPay, OVO, DANA, LinkAja, ShopeePay) atau Mobile Banking untuk memproses payout.
        </p>

        {/* Premium QR Container */}
        <div className="flex flex-col items-center justify-center py-4">
          <div className="relative p-4 rounded-2xl bg-white border-2 border-gold-primary/60 shadow-[0_0_20px_rgba(212,175,55,0.15)] overflow-hidden group">
            {/* The laser scanner line */}
            <div className="absolute left-0 w-full h-[3px] bg-gradient-to-r from-transparent via-crimson-primary to-transparent animate-[bounce_3s_infinite] shadow-[0_0_8px_#e63946] pointer-events-none"></div>
            
            {/* Custom vector QR Code for a high-end look */}
            <svg
              className="w-48 h-48 md:w-56 md:h-56 select-none"
              viewBox="0 0 100 100"
              xmlns="http://www.w3.org/2000/svg"
            >
              {/* QR Corners */}
              <rect x="0" y="0" width="25" height="25" fill="#0d0a16" />
              <rect x="3" y="3" width="19" height="19" fill="#ffffff" />
              <rect x="6" y="6" width="13" height="13" fill="#d4af37" />

              <rect x="75" y="0" width="25" height="25" fill="#0d0a16" />
              <rect x="78" y="3" width="19" height="19" fill="#ffffff" />
              <rect x="81" y="6" width="13" height="13" fill="#d4af37" />

              <rect x="0" y="75" width="25" height="25" fill="#0d0a16" />
              <rect x="3" y="78" width="19" height="19" fill="#ffffff" />
              <rect x="6" y="81" width="13" height="13" fill="#d4af37" />

              {/* QR Body Mock Blocks (random beautiful pattern) */}
              <path
                d="M 30,5 H 40 V 10 H 30 Z M 45,0 H 55 V 5 H 45 Z M 60,5 H 70 V 15 H 60 Z"
                fill="#0d0a16"
              />
              <path
                d="M 35,20 H 45 V 30 H 35 Z M 50,15 H 65 V 20 H 50 Z M 70,20 H 75 V 35 H 70 Z"
                fill="#8b0000"
              />
              <path
                d="M 0,35 H 10 V 45 H 0 Z M 15,30 H 25 V 40 H 15 Z M 30,35 H 35 V 50 H 30 Z"
                fill="#0d0a16"
              />
              <path
                d="M 40,40 H 60 V 45 H 40 Z M 65,40 H 75 V 55 H 65 Z M 80,30 H 95 V 35 H 80 Z"
                fill="#0d0a16"
              />
              <path
                d="M 85,45 H 100 V 50 H 85 Z M 85,55 H 90 V 70 H 85 Z M 95,60 H 100 V 75 H 95 Z"
                fill="#d4af37"
              />
              <path
                d="M 45,55 H 55 V 65 H 45 Z M 35,60 H 40 V 75 H 35 Z M 50,70 H 60 V 75 H 50 Z"
                fill="#8b0000"
              />
              <path
                d="M 30,80 H 45 V 85 H 30 Z M 35,90 H 50 V 95 H 35 Z M 55,80 H 65 V 90 H 55 Z"
                fill="#0d0a16"
              />
              <path
                d="M 70,80 H 75 V 95 H 70 Z M 80,80 H 90 V 85 H 80 Z M 85,90 H 100 V 95 H 85 Z"
                fill="#0d0a16"
              />

              {/* Logo Watermark in the middle */}
              <rect x="38" y="38" width="24" height="24" rx="4" fill="#0d0a16" />
              <rect x="40" y="40" width="20" height="20" rx="3" fill="#d4af37" />
              {/* Stylized M shape */}
              <path
                d="M 44,54 V 46 L 50,50 L 56,46 V 54"
                stroke="#06040a"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
              />
            </svg>
          </div>
          <span className="text-[10px] font-bold tracking-widest text-gold-primary uppercase mt-3">
            QRIS DUMMY PAYMENT
          </span>
        </div>

        {/* Verification badges */}
        <div className="space-y-2">
          <div className="flex items-center gap-2.5 text-xs text-emerald-400 bg-emerald-950/20 p-3 rounded-lg border border-emerald-500/25">
            <ShieldCheck className="w-4 h-4 shrink-0" />
            <span className="font-semibold">Transaksi Instan & Terenkripsi</span>
          </div>

          <div className="flex gap-2 bg-obsidian-950/50 p-3 rounded-lg border border-obsidian-border">
            <Info className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
            <span className="text-[10px] text-slate-400 leading-normal">
              Setelah melakukan transfer, mohon klik <b>"Copy Format Chat"</b> lalu kirimkan format tersebut ke admin melalui link WhatsApp, Discord, atau TikTok yang tersedia.
            </span>
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-obsidian-border text-center text-[10px] text-slate-500">
        Aeon Studio © 2026. All rights reserved.
      </div>
    </div>
  );
}
