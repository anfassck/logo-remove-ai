import React from 'react';
import { Sparkles, ShieldAlert, Heart } from 'lucide-react';
import logoImg from '../assets/logo.png';

export default function Footer() {
  return (
    <footer className="border-t border-white/5 bg-dark-950/80 pt-16 pb-12 text-slate-400 text-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-12 border-b border-white/5">
          
          {/* Brand Info */}
          <div className="md:col-span-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 via-brand-500 to-brand-cyan p-[1.5px] shadow-md shadow-brand-500/20">
                <div className="w-full h-full bg-dark-900 rounded-[10px] flex items-center justify-center p-1.5 overflow-hidden">
                  <img 
                    src={logoImg} 
                    alt="CleanFrame AI" 
                    className="w-full h-full object-contain filter drop-shadow"
                  />
                </div>
              </div>
              <span className="font-extrabold text-lg text-white">
                CleanFrame<span className="text-brand-400">.AI</span>
              </span>
            </div>

            <p className="max-w-md text-slate-400 leading-relaxed text-xs">
              AI-assisted video restoration and logo removal platform. Designed for video editors, content creators, and businesses to restore their own footage cleanly.
            </p>

            <div className="mt-4 flex items-center gap-2 text-amber-400/90 text-[11px] bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg max-w-lg">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>Intended exclusively for videos you own or have explicit authorization to edit.</span>
            </div>
          </div>

          {/* Quick Links */}
          <div className="md:col-span-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-4">
              Navigation
            </h4>
            <ul className="space-y-2.5">
              <li><a href="#how-it-works" className="hover:text-white transition-colors">How It Works</a></li>
              <li><a href="#features" className="hover:text-white transition-colors">Features</a></li>
              <li><a href="#faq" className="hover:text-white transition-colors">FAQ</a></li>
              <li><a href="#privacy" className="hover:text-white transition-colors">Privacy Policy</a></li>
            </ul>
          </div>

          {/* Technology */}
          <div className="md:col-span-3">
            <h4 className="font-bold text-white uppercase tracking-wider text-[11px] mb-4">
              Technology
            </h4>
            <ul className="space-y-2.5">
              <li><span className="text-slate-300">FFmpeg Native Delogo</span></li>
              <li><span className="text-slate-300">Multi-channel Audio Sync</span></li>
              <li><span className="text-slate-300">Spatial Inpainting Engine</span></li>
              <li><span className="text-slate-300">Auto-Purge Storage</span></li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p>© {new Date().getFullYear()} CleanFrame AI. All rights reserved. Free development beta.</p>
          <div className="flex items-center gap-2">
            <span>Built with precision for creators</span>
            <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
          </div>
        </div>

      </div>
    </footer>
  );
}
