import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, RotateCw, Trash2, Eye, EyeOff, 
  Sparkles, Sliders, Layers, Film, ArrowLeft, Maximize2, 
  CheckCircle, ShieldAlert, Cpu, Brush, Square, ChevronLeft, ChevronRight,
  ZoomIn, ZoomOut, Wand2, Target, Crosshair, Sparkle, Minimize2, Plus, X
} from 'lucide-react';
import { apiService } from '../services/api';

export default function VideoEditor({ videoData, onProcess, onReset }) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);

  const isImage = videoData?.mediaType === 'image' || ['.jpg', '.jpeg', '.png', '.webp', '.bmp'].some(ext => videoData?.filename?.toLowerCase().endsWith(ext));

  // Video playback state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(videoData?.duration || 0);

  // Tool & Zoom state
  const [activeTool, setActiveTool] = useState('rect');
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Dimensions of media
  const vidW = videoData?.width || 1280;
  const vidH = videoData?.height || 720;

  // AI Gemini Star Auto-Detection Engine (scans candidate zones for 4-pointed diamond sparkle)
  const [isScanningAi, setIsScanningAi] = useState(false);
  const [aiDetectionMessage, setAiDetectionMessage] = useState(null);

  const detectGeminiWatermark = () => {
    if (!videoRef.current) return null;
    setIsScanningAi(true);
    setAiDetectionMessage('Scanning frame for Gemini watermark...');

    try {
      const canvas = document.createElement('canvas');
      canvas.width = vidW;
      canvas.height = vidH;
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      ctx.drawImage(videoRef.current, 0, 0, vidW, vidH);

      const isVertical = vidH > vidW;
      
      // Candidate zones for Google Gemini / Veo sparkle logos
      const searchZones = isVertical ? [
        { minX: Math.round(vidW * 0.76), maxX: Math.round(vidW * 0.98), minY: Math.round(vidH * 0.50), maxY: Math.round(vidH * 0.68), name: 'Letterbox Center BR' },
        { minX: Math.round(vidW * 0.76), maxX: Math.round(vidW * 0.98), minY: Math.round(vidH * 0.78), maxY: Math.round(vidH * 0.98), name: 'Bottom-Right Full' },
        { minX: Math.round(vidW * 0.02), maxX: Math.round(vidW * 0.24), minY: Math.round(vidH * 0.50), maxY: Math.round(vidH * 0.68), name: 'Letterbox Center BL' },
      ] : [
        { minX: Math.round(vidW * 0.78), maxX: Math.round(vidW * 0.98), minY: Math.round(vidH * 0.70), maxY: Math.round(vidH * 0.98), name: 'Bottom-Right' },
        { minX: Math.round(vidW * 0.78), maxX: Math.round(vidW * 0.98), minY: Math.round(vidH * 0.02), maxY: Math.round(vidH * 0.25), name: 'Top-Right' },
        { minX: Math.round(vidW * 0.02), maxX: Math.round(vidW * 0.22), minY: Math.round(vidH * 0.70), maxY: Math.round(vidH * 0.98), name: 'Bottom-Left' },
      ];

      let bestMatch = null;
      let maxStarScore = 0;

      for (const zone of searchZones) {
        const zw = zone.maxX - zone.minX;
        const zh = zone.maxY - zone.minY;
        if (zw <= 0 || zh <= 0) continue;

        const imgData = ctx.getImageData(zone.minX, zone.minY, zw, zh);
        const d = imgData.data;
        const starR = Math.max(8, Math.min(18, Math.round(Math.min(vidW, vidH) * 0.015)));

        for (let y = starR + 2; y < zh - starR - 2; y += 2) {
          for (let x = starR + 2; x < zw - starR - 2; x += 2) {
            const getLuma = (px, py) => {
              const idx = (py * zw + px) * 4;
              return 0.299 * d[idx] + 0.587 * d[idx + 1] + 0.114 * d[idx + 2];
            };

            const centerLuma = getLuma(x, y);
            const armN = getLuma(x, y - Math.round(starR * 0.7));
            const armS = getLuma(x, y + Math.round(starR * 0.7));
            const armE = getLuma(x + Math.round(starR * 0.7), y);
            const armW = getLuma(x - Math.round(starR * 0.7), y);
            const avgArms = (armN + armS + armE + armW) / 4;

            const diagNE = getLuma(x + Math.round(starR * 0.7), y - Math.round(starR * 0.7));
            const diagNW = getLuma(x - Math.round(starR * 0.7), y - Math.round(starR * 0.7));
            const diagSE = getLuma(x + Math.round(starR * 0.7), y + Math.round(starR * 0.7));
            const diagSW = getLuma(x - Math.round(starR * 0.7), y + Math.round(starR * 0.7));
            const avgDiags = (diagNE + diagNW + diagSE + diagSW) / 4;

            const starScore = (centerLuma + avgArms * 1.6) - (avgDiags * 2.4);

            if (starScore > maxStarScore && starScore > 30) {
              maxStarScore = starScore;
              bestMatch = {
                centerX: zone.minX + x,
                centerY: zone.minY + y,
                score: starScore,
                radius: starR
              };
            }
          }
        }
      }

      if (bestMatch) {
        // Tight zero-blur fit
        const tightW = Math.max(22, Math.min(36, Math.round(bestMatch.radius * 2.0)));
        const tightH = Math.max(24, Math.min(40, Math.round(bestMatch.radius * 2.2)));
        const boxX = Math.max(1, Math.min(vidW - tightW - 1, Math.round(bestMatch.centerX - tightW / 2)));
        const boxY = Math.max(1, Math.min(vidH - tightH - 1, Math.round(bestMatch.centerY - tightH / 2)));

        const detectedBox = {
          id: activeBoxId || 1,
          x: boxX,
          y: boxY,
          width: tightW,
          height: tightH
        };

        setBoxes([detectedBox]);
        setActiveBoxId(detectedBox.id);
        pushState([detectedBox]);
        setAiDetectionMessage('✦ Gemini Star detected & fitted with Zero-Blur precision!');
        setTimeout(() => setAiDetectionMessage(null), 4000);
      } else {
        // Fallback to high-precision tight preset
        const fallback = calcCornerBox('bottom-right-sparkle-tight');
        const detectedBox = { id: activeBoxId || 1, ...fallback };
        setBoxes([detectedBox]);
        setActiveBoxId(detectedBox.id);
        pushState([detectedBox]);
        setAiDetectionMessage('✦ Applied Zero-Blur Gemini Star tight bounds.');
        setTimeout(() => setAiDetectionMessage(null), 4000);
      }
    } catch (err) {
      console.warn('AI detect error:', err);
      const fallback = calcCornerBox('bottom-right-sparkle-tight');
      setBoxes([{ id: 1, ...fallback }]);
    } finally {
      setIsScanningAi(false);
    }
  };

  // Calculate default Gemini sparkle logo size & position (tight zero-blur dimensions)
  const calcCornerBox = (corner = 'bottom-right-sparkle-tight') => {
    const isVertical = vidH > vidW;

    if (corner === 'bottom-right-sparkle-tight' || corner === 'bottom-right-sparkle') {
      if (isVertical) {
        // Tight zero-blur box for vertical video with letterboxed 16:9 content
        const w = Math.max(26, Math.round(vidW * 0.030));
        const h = Math.max(30, Math.round(vidH * 0.020));
        const x = Math.round(vidW * 0.89);
        const y = Math.round(vidH * 0.588);
        return { x, y, width: w, height: h };
      } else {
        // Landscape 16:9 video - tight box
        const w = Math.max(26, Math.round(vidW * 0.028));
        const h = Math.max(30, Math.round(vidH * 0.045));
        const x = Math.round(vidW * 0.89);
        const y = Math.round(vidH * 0.81);
        return { x, y, width: w, height: h };
      }
    }

    if (corner === 'bottom-right-sparkle-full') {
      const w = Math.max(28, Math.round(vidW * 0.032));
      const h = Math.max(32, Math.round(vidH * 0.022));
      const x = Math.round(vidW * 0.87);
      const y = Math.round(vidH * 0.90);
      return { x, y, width: w, height: h };
    }

    if (corner === 'bottom-right-corner') {
      const size = Math.max(32, Math.round(vidW * 0.035));
      const pad = Math.round(vidW * 0.02);
      return { x: vidW - size - pad, y: vidH - size - pad, width: size, height: size };
    }

    const w = Math.max(45, Math.round(vidW * 0.07));
    const h = Math.max(22, Math.round(w * 0.35));
    const padX = Math.round(vidW * 0.02);
    const padY = Math.round(vidH * 0.025);

    switch (corner) {
      case 'top-right':
        return { x: vidW - w - padX, y: padY, width: w, height: h };
      case 'bottom-right':
        return { x: vidW - w - padX, y: vidH - h - padY, width: w, height: h };
      case 'bottom-left':
        return { x: padX, y: vidH - h - padY, width: w, height: h };
      case 'top-left':
        return { x: padX, y: padY, width: w, height: h };
      default:
        return { x: Math.round(vidW * 0.89), y: Math.round(vidH * 0.588), width: 28, height: 32 };
    }
  };

  // MULTI-AREA BOXES STATE (default to tight zero-blur fit)
  const [boxes, setBoxes] = useState(() => [
    { id: 1, ...calcCornerBox('bottom-right-sparkle-tight') }
  ]);
  const [activeBoxId, setActiveBoxId] = useState(1);
  const [history, setHistory] = useState([[ { id: 1, ...calcCornerBox('bottom-right-sparkle-tight') } ]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Dragging state
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 });

  // Engine and filter tuning (default to ultra-clean zero-blur)
  const [feather, setFeather] = useState(1);
  const [selectedEngine, setSelectedEngine] = useState('ultra_clean');

  // Push history state
  const pushState = (newBoxes) => {
    const newHistory = history.slice(0, historyIndex + 1);
    newHistory.push(newBoxes);
    setHistory(newHistory);
    setHistoryIndex(newHistory.length - 1);
  };

  // Add a new removal box
  const handleAddNewBox = () => {
    const nextId = boxes.length > 0 ? Math.max(...boxes.map(b => b.id)) + 1 : 1;
    // Default position slightly offset from previous
    const offset = (boxes.length * 30) % 150;
    const newBox = {
      id: nextId,
      x: Math.max(10, Math.min(vidW - 80, 50 + offset)),
      y: Math.max(10, Math.min(vidH - 50, 50 + offset)),
      width: Math.max(30, Math.round(vidW * 0.08)),
      height: Math.max(26, Math.round(vidH * 0.06))
    };

    const newBoxes = [...boxes, newBox];
    setBoxes(newBoxes);
    setActiveBoxId(nextId);
    pushState(newBoxes);
  };

  // Delete active box
  const handleDeleteActiveBox = (idToDelete = activeBoxId) => {
    if (boxes.length <= 1) {
      handleClearAll();
      return;
    }
    const newBoxes = boxes.filter(b => b.id !== idToDelete);
    setBoxes(newBoxes);
    setActiveBoxId(newBoxes[0]?.id || null);
    pushState(newBoxes);
  };

  const handleClearAll = () => {
    const empty = [];
    setBoxes(empty);
    setActiveBoxId(null);
    pushState(empty);
  };

  const applyPreset = (corner) => {
    const cornerCoords = calcCornerBox(corner);
    if (boxes.length === 0) {
      const newBox = { id: 1, ...cornerCoords };
      setBoxes([newBox]);
      setActiveBoxId(1);
      pushState([newBox]);
      return;
    }

    // Update currently active box or add if corner doesn't exist
    const newBoxes = boxes.map(b => (b.id === activeBoxId ? { ...b, ...cornerCoords } : b));
    setBoxes(newBoxes);
    pushState(newBoxes);
  };

  const adjustActiveBoxSize = (delta) => {
    const activeBox = boxes.find(b => b.id === activeBoxId);
    if (!activeBox) return;

    const newW = Math.max(16, Math.min(vidW - activeBox.x, activeBox.width + delta));
    const newH = Math.max(16, Math.min(vidH - activeBox.y, activeBox.height + delta));
    
    const newBoxes = boxes.map(b => b.id === activeBoxId ? { ...b, width: newW, height: newH } : b);
    setBoxes(newBoxes);
    pushState(newBoxes);
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      const prevBoxes = history[historyIndex - 1];
      setBoxes(prevBoxes);
      setActiveBoxId(prevBoxes[0]?.id || null);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      const nextBoxes = history[historyIndex + 1];
      setBoxes(nextBoxes);
      setActiveBoxId(nextBoxes[0]?.id || null);
    }
  };

  // Video time updates
  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration || videoData.duration);
  };

  const togglePlay = () => {
    if (videoRef.current) {
      if (isPlaying) videoRef.current.pause();
      else videoRef.current.play();
      setIsPlaying(!isPlaying);
    }
  };

  const handleSeek = (e) => {
    const time = parseFloat(e.target.value);
    setCurrentTime(time);
    if (videoRef.current) videoRef.current.currentTime = time;
  };

  const stepFrame = (direction) => {
    if (videoRef.current) {
      const fps = videoData.fps || 30;
      const frameTime = 1 / fps;
      const newTime = Math.max(0, Math.min(duration, videoRef.current.currentTime + (direction * frameTime)));
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  // Precise Scaling helper
  const getRenderMetrics = () => {
    if (!videoRef.current) return { scaleX: 1, scaleY: 1, offsetX: 0, offsetY: 0, renderW: vidW, renderH: vidH, rect: {} };
    const rect = videoRef.current.getBoundingClientRect();
    const containerW = rect.width;
    const containerH = rect.height;
    const videoAspect = vidW / vidH;
    const containerAspect = containerW / containerH;

    let renderW, renderH, offsetX, offsetY;

    if (containerAspect > videoAspect) {
      renderH = containerH;
      renderW = containerH * videoAspect;
      offsetX = (containerW - renderW) / 2;
      offsetY = 0;
    } else {
      renderW = containerW;
      renderH = containerW / videoAspect;
      offsetX = 0;
      offsetY = (containerH - renderH) / 2;
    }

    const scaleX = renderW / vidW;
    const scaleY = renderH / vidH;

    return { scaleX, scaleY, offsetX, offsetY, renderW, renderH, rect };
  };

  // Helper to extract coordinates from Mouse or Touch events
  const getPointerPos = (e) => {
    if (e.touches && e.touches.length > 0) {
      return { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    }
    if (e.changedTouches && e.changedTouches.length > 0) {
      return { clientX: e.changedTouches[0].clientX, clientY: e.changedTouches[0].clientY };
    }
    return { clientX: e.clientX, clientY: e.clientY };
  };

  // Handle Box Drag & Resize (Mouse & Touch)
  const handlePointerDown = (e, handle, boxId) => {
    if (e.cancelable && e.type === 'touchstart') e.preventDefault();
    e.stopPropagation();
    setActiveBoxId(boxId);
    setIsDragging(true);
    setDragHandle(handle);

    const targetBox = boxes.find(b => b.id === boxId);
    if (!targetBox) return;

    const pos = getPointerPos(e);
    setDragStart({
      x: pos.clientX,
      y: pos.clientY,
      boxX: targetBox.x,
      boxY: targetBox.y,
      boxW: targetBox.width,
      boxH: targetBox.height
    });
  };

  const handlePointerMove = (e) => {
    if (!isDragging || !videoRef.current || activeBoxId === null) return;
    if (e.cancelable && e.type === 'touchmove') e.preventDefault();
    const metrics = getRenderMetrics();
    const pos = getPointerPos(e);

    const deltaX = (pos.clientX - dragStart.x) / (metrics.scaleX * zoomLevel);
    const deltaY = (pos.clientY - dragStart.y) / (metrics.scaleY * zoomLevel);

    const targetBox = boxes.find(b => b.id === activeBoxId);
    if (!targetBox) return;

    let updated = { ...targetBox };

    if (dragHandle === 'move') {
      updated.x = Math.max(0, Math.min(vidW - targetBox.width, dragStart.boxX + deltaX));
      updated.y = Math.max(0, Math.min(vidH - targetBox.height, dragStart.boxY + deltaY));
    } else if (dragHandle === 'se') {
      updated.width = Math.max(16, Math.min(vidW - targetBox.x, dragStart.boxW + deltaX));
      updated.height = Math.max(16, Math.min(vidH - targetBox.y, dragStart.boxH + deltaY));
    } else if (dragHandle === 'nw') {
      const maxX = dragStart.boxX + dragStart.boxW - 16;
      const maxY = dragStart.boxY + dragStart.boxH - 16;
      updated.x = Math.max(0, Math.min(maxX, dragStart.boxX + deltaX));
      updated.y = Math.max(0, Math.min(maxY, dragStart.boxY + deltaY));
      updated.width = dragStart.boxW - (updated.x - dragStart.boxX);
      updated.height = dragStart.boxH - (updated.y - dragStart.boxY);
    } else if (dragHandle === 'ne') {
      const maxY = dragStart.boxY + dragStart.boxH - 16;
      updated.y = Math.max(0, Math.min(maxY, dragStart.boxY + deltaY));
      updated.width = Math.max(16, Math.min(vidW - targetBox.x, dragStart.boxW + deltaX));
      updated.height = dragStart.boxH - (updated.y - dragStart.boxY);
    } else if (dragHandle === 'sw') {
      const maxX = dragStart.boxX + dragStart.boxW - 16;
      updated.x = Math.max(0, Math.min(maxX, dragStart.boxX + deltaX));
      updated.width = dragStart.boxW - (updated.x - dragStart.boxX);
      updated.height = Math.max(16, Math.min(vidH - targetBox.y, dragStart.boxH + deltaY));
    }

    setBoxes(boxes.map(b => b.id === activeBoxId ? updated : b));
  };

  const handlePointerUp = () => {
    if (isDragging) {
      setIsDragging(false);
      setDragHandle(null);
      pushState(boxes);
    }
  };

  // Click / Tap on background canvas to add new area
  const handleContainerPointerDown = (e) => {
    if (isDragging) return;
    const metrics = getRenderMetrics();
    const pos = getPointerPos(e);
    const clickX = (pos.clientX - metrics.rect.left - metrics.offsetX) / (metrics.scaleX * zoomLevel);
    const clickY = (pos.clientY - metrics.rect.top - metrics.offsetY) / (metrics.scaleY * zoomLevel);

    if (clickX < 0 || clickX > vidW || clickY < 0 || clickY > vidH) return;

    const nextId = boxes.length > 0 ? Math.max(...boxes.map(b => b.id)) + 1 : 1;
    const boxW = Math.max(26, Math.round(vidW * 0.030));
    const boxH = Math.max(30, Math.round(vidH * 0.020));
    
    const newBox = {
      id: nextId,
      x: Math.max(0, Math.min(vidW - boxW, clickX - (boxW / 2))),
      y: Math.max(0, Math.min(vidH - boxH, clickY - (boxH / 2))),
      width: boxW,
      height: boxH
    };

    const newBoxes = [...boxes, newBox];
    setBoxes(newBoxes);
    setActiveBoxId(nextId);
    pushState(newBoxes);
  };

  // 1-Pixel Precision Nudge for Mobile & Desktop
  const nudgeActiveBox = (dx, dy) => {
    const activeBox = boxes.find(b => b.id === activeBoxId);
    if (!activeBox) return;
    const newX = Math.max(0, Math.min(vidW - activeBox.width, activeBox.x + dx));
    const newY = Math.max(0, Math.min(vidH - activeBox.height, activeBox.y + dy));
    const newBoxes = boxes.map(b => b.id === activeBoxId ? { ...b, x: newX, y: newY } : b);
    setBoxes(newBoxes);
    pushState(newBoxes);
  };

  const metrics = getRenderMetrics();

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const handleStartRemoval = () => {
    if (boxes.length === 0) {
      alert('Please select at least one area over the watermark before processing.');
      return;
    }

    onProcess({
      filename: videoData.filename,
      masks: boxes.map(b => ({
        x: Math.round(b.x),
        y: Math.round(b.y),
        width: Math.round(b.width),
        height: Math.round(b.height),
        type: 'rect',
        feather: feather
      })),
      engine: selectedEngine
    });
  };

  const activeBox = boxes.find(b => b.id === activeBoxId);

  return (
    <div 
      className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 pb-28 lg:pb-6" 
      onMouseUp={handlePointerUp} 
      onMouseMove={handlePointerMove}
      onTouchMove={handlePointerMove}
      onTouchEnd={handlePointerUp}
    >
      
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="p-2.5 rounded-xl bg-dark-900 hover:bg-dark-800 border border-white/10 text-slate-300 hover:text-white transition-all flex items-center gap-2 text-xs font-semibold"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Upload Another {isImage ? 'Photo' : 'Video'}</span>
          </button>

          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Restoration Studio</span>
              <span className="px-2 py-0.5 text-[10px] font-mono bg-brand-500/20 text-brand-300 border border-brand-500/30 rounded-full">
                {videoData.width}x{videoData.height}
              </span>
            </h2>
            <p className="text-xs text-slate-400 truncate max-w-md">
              {videoData.originalName} • {(videoData.size / (1024 * 1024)).toFixed(1)} MB
            </p>
          </div>
        </div>

        {/* Quick Toolbar */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            title="Undo"
            className="p-2 rounded-lg bg-dark-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            title="Redo"
            className="p-2 rounded-lg bg-dark-900 border border-white/10 text-slate-300 hover:text-white disabled:opacity-30 disabled:pointer-events-none transition-all"
          >
            <RotateCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClearAll}
            title="Clear All Areas"
            className="p-2 rounded-lg bg-dark-900 border border-white/10 text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-all"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* MULTI-AREA SELECTION & WATERMARK PRESETS */}
      <div className="mb-6 p-4 rounded-2xl glass-panel border border-brand-500/30 bg-gradient-to-r from-brand-950/80 via-dark-900/90 to-dark-850/80 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-500 to-brand-cyan p-[1px] shrink-0">
            <div className="w-full h-full bg-dark-900 rounded-[11px] flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-brand-cyan animate-pulse" />
            </div>
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>AI Auto-Detect & Precision Fit</span>
              <span className="px-2 py-0.2 text-[9px] font-bold bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 rounded uppercase">
                {boxes.length} {boxes.length === 1 ? 'Area' : 'Areas'} Active
              </span>
            </h4>
            <p className="text-xs text-slate-300">
              Click <b>AI Auto-Detect</b> to automatically pinpoint the Gemini star, or tap a Zero-Blur preset:
            </p>
          </div>
        </div>

        {/* Action Controls & Presets */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          {/* AI Auto-Detect Gemini Watermark Button */}
          <button
            onClick={detectGeminiWatermark}
            disabled={isScanningAi}
            className="px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-brand-500 via-brand-cyan to-indigo-500 hover:from-brand-400 hover:to-indigo-400 text-white shadow-lg shadow-brand-500/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-2 group cursor-pointer"
            title="Automatically scan and lock onto the Gemini 4-point star watermark"
          >
            <Wand2 className={`w-4 h-4 text-white ${isScanningAi ? 'animate-spin' : 'group-hover:rotate-12 transition-transform'}`} />
            <span>{isScanningAi ? 'AI Scanning...' : '✦ AI Auto-Detect Star'}</span>
          </button>

          {/* Add Area Button */}
          <button
            onClick={handleAddNewBox}
            className="px-3.5 py-2 rounded-xl text-xs font-bold bg-emerald-600/90 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-500/20 transition-all flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            <span>Add Area (+1)</span>
          </button>

          <button
            onClick={() => applyPreset('bottom-right-sparkle-tight')}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-dark-900 hover:bg-dark-800 text-brand-300 border border-brand-500/30 hover:border-brand-400 transition-all flex items-center gap-1.5"
            title="Tight bounding box to prevent background smearing/blur"
          >
            <Sparkle className="w-3.5 h-3.5 text-brand-cyan" />
            <span>✦ Gemini (Tight Fit)</span>
          </button>

          <button
            onClick={() => applyPreset('bottom-right-sparkle-full')}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-dark-900 hover:bg-dark-800 text-slate-300 border border-white/10 hover:border-brand-500/40 transition-all"
          >
            <span>Gemini (9:16 Full)</span>
          </button>

          <button
            onClick={() => applyPreset('top-right')}
            className="px-3 py-2 rounded-xl text-xs font-semibold bg-dark-900 hover:bg-dark-800 text-slate-300 border border-white/10 hover:border-brand-500/40 transition-all"
          >
            <span>Top-Right</span>
          </button>
        </div>
      </div>

      {/* AI Detection Toast Notice */}
      {aiDetectionMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="mb-4 p-3 rounded-xl bg-gradient-to-r from-brand-900/90 via-dark-900 to-brand-950 border border-brand-cyan/40 text-xs font-semibold text-brand-200 flex items-center gap-2 shadow-lg"
        >
          <Sparkles className="w-4 h-4 text-brand-cyan animate-spin-slow shrink-0" />
          <span>{aiDetectionMessage}</span>
        </motion.div>
      )}

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Interactive Video Player with Multi-Area Overlays */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div 
            ref={containerRef}
            className="relative rounded-2xl glass-panel p-2 sm:p-3 overflow-hidden border border-white/10 shadow-2xl bg-dark-950 flex flex-col items-center justify-center select-none"
          >
            {/* Top Toolbar Overlay */}
            <div className="w-full flex items-center justify-between pb-2 px-2 text-xs font-mono text-slate-400 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
                <span>Active Area: #{activeBoxId || 'None'} ({boxes.length} Total)</span>
              </div>
              {activeBox && (
                <div className="flex items-center gap-3">
                  <span>X: {Math.round(activeBox.x)} Y: {Math.round(activeBox.y)}</span>
                  <span>W: {Math.round(activeBox.width)} H: {Math.round(activeBox.height)}</span>
                </div>
              )}
            </div>

            {/* Canvas Container (Image or Video) with Touch Support */}
            <div 
              className="relative mt-2 w-full max-h-[68vh] rounded-xl overflow-hidden bg-black flex items-center justify-center cursor-crosshair touch-none"
              onMouseDown={handleContainerPointerDown}
              onTouchStart={handleContainerPointerDown}
              style={{
                aspectRatio: `${vidW} / ${vidH}`,
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'bottom right',
                transition: 'transform 0.2s ease-out',
                touchAction: 'none'
              }}
            >
              {isImage ? (
                <img
                  ref={videoRef}
                  crossOrigin="anonymous"
                  src={apiService.resolveMediaUrl(videoData.imageUrl || videoData.videoUrl)}
                  alt={videoData.originalName || "Uploaded image"}
                  className="w-full h-full object-contain pointer-events-none select-none"
                />
              ) : (
                <video
                  ref={videoRef}
                  crossOrigin="anonymous"
                  src={apiService.resolveMediaUrl(videoData.videoUrl)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                  className="w-full h-full object-contain pointer-events-none"
                />
              )}

              {/* RENDER ALL MULTI-SELECTION BOXES */}
              {boxes.map((b, idx) => {
                const isActive = b.id === activeBoxId;
                const bLeft = metrics.offsetX + (b.x * metrics.scaleX);
                const bTop = metrics.offsetY + (b.y * metrics.scaleY);
                const bWidth = b.width * metrics.scaleX;
                const bHeight = b.height * metrics.scaleY;

                return (
                  <div
                    key={b.id}
                    style={{
                      left: `${bLeft}px`,
                      top: `${bTop}px`,
                      width: `${bWidth}px`,
                      height: `${bHeight}px`,
                      touchAction: 'none'
                    }}
                    onMouseDown={(e) => handlePointerDown(e, 'move', b.id)}
                    onTouchStart={(e) => handlePointerDown(e, 'move', b.id)}
                    className={`absolute cursor-move transition-shadow duration-150 select-none ${
                      isActive
                        ? 'border-2 border-brand-cyan bg-brand-cyan/10 shadow-[0_0_15px_rgba(6,182,212,0.6)] z-20'
                        : 'border border-dashed border-slate-300/60 bg-white/5 hover:border-brand-400 z-10'
                    }`}
                  >
                    {/* Area Badge */}
                    <div className="absolute -top-4 -left-1 px-1.5 py-0.2 rounded bg-dark-950 text-[9px] font-mono font-bold text-brand-cyan border border-brand-cyan/40 pointer-events-none shadow">
                      #{idx + 1}
                    </div>

                    {/* Active Floating Delete Button Directly on Box */}
                    {isActive && (
                      <button
                        onMouseDown={(e) => {
                          e.stopPropagation();
                          handleDeleteActiveBox(b.id);
                        }}
                        onTouchStart={(e) => {
                          e.stopPropagation();
                          handleDeleteActiveBox(b.id);
                        }}
                        className="absolute -top-4 -right-4 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl border-2 border-white cursor-pointer z-30 transition-transform hover:scale-110 active:scale-95"
                        title="Delete this selected area"
                      >
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                      </button>
                    )}

                    {/* Active Corner Handles (Finger-Friendly Touch Hitboxes) */}
                    {isActive && (
                      <>
                        <div
                          onMouseDown={(e) => handlePointerDown(e, 'nw', b.id)}
                          onTouchStart={(e) => handlePointerDown(e, 'nw', b.id)}
                          className="absolute -top-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize z-30"
                        >
                          <span className="w-3 h-3 rounded-full bg-brand-cyan border-2 border-white shadow-md"></span>
                        </div>
                        <div
                          onMouseDown={(e) => handlePointerDown(e, 'ne', b.id)}
                          onTouchStart={(e) => handlePointerDown(e, 'ne', b.id)}
                          className="absolute -top-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize z-30"
                        >
                          <span className="w-3 h-3 rounded-full bg-brand-cyan border-2 border-white shadow-md"></span>
                        </div>
                        <div
                          onMouseDown={(e) => handlePointerDown(e, 'sw', b.id)}
                          onTouchStart={(e) => handlePointerDown(e, 'sw', b.id)}
                          className="absolute -bottom-2.5 -left-2.5 w-6 h-6 flex items-center justify-center cursor-nesw-resize z-30"
                        >
                          <span className="w-3 h-3 rounded-full bg-brand-cyan border-2 border-white shadow-md"></span>
                        </div>
                        <div
                          onMouseDown={(e) => handlePointerDown(e, 'se', b.id)}
                          onTouchStart={(e) => handlePointerDown(e, 'se', b.id)}
                          className="absolute -bottom-2.5 -right-2.5 w-6 h-6 flex items-center justify-center cursor-nwse-resize z-30"
                        >
                          <span className="w-3 h-3 rounded-full bg-brand-cyan border-2 border-white shadow-md"></span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Mobile & Touch Precision D-Pad Nudge Controls */}
            {activeBox && (
              <div className="w-full mt-2.5 p-2 rounded-xl bg-dark-900/90 border border-white/5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-300 mr-1">Nudge:</span>
                  <button 
                    onClick={() => nudgeActiveBox(0, -3)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 flex items-center justify-center border border-white/10 font-bold"
                    title="Nudge Up"
                  >
                    ⬆
                  </button>
                  <button 
                    onClick={() => nudgeActiveBox(0, 3)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 flex items-center justify-center border border-white/10 font-bold"
                    title="Nudge Down"
                  >
                    ⬇
                  </button>
                  <button 
                    onClick={() => nudgeActiveBox(-3, 0)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 flex items-center justify-center border border-white/10 font-bold"
                    title="Nudge Left"
                  >
                    ⬅
                  </button>
                  <button 
                    onClick={() => nudgeActiveBox(3, 0)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 flex items-center justify-center border border-white/10 font-bold"
                    title="Nudge Right"
                  >
                    ➡
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button 
                    onClick={() => adjustActiveBoxSize(-2)}
                    className="px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 text-xs font-semibold border border-white/10"
                    title="Shrink box"
                  >
                    Shrink (-2)
                  </button>
                  <button 
                    onClick={() => adjustActiveBoxSize(2)}
                    className="px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 text-xs font-semibold border border-white/10"
                    title="Expand box"
                  >
                    Expand (+2)
                  </button>
                </div>
              </div>
            )}

            {/* Media Controls Bar */}
            {isImage ? (
              <div className="w-full mt-3 px-2 py-1.5 flex items-center justify-between text-xs text-slate-300 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-300 font-medium">Static Photo Studio • Drag or click to place watermark boxes</span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setZoomLevel(zoomLevel === 1 ? 1.5 : zoomLevel === 1.5 ? 2 : 1)}
                    className="flex items-center gap-1 px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-mono"
                    title="Zoom in"
                  >
                    <ZoomIn className="w-3.5 h-3.5 text-brand-cyan" />
                    <span>Zoom {zoomLevel}x</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="w-full mt-3 px-2 flex flex-col gap-2">
                {/* Seekbar */}
                <div className="relative flex items-center group">
                  <input
                    type="range"
                    min="0"
                    max={duration || 100}
                    step="0.01"
                    value={currentTime}
                    onChange={handleSeek}
                    className="w-full h-1.5 bg-dark-700 rounded-lg appearance-none cursor-pointer accent-brand-500 hover:accent-brand-cyan transition-all"
                  />
                </div>

                {/* Playback Button Bar */}
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={togglePlay}
                      className="p-2 rounded-lg bg-brand-500 hover:bg-brand-600 text-white shadow-md transition-colors"
                    >
                      {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4 ml-0.5" />}
                    </button>

                    <button
                      onClick={() => stepFrame(-1)}
                      title="Previous Frame"
                      className="p-1.5 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => stepFrame(1)}
                      title="Next Frame"
                      className="p-1.5 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 hover:text-white"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    <span className="font-mono text-xs font-semibold text-slate-200">
                      {formatTime(currentTime)} / {formatTime(duration)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setZoomLevel(zoomLevel === 1 ? 1.5 : zoomLevel === 1.5 ? 2 : 1)}
                      className="flex items-center gap-1 px-2.5 py-1 rounded bg-dark-800 hover:bg-dark-700 text-slate-300 text-xs font-mono"
                      title="Zoom in"
                    >
                      <ZoomIn className="w-3.5 h-3.5 text-brand-cyan" />
                      <span>Zoom {zoomLevel}x</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Selected Areas List & Engine Settings */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* Areas List Manager */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-brand-cyan" />
                <span>Selected Areas ({boxes.length})</span>
              </h3>
              <button
                onClick={handleAddNewBox}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Box</span>
              </button>
            </div>

            {/* List of active box chips */}
            <div className="space-y-2 max-h-40 overflow-y-auto pr-1 mb-3">
              {boxes.map((b, idx) => {
                const isActive = b.id === activeBoxId;
                return (
                  <div
                    key={b.id}
                    onClick={() => setActiveBoxId(b.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border cursor-pointer transition-all ${
                      isActive
                        ? 'bg-brand-500/20 border-brand-500/50 text-white'
                        : 'bg-dark-900/60 border-white/5 text-slate-400 hover:text-white'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-dark-950 border border-brand-cyan/40 text-[10px] font-mono font-bold text-brand-cyan flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span className="text-xs font-semibold">
                        Area #{idx + 1} ({Math.round(b.width)}x{Math.round(b.height)}px)
                      </span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteActiveBox(b.id);
                      }}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 flex items-center gap-1"
                      title="Remove this area"
                    >
                      <Trash2 className="w-3 h-3" />
                      <span>Delete</span>
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Quick Action to Delete Active Box */}
            {activeBox && (
              <button
                onClick={() => handleDeleteActiveBox(activeBoxId)}
                className="w-full mb-3 py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 hover:text-rose-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected Area #{boxes.findIndex(b => b.id === activeBoxId) + 1}</span>
              </button>
            )}

            {/* Box Size Control for active area */}
            {activeBox && (
              <div className="pt-3 border-t border-white/5">
                <div className="flex justify-between text-xs text-slate-300 mb-2">
                  <span>Tighten Area #{boxes.findIndex(b => b.id === activeBoxId) + 1}</span>
                  <span className="font-mono text-brand-300 font-bold">{Math.round(activeBox.width)}x{Math.round(activeBox.height)}px</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => adjustActiveBoxSize(-4)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-dark-900 hover:bg-dark-800 border border-white/10 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1"
                  >
                    <Minimize2 className="w-3 h-3 text-brand-cyan" />
                    <span>Shrink (-4px)</span>
                  </button>
                  <button
                    onClick={() => adjustActiveBoxSize(4)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-dark-900 hover:bg-dark-800 border border-white/10 text-xs text-slate-300 hover:text-white flex items-center justify-center gap-1"
                  >
                    <Maximize2 className="w-3 h-3 text-brand-violet" />
                    <span>Expand (+4px)</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Engine Selector */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-brand-cyan" />
              <span>Restoration Engine</span>
            </h3>

            <div className="space-y-2.5">
              <label 
                onClick={() => setSelectedEngine('texture_clone')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedEngine === 'texture_clone'
                    ? 'bg-brand-500/15 border-brand-500/50 text-white shadow-lg shadow-brand-500/10 ring-1 ring-brand-cyan/40'
                    : 'bg-dark-900/40 border-white/5 text-slate-300 hover:bg-dark-900'
                }`}
              >
                <input
                  type="radio"
                  name="engine"
                  value="texture_clone"
                  checked={selectedEngine === 'texture_clone'}
                  onChange={() => setSelectedEngine('texture_clone')}
                  className="mt-1 accent-brand-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Zero-Blur Texture Match</span>
                    <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                      RECOMMENDED (NO BLUR)
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Clones adjacent real road asphalt grain seamlessly without creating any blur smudges.
                  </p>
                </div>
              </label>

              <label 
                onClick={() => setSelectedEngine('ultra_clean')}
                className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedEngine === 'ultra_clean'
                    ? 'bg-brand-500/15 border-brand-500/50 text-white shadow-lg shadow-brand-500/10'
                    : 'bg-dark-900/40 border-white/5 text-slate-300 hover:bg-dark-900'
                }`}
              >
                <input
                  type="radio"
                  name="engine"
                  value="ultra_clean"
                  checked={selectedEngine === 'ultra_clean'}
                  onChange={() => setSelectedEngine('ultra_clean')}
                  className="mt-1 accent-brand-500"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-white">Micro Delogo Inpaint</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Edge interpolation for static graphics.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Action Trigger Button */}
          <div className="p-1">
            <button
              onClick={handleStartRemoval}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan hover:from-brand-500 hover:to-brand-400 shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group"
            >
              <Sparkles className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
              <span>Remove {boxes.length > 1 ? `(${boxes.length} Areas)` : ''} & Restore {isImage ? 'Photo' : 'Video'}</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2.5 flex items-center justify-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Processes all selected areas simultaneously</span>
            </p>
          </div>

        </div>

      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR (Shown only on small screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-dark-950/95 backdrop-blur-2xl border-t border-white/10 z-50 flex items-center gap-2 shadow-2xl safe-area-bottom">
        <button
          onClick={detectGeminiWatermark}
          disabled={isScanningAi}
          className="px-3.5 py-3 rounded-xl bg-dark-900 border border-brand-cyan/40 text-brand-cyan font-bold text-xs flex items-center gap-1.5 shrink-0 active:scale-95 transition-transform"
          title="AI Auto-Detect"
        >
          <Wand2 className={`w-4 h-4 ${isScanningAi ? 'animate-spin' : ''}`} />
          <span>AI Detect</span>
        </button>

        <button
          onClick={handleStartRemoval}
          className="flex-1 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-gradient-to-r from-brand-500 via-brand-cyan to-indigo-500 shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span>Start Restore {isImage ? 'Photo' : 'Video'} ➔</span>
        </button>
      </div>
    </div>
  );
}
