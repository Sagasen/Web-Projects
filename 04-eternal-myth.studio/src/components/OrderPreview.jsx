import React, { useState } from 'react';
import { Copy, Check, MessageSquare, Compass, Send, ExternalLink } from 'lucide-react';

export default function OrderPreview({ formData }) {
  const [copied, setCopied] = useState(false);

  // Price calculations
  const getRate = () => {
    switch (formData.category) {
      case 'Staff':
      case 'Pembelian Pertama':
        return 100;
      case 'Normal':
      default:
        return 120;
    }
  };

  const rate = getRate();
  const totalHarga = (parseInt(formData.robuxAmount) || 0) * rate;

  // Format IDR helper
  const formatIDR = (number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(number);
  };

  // Chat message generator
  const generateChatString = () => {
    return `
*ETERNAL MYTH STUDIO*
*PAYOUT COMMUNITY*

✦Username: ${formData.username || '-'}
✦Display Name: ${formData.displayName || '-'}
✦Jumlah Robux: ${(parseInt(formData.robuxAmount) || 0).toLocaleString()} R$
✦Verifikasi Umur/KTP: ${formData.ktpVerified}
✦Kategori: ${formData.category}
✦Total Harga: ${formatIDR(totalHarga)}
------------

Catatan: ${formData.notes || '-'}`;
  };

  const chatString = generateChatString();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(chatString);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // WhatsApp redirection url
  const getWhatsAppLink = () => {
    const encodedText = encodeURIComponent(chatString);
    // Standard placeholder Indonesian admin WhatsApp number
    return `https://wa.me/6281234567890?text=${encodedText}`;
  };

  return (
    <div className="glass-panel glass-panel-glow rounded-2xl p-6 md:p-8 space-y-6 relative overflow-hidden flex flex-col justify-between h-full">
      {/* Mystical decorative light glow */}
      <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none"></div>

      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b border-obsidian-border pb-4">
          <Compass className="w-6 h-6 text-gold-primary" />
          <h2 className="font-fantasy text-xl font-semibold text-glow-gold text-gold-light">Calculation & Chat Preview</h2>
        </div>

        {/* Pricing Summary */}
        <div className="grid grid-cols-2 gap-4 bg-obsidian-950/60 p-4 rounded-xl border border-obsidian-border">
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-purple-400">Harga per Robux</span>
            <span className="text-lg font-extrabold text-white">Rp{rate}</span>
          </div>
          <div>
            <span className="block text-[10px] uppercase font-bold tracking-wider text-purple-400">Total Pembayaran</span>
            <span className="text-lg font-extrabold text-gold-light text-glow-gold">{formatIDR(totalHarga)}</span>
          </div>
        </div>

        {/* Chat Format Preview Box */}
        <div className="space-y-2 relative">
          <div className="flex items-center justify-between">
            <span className="block text-xs font-semibold uppercase tracking-wider text-purple-300">Format Chat Preview</span>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 text-xs text-gold-primary hover:text-gold-light font-bold transition-all duration-200 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Format Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Format</span>
                </>
              )}
            </button>
          </div>

          <div className="relative group">
            <pre className="w-full bg-obsidian-950/80 p-4 rounded-xl border border-obsidian-border text-[11px] md:text-xs text-slate-300 font-mono overflow-x-auto whitespace-pre leading-relaxed select-all">
              {chatString}
            </pre>
          </div>
        </div>
      </div>

      {/* Button Operations */}
      <div className="space-y-3 pt-6 border-t border-obsidian-border mt-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* Primary Action: Copy Format */}
          <button
            type="button"
            onClick={handleCopy}
            className="w-full btn-premium-dark py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 cursor-pointer text-sm font-bold"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-gold-primary" />
                <span>Copy Format Chat</span>
              </>
            )}
          </button>

          {/* Primary Action: Open WhatsApp */}
          <a
            href={getWhatsAppLink()}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full btn-premium-gold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm font-bold"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Chat WhatsApp</span>
          </a>
        </div>

        {/* Secondary Links */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href="https://discord.gg/eternalmyth"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-premium-dark py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold"
          >
            <span>Buka Discord</span>
            <ExternalLink className="w-3 h-3 text-indigo-400" />
          </a>
          <a
            href="https://www.tiktok.com/@eternalmyth"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-premium-dark py-2.5 rounded-lg flex items-center justify-center gap-2 text-xs font-bold"
          >
            <span>Buka TikTok</span>
            <ExternalLink className="w-3 h-3 text-pink-400" />
          </a>
        </div>
      </div>
    </div>
  );
}
