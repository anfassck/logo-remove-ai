import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, ArrowRight, Play, CheckCircle2, ShieldAlert, Cpu, Layers } from 'lucide-react';

export default function Hero({ onUploadClick, onLearnMoreClick }) {
  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-32 overflow-hidden">
      {/* Background Neon Blurs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-brand-500/15 blur-[120px] rounded-full pointer-events-none -z-10"></div>
      <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-brand-cyan/15 blur-[100px] rounded-full pointer-events-none -z-10"></div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Hero Content */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="lg:col-span-7 text-center lg:text-left"
          >
            {/* Tag Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-brand-300 mb-6 backdrop-blur-md">
              <Sparkles className="w-3.5 h-3.5 text-brand-cyan animate-spin-slow" />
              <span>Next-Gen Video & Photo Restoration Engine</span>
              <span className="w-1.5 h-1.5 rounded-full bg-brand-cyan animate-ping"></span>
            </div>

            {/* Main Headline */}
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white leading-[1.12]">
              Remove Unwanted Logos <br className="hidden sm:inline" />
              <span className="bg-gradient-to-r from-brand-400 via-brand-cyan to-brand-violet bg-clip-text text-transparent">
                From Videos & Photos
              </span>
            </h1>

            {/* Subheading */}
            <p className="mt-6 text-base sm:text-lg text-slate-300 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
              AI-assisted restoration for your videos and images. Reconstruct background details with zero quality loss, instant high-res photo inpainting, and audio preservation.
            </p>

            {/* Action Buttons */}
            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
              <button
                onClick={onUploadClick}
                className="w-full sm:w-auto px-8 py-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan hover:from-brand-500 hover:to-brand-400 shadow-xl shadow-brand-500/25 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 group"
              >
                <span>Upload Video or Photo</span>
                <ArrowRight className="w-4 h-4 text-white group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onLearnMoreClick}
                className="w-full sm:w-auto px-7 py-4 rounded-xl font-semibold text-sm text-slate-300 hover:text-white bg-dark-900/80 hover:bg-dark-800 border border-white/10 hover:border-white/20 transition-all flex items-center justify-center gap-2"
              >
                <Play className="w-4 h-4 text-brand-cyan" />
                <span>See How It Works</span>
              </button>
            </div>

            {/* Key Value Highlights */}
            <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-3 gap-4 text-left">
              <div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>100% Free</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Free during beta</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
                  <Layers className="w-4 h-4 text-brand-cyan shrink-0" />
                  <span>Lossless Audio</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Original audio synced</p>
              </div>

              <div>
                <div className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-white">
                  <Cpu className="w-4 h-4 text-brand-violet shrink-0" />
                  <span>Smart Inpaint</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">Frame spatial blend</p>
              </div>
            </div>

            {/* Fair Use Reminder */}
            <div className="mt-6 flex items-start gap-2 text-left p-3 rounded-lg bg-white/[0.02] border border-white/5 text-slate-400 text-xs">
              <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <span>Intended strictly for videos you own or have explicit rights to edit and restore.</span>
            </div>
          </motion.div>

          {/* Right Hero Interactive Animated Video Frame Demo */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="lg:col-span-5 relative"
          >
            <div className="relative mx-auto max-w-md lg:max-w-none">
              {/* Outer Glow Ring */}
              <div className="absolute -inset-1 bg-gradient-to-r from-brand-500 via-brand-cyan to-brand-violet rounded-2xl blur-xl opacity-40 group-hover:opacity-60 transition duration-1000 animate-pulse-glow"></div>
              
              {/* Mockup Frame */}
              <div className="relative rounded-2xl glass-panel p-3 sm:p-4 overflow-hidden border border-white/10 shadow-2xl">
                {/* Header bar */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-rose-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500/80"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500/80"></div>
                    <span className="text-[11px] font-mono text-slate-400 ml-2">CleanFrame_Restoration_Engine.mp4</span>
                  </div>
                  <span className="px-2 py-0.5 text-[10px] font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded">
                    LIVE PREVIEW
                  </span>
                </div>

                {/* Simulated Video Canvas */}
                <div className="relative mt-3 rounded-xl overflow-hidden aspect-video bg-dark-900 flex items-center justify-center group">
                  {/* Background Artwork */}
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-950 flex items-center justify-center">
                    <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#6366f1_1px,transparent_1px)] [background-size:16px_16px]"></div>
                    
                    {/* Visual waves */}
                    <div className="w-32 h-32 rounded-full border border-brand-500/20 animate-ping absolute"></div>
                    <div className="w-48 h-48 rounded-full border border-brand-cyan/20 animate-pulse absolute"></div>
                    
                    {/* Scene Elements */}
                    <div className="text-center z-10 px-4">
                      <div className="inline-block p-3 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-md mb-2">
                        <Sparkles className="w-8 h-8 text-brand-cyan animate-bounce" />
                      </div>
                      <p className="text-xs font-semibold text-slate-200">High-Definition Source Track</p>
                      <p className="text-[10px] font-mono text-slate-400">1920x1080 • 60 FPS • H.264</p>
                    </div>
                  </div>

                  {/* Simulated Watermark Removal Target Box (Top-Right) */}
                  <motion.div 
                    animate={{ 
                      scale: [1, 1.04, 1],
                      boxShadow: [
                        '0 0 0 0 rgba(99, 102, 241, 0)',
                        '0 0 15px 2px rgba(6, 182, 212, 0.4)',
                        '0 0 0 0 rgba(99, 102, 241, 0)'
                      ]
                    }}
                    transition={{ repeat: Infinity, duration: 3 }}
                    className="absolute top-4 right-4 w-28 h-12 rounded-lg border-2 border-dashed border-brand-cyan bg-brand-cyan/15 backdrop-blur-sm flex flex-col items-center justify-center z-20"
                  >
                    <span className="text-[9px] font-mono font-bold text-brand-cyan tracking-wider uppercase">
                      Target Area
                    </span>
                    <span className="text-[8px] text-slate-300 font-mono">Restoring...</span>
                  </motion.div>

                  {/* Laser Scanner Line */}
                  <div className="absolute inset-x-0 h-0.5 bg-gradient-to-r from-transparent via-brand-cyan to-transparent shadow-[0_0_12px_#06B6D4] animate-scanner pointer-events-none z-30"></div>

                  {/* Before / After Floating Tag */}
                  <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-dark-950/80 border border-white/10 text-[10px] font-semibold text-slate-200 backdrop-blur-md">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    <span>AI Inpaint Active</span>
                  </div>

                  {/* Audio Track Tag */}
                  <div className="absolute bottom-3 right-3 z-20 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-dark-950/80 border border-white/10 text-[10px] font-mono text-slate-300 backdrop-blur-md">
                    <span>AAC 320kbps</span>
                  </div>
                </div>

                {/* Bottom Timeline Simulation */}
                <div className="mt-3 pt-2 flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <div className="flex items-center gap-2">
                    <Play className="w-3.5 h-3.5 text-brand-400" />
                    <span>00:04.12 / 00:18.00</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-brand-300 font-semibold">100% Inpainted</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
}
