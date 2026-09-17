import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Download, RefreshCw, Play, Pause, CheckCircle2, 
  Sparkles, Volume2, VolumeX, ShieldCheck, Share2, Layers, Cpu 
} from 'lucide-react';
import { apiService } from '../services/api';

export default function ComparisonView({ originalVideo, jobResult, onReset }) {
  const originalVidRef = useRef(null);
  const restoredVidRef = useRef(null);
  const containerRef = useRef(null);

  const isImage = jobResult?.output?.mediaType === 'image' || originalVideo?.mediaType === 'image' || ['.jpg', '.jpeg', '.png', '.webp', '.bmp'].some(ext => originalVideo?.filename?.toLowerCase().endsWith(ext));

  const [sliderPosition, setSliderPosition] = useState(50); // percentage 0 - 100
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(jobResult?.output?.duration || originalVideo?.duration || 0);

  // Trigger celebratory confetti on initial load
  useEffect(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6 }
    });
  }, []);

  // Synchronize playback between both video elements (for videos only)
  const togglePlay = () => {
    if (isImage) return;
    const nextPlaying = !isPlaying;
    setIsPlaying(nextPlaying);

    if (originalVidRef.current && restoredVidRef.current) {
      if (nextPlaying) {
        originalVidRef.current.play();
        restoredVidRef.current.play();
      } else {
        originalVidRef.current.pause();
        restoredVidRef.current.pause();
      }
    }
  };

  const handleTimeUpdate = () => {
    if (restoredVidRef.current) {
      setCurrentTime(restoredVidRef.current.currentTime);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (originalVidRef.current) originalVidRef.current.currentTime = time;
    if (restoredVidRef.current) restoredVidRef.current.currentTime = time;
  };

  const toggleMute = () => {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    if (originalVidRef.current) originalVidRef.current.muted = nextMuted;
    if (restoredVidRef.current) restoredVidRef.current.muted = nextMuted;
  };

  // Slider dragging logic (Mouse & Touch)
  const handlePointerDown = () => {
    setIsDraggingSlider(true);
  };

  const handlePointerMove = (e) => {
    if (!isDraggingSlider || !containerRef.current) return;
    if (e.cancelable && e.type === 'touchmove') e.preventDefault();
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = e.touches && e.touches.length > 0 ? e.touches[0].clientX : e.clientX;
    const x = clientX - rect.left;
    const percent = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percent);
  };

  const handlePointerUp = () => {
    setIsDraggingSlider(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const downloadUrl = apiService.getDownloadUrl(jobResult.jobId);
  const outExt = jobResult?.output?.filename?.slice(jobResult.output.filename.lastIndexOf('.')) || (isImage ? '.png' : '.mp4');
  const downloadFilename = `cleanframe_restored${outExt}`;

  return (
    <div 
      className="w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 select-none"
      onMouseMove={handlePointerMove}
      onMouseUp={handlePointerUp}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      {/* Top Banner */}
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs font-semibold mb-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{isImage ? 'Photo' : 'Video'} Restoration Successfully Completed</span>
        </div>
        <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
          Before & After Comparison
        </h2>
        <p className="text-sm text-slate-300 mt-2">
          Drag the interactive slider to compare the original {isImage ? 'photo' : 'footage'} with the AI-restored output.
        </p>
      </motion.div>

      {/* Synchronized Split-Screen Player (Photo or Video) */}
      <div className="relative rounded-3xl glass-panel p-3 sm:p-4 border border-white/10 shadow-2xl bg-dark-950">
        
        <div 
          ref={containerRef}
          className="relative w-full max-h-[70vh] rounded-2xl overflow-hidden bg-black cursor-ew-resize"
          onMouseDown={handlePointerDown}
          onTouchStart={handlePointerDown}
          style={{
            aspectRatio: `${jobResult?.output?.width || originalVideo?.width || 16} / ${jobResult?.output?.height || originalVideo?.height || 9}`,
            touchAction: 'none'
          }}
        >
          {/* Layer 1: Restored (Full Background) */}
          {isImage ? (
            <img
              ref={restoredVidRef}
              crossOrigin="anonymous"
              src={apiService.resolveMediaUrl(jobResult?.output?.imageUrl || jobResult?.output?.videoUrl)}
              alt="Restored Photo"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            />
          ) : (
            <video
              ref={restoredVidRef}
              crossOrigin="anonymous"
              src={apiService.resolveMediaUrl(jobResult?.output?.videoUrl)}
              onTimeUpdate={handleTimeUpdate}
              onEnded={() => setIsPlaying(false)}
              loop
              playsInline
              muted={isMuted}
              className="absolute inset-0 w-full h-full object-contain pointer-events-none"
            />
          )}

          {/* Layer 2: Original (Clipped to Slider Left) */}
          <div 
            className="absolute inset-0 overflow-hidden pointer-events-none select-none"
            style={{ width: `${sliderPosition}%` }}
          >
            {isImage ? (
              <img
                ref={originalVidRef}
                crossOrigin="anonymous"
                src={apiService.resolveMediaUrl(originalVideo?.imageUrl || originalVideo?.videoUrl)}
                alt="Original Photo"
                className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
                style={{
                  width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                  maxWidth: 'none'
                }}
              />
            ) : (
              <video
                ref={originalVidRef}
                crossOrigin="anonymous"
                src={apiService.resolveMediaUrl(originalVideo?.videoUrl)}
                loop
                playsInline
                muted={isMuted}
                className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                style={{
                  width: containerRef.current ? `${containerRef.current.clientWidth}px` : '100%',
                  maxWidth: 'none'
                }}
              />
            )}
          </div>

          {/* Draggable Divider Line & Handle */}
          <div 
            className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_12px_rgba(255,255,255,0.8)] z-30 pointer-events-none"
            style={{ left: `${sliderPosition}%` }}
          >
            {/* Center Handle Button */}
            <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-9 h-9 rounded-full bg-white text-dark-950 font-bold text-xs flex items-center justify-center shadow-2xl border-2 border-brand-500">
              <span className="text-[10px]">◀ ▶</span>
            </div>
          </div>

          {/* Top Badges */}
          <div className="absolute top-4 left-4 z-20 px-3 py-1 rounded-md bg-dark-950/80 backdrop-blur-md border border-white/10 text-xs font-bold text-slate-300">
            BEFORE (ORIGINAL)
          </div>

          <div className="absolute top-4 right-4 z-20 px-3 py-1 rounded-md bg-brand-600/90 backdrop-blur-md border border-brand-400/40 text-xs font-bold text-white shadow-lg flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-brand-cyan" />
            <span>AFTER (RESTORED)</span>
          </div>

        </div>

        {/* Media Controls Bar */}
        {!isImage && (
          <div className="mt-4 px-2 flex flex-col gap-3">
            {/* Progress Seekbar */}
            <input
              type="range"
              min="0"
              max={duration || 100}
              step="0.01"
              value={currentTime}
              onChange={handleSeek}
              className="w-full h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-brand-500"
            />

            <div className="flex items-center justify-between text-xs text-slate-300">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="p-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white shadow-lg transition-colors flex items-center gap-1.5 font-semibold"
                >
                  {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  <span>{isPlaying ? 'Pause' : 'Play Both'}</span>
                </button>

                <button
                  onClick={toggleMute}
                  className="p-2 rounded-lg bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white transition-colors"
                >
                  {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                </button>

                <span className="font-mono text-slate-200">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <div className="hidden sm:flex items-center gap-3 font-mono text-[11px] text-slate-400">
                <span>{jobResult?.output?.width}x{jobResult?.output?.height}</span>
                <span>•</span>
                <span>{jobResult?.output?.strategy || 'Spatial Inpaint'}</span>
                <span>•</span>
                <span className="text-emerald-400">Audio Preserved</span>
              </div>
            </div>
          </div>
        )}

      </div>

      {/* Bottom Actions Bar */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-between gap-4 p-6 rounded-2xl glass-panel border border-white/10">
        <div>
          <h4 className="text-base font-bold text-white flex items-center gap-2">
            <span>Ready for High-Quality Export</span>
            <span className="text-xs font-mono font-normal text-slate-400">
              ({((jobResult?.output?.size || 0) / (1024 * 1024)).toFixed(1)} MB)
            </span>
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            File will remain on temporary storage for 30 minutes.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={onReset}
            className="w-full sm:w-auto px-5 py-3.5 rounded-xl font-semibold text-xs text-slate-300 hover:text-white bg-dark-800 hover:bg-dark-700 border border-white/10 transition-all flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4 text-brand-cyan" />
            <span>Process Another {isImage ? 'Photo' : 'Video'}</span>
          </button>

          <a
            href={downloadUrl}
            download={downloadFilename}
            className="w-full sm:w-auto px-7 py-3.5 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-emerald-600 via-teal-500 to-brand-cyan hover:opacity-95 shadow-xl shadow-emerald-500/20 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" />
            <span>Download Restored {isImage ? 'Photo' : 'Video'}</span>
          </a>
        </div>
      </div>
    </div>
  );
}
