import React, { useState } from 'react';
import { ChevronDown, HelpCircle } from 'lucide-react';

const FAQS = [
  {
    q: 'Is CleanFrame AI free?',
    a: 'Yes! CleanFrame AI is completely free to use during our beta development period. There are no subscriptions, paywalls, or hidden watermarks added to your output video.'
  },
  {
    q: 'Which video formats are supported?',
    a: 'We support standard MP4, MOV, WebM, and MKV video formats. The output video is encoded in universally compatible MP4 (H.264 / AAC) with web faststart streaming enabled.'
  },
  {
    q: 'Does the tool work on long videos?',
    a: 'Yes, CleanFrame AI handles video clips up to 5 minutes (300 seconds) and 100 MB per file during the free beta to ensure fast processing and optimal server availability.'
  },
  {
    q: 'Are my uploaded videos stored permanently?',
    a: 'No. All uploaded raw footage and rendered outputs are stored strictly in temporary memory/disk and are automatically purged after 30 minutes. We do not use your videos for AI training.'
  },
  {
    q: 'Can I select the exact area to restore?',
    a: 'Yes! You can use our interactive bounding box tool or freehand brush to mark the exact watermark coordinates. You can also adjust edge feathering and preview the mask before processing.'
  },
  {
    q: 'Does it preserve audio?',
    a: 'Yes. The restoration pipeline extracts the original multi-channel audio stream (AAC, MP3, Opus) and muxes it synchronously back into your restored MP4 video with lossless quality.'
  }
];

export default function FAQ() {
  const [openIndex, setOpenIndex] = useState(0);

  const toggle = (idx) => {
    setOpenIndex(openIndex === idx ? -1 : idx);
  };

  return (
    <section id="faq" className="py-20 relative">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center mb-16">
          <span className="px-3.5 py-1 rounded-full text-xs font-semibold bg-brand-violet/10 text-brand-violet border border-brand-violet/20 uppercase tracking-wider">
            Got Questions?
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mt-4">
            Frequently Asked Questions
          </h2>
          <p className="text-slate-300 text-sm sm:text-base mt-3">
            Everything you need to know about CleanFrame AI video restoration.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-4">
          {FAQS.map((faq, idx) => {
            const isOpen = openIndex === idx;

            return (
              <div
                key={idx}
                className="rounded-2xl glass-panel border border-white/10 overflow-hidden transition-colors"
              >
                <button
                  onClick={() => toggle(idx)}
                  className="w-full p-6 text-left flex items-center justify-between gap-4 focus:outline-none"
                >
                  <span className="font-bold text-white text-base sm:text-lg">
                    {faq.q}
                  </span>
                  <div className={`p-2 rounded-lg bg-dark-900 border border-white/5 transition-transform duration-300 ${isOpen ? 'rotate-180 bg-brand-500/20 text-brand-300' : 'text-slate-400'}`}>
                    <ChevronDown className="w-4 h-4" />
                  </div>
                </button>

                {isOpen && (
                  <div className="px-6 pb-6 pt-1 text-slate-300 text-sm leading-relaxed border-t border-white/5">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
