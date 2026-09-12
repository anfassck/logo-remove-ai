import React from 'react';
import { Sparkles, Crop, ArrowRight, ShieldCheck, Video, Code2 } from 'lucide-react';

export default function Navbar({ onStartClick }) {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-dark-950/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <div 
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="flex items-center gap-3 cursor-pointer group"
        >
          <div className="relative w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-600 to-brand-cyan p-[1px] shadow-lg shadow-brand-500/20 group-hover:shadow-brand-500/40 transition-all duration-300">
            <div className="w-full h-full bg-dark-900 rounded-[11px] flex items-center justify-center relative overflow-hidden">
              <div className="absolute inset-0 bg-brand-500/10 group-hover:bg-brand-500/20 transition-colors"></div>
              <Crop className="w-5 h-5 text-brand-400 group-hover:scale-110 transition-transform duration-300" />
              <Sparkles className="w-3.5 h-3.5 text-brand-cyan absolute top-1.5 right-1.5 animate-pulse" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-100 to-slate-400 bg-clip-text text-transparent">
                CleanFrame<span className="text-brand-400">.AI</span>
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-brand-500/10 text-brand-300 border border-brand-500/20 rounded-full">
                FREE BETA
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">AI Video & Photo Restoration</p>
          </div>
        </div>

        {/* Navigation Links */}
        <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-300">
          <a href="#how-it-works" className="hover:text-white transition-colors">
            How It Works
          </a>
          <a href="#features" className="hover:text-white transition-colors">
            Features
          </a>
          <a href="#faq" className="hover:text-white transition-colors">
            FAQ
          </a>
          <a href="#privacy" className="hover:text-white transition-colors flex items-center gap-1.5 text-slate-400 hover:text-brand-300">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Privacy
          </a>
        </nav>

        {/* CTA & GitHub */}
        <div className="flex items-center gap-4">
          <a
            href="https://github.com"
            target="_blank"
            rel="noreferrer"
            className="hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold text-slate-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/5 transition-all"
          >
            <Code2 className="w-4 h-4 text-brand-cyan" />
            <span>GitHub</span>
          </a>

          <button
            onClick={onStartClick}
            className="relative group overflow-hidden rounded-xl p-[1px] focus:outline-none"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-brand-500 via-brand-cyan to-brand-violet rounded-xl blur-sm opacity-70 group-hover:opacity-100 transition-opacity"></div>
            <div className="relative px-5 py-2.5 bg-dark-900 rounded-[11px] flex items-center gap-2 text-xs sm:text-sm font-semibold text-white group-hover:bg-dark-850 transition-colors">
              <Video className="w-4 h-4 text-brand-400" />
              <span>Try Free</span>
              <ArrowRight className="w-3.5 h-3.5 text-brand-cyan group-hover:translate-x-1 transition-transform" />
            </div>
          </button>
        </div>
      </div>
    </header>
  );
}
