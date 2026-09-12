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
    maxFileSizeMB: 100,
    maxDurationSec: 300,
    maxConcurrentJobs: 3,
    fileExpiryMinutes: 30
  });

  const pollIntervalRef = useRef(null);

  // Fetch backend limits on mount
  useEffect(() => {
    apiService.getConfig().then(data => {
      if (data?.limits) {
        setServerLimits(data.limits);
      }
    }).catch(err => {
      console.warn('Could not fetch server limits:', err);
    });

    return () => {
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
    };
  }, []);

  // Handle Video Upload
  const handleFileSelect = async (file) => {
    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    try {
      const response = await apiService.uploadVideo(file, (percent) => {
        setUploadProgress(percent);
      });

      if (response.success && response.video) {
        setVideoData(response.video);
        setViewMode('editor');
        // Smooth scroll to editor
        setTimeout(() => {
          const editorElement = document.getElementById('studio-section');
          if (editorElement) {
            editorElement.scrollIntoView({ behavior: 'smooth' });
          }
        }, 100);
      } else {
        throw new Error(response.error || 'Upload failed.');
      }
    } catch (err) {
      console.error('Upload Error:', err);
      setErrorMessage(err.message || 'An error occurred during video upload. Please check your network and backend.');
    } finally {
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

      pollIntervalRef.current = setInterval(async () => {
        try {
          const job = await apiService.getJobStatus(jobId);
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
            setViewMode('editor');
          }
        } catch (pollErr) {
          console.error('Polling error:', pollErr);
        }
      }, 1000);

    } catch (err) {
      console.error('Process Error:', err);
      setErrorMessage(err.message || 'Failed to start video restoration process.');
      setViewMode('editor');
    }
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
            <VideoEditor
              videoData={videoData}
              onProcess={handleStartProcess}
              onReset={handleReset}
            />
          </section>
        )}

        {viewMode === 'processing' && (
          <section className="py-12">
            <ProcessingView
              job={currentJob}
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
            />
          </section>
        )}
      </main>

      {/* Global Footer */}
      <Footer />
    </div>
  );
}
