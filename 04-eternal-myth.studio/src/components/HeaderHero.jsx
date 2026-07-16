import React from 'react';
import { Sparkles } from 'lucide-react';

export default function HeaderHero() {
  return (
    <header className="text-center mb-10 relative py-4">
      {/* Subtle light background glow behind title */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-24 bg-purple-900/10 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-purple-500/20 bg-purple-950/20 text-[10px] md:text-xs font-bold tracking-[0.2em] text-gold-light uppercase mb-4 animate-pulse-slow">
        <Sparkles className="w-3.5 h-3.5 text-gold-primary" />
        <span>Exclusive Community Payout</span>
      </div>

      <h1 className="font-fantasy text-3xl md:text-5xl lg:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gold-light via-gold-primary to-gold-dark tracking-wider uppercase drop-shadow-[0_2px_10px_rgba(212,175,55,0.15)]">
        Aeon Studio
      </h1>
    </header>
  );
}
