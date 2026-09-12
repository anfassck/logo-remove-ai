import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';

const uploadsDir = path.resolve('uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Storage configuration with unique UUID filenames
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || '.mp4';
    const uniqueName = `upload_${uuidv4()}${ext}`;
    cb(null, uniqueName);
  }
});

// File filter: Videos (MP4, MOV, WebM, MKV) and Images (JPG, JPEG, PNG, WEBP, BMP)
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-matroska',
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/bmp',
    'image/x-ms-bmp'
  ];

  const allowedExtensions = ['.mp4', '.mov', '.webm', '.mkv', '.jpg', '.jpeg', '.png', '.webp', '.bmp'];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedMimeTypes.includes(file.mimetype) || allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error(`Unsupported file format (${ext}). Supported formats: MP4, MOV, WebM, JPG, PNG, WEBP.`), false);
  }
};

const maxFileSizeMB = parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10);

export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: maxFileSizeMB * 1024 * 1024
  }
});
