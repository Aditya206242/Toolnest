import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, CheckCircle, AlertTriangle, Play, Sparkles, 
  Download, FileImage, Layers, RotateCw, RotateCcw, 
  Undo, ZoomIn, ZoomOut, Move, Eye, Check, Trash2, HelpCircle, X
} from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import { useImage } from '../hooks/useImage';
import api from '../utils/api';

const PRESET_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
  { name: 'Slate Grey', value: '#475569' },
  { name: 'Off-White', value: '#f8fafc' },
  { name: 'Royal Blue', value: '#2563eb' },
  { name: 'Ruby Red', value: '#dc2626' },
  { name: 'Emerald Green', value: '#16a34a' }
];

export default function ImageRotateWorkspace({ onBack }) {
  const { loadImage, downloadBlob } = useImage();

  // Queue state
  const [imagesQueue, setImagesQueue] = useState([]); // [{ id, file, previewUrl, name, size }]
  const [activeImage, setActiveImage] = useState(null);

  // Rotation parameters
  const [degrees, setDegrees] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [flipVertical, setFlipVertical] = useState(false);
  const [keepTransparency, setKeepTransparency] = useState(true);
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [preserveMetadata, setPreserveMetadata] = useState(true);
  const [quality, setQuality] = useState(90);

  // Preview viewport options
  const [viewMode, setViewMode] = useState('transformed'); // 'transformed', 'original', 'compare'
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Processing indicators
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Limits tracking
  const [isAllowed, setIsAllowed] = useState(true);
  const [usageStats, setUsageStats] = useState({ limit: 10, usage: 0 });

  // References
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [loadedImgEl, setLoadedImgEl] = useState(null);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/tools/limits', {
          params: { toolSlug: 'image-rotate' }
        });
        const { allowed, limit, usage } = response.data;
        setIsAllowed(allowed);
        setUsageStats({ limit, usage });
      } catch (error) {
        console.warn('Could not retrieve user limit status.', error.message);
      }
    };
    fetchLimits();
  }, []);

  // Toggle fullscreen layout class when queue changes
  useEffect(() => {
    if (imagesQueue.length > 0) {
      document.documentElement.classList.add('hide-site-layout');
    } else {
      document.documentElement.classList.remove('hide-site-layout');
    }
    return () => {
      document.documentElement.classList.remove('hide-site-layout');
    };
  }, [imagesQueue]);

  // Keyboard Shortcuts Hook
  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (document.activeElement && (
        document.activeElement.tagName === 'INPUT' ||
        document.activeElement.tagName === 'TEXTAREA' ||
        document.activeElement.isContentEditable
      )) {
        return;
      }

      const key = e.key.toLowerCase();
      if (key === 'r') {
        e.preventDefault();
        setDegrees(prev => (prev + 90) % 360);
      } else if (key === 'l') {
        e.preventDefault();
        setDegrees(prev => (prev - 90) % 360);
      } else if (key === 'h') {
        e.preventDefault();
        setFlipHorizontal(prev => !prev);
      } else if (key === 'v') {
        e.preventDefault();
        setFlipVertical(prev => !prev);
      } else if (key === 't') {
        e.preventDefault();
        setKeepTransparency(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => {
      window.removeEventListener('keydown', handleGlobalKeyDown);
    };
  }, []);

  // Update active image queue changes
  const handleImagesSelected = (queue) => {
    setImagesQueue(queue);
    if (queue.length > 0) {
      if (!activeImage || !queue.some(img => img.id === activeImage.id)) {
        setActiveImage(queue[0]);
      }
    } else {
      setActiveImage(null);
    }
  };

  // Load preview element
  useEffect(() => {
    if (!activeImage) {
      setLoadedImgEl(null);
      return;
    }
    let isCurrent = true;
    loadImage(activeImage.previewUrl)
      .then((imgEl) => {
        if (isCurrent) {
          setLoadedImgEl(imgEl);
        }
      })
      .catch((err) => {
        console.error('[Preview Load Error]', err);
        if (isCurrent) {
          setLoadedImgEl({ unavailable: true, name: activeImage.name });
        }
      });
    return () => {
      isCurrent = false;
    };
  }, [activeImage, loadImage]);

  // Redraw Canvas preview
  useEffect(() => {
    if (!loadedImgEl || loadedImgEl.unavailable || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const rad = (degrees * Math.PI) / 180;
    const w = loadedImgEl.naturalWidth;
    const h = loadedImgEl.naturalHeight;

    // Compute dimensions that can fully fit the rotated canvas
    let newW = w;
    let newH = h;
    if (degrees % 180 === 90 || degrees % 180 === -90) {
      newW = h;
      newH = w;
    } else if (degrees % 180 !== 0) {
      newW = Math.abs(w * Math.cos(rad)) + Math.abs(h * Math.sin(rad));
      newH = Math.abs(w * Math.sin(rad)) + Math.abs(h * Math.cos(rad));
    }

    canvas.width = newW;
    canvas.height = newH;

    // Clear frame
    ctx.clearRect(0, 0, newW, newH);

    // Apply color fill if transparency is unchecked
    if (!keepTransparency) {
      ctx.fillStyle = backgroundColor;
      ctx.fillRect(0, 0, newW, newH);
    }

    ctx.save();
    ctx.translate(newW / 2, newH / 2);
    // Scale for flips, then rotate around center coordinates
    ctx.scale(flipHorizontal ? -1 : 1, flipVertical ? -1 : 1);
    ctx.rotate(rad);
    ctx.drawImage(loadedImgEl, -w / 2, -h / 2, w, h);
    ctx.restore();
  }, [loadedImgEl, degrees, flipHorizontal, flipVertical, keepTransparency, backgroundColor]);

  // Reset transforms
  const handleReset = () => {
    setDegrees(0);
    setFlipHorizontal(false);
    setFlipVertical(false);
    setKeepTransparency(true);
    setBackgroundColor('#ffffff');
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
  };

  // Dragging event handlers for panning
  const handleMouseDown = (e) => {
    if (e.button !== 0) return; // Only left click
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const changeZoom = (factor) => {
    setZoom(prev => Math.min(5, Math.max(0.5, prev + factor)));
  };

  const removeImage = (id) => {
    const updatedQueue = imagesQueue.filter(img => img.id !== id);
    setImagesQueue(updatedQueue);
    if (updatedQueue.length > 0) {
      if (activeImage.id === id) {
        setActiveImage(updatedQueue[0]);
      }
    } else {
      setActiveImage(null);
    }
  };

  // Submit to Backend
  const handleRotateExecute = async (processAll = false) => {
    if (imagesQueue.length === 0) return;
    setIsProcessing(true);
    setUploadPercent(0);
    setErrorMessage('');
    setSuccessMessage('');
 
    try {
      const formData = new FormData();
      formData.append('degrees', degrees.toString());
      formData.append('flipHorizontal', flipHorizontal ? 'true' : 'false');
      formData.append('flipVertical', flipVertical ? 'true' : 'false');
      formData.append('keepTransparency', keepTransparency ? 'true' : 'false');
      formData.append('backgroundColor', backgroundColor);
      formData.append('preserveMetadata', preserveMetadata ? 'true' : 'false');
      formData.append('quality', quality.toString());
 
      if (processAll) {
        // Append all files for array key
        imagesQueue.forEach((img) => {
          formData.append('files', img.file);
        });
 
        const response = await api.post('/image/rotate-batch', formData, {
          responseType: 'blob',
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percent);
          }
        });
 
        downloadBlob(response.data, `rotated_batch_${Date.now()}.zip`);
        setSuccessMessage('Batch rotated successfully! ZIP archive downloaded.');
      } else {
        if (!activeImage) throw new Error('No active image selected.');
        formData.append('file', activeImage.file);
 
        const response = await api.post('/image/rotate', formData, {
          responseType: 'blob',
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percent);
          }
        });
 
        let ext = activeImage.name.split('.').pop();
        const contentType = response.headers['content-type'] || '';
        if (contentType.includes('image/png')) ext = 'png';
        else if (contentType.includes('image/jpeg')) ext = 'jpg';
        else if (contentType.includes('image/webp')) ext = 'webp';
        else if (contentType.includes('image/avif')) ext = 'avif';
        else if (contentType.includes('image/gif')) ext = 'gif';
        else if (contentType.includes('image/tiff')) ext = 'tiff';
        else if (contentType.includes('image/heif') || contentType.includes('image/heic')) ext = 'heic';

        const nameWithoutExt = activeImage.name.substring(0, activeImage.name.lastIndexOf('.'));
        downloadBlob(response.data, `rotated_${nameWithoutExt}.${ext}`);
        setSuccessMessage('Image rotated and downloaded successfully!');
      }
 
      // Log metrics
      try {
        await api.post('/tools/log', { toolSlug: 'image-rotate' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Logging usage failed.', logErr.message);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error occurred during image rotation.');
    } finally {
      setIsProcessing(false);
      setUploadPercent(0);
    }
  };

  const checkerboardBgStyle = {
    backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#f8fafc'
  };

  const handleExitWorkspace = () => {
    if (imagesQueue.length > 0) {
      setImagesQueue([]);
    } else {
      onBack();
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 text-slate-100 p-8 pt-20 overflow-y-auto select-none dark relative">
      {/* Floating Pink Circular Exit Cross Button */}
      <button
        onClick={handleExitWorkspace}
        className="absolute top-4 left-4 z-50 flex items-center justify-center h-12 w-12 rounded-full bg-pink-600 hover:bg-pink-700 active:scale-95 transition-all text-white shadow-xl cursor-pointer border border-pink-500/20"
        title="Exit / Go Back"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Paywall Banner */}
      {!isAllowed && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-4 text-sm leading-relaxed mb-6">
          <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-slate-200">Daily limit exceeded!</span>
            <p className="mt-1 text-slate-400">
              Please sign in or upgrade to premium to rotate images.
            </p>
          </div>
        </div>
      )}

      {/* Workspace column layouts */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side: Upload & Canvas Previews */}
        <div className="lg:col-span-8 space-y-6">
          
          {isAllowed && imagesQueue.length === 0 && (
            <ImageUpload
              multiple={true}
              onImagesSelected={handleImagesSelected}
            />
          )}

          {/* Canvas workspace block */}
          {imagesQueue.length > 0 && activeImage && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-855 rounded-3xl overflow-hidden shadow-sm flex flex-col">
              
              {/* Preview Menu Toolbar */}
              <div className="bg-white dark:bg-slate-900 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                
                {/* View modes toggle */}
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-955 p-1 rounded-xl">
                  {[
                    { id: 'transformed', label: 'Transformed' },
                    { id: 'original', label: 'Original' },
                    { id: 'compare', label: 'Side-by-Side' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setViewMode(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        viewMode === tab.id
                          ? 'bg-white dark:bg-slate-800 text-violet-650 dark:text-violet-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* Zoom Pan widgets */}
                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => changeZoom(-0.15)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500 transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-black text-slate-500 w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => changeZoom(0.15)}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500 transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950 text-slate-500 text-xs font-bold transition"
                  >
                    Reset Zoom
                  </button>
                </div>
              </div>

              {/* Viewport Canvas Frame */}
              <div 
                ref={containerRef}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="relative min-h-[420px] max-h-[500px] overflow-hidden flex items-center justify-center p-8 select-none"
                style={keepTransparency ? checkerboardBgStyle : { backgroundColor }}
              >
                {/* Drag Indicator Overlay */}
                <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-[10px] text-slate-200 font-bold px-3 py-1.5 rounded-full flex items-center gap-2 pointer-events-none shadow z-10">
                  <Move className="h-3 w-3 text-indigo-400" /> Hold & drag workspace to pan
                </div>

                {isProcessing && (
                  <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-slate-955/85 backdrop-blur-sm gap-4 p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent shadow-lg shadow-violet-500/20" />
                    <div className="w-full max-w-xs space-y-3">
                      <span className="text-sm font-black text-slate-200 block animate-pulse">
                        {imagesQueue.length > 1 && uploadPercent < 100
                          ? `Uploading ${imagesQueue.length} files...`
                          : 'Processing Rotation...'}
                      </span>
                      {uploadPercent > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-extrabold block">
                            {uploadPercent}% uploaded
                          </span>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden shadow-inner border border-slate-700/50">
                            <div 
                              className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-100 shadow"
                              style={{ width: `${uploadPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {viewMode === 'transformed' && (
                    <motion.div
                      key="transformed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onMouseDown={loadedImgEl?.unavailable ? undefined : handleMouseDown}
                      style={{
                        transform: loadedImgEl?.unavailable ? 'none' : `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                        cursor: loadedImgEl?.unavailable ? 'default' : (isDragging ? 'grabbing' : 'grab'),
                        transition: isDragging ? 'none' : 'transform 0.15s ease'
                      }}
                      className="origin-center shadow-xl max-w-full max-h-full"
                    >
                      {loadedImgEl?.unavailable ? (
                        <div className="flex flex-col items-center justify-center bg-slate-900/80 text-slate-300 gap-4 p-8 text-center border border-slate-800/80 rounded-2xl max-w-xs mx-auto shadow-2xl">
                          <FileImage className="h-12 w-12 text-indigo-400" />
                          <div>
                            <span className="font-extrabold text-xs block text-slate-200 truncate max-w-[200px]">
                              {loadedImgEl.name}
                            </span>
                            <span className="text-[9px] text-indigo-400 font-mono font-extrabold tracking-wider block mt-1">
                              {loadedImgEl.name.split('.').pop().toUpperCase()} FORMAT
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            Preview not supported natively in browser. You can still rotate and download this image successfully.
                          </p>
                        </div>
                      ) : (
                        <canvas 
                          ref={canvasRef} 
                          className="max-h-[360px] object-contain rounded border border-slate-200 dark:border-slate-800 shadow"
                        />
                      )}
                    </motion.div>
                  )}

                  {viewMode === 'original' && (
                    <motion.div
                      key="original"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onMouseDown={loadedImgEl?.unavailable ? undefined : handleMouseDown}
                      style={{
                        transform: loadedImgEl?.unavailable ? 'none' : `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                        cursor: loadedImgEl?.unavailable ? 'default' : (isDragging ? 'grabbing' : 'grab'),
                        transition: isDragging ? 'none' : 'transform 0.15s ease'
                      }}
                      className="origin-center max-w-full max-h-full"
                    >
                      {loadedImgEl?.unavailable ? (
                        <div className="flex flex-col items-center justify-center bg-slate-900/80 text-slate-300 gap-4 p-8 text-center border border-slate-800/80 rounded-2xl max-w-xs mx-auto shadow-2xl">
                          <FileImage className="h-12 w-12 text-indigo-400" />
                          <div>
                            <span className="font-extrabold text-xs block text-slate-200 truncate max-w-[200px]">
                              {loadedImgEl.name}
                            </span>
                            <span className="text-[9px] text-indigo-400 font-mono font-extrabold tracking-wider block mt-1">
                              {loadedImgEl.name.split('.').pop().toUpperCase()} FORMAT
                            </span>
                          </div>
                          <p className="text-[10px] text-slate-400 leading-relaxed">
                            Preview not supported natively in browser. You can still rotate and download this image successfully.
                          </p>
                        </div>
                      ) : (
                        <img
                          src={activeImage.previewUrl}
                          alt="Original"
                          className="max-h-[360px] object-contain rounded border border-slate-200 dark:border-slate-800 shadow"
                          draggable={false}
                        />
                      )}
                    </motion.div>
                  )}

                  {viewMode === 'compare' && (
                    <motion.div
                      key="compare"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-2 gap-6 w-full h-full items-center justify-center p-4"
                    >
                      {/* Left: Original */}
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-md shadow-sm">
                          Before (Original)
                        </span>
                        <div className="h-[280px] w-full flex items-center justify-center bg-slate-100/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-2">
                          {loadedImgEl?.unavailable ? (
                            <div className="flex flex-col items-center gap-1 text-slate-500">
                              <FileImage className="h-8 w-8 text-slate-400" />
                              <span className="text-[9px] font-bold text-slate-400 uppercase">HEIC/TIFF</span>
                            </div>
                          ) : (
                            <img
                              src={activeImage.previewUrl}
                              alt="Before"
                              className="max-h-full max-w-full object-contain rounded shadow"
                              draggable={false}
                            />
                          )}
                        </div>
                      </div>

                      {/* Right: Rotated Canvas */}
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black uppercase bg-violet-100 dark:bg-violet-955/50 text-violet-500 px-2.5 py-1 rounded-md shadow-sm">
                          After (Transformed)
                        </span>
                        <div className="h-[280px] w-full flex items-center justify-center bg-slate-100/40 rounded-2xl border border-slate-200 dark:border-slate-800 p-2">
                          {loadedImgEl?.unavailable ? (
                            <div className="flex flex-col items-center gap-1 text-slate-500">
                              <RotateCw className="h-8 w-8 text-indigo-400" />
                              <span className="text-[9px] font-bold text-indigo-400 uppercase">Rotate Ready</span>
                            </div>
                          ) : (
                            <canvas 
                              ref={canvasRef} 
                              className="max-h-full max-w-full object-contain rounded shadow"
                            />
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Status information banner */}
              <div className="bg-slate-100/60 dark:bg-slate-900/60 px-5 py-3.5 border-t border-slate-200 dark:border-slate-800/80 flex justify-between text-xs text-slate-500 font-bold">
                <span>File: {activeImage.name}</span>
                <span>
                  Canvas Dimensions: {canvasRef.current && !loadedImgEl?.unavailable ? `${canvasRef.current.width} x ${canvasRef.current.height}` : 'N/A'}
                </span>
              </div>

            </div>
          )}

          {/* Status Messages */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3 text-sm font-semibold"
              >
                <AlertTriangle className="h-5 w-5" /> {errorMessage}
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 flex items-center gap-3 text-sm font-semibold"
              >
                <CheckCircle className="h-5 w-5" /> {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selected files queue */}
          {imagesQueue.length > 0 && (
            <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                  <FileImage className="h-4.5 w-4.5" /> Queue list ({imagesQueue.length})
                </h3>
                <button
                  onClick={() => handleImagesSelected([])}
                  className="text-xs text-red-500 font-bold hover:underline inline-flex items-center gap-1"
                >
                  Clear Queue
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {imagesQueue.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => setActiveImage(img)}
                    className={`relative p-2 rounded-2xl border cursor-pointer transition flex flex-col gap-2 ${
                      activeImage?.id === img.id
                        ? 'border-violet-500 bg-violet-500/5 ring-1 ring-violet-500 shadow-md shadow-violet-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="aspect-video relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center border border-slate-200 dark:border-slate-800/80">
                      <img src={img.previewUrl} alt="" className="max-h-full max-w-full object-contain" />
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(img.id);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 hover:bg-red-600 text-white transition"
                        title="Remove file"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>

                    <span className="text-[10px] font-bold text-slate-600 dark:text-slate-300 truncate px-1">
                      {img.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right Side: Rotation Configurations */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            
            {/* Quick Rotate Buttons */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">
                Quick Rotations
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  onClick={() => setDegrees(prev => (prev - 90) % 360)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-violet-500 hover:bg-slate-50 dark:hover:bg-slate-950 flex flex-col items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                  title="Rotate Left 90°"
                >
                  <RotateCcw className="h-4 w-4 text-violet-500" />
                  <span>Left 90°</span>
                </button>
                <button
                  onClick={() => setDegrees(prev => (prev + 90) % 360)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-violet-500 hover:bg-slate-50 dark:hover:bg-slate-950 flex flex-col items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                  title="Rotate Right 90°"
                >
                  <RotateCw className="h-4 w-4 text-violet-500" />
                  <span>Right 90°</span>
                </button>
                <button
                  onClick={() => setDegrees(prev => (prev + 180) % 360)}
                  className="py-2.5 px-3 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-violet-500 hover:bg-slate-50 dark:hover:bg-slate-955 flex flex-col items-center gap-1.5 text-xs font-bold text-slate-700 dark:text-slate-300 transition"
                  title="Rotate 180°"
                >
                  <Undo className="h-4 w-4 text-violet-500 rotate-180" />
                  <span>Rotate 180°</span>
                </button>
              </div>
            </div>

            {/* Custom Degrees Input & Slider */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Custom Angle
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    value={degrees}
                    min={-360}
                    max={360}
                    onChange={(e) => setDegrees(parseInt(e.target.value, 10) || 0)}
                    className="w-16 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1 text-xs font-bold text-center focus:outline-none focus:border-violet-500"
                  />
                  <span className="text-xs text-slate-400 font-bold">°</span>
                </div>
              </div>
              
              <input
                type="range"
                min={-360}
                max={360}
                value={degrees}
                onChange={(e) => setDegrees(parseInt(e.target.value, 10) || 0)}
                className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-600 mt-2"
              />
            </div>

            {/* Flips config */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">
                Mirror Flip
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setFlipHorizontal(!flipHorizontal)}
                  className={`py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                    flipHorizontal
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  Flip Horizontal
                </button>
                <button
                  onClick={() => setFlipVertical(!flipVertical)}
                  className={`py-2 rounded-xl text-xs font-bold border transition flex items-center justify-center gap-2 ${
                    flipVertical
                      ? 'bg-violet-600 border-violet-600 text-white'
                      : 'bg-slate-50 dark:bg-slate-955 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                  }`}
                >
                  Flip Vertical
                </button>
              </div>
            </div>

            {/* Transparency & Background Color */}
            <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
              
              {/* Keep Transparency Switch */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Keep Transparency</span>
                <input
                  type="checkbox"
                  checked={keepTransparency}
                  onChange={(e) => setKeepTransparency(e.target.checked)}
                  className="h-4.5 w-4.5 accent-violet-600 cursor-pointer"
                />
              </div>

              {/* Background Color Picker */}
              {!keepTransparency && (
                <div className="space-y-3.5">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Background Color</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="h-7 w-7 rounded border border-slate-200 dark:border-slate-800 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={backgroundColor}
                        onChange={(e) => setBackgroundColor(e.target.value)}
                        className="w-20 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[10px] font-bold text-center focus:outline-none focus:border-violet-500"
                      />
                    </div>
                  </div>

                  {/* Preset color swatches */}
                  <div className="flex flex-wrap gap-1.5">
                    {PRESET_COLORS.map((color) => (
                      <button
                        key={color.name}
                        onClick={() => setBackgroundColor(color.value)}
                        className={`h-6 w-6 rounded-full border transition-all ${
                          backgroundColor === color.value
                            ? 'ring-2 ring-violet-500 border-white'
                            : 'border-slate-200 dark:border-slate-800'
                        }`}
                        style={{ backgroundColor: color.value }}
                        title={color.name}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Quality & Metadata */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              
              {/* Quality Selector */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Output Quality</span>
                  <span className="text-xs font-black text-violet-500">{quality}%</span>
                </div>
                <input
                  type="range"
                  min={10}
                  max={100}
                  value={quality}
                  onChange={(e) => setQuality(parseInt(e.target.value, 10))}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-650"
                />
              </div>

              {/* Preserve Metadata Switch */}
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  Preserve EXIF Metadata
                </span>
                <input
                  type="checkbox"
                  checked={preserveMetadata}
                  onChange={(e) => setPreserveMetadata(e.target.checked)}
                  className="h-4.5 w-4.5 accent-violet-600 cursor-pointer"
                />
              </div>

            </div>

            {/* Action buttons */}
            <div className="space-y-2.5 pt-4 border-t border-slate-100 dark:border-slate-800">
              
              <button
                onClick={() => handleRotateExecute(false)}
                disabled={isProcessing || imagesQueue.length === 0 || !isAllowed}
                className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-750 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-violet-600/20 transition flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" /> Download Processed Image
              </button>

              {imagesQueue.length > 1 && (
                <button
                  onClick={() => handleRotateExecute(true)}
                  disabled={isProcessing || !isAllowed}
                  className="w-full py-3 rounded-2xl bg-indigo-650 hover:bg-indigo-750 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 border border-indigo-600/50"
                >
                  <Layers className="h-4 w-4" /> Process & Download Batch (ZIP)
                </button>
              )}

              <button
                onClick={handleReset}
                disabled={imagesQueue.length === 0}
                className="w-full py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950 font-semibold text-xs transition"
              >
                Reset Configuration
              </button>
            </div>

          </div>

          <div className="p-5.5 rounded-3xl bg-violet-500/5 border border-violet-500/10 flex items-start gap-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <Sparkles className="h-4.5 w-4.5 text-violet-500 shrink-0" />
            <p>
              Uses high-precision bicubic interpolation filters and EXIF orientation checking to avoid loss of details or double-rotation conflicts.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
