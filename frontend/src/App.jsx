import React, { useState, useEffect, useRef } from 'react';
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import UploadZone from './components/UploadZone';
import VideoEditor from './components/VideoEditor';
import ProcessingView from './components/ProcessingView';
import ComparisonView from './components/ComparisonView';
import Features from './components/Features';
import HowItWorks from './components/HowItWorks';
import PrivacyBanner from './components/PrivacyBanner';
import FAQ from './components/FAQ';
import Footer from './components/Footer';
import { apiService } from './services/api';
import { cleanGeminiImageBrowser } from './services/geminiCleaner';

export default function App() {
  // App state modes: 'idle' | 'editor' | 'processing' | 'comparison'
  const [viewMode, setViewMode] = useState('idle');
  
  // Video & Job Data
  const [videoData, setVideoData] = useState(null);
  const [currentJob, setCurrentJob] = useState(null);
  const [jobResult, setJobResult] = useState(null);

  // Upload state
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState(null);

  // Backend limits
  const [serverLimits, setServerLimits] = useState({
    maxFileSizeMB: 200,
    maxDurationSec: 300,
    maxConcurrentJobs: 3,
    fileExpiryMinutes: 30
  });

  const pollIntervalRef = useRef(null);

  // Fetch backend limits on mount
  useEffect(() => {
    apiService.getConfig().then(data => {
      if (data?.limits) {
        setServerLimits({
          ...data.limits,
          maxFileSizeMB: Math.max(200, data.limits.maxFileSizeMB || 200)
        });
      }
    }).catch(err => {
      console.warn('Could not fetch server limits:', err);
    });

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Handle Video / Photo Upload
  const handleFileSelect = async (file) => {
    setErrorMessage(null);

    const isImg = file.type.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.webp', '.bmp'].some(ext => file.name.toLowerCase().endsWith(ext));

    // =========================================================================
    // 100% AUTOMATIC ZERO-BLUR GEMINI REMOVAL (LIKE geminiwatermarkremover.io)
    // No square box selection needed! Automatically detects & unblends star.
    // =========================================================================
    if (isImg) {
      setViewMode('processing');
      setCurrentJob({
        status: 'processing',
        progress: 45,
        step: '✨ Auto-detecting and removing Gemini watermark with Reverse Alpha Blending (Zero Blur)...'
      });

      try {
        const cleaned = await cleanGeminiImageBrowser(file);
        
        // Also upload original to backend so user can switch to manual editor if desired
        apiService.uploadVideo(file, () => {}).then(res => {
          if (res?.video) {
            setVideoData(res.video);
          }
        }).catch(() => {});

        setJobResult({
          jobId: 'local_' + Date.now(),
          isImage: true,
          cleanUrl: cleaned.cleanUrl,
          output: {
            filename: `clean_${file.name.replace(/\\.[^.]+$/, '')}.png`,
            imageUrl: cleaned.cleanUrl,
            videoUrl: cleaned.cleanUrl,
            mediaType: 'image',
            width: cleaned.width,
            height: cleaned.height
          },
          meta: cleaned.meta
        });

        setVideoData({
          filename: file.name,
          originalName: file.name,
          imageUrl: cleaned.originalUrl,
          videoUrl: cleaned.originalUrl,
          mediaType: 'image',
          width: cleaned.width,
          height: cleaned.height,
          size: file.size
        });

        setViewMode('comparison');
        return;
      } catch (clientErr) {
        console.warn('Browser cleaning failed, falling back to manual studio:', clientErr);
      }
    }

    // =========================================================================
    // 100% AUTOMATIC ZERO-BLUR VIDEO REMOVAL (NO BOX SELECTION NEEDED)
    // Automatically uploads, detects watermark location, and unblends frames.
    // =========================================================================
    setIsUploading(true);
    setUploadProgress(0);

    try {
      const response = await apiService.uploadVideo(file, (percent) => {
        setUploadProgress(percent);
      });

      if (response.success && response.video) {
        setVideoData(response.video);
        setIsUploading(false);

        // Automatically launch zero-blur restoration without opening manual box editor
        handleStartProcess({
          filename: response.video.filename,
          masks: [],
          engine: 'gemini_zero_blur'
        });
      } else {
        throw new Error(response.error || 'Upload failed.');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      setErrorMessage(err.message || 'An error occurred during upload. Please check your network and backend.');
      setIsUploading(false);
    }
  };

  // Start Restoration Job
  const handleStartProcess = async (processPayload) => {
    setErrorMessage(null);
    setViewMode('processing');
    setCurrentJob({
      status: 'queued',
      progress: 5,
      step: 'Initializing restoration engine...'
    });

    try {
      const startRes = await apiService.startProcessing(processPayload);
      const jobId = startRes.jobId;

      // Start Polling Job Status
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);

      let consecutiveFailures = 0;
      pollIntervalRef.current = setInterval(async () => {
        try {
          const job = await apiService.getJobStatus(jobId);
          consecutiveFailures = 0;
          setCurrentJob(job);

          if (job.status === 'completed') {
            clearInterval(pollIntervalRef.current);
            setJobResult(job);
            setViewMode('comparison');
            // Smooth scroll to comparison
            setTimeout(() => {
              window.scrollTo({ top: 100, behavior: 'smooth' });
            }, 100);
          } else if (job.status === 'failed') {
            clearInterval(pollIntervalRef.current);
            setErrorMessage(job.error || 'Video restoration failed.');
            setViewMode('idle');
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
          consecutiveFailures++;
          // If server fails 8 times consecutively (e.g. server restarted or OOM), notify user
          if (consecutiveFailures >= 8) {
            clearInterval(pollIntervalRef.current);
            setErrorMessage('The cloud server was temporarily interrupted or restarted. Please try again.');
            setViewMode('idle');
          }
        }
      }, 1000);

    } catch (err) {
      console.error('Process Error:', err);
      setErrorMessage(err.message || 'Failed to start video restoration process.');
      setViewMode('idle');
    }
  };

  // Auto-clean Gemini Image without box
  const handleAutoClean = () => {
    if (!videoData) return;
    handleStartProcess({
      filename: videoData.filename,
      masks: [],
      engine: 'gemini_zero_blur'
    });
  };

  // Reset Workflow
  const handleReset = () => {
    if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    setViewMode('idle');
    setVideoData(null);
    setCurrentJob(null);
    setJobResult(null);
    setErrorMessage(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const scrollToUpload = () => {
    const el = document.getElementById('upload-section');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  const scrollToHowItWorks = () => {
    const el = document.getElementById('how-it-works');
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen flex flex-col bg-dark-950 text-slate-100 font-sans selection:bg-brand-500 selection:text-white">
      {/* Navigation */}
      <Navbar onStartClick={scrollToUpload} />

      {/* Main App Content View Switcher */}
      <main className="flex-1">
        {viewMode === 'idle' && (
          <>
            <Hero onUploadClick={scrollToUpload} onLearnMoreClick={scrollToHowItWorks} />

            <section className="py-12">
              <UploadZone
                onFileSelect={handleFileSelect}
                isUploading={isUploading}
                uploadProgress={uploadProgress}
                limits={serverLimits}
                error={errorMessage}
                onClearError={() => setErrorMessage(null)}
              />
            </section>

            <HowItWorks />
            <Features />
            <PrivacyBanner />
            <FAQ />
          </>
        )}

        {viewMode === 'editor' && videoData && (
          <section id="studio-section" className="py-8">
            {errorMessage && (
              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-4">
                <div className="p-4 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-sm font-semibold flex items-center justify-between shadow-lg">
                  <span>⚠️ {errorMessage}</span>
                  <button 
                    onClick={() => setErrorMessage(null)} 
                    className="ml-4 text-xs underline hover:text-white"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}
            <VideoEditor
              videoData={videoData}
              onProcess={handleStartProcess}
              onReset={handleReset}
              onAutoClean={handleAutoClean}
            />
          </section>
        )}

        {viewMode === 'processing' && (
          <section className="py-12">
            <ProcessingView
              job={currentJob}
              videoData={videoData}
              onCancel={handleReset}
            />
          </section>
        )}

        {viewMode === 'comparison' && jobResult && (
          <section className="py-8">
            <ComparisonView
              originalVideo={videoData}
              jobResult={jobResult}
              onReset={handleReset}
              onEditManual={() => setViewMode('editor')}
            />
          </section>
        )}
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
