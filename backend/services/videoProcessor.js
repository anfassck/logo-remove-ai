import ffmpeg from 'fluent-ffmpeg';
import ffmpegStatic from 'ffmpeg-static';
import ffprobeStatic from 'ffprobe-static';
import path from 'path';
import fs from 'fs';
import { spawn } from 'child_process';
import { restorationEngine } from './restorationEngine.js';
import { pixelRestorer } from './pixelRestorer.js';
import { jobManager } from './jobManager.js';
import { getAlphaMapForSize, unblendRegion, removeGeminiWatermarkRaw } from './geminiRestorer.js';

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
      const outputExt = isImage ? '.png' : '.mp4';
      let outputFilename = `restored_${job.input.fileId}${outputExt}`;
      let outputPath = path.join(outputsDir, outputFilename);

      jobManager.setProgress(jobId, 25, `Applying ${strategy.name}...`, 'restoring');

      const filterString = restorationEngine.buildFilterGraph(strategy.type, job.maskData, {
        videoWidth: metadata.width,
        videoHeight: metadata.height
      });

      console.log(`[VideoProcessor] Job ${jobId} (${isImage ? 'Image' : 'Video'}): Filter "${filterString}"`);

      if (isImage) {
        // === HIGH-QUALITY PIXEL-PERFECT IMAGE RESTORATION ===
        // Uses content-aware pixel synthesis (zero blur, no delogo)
        // Similar to geminiwatermarkremover.io's reverse alpha blending approach
        jobManager.setProgress(jobId, 40, 'Analyzing watermark pixels...', 'restoring');

        // Extract masks array from job data
        let masks = [];
        if (job.maskData) {
          if (Array.isArray(job.maskData.masks)) {
            masks = job.maskData.masks;
          } else if (typeof job.maskData.x === 'number') {
            masks = [job.maskData];
          }
        }

        // Normalize mask format for pixelRestorer
        const normalizedMasks = masks.map(m => ({
          x: m.x || 0,
          y: m.y || 0,
          width: m.width || m.w || 40,
          height: m.height || m.h || 40,
          feather: m.feather || 4
        }));

        jobManager.setProgress(jobId, 55, 'Restoring pixels with zero-blur engine...', 'restoring');

        // Force PNG output for maximum quality (lossless)
        const outputPathPng = outputPath.replace(/\.[^.]+$/, '.png');

        const result = await pixelRestorer.restoreImage(inputPath, outputPathPng, normalizedMasks);

        // Update output path if changed to PNG
        if (outputPathPng !== outputPath) {
          outputPath = outputPathPng;
          outputFilename = path.basename(outputPathPng);
        }

        jobManager.setProgress(jobId, 95, 'Finalizing restored image (zero-blur quality)...', 'rendering');
      } else {
        // === HIGH-QUALITY ZERO-BLUR VIDEO RESTORATION ===
        jobManager.setProgress(jobId, 25, 'Scanning video frames for Gemini watermark...', 'restoring');

        // Extract masks from job if user manually selected any
        let userMasks = [];
        if (job.maskData) {
          if (Array.isArray(job.maskData.masks)) userMasks = job.maskData.masks;
          else if (typeof job.maskData.x === 'number') userMasks = [job.maskData];
        }

        let usedZeroBlur = false;
        try {
          usedZeroBlur = await this.processVideoZeroBlur(
            inputPath,
            outputPath,
            metadata,
            userMasks,
            (percent, step) => {
              jobManager.setProgress(jobId, percent, step, 'restoring');
            }
          );
        } catch (unblendErr) {
          console.warn('[VideoProcessor] Zero-blur video unblending error, falling back:', unblendErr.message);
        }

        if (usedZeroBlur) {
          strategy.name = 'Reverse Alpha Blending (Zero Blur)';
        }

        // Fallback only if zero-blur streaming could not complete
        if (!usedZeroBlur) {
          jobManager.setProgress(jobId, 45, 'Processing video frames...', 'restoring');
          await this.processVideoFfmpegFallback(inputPath, outputPath, metadata, strategy, filterString, (percent, step) => {
            jobManager.setProgress(jobId, percent, step, 'restoring');
          });
        }
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

  /**
   * Extract a single raw RGBA frame from video at given timestamp
   */
  async extractSampleFrame(filePath, timeSec, width, height) {
    return new Promise((resolve) => {
      const chunks = [];
      const proc = spawn(ffmpegStatic, [
        '-i', filePath,
        '-ss', Math.max(0, timeSec).toFixed(3),
        '-vframes', '1',
        '-f', 'rawvideo',
        '-pix_fmt', 'rgba',
        '-s', `${width}x${height}`,
        '-'
      ]);

      proc.stdout.on('data', (d) => chunks.push(d));
      proc.on('close', (code) => {
        if (code === 0 && chunks.length > 0) resolve(Buffer.concat(chunks));
        else resolve(null);
      });
      proc.on('error', () => resolve(null));
    });
  }

  /**
   * Stream video frames through Reverse Alpha Blending for 100% Zero-Blur output
   */
  async processVideoZeroBlur(inputPath, outputPath, metadata, userMasks, onProgress) {
    const width = metadata.width;
    const height = metadata.height;
    const fps = Math.max(1, metadata.fps || 30);
    const duration = Math.max(0.5, metadata.duration || 1);
    const totalFrames = Math.max(1, Math.round(duration * fps));

    let targetX, targetY, targetSize;
    let targetAlphaGain = 0.45;

    // 1. Try detecting watermark from sample frames across multiple timestamps
    const sampleTimestamps = [1.0, 0.5, Math.min(2.0, duration * 0.75)].filter(t => t < duration);
    if (sampleTimestamps.length === 0) sampleTimestamps.push(0.1);

    for (const sTime of sampleTimestamps) {
      if (targetX !== undefined && targetY !== undefined) break;
      const sampleBuffer = await this.extractSampleFrame(inputPath, sTime, width, height);

      if (sampleBuffer) {
        try {
          const detection = await removeGeminiWatermarkRaw(sampleBuffer, width, height, { adaptiveMode: 'always' });
          if (detection && detection.meta) {
            const meta = detection.meta;
            const pos = meta.position || meta.selectedCandidate?.position;
            if (pos && typeof pos.x === 'number' && typeof pos.y === 'number' && pos.width > 0) {
              targetX = pos.x;
              targetY = pos.y;
              targetSize = meta.size || pos.width || (width >= 1920 ? 96 : 48);
              targetAlphaGain = meta.alphaGain || 0.45;
              console.log(`[VideoProcessor] Auto-detected video watermark at (${targetX}, ${targetY}) size ${targetSize}px with alphaGain ${targetAlphaGain} at timestamp ${sTime}s!`);
              break;
            }
          }
        } catch (detErr) {
          console.warn('[VideoProcessor] Watermark detection check error:', detErr.message);
        }
      }
    }

    // 2. If auto-detection didn't locate candidate, but user provided an intentional custom box -> use user box
    if ((targetX === undefined || targetY === undefined) && userMasks && userMasks.length > 0 && userMasks[0].width >= 10) {
      const uBox = userMasks[0];
      targetX = Math.max(0, Math.round(uBox.x));
      targetY = Math.max(0, Math.round(uBox.y));
      targetSize = Math.max(24, Math.round(Math.min(uBox.width, uBox.height)));
      console.log(`[VideoProcessor] Using user-specified area: (${targetX}, ${targetY}) size ${targetSize}px`);
    }

    // 3. Calibrated standard Gemini / Google Veo watermark position (bottom-right)
    if (targetX === undefined || targetY === undefined) {
      // Standard Veo watermark dimensions:
      // 720p (1280x720): 48px star, 96px margin from right, 96px margin from bottom
      // 1080p (1920x1080) and 4K: 96px star, 96px margin from right, 96px margin from bottom
      targetSize = width >= 1920 ? 96 : 48;
      const marginRight = 96;
      const marginBottom = 96;
      targetX = Math.max(0, width - targetSize - marginRight);
      targetY = Math.max(0, height - targetSize - marginBottom);
      targetAlphaGain = 0.45;
      console.log(`[VideoProcessor] Using calibrated standard Gemini video watermark coordinates: (${targetX}, ${targetY}) size ${targetSize}px gain ${targetAlphaGain}`);
    }

    // 2. Load exact calibrated alpha map for this watermark size
    const alphaMap = await getAlphaMapForSize(targetSize);
    if (!alphaMap) {
      throw new Error(`Could not generate alpha map for size ${targetSize}`);
    }

    onProgress(35, 'Restoring video frames with Zero Blur (Reverse Alpha Blending)...');

    // 3. Setup streaming pipeline with strict memory bounds
    const frameBytes = width * height * 4;

    const ffIn = spawn(ffmpegStatic, [
      '-threads', '1',
      '-i', inputPath,
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-'
    ]);

    const ffOut = spawn(ffmpegStatic, [
      '-y',
      '-threads', '1',
      '-f', 'rawvideo',
      '-pix_fmt', 'rgba',
      '-s', `${width}x${height}`,
      '-r', fps.toString(),
      '-i', '-',
      '-i', inputPath,
      '-map', '0:v:0',
      '-map', '1:a:0?',
      '-c:v', 'libx264',
      '-preset', 'ultrafast',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-c:a', 'copy',
      '-movflags', '+faststart',
      outputPath
    ]);

    ffIn.stderr.on('data', () => {});
    ffOut.stderr.on('data', () => {});

    let bufferQueue = Buffer.alloc(0);
    let processedFrames = 0;
    let lastProgressUpdate = 0;
    let isWriting = false;

    await new Promise((resolve, reject) => {
      const tryProcess = () => {
        while (!isWriting && bufferQueue.length >= frameBytes) {
          const frameBuf = bufferQueue.subarray(0, frameBytes);
          bufferQueue = bufferQueue.subarray(frameBytes);

          // Apply zero-blur mathematical reverse alpha blending on target region
          const imgData = {
            width,
            height,
            data: new Uint8ClampedArray(frameBuf.buffer, frameBuf.byteOffset, frameBytes)
          };

          unblendRegion(
            imgData,
            alphaMap,
            { x: targetX, y: targetY, width: targetSize, height: targetSize },
            { alphaGain: targetAlphaGain, logoValue: 255 }
          );

          processedFrames++;
          const canWrite = ffOut.stdin.write(frameBuf);

          const now = Date.now();
          if (now - lastProgressUpdate > 500) {
            lastProgressUpdate = now;
            const pct = Math.min(92, 35 + Math.round((processedFrames / totalFrames) * 57));
            onProgress(pct, `Restoring frames with Zero Blur: ${Math.round((processedFrames / totalFrames) * 100)}% complete`);
          }

          if (!canWrite) {
            isWriting = true;
            ffIn.stdout.pause();
            ffOut.stdin.once('drain', () => {
              isWriting = false;
              if (bufferQueue.length < frameBytes * 2 && ffIn.stdout.isPaused()) {
                ffIn.stdout.resume();
              }
              tryProcess();
            });
            break;
          }
        }

        // Strict backpressure: keep at most 2 uncompressed frames in memory (~16 MB total)
        if (bufferQueue.length >= frameBytes * 2) {
          ffIn.stdout.pause();
        } else if (!isWriting && ffIn.stdout.isPaused()) {
          ffIn.stdout.resume();
        }
      };

      ffIn.stdout.on('data', (chunk) => {
        bufferQueue = Buffer.concat([bufferQueue, chunk]);
        tryProcess();
      });

      ffIn.stdout.on('end', () => {
        const finish = () => {
          if (bufferQueue.length >= frameBytes) {
            tryProcess();
            setImmediate(finish);
          } else {
            ffOut.stdin.end();
          }
        };
        finish();
      });

      ffIn.on('error', (err) => {
        try { ffOut.kill(); } catch (_) {}
        reject(err);
      });
      ffOut.on('error', reject);

      ffOut.on('close', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`FFmpeg encoding exited with code ${code}`));
      });
    });

    onProgress(95, 'Finalizing zero-blur video stream...');
    return true;
  }

  /**
   * Fallback video restoration using standard FFmpeg filters
   */
  async processVideoFfmpegFallback(inputPath, outputPath, metadata, strategy, filterString, onProgress) {
    return new Promise((resolve, reject) => {
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

      if (metadata.hasAudio) {
        command = command.audioCodec('aac').audioBitrate('192k');
      } else {
        command = command.noAudio();
      }

      command
        .on('progress', (progress) => {
          if (progress && progress.percent) {
            const mappedProgress = 35 + (progress.percent * 0.55);
            onProgress(Math.min(90, mappedProgress), `Restoring frames: ${Math.round(progress.percent)}% complete`);
          }
        })
        .on('end', resolve)
        .on('error', reject)
        .save(outputPath);
    });
  }
}

export const videoProcessor = new VideoProcessor();
