import React, { useState } from 'react';
import { Copy, Check, MessageSquare, Compass, ExternalLink, ArrowLeft, Info } from 'lucide-react';
import { buildWhatsAppLink, buildOrderChatMessage } from '../lib/utils';

export default function ChatPreviewStep({ transaction, settings, onBack }) {
  const [copied, setCopied] = useState(false);

  const chatMessage = buildOrderChatMessage(transaction);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chatMessage);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Gagal menyalin teks: ', err);
    }
  };

  const waLink      = buildWhatsAppLink(chatMessage, settings.whatsapp_number || '6281234567890');
  const discordUrl  = settings.discord_url || 'https://discord.com/users/459376386671509505';
  const tiktokUrl   = settings.tiktok_url  || 'https://www.tiktok.com/@eternalmyth';

  return (
    <div className="glass-panel glass-panel-glow rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden">
      <div className="absolute -top-12 -right-12 w-32 h-32 bg-gold-primary/5 rounded-full blur-3xl pointer-events-none"></div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-obsidian-border pb-4">
        <div className="flex items-center gap-3">
          <Compass className="w-6 h-6 text-gold-primary animate-pulse-slow" />
          <h2 className="font-fantasy text-xl font-semibold text-glow-gold text-gold-light">Chat Preview</h2>
        </div>
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Kembali</span>
        </button>
      </div>

      {/* Success notice */}
      <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-4 text-xs text-slate-300 leading-normal">
        <span className="font-bold text-emerald-400">Order Berhasil Dibuat!</span> Kode order Anda adalah{' '}
        <span className="font-mono bg-obsidian-950 text-gold-light px-2 py-0.5 rounded border border-obsidian-border font-bold">
          {transaction.order_code}
        </span>.{' '}
        Harap salin format chat di bawah ini dan hubungi admin di platform pilihan Anda.
      </div>

      {/* Formatted Chat Text */}
      <div className="space-y-2 relative">
        <div className="flex items-center justify-between">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">Format Chat Admin</span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1.5 text-xs text-gold-primary hover:text-gold-light font-bold transition-all duration-200 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Teks Tersalin!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Salin Teks</span>
              </>
            )}
          </button>
        </div>
        <pre className="w-full bg-obsidian-950/80 p-4 rounded-xl border border-obsidian-border text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre leading-relaxed select-all">
          {chatMessage}
        </pre>
      </div>

      {/* Large Copy Button */}
      <button
        type="button"
        onClick={handleCopy}
        className={`w-full py-4 rounded-xl text-center text-sm font-bold tracking-widest uppercase transition-all duration-300 cursor-pointer flex items-center justify-center gap-2 ${
          copied
            ? 'bg-emerald-950/30 border border-emerald-500 text-emerald-400'
            : 'btn-premium-gold shadow-[0_0_15px_rgba(212,175,55,0.25)]'
        }`}
      >
        {copied ? (
          <><Check className="w-5 h-5 text-emerald-400" /><span>Format Chat Tersalin</span></>
        ) : (
          <><Copy className="w-5 h-5" /><span>Copy Text Chat</span></>
        )}
      </button>

      {/* Social Channel Buttons */}
      <div className="space-y-4 pt-4 border-t border-obsidian-border">
        <span className="block text-xs font-bold uppercase tracking-wider text-center text-gold-dark">
          Kirim Bukti Ke Admin Pilihan Anda:
        </span>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* WhatsApp */}
          <a
            href={waLink}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-xs border bg-emerald-950/20 text-emerald-400 border-emerald-500/20 hover:border-emerald-500/50 hover:bg-emerald-500/10 transition-all duration-300"
          >
            <MessageSquare className="w-4 h-4 shrink-0" />
            <span>Chat WhatsApp</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>

          {/* Discord */}
          <a
            href={discordUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-xs border bg-indigo-950/20 text-indigo-400 border-indigo-500/20 hover:border-indigo-500/50 hover:bg-indigo-500/10 transition-all duration-300"
          >
            <span>Buka Discord</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>

          {/* TikTok */}
          <a
            href={tiktokUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-xs border bg-pink-950/20 text-pink-400 border-pink-500/20 hover:border-pink-500/50 hover:bg-pink-500/10 transition-all duration-300"
          >
            <span>Buka TikTok</span>
            <ExternalLink className="w-3.5 h-3.5 shrink-0" />
          </a>
        </div>

        {/* Discord helper note */}
        <div className="bg-indigo-950/10 border border-indigo-500/15 rounded-lg px-4 py-2.5 flex items-start gap-2 text-[11px] text-slate-500">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-indigo-500/60" />
          <span>Jika Discord tidak langsung membuka DM, salin text order lalu kirim manual ke akun Discord admin.</span>
        </div>
      </div>
    </div>
  );
}
