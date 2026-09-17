import React, { useState, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, RotateCcw, RotateCw, Trash2,
  Sparkles, Layers, ArrowLeft,
  CheckCircle, ChevronLeft, ChevronRight,
  ZoomIn, Plus, X, Maximize2, Minimize2, Move, Crosshair
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

  // Zoom state
  const [zoomLevel, setZoomLevel] = useState(1);
  
  // Dimensions of media
  const vidW = videoData?.width || 1280;
  const vidH = videoData?.height || 720;

  // Calculate clean, compact initial box positioned directly over watermark zone
  const calcDefaultBox = (position = 'bottom-right') => {
    // Compact size: ~32-42px for tight logos and sparkle watermarks
    const baseW = Math.max(28, Math.min(48, Math.round(Math.min(vidW, vidH) * 0.055)));
    const baseH = Math.max(28, Math.min(48, Math.round(Math.min(vidW, vidH) * 0.055)));

    switch (position) {
      case 'top-right':
        return { 
          x: Math.max(0, Math.min(vidW - baseW - 4, Math.round(vidW * 0.84))), 
          y: Math.max(0, Math.min(vidH - baseH - 4, Math.round(vidH * 0.05))), 
          width: baseW, 
          height: baseH 
        };
      case 'bottom-left':
        return { 
          x: Math.max(0, Math.min(vidW - baseW - 4, Math.round(vidW * 0.05))), 
          y: Math.max(0, Math.min(vidH - baseH - 4, Math.round(vidH * 0.86))), 
          width: baseW, 
          height: baseH 
        };
      case 'top-left':
        return { 
          x: Math.max(0, Math.min(vidW - baseW - 4, Math.round(vidW * 0.05))), 
          y: Math.max(0, Math.min(vidH - baseH - 4, Math.round(vidH * 0.05))), 
          width: baseW, 
          height: baseH 
        };
      case 'bottom-right':
      default:
        // Position directly over typical bottom-right watermark (around 84% X, 86% Y)
        return { 
          x: Math.max(0, Math.min(vidW - baseW - 4, Math.round(vidW * 0.84))), 
          y: Math.max(0, Math.min(vidH - baseH - 4, Math.round(vidH * 0.86))), 
          width: baseW, 
          height: baseH 
        };
    }
  };

  // MULTI-AREA BOXES STATE (default to 1 small compact box)
  const [boxes, setBoxes] = useState(() => [
    { id: 1, ...calcDefaultBox('bottom-right') }
  ]);
  const [activeBoxId, setActiveBoxId] = useState(1);
  const [history, setHistory] = useState([[ { id: 1, ...calcDefaultBox('bottom-right') } ]]);
  const [historyIndex, setHistoryIndex] = useState(0);

  // Dragging & Resizing state
  const [isDragging, setIsDragging] = useState(false);
  const [dragHandle, setDragHandle] = useState(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, boxX: 0, boxY: 0, boxW: 0, boxH: 0 });

  // Engine: default to ultra_clean delogo inpainting
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
    const offset = (boxes.length * 25) % 120;
    const baseSize = Math.max(32, Math.min(48, Math.round(Math.min(vidW, vidH) * 0.055)));

    const newBox = {
      id: nextId,
      x: Math.max(10, Math.min(vidW - baseSize - 10, vidW / 2 - baseSize / 2 + offset)),
      y: Math.max(10, Math.min(vidH - baseSize - 10, vidH / 2 - baseSize / 2 + offset)),
      width: baseSize,
      height: baseSize
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

  const applyPresetPosition = (position) => {
    const coords = calcDefaultBox(position);
    if (boxes.length === 0) {
      const newBox = { id: 1, ...coords };
      setBoxes([newBox]);
      setActiveBoxId(1);
      pushState([newBox]);
      return;
    }

    const newBoxes = boxes.map(b => (b.id === activeBoxId ? { ...b, ...coords } : b));
    setBoxes(newBoxes);
    pushState(newBoxes);
  };

  const setBoxFixedSize = (targetW, targetH) => {
    const activeBox = boxes.find(b => b.id === activeBoxId);
    if (!activeBox) return;

    const w = Math.max(16, Math.min(vidW - activeBox.x - 2, targetW));
    const h = Math.max(16, Math.min(vidH - activeBox.y - 2, targetH));

    const newBoxes = boxes.map(b => b.id === activeBoxId ? { ...b, width: w, height: h } : b);
    setBoxes(newBoxes);
    pushState(newBoxes);
  };

  const adjustActiveBoxSize = (delta) => {
    const activeBox = boxes.find(b => b.id === activeBoxId);
    if (!activeBox) return;

    const newW = Math.max(16, Math.min(vidW - activeBox.x - 2, activeBox.width + delta));
    const newH = Math.max(16, Math.min(vidH - activeBox.y - 2, activeBox.height + delta));
    
    const newBoxes = boxes.map(b => b.id === activeBoxId ? { ...b, width: newW, height: newH } : b);
    setBoxes(newBoxes);
    pushState(newBoxes);
  };

  const nudgeActiveBox = (dx, dy) => {
    const activeBox = boxes.find(b => b.id === activeBoxId);
    if (!activeBox) return;

    const newX = Math.max(2, Math.min(vidW - activeBox.width - 2, activeBox.x + dx));
    const newY = Math.max(2, Math.min(vidH - activeBox.height - 2, activeBox.y + dy));

    const newBoxes = boxes.map(b => b.id === activeBoxId ? { ...b, x: newX, y: newY } : b);
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
    if (!isDragging || !containerRef.current || activeBoxId === null) return;
    if (e.cancelable && e.type === 'touchmove') e.preventDefault();

    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const pos = getPointerPos(e);

    // Delta converted to original video/image coordinates
    const deltaX = ((pos.clientX - dragStart.x) / (rect.width * zoomLevel)) * vidW;
    const deltaY = ((pos.clientY - dragStart.y) / (rect.height * zoomLevel)) * vidH;

    const targetBox = boxes.find(b => b.id === activeBoxId);
    if (!targetBox) return;

    let updated = { ...targetBox };

    if (dragHandle === 'move') {
      updated.x = Math.max(2, Math.min(vidW - targetBox.width - 2, dragStart.boxX + deltaX));
      updated.y = Math.max(2, Math.min(vidH - targetBox.height - 2, dragStart.boxY + deltaY));
    } else if (dragHandle === 'se') {
      updated.width = Math.max(16, Math.min(vidW - targetBox.x - 2, dragStart.boxW + deltaX));
      updated.height = Math.max(16, Math.min(vidH - targetBox.y - 2, dragStart.boxH + deltaY));
    } else if (dragHandle === 'nw') {
      const maxX = dragStart.boxX + dragStart.boxW - 16;
      const maxY = dragStart.boxY + dragStart.boxH - 16;
      updated.x = Math.max(2, Math.min(maxX, dragStart.boxX + deltaX));
      updated.y = Math.max(2, Math.min(maxY, dragStart.boxY + deltaY));
      updated.width = dragStart.boxW - (updated.x - dragStart.boxX);
      updated.height = dragStart.boxH - (updated.y - dragStart.boxY);
    } else if (dragHandle === 'ne') {
      const maxY = dragStart.boxY + dragStart.boxH - 16;
      updated.y = Math.max(2, Math.min(maxY, dragStart.boxY + deltaY));
      updated.width = Math.max(16, Math.min(vidW - targetBox.x - 2, dragStart.boxW + deltaX));
      updated.height = dragStart.boxH - (updated.y - dragStart.boxY);
    } else if (dragHandle === 'sw') {
      const maxX = dragStart.boxX + dragStart.boxW - 16;
      updated.x = Math.max(2, Math.min(maxX, dragStart.boxX + deltaX));
      updated.width = dragStart.boxW - (updated.x - dragStart.boxX);
      updated.height = Math.max(16, Math.min(vidH - targetBox.y - 2, dragStart.boxH + deltaY));
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

  // Tap / Click on canvas directly repositions active box center to tap location
  const handleContainerPointerDown = (e) => {
    if (isDragging || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    const pos = getPointerPos(e);
    const clickVideoX = ((pos.clientX - rect.left) / rect.width) * vidW;
    const clickVideoY = ((pos.clientY - rect.top) / rect.height) * vidH;

    if (clickVideoX < 0 || clickVideoX > vidW || clickVideoY < 0 || clickVideoY > vidH) return;

    const baseSize = Math.max(28, Math.min(48, Math.round(Math.min(vidW, vidH) * 0.055)));

    if (boxes.length === 0) {
      const newBox = {
        id: 1,
        x: Math.max(2, Math.min(vidW - baseSize - 2, clickVideoX - baseSize / 2)),
        y: Math.max(2, Math.min(vidH - baseSize - 2, clickVideoY - baseSize / 2)),
        width: baseSize,
        height: baseSize
      };
      setBoxes([newBox]);
      setActiveBoxId(1);
      pushState([newBox]);
    } else if (activeBoxId) {
      const targetBox = boxes.find(b => b.id === activeBoxId);
      if (targetBox) {
        const updated = {
          ...targetBox,
          x: Math.max(2, Math.min(vidW - targetBox.width - 2, clickVideoX - targetBox.width / 2)),
          y: Math.max(2, Math.min(vidH - targetBox.height - 2, clickVideoY - targetBox.height / 2))
        };
        const newBoxes = boxes.map(b => b.id === activeBoxId ? updated : b);
        setBoxes(newBoxes);
        pushState(newBoxes);
      }
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
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
        type: 'rect'
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

        {/* Quick History Controls */}
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

      {/* QUICK PRESET & POSITION BAR */}
      <div className="mb-6 p-4 rounded-2xl glass-panel border border-white/10 bg-dark-900/90 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-brand-500/20 border border-brand-500/30 flex items-center justify-center shrink-0">
            <Move className="w-4 h-4 text-brand-cyan" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Watermark Box Position & Size</span>
              <span className="px-2 py-0.2 text-[9px] font-bold bg-brand-cyan/20 text-brand-cyan border border-brand-cyan/30 rounded uppercase">
                {boxes.length} {boxes.length === 1 ? 'Area' : 'Areas'}
              </span>
            </h4>
            <p className="text-xs text-slate-300">
              Tap anywhere on the image to place the box over the logo:
            </p>
          </div>
        </div>

        {/* Quick Position Snap Presets */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
          <button
            onClick={() => applyPresetPosition('bottom-right')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-brand-300 border border-brand-500/30 hover:border-brand-400 transition-all"
          >
            📍 Bottom-Right (Gemini)
          </button>
          <button
            onClick={() => applyPresetPosition('top-right')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-slate-300 border border-white/10 hover:border-brand-500/40 transition-all"
          >
            📍 Top-Right
          </button>
          <button
            onClick={() => applyPresetPosition('bottom-left')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-slate-300 border border-white/10 hover:border-brand-500/40 transition-all"
          >
            📍 Bottom-Left
          </button>
          <button
            onClick={() => applyPresetPosition('top-left')}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-dark-800 hover:bg-dark-700 text-slate-300 border border-white/10 hover:border-brand-500/40 transition-all"
          >
            📍 Top-Left
          </button>
          <button
            onClick={handleAddNewBox}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-emerald-600/90 hover:bg-emerald-500 text-white shadow transition-all flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Box</span>
          </button>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Column: Interactive Video/Image Canvas with Multi-Area Overlays */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div 
            className="relative rounded-2xl glass-panel p-2 sm:p-3 overflow-hidden border border-white/10 shadow-2xl bg-dark-950 flex flex-col items-center justify-center select-none"
          >
            {/* Top Toolbar Overlay */}
            <div className="w-full flex items-center justify-between pb-2 px-2 text-xs font-mono text-slate-400 border-b border-white/5">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-brand-cyan animate-pulse"></span>
                <span>Active Box: #{activeBoxId || 'None'}</span>
              </div>
              {activeBox && (
                <div className="flex items-center gap-3">
                  <span>X: {Math.round(activeBox.x)} Y: {Math.round(activeBox.y)}</span>
                  <span className="text-brand-300 font-bold">W: {Math.round(activeBox.width)} H: {Math.round(activeBox.height)}px</span>
                </div>
              )}
            </div>

            {/* Canvas Container with Pixel-Perfect Aspect Ratio & Percentage Coordinates */}
            <div 
              ref={containerRef}
              className="relative mt-2 mx-auto rounded-xl overflow-hidden bg-black flex items-center justify-center cursor-crosshair touch-none select-none shadow-2xl"
              onMouseDown={handleContainerPointerDown}
              onTouchStart={handleContainerPointerDown}
              style={{
                aspectRatio: `${vidW} / ${vidH}`,
                maxHeight: '68vh',
                maxWidth: '100%',
                transform: `scale(${zoomLevel})`,
                transformOrigin: 'bottom right',
                transition: 'transform 0.2s ease-out',
                touchAction: 'none'
              }}
            >
              {isImage ? (
                <img
                  ref={videoRef}
                  src={apiService.resolveMediaUrl(videoData.imageUrl || videoData.videoUrl)}
                  alt={videoData.originalName || "Uploaded image"}
                  className="w-full h-full block object-contain pointer-events-none select-none"
                />
              ) : (
                <video
                  ref={videoRef}
                  src={apiService.resolveMediaUrl(videoData.videoUrl)}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  playsInline
                  className="w-full h-full block object-contain pointer-events-none"
                />
              )}

              {/* RENDER ALL MULTI-SELECTION BOXES WITH PERCENTAGE ACCURACY */}
              {boxes.map((b, idx) => {
                const isActive = b.id === activeBoxId;
                const leftPercent = (b.x / vidW) * 100;
                const topPercent = (b.y / vidH) * 100;
                const widthPercent = (b.width / vidW) * 100;
                const heightPercent = (b.height / vidH) * 100;

                return (
                  <div
                    key={b.id}
                    style={{
                      left: `${leftPercent}%`,
                      top: `${topPercent}%`,
                      width: `${widthPercent}%`,
                      height: `${heightPercent}%`,
                      touchAction: 'none'
                    }}
                    onMouseDown={(e) => handlePointerDown(e, 'move', b.id)}
                    onTouchStart={(e) => handlePointerDown(e, 'move', b.id)}
                    className={`absolute cursor-move transition-shadow duration-150 select-none ${
                      isActive
                        ? 'border-2 border-brand-cyan bg-brand-cyan/25 shadow-[0_0_15px_rgba(6,182,212,0.8)] z-20'
                        : 'border border-dashed border-slate-300/70 bg-white/10 hover:border-brand-400 z-10'
                    }`}
                  >
                    {/* Area Badge */}
                    <div className="absolute -top-4 -left-1 px-1.5 py-0.2 rounded bg-dark-950 text-[9px] font-mono font-bold text-brand-cyan border border-brand-cyan/40 pointer-events-none shadow">
                      #{idx + 1}
                    </div>

                    {/* Active Floating Delete Button */}
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
                        className="absolute -top-3.5 -right-3.5 w-6 h-6 rounded-full bg-rose-600 hover:bg-rose-500 text-white flex items-center justify-center shadow-xl border-2 border-white cursor-pointer z-30 transition-transform hover:scale-110 active:scale-95"
                        title="Delete box"
                      >
                        <X className="w-3 h-3 stroke-[3]" />
                      </button>
                    )}

                    {/* Active Corner Handles for Resizing */}
                    {isActive && (
                      <>
                        <div
                          onMouseDown={(e) => handlePointerDown(e, 'nw', b.id)}
                          onTouchStart={(e) => handlePointerDown(e, 'nw', b.id)}
                          className="absolute -top-3 -left-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-30"
                        >
                          <span className="w-3.5 h-3.5 rounded-full bg-brand-cyan border-2 border-white shadow-md"></span>
                        </div>
                        <div
                          onMouseDown={(e) => handlePointerDown(e, 'ne', b.id)}
                          onTouchStart={(e) => handlePointerDown(e, 'ne', b.id)}
                          className="absolute -top-3 -right-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-30"
                        >
                          <span className="w-3.5 h-3.5 rounded-full bg-brand-cyan border-2 border-white shadow-md"></span>
                        </div>
                        <div
                          onMouseDown={(e) => handlePointerDown(e, 'sw', b.id)}
                          onTouchStart={(e) => handlePointerDown(e, 'sw', b.id)}
                          className="absolute -bottom-3 -left-3 w-7 h-7 flex items-center justify-center cursor-nesw-resize z-30"
                        >
                          <span className="w-3.5 h-3.5 rounded-full bg-brand-cyan border-2 border-white shadow-md"></span>
                        </div>
                        <div
                          onMouseDown={(e) => handlePointerDown(e, 'se', b.id)}
                          onTouchStart={(e) => handlePointerDown(e, 'se', b.id)}
                          className="absolute -bottom-3 -right-3 w-7 h-7 flex items-center justify-center cursor-nwse-resize z-30"
                        >
                          <span className="w-3.5 h-3.5 rounded-full bg-brand-cyan border-2 border-white shadow-md"></span>
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Precision D-Pad Nudge & Size Controls */}
            {activeBox && (
              <div className="w-full mt-2.5 p-2 rounded-xl bg-dark-900/90 border border-white/5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-slate-300 mr-1">Move:</span>
                  <button 
                    onClick={() => nudgeActiveBox(0, -4)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 flex items-center justify-center border border-white/10 font-bold text-xs"
                    title="Nudge Up"
                  >
                    ⬆
                  </button>
                  <button 
                    onClick={() => nudgeActiveBox(0, 4)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 flex items-center justify-center border border-white/10 font-bold text-xs"
                    title="Nudge Down"
                  >
                    ⬇
                  </button>
                  <button 
                    onClick={() => nudgeActiveBox(-4, 0)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 flex items-center justify-center border border-white/10 font-bold text-xs"
                    title="Nudge Left"
                  >
                    ⬅
                  </button>
                  <button 
                    onClick={() => nudgeActiveBox(4, 0)}
                    className="w-8 h-8 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 flex items-center justify-center border border-white/10 font-bold text-xs"
                    title="Nudge Right"
                  >
                    ➡
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-300 mr-1">Size:</span>
                  <button 
                    onClick={() => adjustActiveBoxSize(-4)}
                    className="px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 text-xs font-semibold border border-white/10 flex items-center gap-1"
                    title="Shrink box"
                  >
                    <Minimize2 className="w-3 h-3 text-brand-cyan" />
                    <span>Shrink (-4)</span>
                  </button>
                  <button 
                    onClick={() => adjustActiveBoxSize(4)}
                    className="px-2.5 py-1.5 rounded-lg bg-dark-800 hover:bg-dark-700 active:bg-brand-500 text-slate-200 text-xs font-semibold border border-white/10 flex items-center gap-1"
                    title="Expand box"
                  >
                    <Maximize2 className="w-3 h-3 text-brand-cyan" />
                    <span>Expand (+4)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Media Controls Bar */}
            {isImage ? (
              <div className="w-full mt-3 px-2 py-1.5 flex items-center justify-between text-xs text-slate-300 border-t border-white/5">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span className="text-slate-300 font-medium">Photo Studio • Tap or drag box onto watermark</span>
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

        {/* Right Column: Box Controls & Remove Button */}
        <div className="lg:col-span-4 flex flex-col gap-5">
          
          {/* Quick Size Presets */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <h3 className="text-sm font-bold text-white mb-2 flex items-center justify-between">
              <span>Box Size Presets</span>
              {activeBox && (
                <span className="text-xs font-mono text-brand-300 font-bold">
                  {Math.round(activeBox.width)}x{Math.round(activeBox.height)}px
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mb-3">
              Keep the box small to avoid unnecessary blurring:
            </p>

            <div className="grid grid-cols-3 gap-2">
              <button
                onClick={() => setBoxFixedSize(30, 32)}
                className="py-2 px-2 rounded-xl bg-dark-900 hover:bg-dark-850 border border-brand-500/40 text-brand-200 text-xs font-semibold text-center hover:border-brand-400 transition-all"
              >
                <div className="text-[10px] text-slate-400">Gemini Star</div>
                <div className="font-bold text-xs mt-0.5">Small (30px)</div>
              </button>

              <button
                onClick={() => setBoxFixedSize(50, 50)}
                className="py-2 px-2 rounded-xl bg-dark-900 hover:bg-dark-850 border border-white/10 text-slate-200 text-xs font-semibold text-center hover:border-brand-500/40 transition-all"
              >
                <div className="text-[10px] text-slate-400">Standard Logo</div>
                <div className="font-bold text-xs mt-0.5">Medium (50px)</div>
              </button>

              <button
                onClick={() => setBoxFixedSize(110, 36)}
                className="py-2 px-2 rounded-xl bg-dark-900 hover:bg-dark-850 border border-white/10 text-slate-200 text-xs font-semibold text-center hover:border-brand-500/40 transition-all"
              >
                <div className="text-[10px] text-slate-400">Text Watermark</div>
                <div className="font-bold text-xs mt-0.5">Wide (110x36)</div>
              </button>
            </div>
          </div>

          {/* Areas List Manager */}
          <div className="glass-panel p-5 rounded-2xl border border-white/10">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Layers className="w-4 h-4 text-brand-cyan" />
                <span>Selected Areas ({boxes.length})</span>
              </h3>
              <button
                onClick={handleAddNewBox}
                className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Area</span>
              </button>
            </div>

            {/* List of active box chips */}
            <div className="space-y-2 max-h-44 overflow-y-auto pr-1 mb-3">
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
                className="w-full py-2 px-3 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-xs font-semibold text-rose-300 hover:text-rose-200 transition-all flex items-center justify-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected Box #{boxes.findIndex(b => b.id === activeBoxId) + 1}</span>
              </button>
            )}
          </div>

          {/* Action Trigger Button */}
          <div className="p-1">
            <button
              onClick={handleStartRemoval}
              className="w-full py-4 px-6 rounded-2xl font-bold text-sm text-white bg-gradient-to-r from-brand-600 via-brand-500 to-brand-cyan hover:from-brand-500 hover:to-brand-400 shadow-xl shadow-brand-500/30 hover:shadow-brand-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2.5 group cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-white group-hover:rotate-12 transition-transform" />
              <span>Remove Watermark & Restore {isImage ? 'Photo' : 'Video'}</span>
            </button>
            <p className="text-[11px] text-center text-slate-400 mt-2.5 flex items-center justify-center gap-1">
              <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
              <span>Instant, clean watermark removal</span>
            </p>
          </div>

        </div>

      </div>

      {/* MOBILE STICKY BOTTOM ACTION BAR (Shown only on small screens) */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-dark-950/95 backdrop-blur-2xl border-t border-white/10 z-50 flex items-center gap-2 shadow-2xl safe-area-bottom">
        <button
          onClick={handleStartRemoval}
          className="w-full py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-brand-500 via-brand-cyan to-indigo-500 shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 active:scale-95 transition-transform"
        >
          <Sparkles className="w-4 h-4 text-white" />
          <span>Remove Watermark & Restore ➔</span>
        </button>
      </div>
    </div>
  );
}
