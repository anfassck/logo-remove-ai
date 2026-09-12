import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Layers, Cpu, CheckCircle2, Loader2, AlertCircle, RefreshCw, XCircle } from 'lucide-react';

const STEPS = [
  { id: 'uploading', label: '1. Uploading & Verifying Video' },
  { id: 'detecting', label: '2. Detecting Selected Area' },
  { id: 'extracting', label: '3. Processing Frames' },
  { id: 'restoring', label: '4. Restoring Background' },
  { id: 'rendering', label: '5. Rendering Video' },
  { id: 'finalizing', label: '6. Finalizing Output' }
];

export default function ProcessingView({ job, onCancel }) {
  const progress = job?.progress || 10;
  const currentStepText = job?.step || 'Initializing video restoration...';
  const status = job?.status || 'extracting';

  // Compute active step index based on progress
  let activeStepIndex = 0;
  if (progress > 15) activeStepIndex = 1;
  if (progress > 30) activeStepIndex = 2;
  if (progress > 55) activeStepIndex = 3;
  if (progress > 85) activeStepIndex = 4;
  if (progress >= 98) activeStepIndex = 5;

  return (
    <div className="w-full max-w-3xl mx-auto px-4 py-12">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel rounded-3xl p-8 sm:p-12 border border-white/10 shadow-2xl relative overflow-hidden text-center"
      >
        {/* Animated Glow Backdrop */}
        <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-brand-500/15 blur-[100px] rounded-full pointer-events-none -z-10"></div>

        {/* Central Holographic Spinner */}
        <div className="relative w-36 h-36 mx-auto mb-8 flex items-center justify-center">
          {/* Outer Pulsing Rings */}
          <div className="absolute inset-0 rounded-full border-2 border-brand-500/20 animate-ping"></div>
          <div className="absolute -inset-2 rounded-full border border-brand-cyan/30 animate-pulse"></div>
          
          {/* Rotating Gradient Arc */}
          <div className="w-full h-full rounded-full border-4 border-transparent border-t-brand-cyan border-r-brand-500 animate-spin"></div>

          {/* Central Percentage & Icon */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <Sparkles className="w-6 h-6 text-brand-cyan mb-1 animate-bounce" />
            <span className="text-2xl font-extrabold font-mono text-white tracking-tight">
              {progress}%
            </span>
          </div>
        </div>

        {/* Headline & Subtitle */}
        <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
          Cleaning your video...
        </h3>
        <p className="text-sm text-slate-300 mt-2 max-w-md mx-auto">
          AI is reconstructing the selected area frame by frame while maintaining original video resolution and audio streams.
        </p>

        {/* Live Step Tracker Pill */}
        <div className="mt-6 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-mono font-semibold">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-brand-cyan" />
          <span>{currentStepText}</span>
        </div>

        {/* Multi-Step Pipeline Indicator */}
        <div className="mt-10 pt-8 border-t border-white/5 grid grid-cols-2 sm:grid-cols-3 gap-3 text-left">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < activeStepIndex;
            const isCurrent = idx === activeStepIndex;

            return (
              <div 
                key={step.id}
                className={`p-3 rounded-xl border transition-all ${
                  isCurrent 
                    ? 'bg-brand-500/20 border-brand-500/40 text-white shadow-lg shadow-brand-500/10'
                    : isCompleted
                    ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300'
                    : 'bg-dark-900/40 border-white/5 text-slate-500'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold">{step.label}</span>
                  {isCompleted && <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />}
                  {isCurrent && <Loader2 className="w-4 h-4 text-brand-cyan animate-spin shrink-0" />}
                </div>
              </div>
            );
          })}
        </div>

        {/* Notice & Cancel option */}
        <div className="mt-8 flex items-center justify-between pt-6 border-t border-white/5 text-xs text-slate-400">
          <span>Please do not close this browser window.</span>
          {onCancel && (
            <button
              onClick={onCancel}
              className="text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
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
