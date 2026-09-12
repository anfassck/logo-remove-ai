import React from 'react';
import { ShieldCheck, Clock, Trash2, CheckCircle2, Lock } from 'lucide-react';

export default function PrivacyBanner() {
  return (
    <section id="privacy" className="py-16">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl p-8 sm:p-10 border border-white/10 bg-gradient-to-br from-dark-900 via-dark-850 to-indigo-950/30 overflow-hidden shadow-2xl">
          
          {/* Subtle Ambient Glow */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none"></div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
            
            <div className="md:col-span-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-4">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>Zero Long-Term Storage</span>
              </div>

              <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                Your Videos Are Strictly Temporary
              </h3>

              <p className="mt-3 text-slate-300 text-sm leading-relaxed">
                We respect creator ownership. Uploaded footage and processed outputs are strictly isolated, processed solely for your session, and automatically deleted from our servers after 30 minutes.
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-4 text-xs text-slate-300">
                <div className="flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>No data selling</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Trash2 className="w-4 h-4 text-emerald-400" />
                  <span>Auto-purge timer</span>
                </div>
                <div className="flex items-center gap-1.5 font-medium">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>SSL encrypted transfer</span>
                </div>
              </div>
            </div>

            <div className="md:col-span-4 flex flex-col items-center justify-center p-6 rounded-2xl bg-dark-950/70 border border-white/5 text-center">
              <Clock className="w-10 h-10 text-emerald-400 mb-2 animate-pulse" />
              <span className="text-2xl font-extrabold font-mono text-white">30 Min TTL</span>
              <span className="text-[11px] text-slate-400 mt-1">Automatic file expiration</span>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
