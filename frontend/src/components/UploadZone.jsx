import React, { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  UploadCloud, Film, AlertCircle, FileVideo, FileImage, 
  CheckCircle2, ShieldCheck, PlayCircle, Loader2, Sparkles, 
  Video, Image as ImageIcon, Camera 
} from 'lucide-react';

export default function UploadZone({ onFileSelect, isUploading, uploadProgress, limits, error, onClearError }) {
  const [activeTab, setActiveTab] = useState('video'); // 'video' | 'image'
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const maxMB = limits?.maxFileSizeMB || 100;

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const validateAndPassFile = (file) => {
    if (onClearError) onClearError();
    if (!file) return;

    // Check size
    const fileSizeMB = file.size / (1024 * 1024);
    if (fileSizeMB > maxMB) {
      alert(`File size (${fileSizeMB.toFixed(1)} MB) exceeds the maximum allowed limit of ${maxMB} MB.`);
      return;
    }

    const videoExts = ['.mp4', '.mov', '.webm', '.mkv'];
    const imageExts = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'];
    const fileName = file.name.toLowerCase();
    
    const isVid = videoExts.some(ext => fileName.endsWith(ext)) || file.type.startsWith('video/');
    const isImg = imageExts.some(ext => fileName.endsWith(ext)) || file.type.startsWith('image/');

    if (activeTab === 'video') {
      if (!isVid && isImg) {
        // User uploaded image on video tab -> auto switch to image tab
        setActiveTab('image');
      } else if (!isVid && !isImg) {
        alert('Please upload a valid video file (.mp4, .mov, or .webm).');
        return;
      }
    } else {
      if (!isImg && isVid) {
        // User uploaded video on image tab -> auto switch to video tab
        setActiveTab('video');
      } else if (!isImg && !isVid) {
        alert('Please upload a valid image file (.png, .jpg, or .webp).');
        return;
      }
    }

    onFileSelect(file);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      validateAndPassFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndPassFile(e.target.files[0]);
    }
  };

  // Create a synthetic sample demo image with a watermark for instant testing
  const createSampleDemoImage = () => {
    if (onClearError) onClearError();
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 1280;
      canvas.height = 720;
      const ctx = canvas.getContext('2d');

      // Realistic background scene gradient
      const grad = ctx.createLinearGradient(0, 0, 1280, 720);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e1b4b');
      grad.addColorStop(1, '#090d16');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 1280, 720);

      // Decorative shapes
      ctx.fillStyle = '#6366f1';
      ctx.beginPath();
      ctx.arc(400, 360, 180, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(880, 360, 120, 0, Math.PI * 2);
      ctx.fill();

      // Heading
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 36px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('CleanFrame AI • Image Watermark Demo', 640, 320);

      ctx.font = '20px sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Select the logo in the corner to test instant high-res photo inpainting', 640, 370);

      // Watermark in bottom right
      const wmX = 1280 - 180;
      const wmY = 720 - 90;
      
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.font = 'bold 38px sans-serif';
      ctx.textAlign = 'left';
      ctx.fillText('✦', wmX, wmY + 40);

      ctx.font = 'bold 22px sans-serif';
      ctx.fillText('Gemini', wmX + 45, wmY + 36);

      canvas.toBlob((blob) => {
        if (blob) {
          const sampleFile = new File([blob], 'cleanframe_sample_photo.png', { type: 'image/png' });
          onFileSelect(sampleFile);
        }
      }, 'image/png');
    } catch (err) {
      console.error('Failed to generate sample image:', err);
    }
  };

  // Create a synthetic sample video canvas & record a 3-second sample WebM for instant testing
  const createSampleDemoVideo = async () => {
    if (onClearError) onClearError();
    try {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 360;
      const ctx = canvas.getContext('2d');
      const stream = canvas.captureStream(30);
      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
      const chunks = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunks.push(e.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(chunks, { type: 'video/webm' });
        const sampleFile = new File([blob], 'cleanframe_sample_test.webm', { type: 'video/webm' });
        onFileSelect(sampleFile);
      };

      mediaRecorder.start();

      let frame = 0;
      const totalFrames = 90; // 3 seconds at 30 fps

      const renderFrame = () => {
        if (frame >= totalFrames) {
          mediaRecorder.stop();
          return;
        }

        // Draw animated background
        const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
        const hue = (frame * 2) % 360;
        gradient.addColorStop(0, `hsl(${hue}, 60%, 20%)`);
        gradient.addColorStop(1, `hsl(${(hue + 60) % 360}, 70%, 10%)`);
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Animated bouncing ball
        const x = 100 + Math.sin(frame * 0.1) * 80;
        const y = 180 + Math.cos(frame * 0.1) * 50;
        ctx.beginPath();
        ctx.arc(x, y, 30, 0, Math.PI * 2);
        ctx.fillStyle = '#6366F1';
        ctx.fill();
        ctx.lineWidth = 3;
        ctx.strokeStyle = '#06B6D4';
        ctx.stroke();

        // Title
        ctx.font = 'bold 22px sans-serif';
        ctx.fillStyle = '#FFFFFF';
        ctx.textAlign = 'center';
        ctx.fillText('CleanFrame AI Demo Footage', canvas.width / 2, 80);

        ctx.font = '14px sans-serif';
        ctx.fillStyle = '#94A3B8';
        ctx.fillText('Select the logo box below to test watermark removal', canvas.width / 2, 110);

        // Realistic Gemini Video Logo to remove in top-right corner
        const wmX = canvas.width - 145;
        const wmY = 20;
        const wmW = 125;
        const wmH = 40;

        // Semi-transparent pill background
        ctx.fillStyle = 'rgba(15, 23, 42, 0.75)';
        ctx.beginPath();
        ctx.roundRect(wmX, wmY, wmW, wmH, 8);
        ctx.fill();
        ctx.lineWidth = 1;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
        ctx.stroke();

        // Gemini Star / Sparkle icon
        ctx.fillStyle = '#38BDF8';
        ctx.font = 'bold 16px sans-serif';
        ctx.fillText('✦', wmX + 18, wmY + 25);

        // Gemini text
        ctx.fillStyle = '#FFFFFF';
        ctx.font = '600 13px sans-serif';
        ctx.textAlign = 'left';
        ctx.fillText('Gemini', wmX + 32, wmY + 25);

        frame++;
        requestAnimationFrame(renderFrame);
      };

      renderFrame();
    } catch (err) {
      console.error('Failed to generate sample video:', err);
      alert('Could not generate sample video in this browser. Please upload an MP4/WebM/Image file.');
    }
  };

  return (
    <div id="upload-section" className="w-full max-w-4xl mx-auto px-4">
      {/* Error Alert if any */}
      {error && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-3 text-rose-300 text-sm"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-rose-400" />
          <div className="flex-1">
            <p className="font-semibold text-rose-200">Upload Error</p>
            <p className="text-xs text-rose-300/90 mt-0.5">{error}</p>
          </div>
          <button 
            onClick={onClearError}
            className="text-xs text-rose-400 hover:text-white px-2 py-1 bg-rose-500/20 rounded"
          >
            Dismiss
          </button>
        </motion.div>
      )}

      {/* MODE SELECTOR TABS: VIDEO vs PHOTO */}
      <div className="flex items-center justify-center mb-6">
        <div className="p-1.5 rounded-2xl bg-dark-900/90 border border-white/10 shadow-2xl backdrop-blur-xl flex items-center gap-2">
          
          {/* Video Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`relative px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 ${
              activeTab === 'video'
                ? 'text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {activeTab === 'video' && (
              <motion.div
                layoutId="activeUploadTab"
                className="absolute inset-0 bg-gradient-to-r from-brand-600 to-brand-500 rounded-xl shadow-lg shadow-brand-500/25 border border-brand-400/30"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Video className="w-4 h-4 text-brand-cyan" />
              <span>Video Remover</span>
            </span>
          </button>

          {/* Photo Tab */}
          <button
            type="button"
            onClick={() => setActiveTab('image')}
            className={`relative px-6 py-3 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2.5 ${
              activeTab === 'image'
                ? 'text-white shadow-lg'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            {activeTab === 'image' && (
              <motion.div
                layoutId="activeUploadTab"
                className="absolute inset-0 bg-gradient-to-r from-emerald-600 via-teal-500 to-brand-cyan rounded-xl shadow-lg shadow-emerald-500/25 border border-emerald-400/30"
                transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
              />
            )}
            <span className="relative z-10 flex items-center gap-2">
              <Camera className="w-4 h-4 text-emerald-300" />
              <span>Photo Remover</span>
            </span>
          </button>

        </div>
      </div>

      {/* Main Upload Dropzone */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !isUploading && fileInputRef.current?.click()}
        className={`relative group rounded-3xl p-8 sm:p-14 text-center cursor-pointer transition-all duration-300 border-2 ${
          isDragOver
            ? activeTab === 'video' ? 'border-brand-cyan bg-brand-500/10 shadow-2xl shadow-brand-cyan/20 scale-[1.01]' : 'border-emerald-400 bg-emerald-500/10 shadow-2xl shadow-emerald-500/20 scale-[1.01]'
            : activeTab === 'video' ? 'border-white/10 hover:border-brand-500/50 glass-panel glass-panel-hover' : 'border-white/10 hover:border-emerald-500/50 glass-panel glass-panel-hover'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={activeTab === 'video' ? "video/mp4,video/quicktime,video/webm,video/x-matroska,.mp4,.mov,.webm,.mkv" : "image/jpeg,image/png,image/webp,image/bmp,.jpg,.jpeg,.png,.webp,.bmp"}
          onChange={handleFileInputChange}
          className="hidden"
          disabled={isUploading}
        />

        {/* Scanning line animation when drag active */}
        {isDragOver && (
          <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-brand-cyan to-transparent animate-scanner pointer-events-none"></div>
        )}

        {isUploading ? (
          /* Uploading state */
          <div className="py-6 flex flex-col items-center">
            <div className="relative w-20 h-20 mb-6">
              <div className="absolute inset-0 rounded-full border-4 border-brand-500/20 animate-ping"></div>
              <div className="w-full h-full rounded-full border-4 border-brand-cyan border-t-transparent animate-spin flex items-center justify-center"></div>
              <Loader2 className="w-8 h-8 text-brand-400 absolute inset-0 m-auto animate-pulse" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">
              Uploading & Inspecting {activeTab === 'video' ? 'Video' : 'Photo'}...
            </h3>
            <p className="text-xs text-slate-400 max-w-sm mb-6">
              {activeTab === 'video'
                ? 'Reading video codec, duration, and generating high-res studio preview.'
                : 'Analyzing image dimensions, color profiles, and preparing studio inpainter.'}
            </p>

            {/* Progress Bar */}
            <div className="w-full max-w-md bg-dark-900 rounded-full h-3.5 p-0.5 border border-white/10 overflow-hidden relative">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  activeTab === 'video'
                    ? 'bg-gradient-to-r from-brand-600 via-brand-cyan to-brand-violet'
                    : 'bg-gradient-to-r from-emerald-600 via-teal-400 to-brand-cyan'
                }`}
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <span className="text-xs font-mono font-bold text-brand-300 mt-2">
              {uploadProgress}%
            </span>
          </div>
        ) : (
          /* Idle upload zone state */
          <div className="flex flex-col items-center">
            {/* Upload Icon with Floating Rings */}
            <div className="relative w-24 h-24 mb-6 flex items-center justify-center">
              <div className={`absolute inset-0 rounded-2xl blur-xl transition-all ${
                activeTab === 'video'
                  ? 'bg-brand-500/20 group-hover:bg-brand-500/30'
                  : 'bg-emerald-500/20 group-hover:bg-emerald-500/30'
              }`}></div>
              <div className="relative w-20 h-20 rounded-2xl bg-gradient-to-br from-dark-800 to-dark-900 border border-white/15 flex items-center justify-center group-hover:scale-105 transition-all duration-300 shadow-xl">
                {activeTab === 'video' ? (
                  <Video className="w-10 h-10 text-brand-400 group-hover:text-brand-cyan transition-colors" />
                ) : (
                  <ImageIcon className="w-10 h-10 text-emerald-400 group-hover:text-teal-300 transition-colors" />
                )}
              </div>
            </div>

            {/* Primary Text */}
            <h3 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {activeTab === 'video' ? 'Drop your video here' : 'Drop your photo here'}
            </h3>
            <p className="text-sm text-slate-400 mt-2 font-medium">
              or <span className={`font-semibold underline underline-offset-4 ${
                activeTab === 'video' ? 'text-brand-400 group-hover:text-brand-300' : 'text-emerald-400 group-hover:text-emerald-300'
              }`}>click to browse {activeTab === 'video' ? 'video' : 'photo'}</span> from your device
            </p>

            {/* Badges / Constraints */}
            <div className="mt-8 flex flex-wrap items-center justify-center gap-2 sm:gap-3 text-xs">
              {activeTab === 'video' ? (
                <>
                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1.5 font-mono">
                    <FileVideo className="w-3.5 h-3.5 text-brand-400" />
                    <span>MP4, MOV, WebM, MKV</span>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1.5">
                    <span>Max size: <strong className="text-white">{maxMB} MB</strong></span>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1.5">
                    <span>Max duration: <strong className="text-white">{limits?.maxDurationSec || 300}s</strong></span>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-emerald-300 flex items-center gap-1.5">
                    <span>Audio Preserved</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1.5 font-mono">
                    <FileImage className="w-3.5 h-3.5 text-emerald-400" />
                    <span>PNG, JPG, JPEG, WEBP, BMP</span>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-slate-300 flex items-center gap-1.5">
                    <span>Max size: <strong className="text-white">{maxMB} MB</strong></span>
                  </div>

                  <div className="px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-emerald-300 flex items-center gap-1.5">
                    <span>Lossless Pixel Restoration</span>
                  </div>
                </>
              )}
            </div>

            {/* Privacy Promise */}
            <div className="mt-6 flex items-center gap-2 text-xs text-slate-400">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Temporary processing • Files deleted automatically after 30 mins</span>
            </div>
          </div>
        )}
      </div>

      {/* Quick Test Demo Buttons */}
      {!isUploading && (
        <div className="mt-6 text-center flex flex-wrap items-center justify-center gap-3">
          <div className="inline-flex flex-wrap items-center justify-center gap-3 p-2 px-4 rounded-xl bg-dark-900/90 border border-white/10 shadow-lg">
            <span className="text-xs text-slate-400">Try instant demo:</span>
            
            {activeTab === 'video' ? (
              <button
                onClick={createSampleDemoVideo}
                className="text-xs font-semibold text-brand-300 hover:text-white bg-brand-500/20 hover:bg-brand-500/30 px-3.5 py-1.5 rounded-lg border border-brand-500/30 transition-all flex items-center gap-1.5 group"
              >
                <PlayCircle className="w-3.5 h-3.5 text-brand-cyan group-hover:scale-110 transition-transform" />
                <span>Generate Sample Video</span>
              </button>
            ) : (
              <button
                onClick={createSampleDemoImage}
                className="text-xs font-semibold text-emerald-300 hover:text-white bg-emerald-500/20 hover:bg-emerald-500/30 px-3.5 py-1.5 rounded-lg border border-emerald-500/30 transition-all flex items-center gap-1.5 group"
              >
                <Sparkles className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                <span>Generate Sample Photo</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
