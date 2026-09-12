import React from 'react';
import { Target, Sparkles, Film, Zap, Lock, Gift } from 'lucide-react';

const FEATURES = [
  {
    icon: Target,
    title: 'Precise Area Selection',
    desc: 'Select exactly where restoration is needed with draggable bounding boxes, brush tools, and edge feathering.',
    color: 'text-brand-cyan',
    badge: 'Pixel Accurate'
  },
  {
    icon: Sparkles,
    title: 'AI-Assisted Restoration',
    desc: 'Restore the selected area while seamlessly reconstructing and blending surrounding background details.',
    color: 'text-brand-400',
    badge: 'Neural Inpaint'
  },
  {
    icon: Film,
    title: 'Video Quality & Audio',
    desc: 'Maintain original video resolution, framerates, and lossless multi-channel AAC audio tracks without re-compression.',
    color: 'text-brand-violet',
    badge: 'Lossless Audio'
  },
  {
    icon: Zap,
    title: 'Ultra-Fast Workflow',
    desc: 'Simple 3-step pipeline: Upload footage → Select target watermark → Process and download final MP4.',
    color: 'text-amber-400',
    badge: 'Zero Friction'
  },
  {
    icon: Lock,
    title: 'Temporary Processing',
    desc: 'Your videos are strictly temporary. Uploaded and processed files are automatically purged from storage after expiry.',
    color: 'text-emerald-400',
    badge: 'Auto Cleanup'
  },
  {
    icon: Gift,
    title: 'Free Development Mode',
    desc: 'Completely free to use during development. No subscriptions, no hidden watermarks, and no sign-up required.',
    color: 'text-rose-400',
    badge: '100% Free'
  }
];

export default function Features() {
  return (
    <section id="features" className="py-20 relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-brand-500/10 text-brand-300 border border-brand-500/20 uppercase tracking-wider">
            Engine Capabilities
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-4">
            Designed for Modern Video Creators
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-3">
            Every feature is engineered to give you complete visual control over logo and watermark restoration.
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="glass-panel glass-panel-hover p-6 sm:p-8 rounded-2xl border border-white/10 flex flex-col justify-between group"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-dark-900 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                      <Icon className={`w-6 h-6 ${feat.color}`} />
                    </div>
                    <span className="px-2.5 py-0.5 text-[10px] font-mono font-semibold uppercase tracking-wider bg-white/5 text-slate-300 rounded-full border border-white/5">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-white mb-2 group-hover:text-brand-300 transition-colors">
                    {feat.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/5 flex items-center gap-1.5 text-xs font-medium text-slate-400 group-hover:text-brand-cyan transition-colors">
                  <span>Engine Feature</span>
                  <span>→</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
