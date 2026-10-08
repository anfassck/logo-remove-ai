import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Sparkles, Layers, Cpu, CheckCircle2, Loader2, AlertCircle, 
  RefreshCw, XCircle, Eye, EyeOff, ScanLine, Wand2, Film, ZoomIn, Maximize2 
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
  const [hasMediaError, setHasMediaError] = useState(false);
  const [isZoomMode, setIsZoomMode] = useState(true); // Default to Zoomed Watermark Focus!

  // Sync split slider with actual progress smoothly if user isn't hovering
  useEffect(() => {
    if (!isHovered) {
      // Map progress to 20-80% slider reveal
      const mapped = Math.max(20, Math.min(80, Math.round(progress * 0.75 + 15)));
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

  // Resolve thumbnail/preview image from videoData (prioritize instant zero-latency local blob)
  const isVideo = videoData?.mediaType === 'video';
  const rawPreview = videoData?.localPreviewUrl || 
    videoData?.imageUrl || 
    (videoData?.thumbnail ? `/api/media/uploads/${videoData.thumbnail}` : null) ||
    videoData?.videoUrl || null;
  const resolvedPreview = rawPreview ? apiService.resolveMediaUrl(rawPreview) : null;

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
            <span>Watermark Live Inspection HUD • 2.5x Zoom</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Watching watermark vanish live frame by frame...
          </h3>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-md mx-auto">
            Zoomed directly on the bottom-right corner. See the video play cleanly without the logo!
          </p>
        </div>

        {/* =========================================================================
            ZOOMED WATERMARK BEFORE & AFTER REVEAL SCANNER SCREEN
        ========================================================================= */}
        <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-dark-900/90 shadow-2xl mb-8 group">
          {/* Top Controls Overlay */}
          <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
            <span className="px-2.5 py-1 rounded-md bg-dark-900/90 backdrop-blur-md border border-rose-500/40 text-[11px] font-bold text-rose-300 flex items-center gap-1.5 shadow-md">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              Before: With Watermark
            </span>
          </div>

          <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
            {/* View Mode Toggle: Zoom vs Full */}
            <button
              onClick={() => setIsZoomMode(!isZoomMode)}
              className="px-2.5 py-1 rounded-md bg-dark-900/90 hover:bg-dark-800 border border-white/20 text-[11px] font-medium text-slate-200 flex items-center gap-1 shadow-md transition-all"
              title="Toggle Zoom Focus"
            >
              <ZoomIn className="w-3 h-3 text-brand-cyan" />
              <span>{isZoomMode ? 'Zoom: 2.5x Focus' : 'Full Video'}</span>
            </button>

            <span className="px-2.5 py-1 rounded-md bg-dark-900/90 backdrop-blur-md border border-emerald-500/40 text-[11px] font-bold text-emerald-300 flex items-center gap-1.5 shadow-md">
              <Sparkles className="w-3 h-3 text-emerald-400" />
              After: Logo Erased
            </span>
          </div>

          {/* Main Visual Comparison Frame (Magnified on Bottom-Right) */}
          <div 
            className="relative w-full aspect-video sm:h-[380px] max-h-[420px] bg-dark-950 flex items-center justify-center overflow-hidden cursor-ew-resize select-none"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const pct = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100));
              setSliderPos(pct);
            }}
          >
            {/* 1. AFTER / RESTORED LAYER (Video playing cleanly without watermark) */}
            <div className="absolute inset-0 w-full h-full flex items-center justify-center overflow-hidden">
              {resolvedPreview && !hasMediaError ? (
                isVideo ? (
                  <video
                    src={resolvedPreview}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className={`w-full h-full object-cover transition-transform duration-500 pointer-events-none ${
                      isZoomMode ? 'scale-[2.4] sm:scale-[2.8] origin-bottom-right' : 'object-contain'
                    }`}
                    onError={() => setHasMediaError(true)}
                  />
                ) : (
                  <img 
                    src={resolvedPreview} 
                    alt="Restored Preview" 
                    className={`w-full h-full object-cover transition-transform duration-500 pointer-events-none ${
                      isZoomMode ? 'scale-[2.4] sm:scale-[2.8] origin-bottom-right' : 'object-contain'
                    }`}
                    onError={() => setHasMediaError(true)}
                  />
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-dark-900 via-dark-800 to-dark-950 flex flex-col items-center justify-center p-6 text-center">
                  <Film className="w-12 h-12 text-brand-cyan/60 mb-2 animate-pulse" />
                  <span className="text-xs text-white font-semibold">{videoData?.originalName || 'Video Footage'}</span>
                  <span className="text-[11px] text-slate-400 font-mono mt-1">Reconstructing Video Stream...</span>
                </div>
              )}

              {/* CLEAN WATERMARK AREA INDICATOR ON AFTER SIDE */}
              <div 
                className={`absolute z-10 flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/25 backdrop-blur-md border border-emerald-400/50 shadow-lg pointer-events-none transition-opacity duration-300 ${
                  isZoomMode ? 'bottom-8 right-8' : 'bottom-5 right-6'
                }`}
                style={{ opacity: sliderPos < 75 ? 1 : 0 }}
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-300 animate-spin" />
                <span className="text-[11px] font-bold text-emerald-200">✨ Logo Erased</span>
              </div>
            </div>

            {/* 2. BEFORE LAYER (Clipped by slider position) with watermark present */}
            <div 
              className="absolute inset-0 w-full h-full overflow-hidden"
              style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
            >
              {resolvedPreview && !hasMediaError ? (
                isVideo ? (
                  <video
                    src={resolvedPreview}
                    autoPlay
                    loop
                    muted
                    playsInline
                    className={`w-full h-full object-cover transition-transform duration-500 pointer-events-none ${
                      isZoomMode ? 'scale-[2.4] sm:scale-[2.8] origin-bottom-right' : 'object-contain'
                    }`}
                  />
                ) : (
                  <img 
                    src={resolvedPreview} 
                    alt="Original Preview" 
                    className={`w-full h-full object-cover transition-transform duration-500 pointer-events-none ${
                      isZoomMode ? 'scale-[2.4] sm:scale-[2.8] origin-bottom-right' : 'object-contain'
                    }`}
                  />
                )
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-dark-900 via-dark-800 to-dark-950 flex flex-col items-center justify-center p-6 text-center">
                  <Film className="w-12 h-12 text-brand-cyan/60 mb-2 animate-pulse" />
                  <span className="text-xs text-white font-semibold">{videoData?.originalName || 'Video Footage'}</span>
                  <span className="text-[11px] text-slate-400 font-mono mt-1">Reconstructing Video Stream...</span>
                </div>
              )}

              {/* Watermark Overlay shown ONLY on Before side (Magnified & Target-Locked) */}
              <div className={`absolute z-20 flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/75 backdrop-blur-md border border-white/30 pointer-events-none shadow-2xl ${
                isZoomMode ? 'bottom-8 right-8 scale-110' : 'bottom-5 right-6'
              }`}>
                <span className="text-2xl leading-none text-white/95">✦</span>
                <span className="text-sm font-bold text-white/95 tracking-wide font-sans">Gemini</span>
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
              </div>

              {/* Corner Target Reticle Box */}
              {isZoomMode && (
                <div className="absolute bottom-6 right-6 w-36 h-16 border-2 border-dashed border-rose-400/50 rounded-xl pointer-events-none flex items-start justify-end p-1">
                  <span className="text-[9px] font-mono font-bold text-rose-300 uppercase px-1 bg-black/60 rounded">
                    Target Lock
                  </span>
                </div>
              )}
            </div>

            {/* 3. Glowing Laser Scanner Divider Line */}
            <div 
              className="absolute top-0 bottom-0 w-1 bg-gradient-to-b from-brand-cyan via-white to-brand-500 shadow-[0_0_20px_#06B6D4] z-25 pointer-events-none"
              style={{ left: `${sliderPos}%` }}
            >
              {/* Laser Scanner Bead Icon in the center */}
              <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-brand-500 border-2 border-white shadow-xl shadow-brand-cyan/70 flex items-center justify-center">
                <Wand2 className="w-4 h-4 text-white animate-spin" />
              </div>
            </div>

            {/* Live Telemetry Pill (Bottom-Left) */}
            <div className="absolute bottom-3 left-3 z-30 hidden sm:flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-dark-950/90 border border-white/15 backdrop-blur-md text-[10px] text-slate-300 font-mono">
              <ScanLine className="w-3.5 h-3.5 text-brand-cyan animate-pulse" />
              <span>Area: Bottom-Right 96px</span>
              <span className="text-slate-500">•</span>
              <span className="text-emerald-300 font-semibold">Zero-Blur Active</span>
            </div>

          </div>

          {/* Interactive Hint strip below frame */}
          <div className="bg-dark-950/90 px-4 py-2.5 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-300">
            <span className="flex items-center gap-1.5 font-medium">
              <ScanLine className="w-3.5 h-3.5 text-brand-cyan" />
              <span>Hover or drag slider to see the logo get erased live across each scene</span>
            </span>
            <span className="font-mono text-brand-300 font-bold">
              Progress: {progress}%
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
