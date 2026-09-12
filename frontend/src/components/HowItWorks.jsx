import React from 'react';
import { UploadCloud, Crop, Sparkles, ArrowRight } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    title: 'Upload Footage',
    desc: 'Select or drag & drop any MP4, MOV, or WebM video that you own or have permission to edit.',
    icon: UploadCloud,
    tag: 'Quick Ingest'
  },
  {
    step: '02',
    title: 'Select Watermark',
    desc: 'Use the interactive bounding box or brush tool to pinpoint the unwanted logo, timestamp, or watermark.',
    icon: Crop,
    tag: 'Precise Marking'
  },
  {
    step: '03',
    title: 'Restore & Export',
    desc: 'CleanFrame AI reconstructs surrounding visual textures frame-by-frame and delivers a clean MP4 ready for download.',
    icon: Sparkles,
    tag: 'Instant Output'
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 relative bg-dark-900/30 border-y border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Heading */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-brand-cyan/10 text-brand-cyan border border-brand-cyan/20 uppercase tracking-wider">
            Simple 3-Step Process
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-4">
            How CleanFrame AI Works
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-3">
            Effortlessly clean unwanted visual artifacts without complex editing software.
          </p>
        </div>

        {/* 3 Step Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          {STEPS.map((item, idx) => {
            const Icon = item.icon;
            return (
              <div 
                key={idx}
                className="relative rounded-2xl glass-panel p-8 border border-white/10 flex flex-col justify-between group hover:border-brand-500/40 transition-all duration-300"
              >
                {/* Step Number */}
                <div className="flex items-center justify-between mb-6">
                  <span className="text-3xl font-extrabold font-mono text-brand-500/40 group-hover:text-brand-cyan transition-colors">
                    {item.step}
                  </span>
                  <div className="w-12 h-12 rounded-xl bg-dark-900 border border-white/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Icon className="w-5 h-5 text-brand-400 group-hover:text-brand-cyan" />
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono font-bold text-brand-cyan tracking-wider uppercase mb-1 block">
                    {item.tag}
                  </span>
                  <h3 className="text-xl font-bold text-white mb-2">
                    {item.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {item.desc}
                  </p>
                </div>

                {/* Progress Bar Bottom */}
                <div className="mt-8 pt-4 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
                  <span>Step {idx + 1} of 3</span>
                  <ArrowRight className="w-4 h-4 text-brand-500 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
