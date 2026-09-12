import express from 'express';
import { videoController } from '../controllers/videoController.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = express.Router();

// Configuration & Limits
router.get('/config', videoController.getConfig);

// Upload video
router.post('/upload', uploadMiddleware.single('video'), videoController.upload);

// Start restoration job
router.post('/process', videoController.process);

// Check job status
router.get('/status/:jobId', videoController.getStatus);

// Download restored MP4
router.get('/download/:jobId', videoController.download);

// Delete job & files
router.delete('/video/:jobId', videoController.deleteJob);

// Media streaming endpoint
router.get('/media/:type/:file', videoController.serveMedia);

export default router;
