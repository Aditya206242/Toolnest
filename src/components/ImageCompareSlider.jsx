import { useState, useEffect, useRef } from 'react';
import { 
  ZoomIn, ZoomOut, Maximize2, Minimize2, Move, X, RefreshCw 
} from 'lucide-react';

export default function ImageCompareSlider({
  beforeImage,
  afterImage,
  beforeLabel = 'Original',
  afterLabel = 'Compressed',
  onClose
}) {
  const containerRef = useRef(null);
  const viewportRef = useRef(null);

  // Layout & Transform states
  const [sliderPosition, setSliderPosition] = useState(50); // percentage (0 - 100)
  const [zoom, setZoom] = useState(1); // scale factor (0.5 to 8)
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Interaction tracking
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isPanning, setIsPanning] = useState(false);
  const startPointerRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });

  // 1. Keyboard Accessibility hotkeys
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        setSliderPosition(prev => Math.max(0, prev - 2));
      } else if (e.key === 'ArrowRight') {
        setSliderPosition(prev => Math.min(100, prev + 2));
      } else if (e.key === '=' || e.key === '+') {
        adjustZoom(0.2);
      } else if (e.key === '-') {
        adjustZoom(-0.2);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [zoom]);

  // Adjust zoom scales
  const adjustZoom = (delta) => {
    setZoom(prev => Math.min(8, Math.max(0.5, parseFloat((prev + delta).toFixed(2)))));
  };

  const handleReset = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setSliderPosition(50);
  };

  // Fullscreen toggle handler
  const handleFullscreenToggle = () => {
    if (!containerRef.current) return;

    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error('Fullscreen error:', err.message));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  // Sync fullscreen state if user exits via ESC
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // 2. Drag & Slide events handler using unified Pointer Events API
  const handleSliderPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSlider(true);
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handleViewportPointerDown = (e) => {
    // Left click or touch down only
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    setIsPanning(true);
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    startPanRef.current = { x: panX, y: panY };
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (isDraggingSlider && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const percentage = Math.min(100, Math.max(0, (clientX / rect.width) * 100));
      setSliderPosition(percentage);
    } else if (isPanning) {
      const dx = e.clientX - startPointerRef.current.x;
      const dy = e.clientY - startPointerRef.current.y;
      setPanX(startPanRef.current.x + dx);
      setPanY(startPanRef.current.y + dy);
    }
  };

  const handlePointerUp = (e) => {
    if (isDraggingSlider) {
      setIsDraggingSlider(false);
      containerRef.current?.releasePointerCapture(e.pointerId);
    } else if (isPanning) {
      setIsPanning(false);
      viewportRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.1 : -0.1;
    adjustZoom(delta);
  };

  return (
    <div 
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      className="fixed inset-0 z-50 bg-slate-950/98 text-slate-100 flex flex-col justify-between select-none"
    >
      
      {/* 1. Header Toolbar */}
      <header className="p-4 border-b border-slate-900 bg-slate-950 flex items-center justify-between shrink-0">
        <div>
          <h2 className="text-sm font-extrabold tracking-wider uppercase bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
            Side-By-Side Visual Comparison
          </h2>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
            Pinch/Scroll to zoom • Drag to pan • Slide center bar to compare details
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Quick labels info */}
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-850 text-[10px] font-extrabold">
            <span className="h-2 w-2 rounded-full bg-slate-400" /> {beforeLabel}
          </span>
          <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-850 text-[10px] font-extrabold">
            <span className="h-2 w-2 rounded-full bg-violet-500" /> {afterLabel}
          </span>

          <button
            onClick={onClose}
            className="p-2.5 rounded-xl border border-slate-900 bg-slate-950 hover:bg-red-650 hover:text-white transition"
            title="Close comparison"
          >
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* 2. Interactive Viewport Area */}
      <div 
        ref={viewportRef}
        onPointerDown={handleViewportPointerDown}
        onWheel={handleWheel}
        className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center bg-slate-950"
      >
        <div 
          className="absolute w-full h-full flex items-center justify-center transition-transform duration-75"
          style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
        >
          {/* Base Layer: Before Image */}
          <div className="max-w-[85vw] max-h-[70vh] aspect-auto relative">
            <img 
              src={beforeImage} 
              alt="Before" 
              className="max-w-full max-h-[70vh] object-contain select-none pointer-events-none"
            />
          </div>

          {/* Absolute Top Layer: After Image, Clipped */}
          <div 
            className="absolute max-w-[85vw] max-h-[70vh] aspect-auto overflow-hidden pointer-events-none"
            style={{ clipPath: `inset(0px 0px 0px ${sliderPosition}%)` }}
          >
            <img 
              src={afterImage} 
              alt="After" 
              className="max-w-full max-h-[70vh] object-contain select-none pointer-events-none"
            />
          </div>
        </div>

        {/* Vertical Separator line & Slider circle handles */}
        <div 
          className="absolute inset-y-0 w-1 bg-violet-500 cursor-ew-resize pointer-events-auto"
          style={{ left: `${sliderPosition}%` }}
        >
          <button
            onPointerDown={handleSliderPointerDown}
            className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 p-3 rounded-full border-4 shadow-xl bg-violet-650 text-white transition-transform ${
              isDraggingSlider ? 'scale-110 border-white bg-violet-700' : 'border-violet-500 bg-violet-600 hover:scale-105'
            }`}
            aria-label="Drag middle comparison bar"
          >
            <Move className="h-4 w-4" />
          </button>
        </div>

        {/* Floating Size labels */}
        <div className="absolute top-4 left-4 p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 pointer-events-none">
          <span className="text-[10px] font-extrabold text-slate-400 block tracking-wider uppercase">Original</span>
          <span className="text-xs font-black text-white">{beforeLabel}</span>
        </div>
        <div className="absolute top-4 right-4 p-2 rounded-lg bg-violet-950/60 backdrop-blur-md border border-violet-500/20 pointer-events-none text-right">
          <span className="text-[10px] font-extrabold text-violet-400 block tracking-wider uppercase">Compressed</span>
          <span className="text-xs font-black text-white">{afterLabel}</span>
        </div>
      </div>

      {/* 3. Floating Bottom Toolbar */}
      <footer className="p-4 border-t border-slate-900 bg-slate-950 shrink-0 flex justify-center items-center gap-3">
        <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900 border border-slate-850">
          <button
            onClick={() => adjustZoom(-0.25)}
            className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Zoom Out (-)"
          >
            <ZoomOut className="h-4.5 w-4.5" />
          </button>
          
          <span className="text-xs font-extrabold px-3 text-slate-400 select-none">
            {Math.round(zoom * 100)}%
          </span>

          <button
            onClick={() => adjustZoom(0.25)}
            className="p-2.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition"
            title="Zoom In (+)"
          >
            <ZoomIn className="h-4.5 w-4.5" />
          </button>
        </div>

        <button
          onClick={handleReset}
          className="p-3.5 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-2 text-xs font-bold"
          title="Fit bounds and center screen"
        >
          <RefreshCw className="h-4 w-4" /> Reset
        </button>

        <button
          onClick={handleFullscreenToggle}
          className="p-3.5 rounded-xl border border-slate-850 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-2 text-xs font-bold"
          title="Fullscreen compare"
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
          <span className="hidden sm:inline">Fullscreen</span>
        </button>
      </footer>

    </div>
  );
}
