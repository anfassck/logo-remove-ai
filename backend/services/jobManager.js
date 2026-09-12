import fs from 'fs';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';

class JobManager {
  constructor() {
    this.jobs = new Map();
    this.queue = [];
    this.runningCount = 0;
    this.maxConcurrent = parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10);
    this.expiryMinutes = parseInt(process.env.FILE_EXPIRY_MINUTES || '30', 10);
    
    // Start auto-cleanup timer every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanupExpiredJobs();
    }, 5 * 60 * 1000);
  }

  createJob(data) {
    const jobId = uuidv4();
    const job = {
      jobId,
      status: 'queued',
      progress: 5,
      step: 'Job queued in restoration engine',
      input: data.input, // { fileId, filepath, filename, originalName, width, height, duration }
      maskData: data.maskData, // { x, y, width, height, type, brushMask, feather }
      engine: data.engine || 'delogo',
      output: null,
      error: null,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.jobs.set(jobId, job);
    return job;
  }

  getJob(jobId) {
    return this.jobs.get(jobId) || null;
  }

  updateJob(jobId, updates) {
    const job = this.jobs.get(jobId);
    if (!job) return null;

    Object.assign(job, updates, { updatedAt: new Date() });
    this.jobs.set(jobId, job);
    return job;
  }

  setProgress(jobId, progress, step, status = null) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = Math.min(100, Math.max(0, Math.round(progress)));
    if (step) job.step = step;
    if (status) job.status = status;
    job.updatedAt = new Date();
  }

  completeJob(jobId, outputData) {
    return this.updateJob(jobId, {
      status: 'completed',
      progress: 100,
      step: 'Video restoration complete!',
      output: outputData,
      completedAt: new Date()
    });
  }

  failJob(jobId, errorMessage) {
    return this.updateJob(jobId, {
      status: 'failed',
      step: 'Processing failed',
      error: errorMessage,
      failedAt: new Date()
    });
  }

  deleteJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return false;

    // Remove output files
    if (job.output?.filepath && fs.existsSync(job.output.filepath)) {
      try {
        fs.unlinkSync(job.output.filepath);
      } catch (err) {
        console.error(`Failed to delete output file for job ${jobId}:`, err);
      }
    }

    this.jobs.delete(jobId);
    return true;
  }

  cleanupExpiredJobs() {
    const now = Date.now();
    const expiryMs = this.expiryMinutes * 60 * 1000;

    for (const [jobId, job] of this.jobs.entries()) {
      const age = now - new Date(job.createdAt).getTime();
      if (age > expiryMs) {
        console.log(`[JobManager] Expiring old job ${jobId}`);
        this.deleteJob(jobId);
      }
    }

    // Clean orphan files in uploads and outputs
    this.cleanupOrphanFiles();
  }

  cleanupOrphanFiles() {
    const dirs = [
      path.resolve('uploads'),
      path.resolve('outputs'),
      path.resolve('temp')
    ];

    const now = Date.now();
    const expiryMs = this.expiryMinutes * 60 * 1000;

    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;

      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file === '.gitkeep') continue;
          try {
            const filePath = path.join(dir, file);
            if (!fs.existsSync(filePath)) continue;
            const stats = fs.statSync(filePath);
            if (now - stats.mtimeMs > expiryMs) {
              if (stats.isDirectory()) {
                fs.rmSync(filePath, { recursive: true, force: true });
              } else {
                fs.unlinkSync(filePath);
              }
            }
          } catch (fileErr) {
            // Ignore locked or concurrently deleted files
          }
        }
      } catch (err) {
        // Ignore directory read errors
      }
    }
  }
}

export const jobManager = new JobManager();
