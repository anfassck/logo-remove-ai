import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import fs from 'fs';
import { restorationEngine } from './restorationEngine.js';
import { jobManager } from './jobManager.js';

// Configure static FFmpeg and FFprobe binaries
try {
  if (ffmpegStatic) {
    ffmpeg.setFfmpegPath(ffmpegStatic);
  }
  if (ffprobeStatic && ffprobeStatic.path) {
    ffmpeg.setFfprobePath(ffprobeStatic.path);
  } else if (typeof ffprobeStatic === 'string') {
    ffmpeg.setFfprobePath(ffprobeStatic);
  }
} catch (err) {
  console.warn('Warning: Could not configure static ffmpeg/ffprobe paths:', err.message);
}

class VideoProcessor {
  /**
   * Extract media metadata (resolution, duration, codecs, fps) for video or image
   */
  async getMetadata(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'].includes(ext);

    return new Promise((resolve, reject) => {
      ffmpeg.ffprobe(filePath, (err, metadata) => {
        if (err) return reject(new Error(`Failed to read media metadata: ${err.message}`));

        const videoStream = metadata.streams.find(s => s.codec_type === 'video');
        const audioStream = metadata.streams.find(s => s.codec_type === 'audio');

        if (!videoStream) {
          return reject(new Error('No valid visual stream found in uploaded file.'));
        }

        let fps = 30;
        if (videoStream.avg_frame_rate && videoStream.avg_frame_rate !== '0/0') {
          const [num, den] = videoStream.avg_frame_rate.split('/').map(Number);
          if (den && den > 0) fps = Math.round(num / den);
        }

        const duration = isImage ? 0 : parseFloat(metadata.format.duration || videoStream.duration || 0);
        const width = parseInt(videoStream.width, 10);
        const height = parseInt(videoStream.height, 10);
        const size = parseInt(metadata.format.size || 0, 10);

        resolve({
          mediaType: isImage ? 'image' : 'video',
          width,
          height,
          duration,
          fps: isImage ? 0 : fps,
          codec: videoStream.codec_name,
          hasAudio: isImage ? false : Boolean(audioStream),
          audioCodec: audioStream ? audioStream.codec_name : null,
          bitrate: metadata.format.bit_rate,
          size
        });
      });
    });
  }

  /**
   * Generate video thumbnail at timestamp or use image directly
   */
  async generateThumbnail(filePath, outputFolder, filename) {
    if (!fs.existsSync(outputFolder)) {
      fs.mkdirSync(outputFolder, { recursive: true });
    }

    const ext = path.extname(filename).toLowerCase();
    const isImage = ['.jpg', '.jpeg', '.png', '.webp', '.bmp'].includes(ext);

    if (isImage) {
      return filename;
    }

    const thumbFilename = `thumb_${path.basename(filename, path.extname(filename))}.jpg`;

    return new Promise((resolve, reject) => {
      ffmpeg(filePath)
        .screenshots({
          timestamps: ['00:00:01.000', '10%'],
          folder: outputFolder,
          filename: thumbFilename,
          size: '640x?'
        })
        .on('end', () => {
          resolve(thumbFilename);
        })
        .on('error', (err) => {
          console.warn('Thumbnail generation warning:', err.message);
          resolve(null);
        });
    });
  }

  /**
   * Main media restoration workflow (Image & Video)
   */
  async processJob(jobId) {
    const job = jobManager.getJob(jobId);
    if (!job) throw new Error(`Job ${jobId} not found.`);

    try {
      jobManager.setProgress(jobId, 10, 'Analyzing media streams and coordinates...', 'extracting');

      const inputPath = job.input.filepath;
      const metadata = await this.getMetadata(inputPath);
      const isImage = metadata.mediaType === 'image';
      
      const strategy = restorationEngine.getRestorationStrategy({
        engine: job.engine,
        maskData: job.maskData
      });

      const outputsDir = path.resolve('outputs');
      if (!fs.existsSync(outputsDir)) {
        fs.mkdirSync(outputsDir, { recursive: true });
      }

      const inputExt = path.extname(inputPath).toLowerCase();
      const outputExt = isImage ? inputExt : '.mp4';
      const outputFilename = `restored_${job.input.fileId}${outputExt}`;
      const outputPath = path.join(outputsDir, outputFilename);

      jobManager.setProgress(jobId, 25, `Applying ${strategy.name}...`, 'restoring');

      const filterString = restorationEngine.buildFilterGraph(strategy.type, job.maskData, {
        videoWidth: metadata.width,
        videoHeight: metadata.height
      });

      console.log(`[VideoProcessor] Job ${jobId} (${isImage ? 'Image' : 'Video'}): Filter "${filterString}"`);

      if (isImage) {
        // Instant Single-Frame High-Resolution Image Inpainting / Delogo
        await new Promise((resolve, reject) => {
          ffmpeg(inputPath)
            .videoFilters(filterString)
            .outputOptions(['-update 1', '-frames:v 1', '-y'])
            .save(outputPath)
            .on('start', (cmdline) => {
              console.log(`[FFmpeg Image] Started: ${cmdline}`);
              jobManager.setProgress(jobId, 50, 'Restoring high-res image pixels...', 'restoring');
            })
            .on('end', () => {
              jobManager.setProgress(jobId, 95, 'Finalizing restored image...', 'rendering');
              resolve();
            })
            .on('error', (err) => {
              console.error('[FFmpeg Image] Error:', err.message);
              reject(new Error(`Image restoration failed: ${err.message}`));
            });
        });
      } else {
        // High-Quality Multi-Frame Video Restoration
        await new Promise((resolve, reject) => {
          let command = ffmpeg(inputPath);

          if (strategy.type === 'smart_blend') {
            command = command.complexFilter(filterString);
          } else {
            command = command.videoFilters(filterString);
          }

          command = command
            .videoCodec('libx264')
            .outputOptions([
              '-preset veryfast',
              '-crf 20',
              '-threads 2',
              '-pix_fmt yuv420p',
              '-movflags +faststart',
              '-max_muxing_queue_size 1024'
            ]);

          // Preserve or encode audio
          if (metadata.hasAudio) {
            command = command.audioCodec('aac').audioBitrate('192k');
          } else {
            command = command.noAudio();
          }

          command
            .on('start', (cmdline) => {
              console.log(`[FFmpeg Video] Started: ${cmdline}`);
              jobManager.setProgress(jobId, 35, 'Restoring video frames...', 'restoring');
            })
            .on('progress', (progress) => {
              if (progress && progress.percent) {
                const mappedProgress = 35 + (progress.percent * 0.55);
                jobManager.setProgress(
                  jobId,
                  Math.min(90, mappedProgress),
                  `Restoring frames: ${Math.round(progress.percent)}% complete`
                );
              }
            })
            .on('end', () => {
              jobManager.setProgress(jobId, 95, 'Finalizing and verifying video stream...', 'rendering');
              resolve();
            })
            .on('error', (err, stdout, stderr) => {
              console.error('[FFmpeg Video] Error:', err.message, stderr);
              reject(new Error(`Video processing failed: ${err.message}`));
            })
            .save(outputPath);
        });
      }

      // Verify output file exists and has size
      const outStats = fs.statSync(outputPath);
      if (outStats.size === 0) {
        throw new Error('Generated output file is empty.');
      }

      // Generate thumbnail for output video or use output image directly
      const outThumbFilename = isImage ? outputFilename : await this.generateThumbnail(outputPath, outputsDir, outputFilename);

      const outputData = {
        fileId: `out_${job.input.fileId}`,
        filename: outputFilename,
        filepath: outputPath,
        mediaType: isImage ? 'image' : 'video',
        size: outStats.size,
        thumbnail: outThumbFilename,
        width: metadata.width,
        height: metadata.height,
        duration: metadata.duration,
        strategy: strategy.name,
        isAiActive: strategy.isAiActive,
        devNotice: strategy.devNotice || null
      };

      jobManager.completeJob(jobId, outputData);
      console.log(`[VideoProcessor] Job ${jobId} completed successfully.`);
      return outputData;

    } catch (error) {
      console.error(`[VideoProcessor] Job ${jobId} failed:`, error);
      jobManager.failJob(jobId, error.message);
      throw error;
    }
  }
}

export const videoProcessor = new VideoProcessor();
