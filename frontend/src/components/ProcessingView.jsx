import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Layers, Cpu, CheckCircle2, Loader2, AlertCircle, 
  RefreshCw, XCircle, Eye, EyeOff, ScanLine, Wand2 
} from 'lucide-react';
import { apiService } from '../services/api';

const STEPS = [
  { id: 'uploading', label: '1. Uploading & Verifying Video' },
  { id: 'detecting', label: '2. Detecting Selected Area' },
  { id: 'extracting', label: '3. Processing Frames' },
  { id: 'restoring', label: '4. Restoring Background' },
  { id: 'rendering', label: '5. Rendering Video' },
  { id: 'finalizing', label: '6. Finalizing Output' }
];

export default function ProcessingView({ job, videoData, onCancel }) {
  const progress = job?.progress || 10;
  const currentStepText = job?.step || 'Initializing video restoration...';
  const status = job?.status || 'extracting';

  // Manual split slider or auto-progress
  const [sliderPos, setSliderPos] = useState(50);
  const [isHovered, setIsHovered] = useState(false);

  // Sync split slider with actual progress smoothly if user isn't hovering
  useEffect(() => {
    if (!isHovered) {
      // Map 10-95% progress to 20-80% slider reveal
      const mapped = Math.max(20, Math.min(80, Math.round(progress * 0.8 + 10)));
      setSliderPos(mapped);
    }
  }, [progress, isHovered]);

  // Compute active step index based on progress
  let activeStepIndex = 0;
  if (progress > 15) activeStepIndex = 1;
  if (progress > 30) activeStepIndex = 2;
  if (progress > 55) activeStepIndex = 3;
  if (progress > 85) activeStepIndex = 4;
  if (progress >= 98) activeStepIndex = 5;

  // Resolve thumbnail/preview image from videoData
  const previewImg = videoData?.imageUrl || 
    (videoData?.thumbnail ? `/api/media/uploads/${videoData.thumbnail}` : null) ||
    videoData?.videoUrl || null;
  const resolvedPreview = previewImg ? apiService.resolveMediaUrl(previewImg) : null;

  return (
    <div className="w-full max-w-4xl mx-auto px-4 py-8">
      <motion.div 
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel rounded-3xl p-6 sm:p-10 border border-white/10 shadow-2xl relative overflow-hidden"
      >
        {/* Animated Background Ambient Glow */}
        <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[500px] h-[300px] bg-gradient-to-r from-brand-500/20 via-brand-cyan/20 to-brand-violet/20 blur-[120px] rounded-full pointer-events-none -z-10"></div>

        {/* Top Header Section */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-semibold mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
            <span>Live Zero-Blur Restoration Engine</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Cleaning your {videoData?.mediaType === 'image' ? 'photo' : 'video'} live...
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">
            Mathematical reverse alpha blending is unblending the watermark in real-time.
          </p>
        </div>

        {/* =========================================================================
            LIVE BEFORE & AFTER REVEAL SCANNER SCREEN
        ========================================================================= */}
        <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-dark-900/80 shadow-2xl mb-8 group">
          {/* Top Badges overlay */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-dark-900/85 backdrop-blur-md border border-rose-500/30 text-[11px] font-bold text-rose-300 flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              Before: Watermark
            </span>
          </div>

          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-dark-900/85 backdrop-blur-md border border-emerald-500/40 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              After: 100% Clean
            </span>
          </div>

          {/* Main Visual Comparison Frame */}
          <div 
            className="relative w-full aspect-video sm:h-[340px] max-h-[380px] bg-dark-950 flex items-center justify-center overflow-hidden cursor-ew-resize select-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
              setSliderPos(pct);
            }}
          >
            {/* 1. AFTER / RESTORED LAYER (Full background) */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center">
              {resolvedPreview ? (
                <img 
                  src={resolvedPreview} 
                  alt="Restored Preview" 
                  className="w-full h-full object-contain filter contrast-[1.02]"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-dark-900 via-dark-800 to-dark-950 flex items-center justify-center">
                  <div className="text-center p-6">
                    <ScanLine className="w-12 h-12 text-brand-cyan/60 mx-auto mb-2 animate-pulse" />
                    <span className="text-xs text-slate-400 font-mono">Restoring Visual Stream...</span>
                  </div>
                </div>
              )}
            </div>

            {/* 2. BEFORE LAYER (Clipped by slider position) with simulated watermark */}
            <div 
              className="absolute inset-0 w-full h-full overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              {resolvedPreview ? (
                <img 
                  src={resolvedPreview} 
                  alt="Original Preview" 
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-dark-900 via-dark-800 to-dark-950 flex items-center justify-center">
                  <div className="text-center p-6">
                    <ScanLine className="w-12 h-12 text-brand-cyan/60 mx-auto mb-2 animate-pulse" />
                    <span className="text-xs text-slate-400 font-mono">Restoring Visual Stream...</span>
                  </div>
                </div>
              )}

              {/* Watermark Overlay shown ONLY on Before side (Bottom-Right) */}
              <div className="absolute bottom-5 right-6 z-20 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-black/40 backdrop-blur-xs border border-white/20 pointer-events-none shadow-lg">
                <span className="text-xl leading-none text-white/90">✦</span>
                <span className="text-xs font-semibold text-white/90 tracking-wide font-sans">Gemini</span>
              </div>
            </div>

            {/* 3. Glowing Laser Scanner Divider Line */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-brand-cyan via-white to-brand-500 shadow-[0_0_16px_#06B6D4] z-25 pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              {/* Laser Scanner Bead Icon in the center */}
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-brand-500/90 border-2 border-white shadow-xl shadow-brand-cyan/50 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-white animate-spin" />
              </div>
            </div>

            {/* Floating Live Watermark Zoom Loupe (Bottom-Right inset) */}
            <div className="absolute bottom-3 right-3 z-30 hidden sm:flex items-center gap-2 p-2 rounded-xl bg-dark-950/90 border border-white/15 backdrop-blur-md shadow-2xl">
              <div className="relative w-16 h-10 rounded-lg overflow-hidden border border-brand-cyan/40 bg-dark-900 flex items-center justify-center">
                {/* Watermark dissolving inside loupe */}
                <span 
                  className="text-base text-white/90 font-bold transition-opacity duration-300"
                  style={{ opacity: Math.max(0, 1 - progress / 85) }}
                >
                  ✦
                </span>
                {progress > 50 && (
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 absolute inset-0 m-auto animate-ping" />
                )}
              </div>
              <div className="text-left pr-1">
                <div className="text-[10px] font-mono uppercase text-brand-cyan font-bold tracking-wider">
                  Target Zone
                </div>
                <div className="text-[10px] font-semibold text-slate-300">
                  {progress < 70 ? 'Unblending Star...' : '✨ Erased 100%'}
                </div>
              </div>
            </div>

          </div>

          {/* Interactive Hint strip below frame */}
          <div className="bg-dark-950/80 px-4 py-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <ScanLine className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Drag slider or hover to compare Before & After live</span>
            </span>
            <span className="font-mono text-brand-300 font-semibold">
              Frame Progress: {progress}%
            </span>
          </div>
        </div>

        {/* =========================================================================
            PROGRESS BAR & LIVE STEP TRACKER
        ========================================================================= */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-brand-cyan" />
              <span className="text-sm font-semibold text-white">{currentStepText}</span>
            </div>
            <span className="text-lg font-black font-mono bg-gradient-to-r from-brand-cyan to-brand-violet bg-clip-text text-transparent">
              {progress}%
            </span>
          </div>

          <div className="w-full bg-dark-900 rounded-full h-3.5 p-0.5 border border-white/10 overflow-hidden relative shadow-inner">
            <motion.div 
              className="h-full rounded-full bg-gradient-to-r from-brand-600 via-brand-cyan to-emerald-400 shadow-md shadow-brand-cyan/20"
              initial={{ width: '5%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.4, ease: 'easeOut' }}
            />
          </div>
        </div>

        {/* Multi-Step Pipeline Indicator */}
        <div className="pt-6 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-2.5 text-left">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < activeStepIndex;
            const isCurrent = idx === activeStepIndex;

            return (
              <div 
                key={step.id}
                className={`p-2.5 rounded-xl border transition-all text-xs ${
                  isCurrent 
                    ? 'bg-brand-500/20 border-brand-500/40 text-white shadow-lg shadow-brand-500/10 font-medium'
                    : isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                    : 'bg-dark-900/40 border-white/5 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="truncate">{step.label}</span>
                  {isCompleted && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-1" />}
                  {isCurrent && <Loader2 className="w-3.5 h-3.5 text-brand-cyan animate-spin shrink-0 ml-1" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notice & Cancel option */}
        <div className="mt-8 flex items-center justify-between pt-5 border-t border-white/5 text-xs text-slate-400">
          <span>Keep this window open while processing.</span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1 font-semibold transition-colors"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Job</span>
            </button>
          )}
        </div>

      </motion.div>
    </div>
  );
}
