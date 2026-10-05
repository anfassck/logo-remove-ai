import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import apiRouter from './routes/api.js';

import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;

// Ensure uploads and outputs directories exist
['uploads', 'outputs', 'temp'].forEach(dir => {
  const dirPath = path.resolve(dir);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
});

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Range', 'Authorization']
}));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ extended: true, limit: '20mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    service: 'CleanFrame AI Restoration Engine',
    timestamp: new Date().toISOString()
  });
});

// Mount API Routes
app.use('/api', apiRouter);

// Serve Frontend in Production if dist exists
const frontendDist = path.resolve('frontend/dist');
const altFrontendDist = path.join(__dirname, '../frontend/dist');
const distPath = fs.existsSync(frontendDist) ? frontendDist : (fs.existsSync(altFrontendDist) ? altFrontendDist : null);

if (distPath) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api') || req.path.startsWith('/health')) return next();
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('[ServerError]', err);
  const status = err.status || 500;
  const message = err.message || 'An unexpected server error occurred.';
  res.status(status).json({
    success: false,
    error: message
  });
});

app.listen(PORT, () => {
  console.log(`=============================================`);
  console.log(`🚀 CleanFrame AI Backend is running on port ${PORT}`);
  console.log(`🔗 API Base: http://localhost:${PORT}/api`);
  console.log(`📁 Uploads: ${path.resolve('uploads')}`);
  console.log(`📁 Outputs: ${path.resolve('outputs')}`);
  console.log(`=============================================`);
});
