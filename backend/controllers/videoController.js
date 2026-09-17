import path from 'path';
import fs from 'fs';
import { videoProcessor } from '../services/videoProcessor.js';
import { jobManager } from '../services/jobManager.js';

export const videoController = {
  /**
   * POST /api/upload
   */
  async upload(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          error: 'No media file provided. Please upload an MP4, MOV, WebM, PNG, JPG, or WebP file.'
        });
      }

      const filePath = req.file.path;
      const originalName = req.file.originalname;
      const filename = req.file.filename;
      const fileId = path.basename(filename, path.extname(filename));

      // Extract media metadata
      let metadata;
      try {
        metadata = await videoProcessor.getMetadata(filePath);
      } catch (metaErr) {
        // Remove invalid file
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        return res.status(422).json({
          success: false,
          error: `Invalid or corrupt media file: ${metaErr.message}`
        });
      }

      const isImage = metadata.mediaType === 'image';

      // Validate duration only for videos
      if (!isImage) {
        const maxDuration = parseInt(process.env.MAX_VIDEO_DURATION_SEC || '300', 10);
        if (metadata.duration > maxDuration) {
          if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
          return res.status(400).json({
            success: false,
            error: `Video duration (${Math.round(metadata.duration)}s) exceeds maximum allowed duration (${maxDuration}s).`
          });
        }
      }

      // Generate thumbnail preview
      const uploadsDir = path.resolve('uploads');
      const thumbFilename = await videoProcessor.generateThumbnail(filePath, uploadsDir, filename);

      return res.status(200).json({
        success: true,
        video: {
          fileId,
          filename,
          originalName,
          mediaType: metadata.mediaType || (isImage ? 'image' : 'video'),
          size: req.file.size,
          width: metadata.width,
          height: metadata.height,
          duration: metadata.duration,
          fps: metadata.fps,
          hasAudio: metadata.hasAudio,
          thumbnailUrl: thumbFilename ? `/api/media/uploads/${thumbFilename}` : `/api/media/uploads/${filename}`,
          videoUrl: `/api/media/uploads/${filename}`,
          imageUrl: `/api/media/uploads/${filename}`
        }
      });
    } catch (err) {
      console.error('[VideoController] Upload error:', err);
      return res.status(500).json({
        success: false,
        error: 'An internal error occurred while uploading and inspecting the media file.'
      });
    }
  },

  /**
   * POST /api/process
   */
  async process(req, res) {
    try {
      const { filename, maskData, masks, engine = 'ultra_clean' } = req.body;

      if (!filename) {
        return res.status(400).json({
          success: false,
          error: 'Missing required video filename.'
        });
      }

      // Extract masks array or single mask
      let maskList = [];
      if (Array.isArray(masks) && masks.length > 0) {
        maskList = masks;
      } else if (maskData) {
        if (Array.isArray(maskData.masks)) {
          maskList = maskData.masks;
        } else if (typeof maskData.x === 'number' && typeof maskData.y === 'number') {
          maskList = [maskData];
        }
      }

      if (maskList.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Please select at least one watermark removal area on the video.'
        });
      }

      // Verify file exists
      const uploadsDir = path.resolve('uploads');
      const sanitizedFilename = path.basename(filename);
      const filePath = path.join(uploadsDir, sanitizedFilename);

      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'The uploaded video file has expired or could not be found. Please re-upload.'
        });
      }

      const fileId = path.basename(sanitizedFilename, path.extname(sanitizedFilename));

      // Normalize all masks
      const cleanedMasks = maskList.map(m => ({
        x: Math.max(0, m.x || 0),
        y: Math.max(0, m.y || 0),
        width: Math.max(4, m.width || 40),
        height: Math.max(4, m.height || 40),
        type: m.type || 'rect',
        feather: m.feather || 2
      }));

      // Create processing job with multiple masks
      const job = jobManager.createJob({
        input: {
          fileId,
          filepath: filePath,
          filename: sanitizedFilename
        },
        maskData: {
          masks: cleanedMasks,
          x: cleanedMasks[0].x,
          y: cleanedMasks[0].y,
          width: cleanedMasks[0].width,
          height: cleanedMasks[0].height
        },
        engine
      });

      // Launch async processing in background
      setImmediate(() => {
        videoProcessor.processJob(job.jobId).catch(err => {
          console.error(`Background job ${job.jobId} failed:`, err.message);
        });
      });

      return res.status(202).json({
        success: true,
        jobId: job.jobId,
        status: job.status,
        message: 'Video restoration job has been queued.'
      });
    } catch (err) {
      console.error('[VideoController] Process error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to initiate video restoration job.'
      });
    }
  },

  /**
   * GET /api/status/:jobId
   */
  async getStatus(req, res) {
    try {
      const { jobId } = req.params;
      const job = jobManager.getJob(jobId);

      if (!job) {
        return res.status(404).json({
          success: false,
          error: 'Restoration job not found or expired.'
        });
      }

      const responseData = {
        jobId: job.jobId,
        status: job.status,
        progress: job.progress,
        step: job.step,
        error: job.error,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt
      };

      if (job.status === 'completed' && job.output) {
        responseData.output = {
          fileId: job.output.fileId,
          filename: job.output.filename,
          mediaType: job.output.mediaType || 'video',
          size: job.output.size,
          width: job.output.width,
          height: job.output.height,
          duration: job.output.duration,
          videoUrl: `/api/media/outputs/${job.output.filename}`,
          imageUrl: `/api/media/outputs/${job.output.filename}`,
          thumbnailUrl: job.output.thumbnail ? `/api/media/outputs/${job.output.thumbnail}` : `/api/media/outputs/${job.output.filename}`,
          downloadUrl: `/api/download/${job.jobId}`,
          strategy: job.output.strategy,
          isAiActive: job.output.isAiActive,
          devNotice: job.output.devNotice
        };
      }

      return res.status(200).json({
        success: true,
        job: responseData
      });
    } catch (err) {
      console.error('[VideoController] Status error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to check job status.'
      });
    }
  },

  /**
   * GET /api/download/:jobId
   */
  async download(req, res) {
    try {
      const { jobId } = req.params;
      const job = jobManager.getJob(jobId);

      if (!job || job.status !== 'completed' || !job.output?.filepath) {
        return res.status(404).json({
          success: false,
          error: 'Restored file is not available for download.'
        });
      }

      const filePath = job.output.filepath;
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({
          success: false,
          error: 'The processed file has expired from storage.'
        });
      }

      const isImage = job.output.mediaType === 'image';
      const ext = path.extname(job.output.filename).toLowerCase() || (isImage ? '.png' : '.mp4');
      const downloadFilename = `cleanframe_restored${ext}`;

      let contentType = 'video/mp4';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.mov') contentType = 'video/quicktime';

      res.setHeader('Content-Disposition', `attachment; filename="${downloadFilename}"`);
      res.setHeader('Content-Type', contentType);

      const fileStream = fs.createReadStream(filePath);
      fileStream.pipe(res);
    } catch (err) {
      console.error('[VideoController] Download error:', err);
      return res.status(500).json({
        success: false,
        error: 'Error downloading restored file.'
      });
    }
  },

  /**
   * DELETE /api/video/:jobId
   */
  async deleteJob(req, res) {
    try {
      const { jobId } = req.params;
      const deleted = jobManager.deleteJob(jobId);

      if (!deleted) {
        return res.status(404).json({
          success: false,
          error: 'Job not found.'
        });
      }

      return res.status(200).json({
        success: true,
        message: 'Job and associated temporary files deleted successfully.'
      });
    } catch (err) {
      console.error('[VideoController] Delete error:', err);
      return res.status(500).json({
        success: false,
        error: 'Failed to delete job.'
      });
    }
  },

  /**
   * GET /api/media/:type/:file
   * Safely serves video and images with HTTP Range support for video seeking
   */
  async serveMedia(req, res) {
    try {
      const { type, file } = req.params;
      if (!['uploads', 'outputs'].includes(type)) {
        return res.status(400).send('Invalid media directory.');
      }

      const safeFilename = path.basename(file);
      const fullPath = path.resolve(type, safeFilename);

      if (!fs.existsSync(fullPath)) {
        return res.status(404).send('Media not found or expired.');
      }

      const stat = fs.statSync(fullPath);
      const fileSize = stat.size;
      const range = req.headers.range;
      const ext = path.extname(safeFilename).toLowerCase();

      let contentType = 'video/mp4';
      if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
      else if (ext === '.png') contentType = 'image/png';
      else if (ext === '.webp') contentType = 'image/webp';
      else if (ext === '.bmp') contentType = 'image/bmp';
      else if (ext === '.webm') contentType = 'video/webm';
      else if (ext === '.mov') contentType = 'video/quicktime';

      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const fileStream = fs.createReadStream(fullPath, { start, end });

        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': contentType,
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cross-Origin-Resource-Policy': 'cross-origin'
        });
        fileStream.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': contentType,
          'Accept-Ranges': 'bytes',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Cross-Origin-Resource-Policy': 'cross-origin'
        });
        fs.createReadStream(fullPath).pipe(res);
      }
    } catch (err) {
      console.error('[VideoController] Serve media error:', err);
      return res.status(500).send('Error streaming media.');
    }
  },

  /**
   * GET /api/config
   * Returns public system limits
   */
  async getConfig(req, res) {
    return res.status(200).json({
      success: true,
      limits: {
        maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10),
        maxDurationSec: parseInt(process.env.MAX_VIDEO_DURATION_SEC || '300', 10),
        maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '3', 10),
        fileExpiryMinutes: parseInt(process.env.FILE_EXPIRY_MINUTES || '30', 10),
        hasAiConfigured: Boolean(process.env.AI_RESTORATION_API_KEY)
      }
    });
  }
};
