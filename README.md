# CleanFrame AI 🎬✨

**AI-Assisted Video Restoration & Logo Removal Web Application**

CleanFrame AI is a modern, dark cinematic web application designed for video editors and content creators to remove unwanted logos, timestamps, and watermarks from their own videos using AI-assisted frame restoration and spatial inpainting.

---

## 🌟 Key Features

- **🎯 Interactive Watermark Selection**: Resizable, draggable bounding box and freehand brush tool directly overlaid on your video player.
- **✨ Spatial & AI Inpainting**: High-performance video restoration pipeline preserving background textures without quality loss.
- **🎵 Lossless Audio Preservation**: Multi-channel audio tracks (AAC, MP3, Opus) are extracted and muxed synchronously back into the restored video.
- **⚡ Synchronized Before/After Slider**: Real-time split-screen player comparing original footage with restored output side-by-side.
- **🔒 Privacy First & Auto-Purge**: Temporary processing with scheduled TTL cleanup (files are automatically deleted after 30 minutes).
- **🆓 100% Free Development Beta**: No signups, no paywalls, and no watermarks added to your outputs.

---

## 🛠️ Tech Stack

### Frontend
- **React 18** + **Vite**
- **Tailwind CSS** (Dark Cinematic Glassmorphism theme)
- **Lucide React** (Vector icons)
- **Framer Motion** (Smooth animations & transitions)
- **Canvas Confetti** (Celebratory completion animations)

### Backend
- **Node.js** + **Express.js**
- **FFmpeg** (Pre-bundled with static Windows binaries via `ffmpeg-static` and `ffprobe-static`)
- **Multer** (Multipart video streaming & validation)
- **In-Memory Job Manager** (Concurrency control & progress tracking)

---

## 🚀 Quick Start & Windows Setup

### Prerequisites
1. **Node.js** (v18+ or v20+ recommended). [Download Node.js](https://nodejs.org/)
2. Windows PowerShell or Command Prompt

> [!NOTE]
> **FFmpeg** is automatically bundled with `ffmpeg-static`, so you do **not** need to manually configure Windows PATH environment variables!

---

### Step 1: Install Dependencies

Open PowerShell in the project directory (`c:\Users\Admin\Desktop\logo remove`):

```powershell
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

---

### Step 2: Configure Environment Variables

The backend includes a pre-configured `.env` file. If you wish to customize limits:

In `backend/.env`:
```env
PORT=5000
NODE_ENV=development
MAX_FILE_SIZE_MB=100
MAX_VIDEO_DURATION_SEC=300
MAX_CONCURRENT_JOBS=3
FILE_EXPIRY_MINUTES=30
FRONTEND_URL=http://localhost:5173

# Optional: Cloud AI Restoration API Key (e.g., Replicate, Runway)
# Leave empty to use local high-precision FFmpeg inpainting
AI_RESTORATION_API_KEY=
```

---

### Step 3: Start the Backend Server

In your first terminal:
```powershell
cd backend
npm start
```
*The backend API will run on `http://localhost:5000`.*

---

### Step 4: Start the Frontend Dev Server

In a second terminal:
```powershell
cd frontend
npm run dev
```
*Open your browser and navigate to `http://localhost:5173`.*

---

## 📡 REST API Documentation

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/config` | Returns server limits (max file size, max duration, concurrency) |
| `POST` | `/api/upload` | Uploads video file (`multipart/form-data`), returns metadata & thumbnail |
| `POST` | `/api/process` | Starts async video restoration job with mask coordinates |
| `GET` | `/api/status/:jobId` | Polls restoration progress (0-100%) and current pipeline step |
| `GET` | `/api/download/:jobId` | Downloads the rendered restored MP4 video file |
| `GET` | `/api/media/:type/:file` | Streams uploaded / processed videos and thumbnail images |
| `DELETE` | `/api/video/:jobId` | Immediately cleans up a job and its associated media |

---

## ⚖️ Permitted Use & Disclaimer

> [!IMPORTANT]
> CleanFrame AI is designed strictly for restoring footage that you own or have explicit authorization to edit. It is not intended for bypassing platform copyrights or removing ownership attributions from third-party content.
