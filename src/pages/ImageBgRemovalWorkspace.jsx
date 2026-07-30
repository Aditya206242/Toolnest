import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, CheckCircle, AlertTriangle, Play, Sparkles, 
  Download, FileImage, Layers, HelpCircle, Move, Trash2, X
} from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import { useImage } from '../hooks/useImage';
import { useAuth } from '../context/AuthContext';
import api from '../utils/api';

export default function ImageBgRemovalWorkspace({ onBack }) {
  const { downloadBlob } = useImage();
  const { isPremium, isAuthenticated } = useAuth();

  // Queue State
  const [imagesQueue, setImagesQueue] = useState([]); // [{ id, file, previewUrl, name, size }]
  const [activeImage, setActiveImage] = useState(null);

  // Settings
  const [edgeSmoothing, setEdgeSmoothing] = useState(true);
  const [hairRefinement, setHairRefinement] = useState(true);
  const [shadowPreservation, setShadowPreservation] = useState(true);
  const [autoCrop, setAutoCrop] = useState(false);

  // Compare slider state
  const [sliderPct, setSliderPct] = useState(50); // 0 to 100
  const [isSliding, setIsSliding] = useState(false);
  const sliderRef = useRef(null);

  // Processed preview cache
  const [processedPreviews, setProcessedPreviews] = useState({}); // { [imageId]: objectUrl }
  const [processingStatus, setProcessingStatus] = useState({}); // { [imageId]: 'idle'|'processing'|'done'|'error' }

  // Limits
  const [isAllowed, setIsAllowed] = useState(true);
  const [usageStats, setUsageStats] = useState({ limit: 10, usage: 0 });

  // Processing indicators
  const [isProcessingBatch, setIsProcessingBatch] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/tools/limits', {
          params: { toolSlug: 'image-remove-bg' }
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

  // Update images queue
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

  // Automatically fetch processed background removal preview on active image change
  useEffect(() => {
    if (!activeImage) return;

    // Skip if already processed with current settings
    if (processedPreviews[activeImage.id]) {
      return;
    }

    fetchPreview(activeImage);
  }, [activeImage, edgeSmoothing, autoCrop]);

  const fetchPreview = async (img) => {
    setProcessingStatus(prev => ({ ...prev, [img.id]: 'processing' }));
    setUploadPercent(0);
    setErrorMessage('');

    try {
      const formData = new FormData();
      formData.append('file', img.file);
      formData.append('edgeSmoothing', edgeSmoothing ? 'true' : 'false');
      formData.append('hairRefinement', hairRefinement ? 'true' : 'false');
      formData.append('shadowPreservation', shadowPreservation ? 'true' : 'false');
      formData.append('autoCrop', autoCrop ? 'true' : 'false');

      const response = await api.post('/image/remove-background', formData, {
        responseType: 'blob',
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadPercent(percent);
        }
      });

      const processedUrl = URL.createObjectURL(response.data);
      setProcessedPreviews(prev => ({ ...prev, [img.id]: processedUrl }));
      setProcessingStatus(prev => ({ ...prev, [img.id]: 'done' }));
    } catch (err) {
      console.error('[Preview Fetch Fail]', err);
      setProcessingStatus(prev => ({ ...prev, [img.id]: 'error' }));
      
      let msg = 'Failed to process preview background removal.';
      if (err.response?.data instanceof Blob) {
        try {
          const text = await err.response.data.text();
          const errorJson = JSON.parse(text);
          msg = errorJson.message || msg;
        } catch (e) {
          // ignore parsing error
        }
      } else if (err.response?.data?.message) {
        msg = err.response.data.message;
      } else if (err.message) {
        msg = err.message;
      }
      setErrorMessage(msg);
    } finally {
      setUploadPercent(0);
    }
  };

  // Clean up object URLs
  useEffect(() => {
    return () => {
      Object.values(processedPreviews).forEach(url => URL.revokeObjectURL(url));
    };
  }, [processedPreviews]);

  // Handle slide mouse actions
  const handleSliderMove = (clientX) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
    setSliderPct(pct);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 0) return;
    handleSliderMove(e.touches[0].clientX);
  };

  const removeImage = (id) => {
    const updatedQueue = imagesQueue.filter(img => img.id !== id);
    setImagesQueue(updatedQueue);
    if (processedPreviews[id]) {
      URL.revokeObjectURL(processedPreviews[id]);
      const copy = { ...processedPreviews };
      delete copy[id];
      setProcessedPreviews(copy);
    }
    if (updatedQueue.length > 0) {
      if (activeImage.id === id) {
        setActiveImage(updatedQueue[0]);
      }
    } else {
      setActiveImage(null);
    }
  };

  // Submit downloads
  const handleExecuteDownload = async (processAll = false) => {
    if (imagesQueue.length === 0) return;
    setIsProcessingBatch(true);
    setUploadPercent(0);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('edgeSmoothing', edgeSmoothing ? 'true' : 'false');
      formData.append('hairRefinement', hairRefinement ? 'true' : 'false');
      formData.append('shadowPreservation', shadowPreservation ? 'true' : 'false');
      formData.append('autoCrop', autoCrop ? 'true' : 'false');

      if (processAll) {
        imagesQueue.forEach((img) => {
          formData.append('files', img.file);
        });

        const response = await api.post('/image/remove-background-batch', formData, {
          responseType: 'blob',
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percent);
          }
        });

        downloadBlob(response.data, `no-bg_batch_${Date.now()}.zip`);
        setSuccessMessage('Batch processed successfully! ZIP downloaded.');
      } else {
        if (!activeImage) throw new Error('No active image selected.');
        
        // If preview is already loaded, we can download it directly from local blob to save network!
        const localUrl = processedPreviews[activeImage.id];
        if (localUrl) {
          const res = await fetch(localUrl);
          const blob = await res.blob();
          const nameWithoutExt = activeImage.name.substring(0, activeImage.name.lastIndexOf('.')) || activeImage.name;
          downloadBlob(blob, `no-bg_${nameWithoutExt}.png`);
          setSuccessMessage('Transparent image downloaded successfully!');
        } else {
          formData.append('file', activeImage.file);
          const response = await api.post('/image/remove-background', formData, {
            responseType: 'blob',
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadPercent(percent);
            }
          });
          const nameWithoutExt = activeImage.name.substring(0, activeImage.name.lastIndexOf('.')) || activeImage.name;
          downloadBlob(response.data, `no-bg_${nameWithoutExt}.png`);
          setSuccessMessage('Transparent image downloaded successfully!');
        }
      }

      // Log metric
      try {
        await api.post('/tools/log', { toolSlug: 'image-remove-bg' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Logging metrics failed.', logErr.message);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error occurred during background removal.');
    } finally {
      setIsProcessingBatch(false);
      setUploadPercent(0);
    }
  };

  const handleReset = () => {
    setEdgeSmoothing(true);
    setHairRefinement(true);
    setShadowPreservation(true);
    setAutoCrop(false);
    setSliderPct(50);
  };

  const checkerboardStyle = {
    backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#f8fafc'
  };

  const status = activeImage ? processingStatus[activeImage.id] || 'idle' : 'idle';
  const processedUrl = activeImage ? processedPreviews[activeImage.id] : null;

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

      {!isAuthenticated ? (
        <div className="max-w-md mx-auto text-center py-16 px-6 bg-white dark:bg-slate-900/55 backdrop-blur-md border border-slate-200 dark:border-slate-800/80 rounded-3xl shadow-xl space-y-6 mt-8">
          <div className="inline-flex p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 mb-2">
            <Sparkles className="h-8 w-8 text-amber-500 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-slate-100">Unlock AI Background Remover</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed max-w-sm mx-auto">
            Erasing image backgrounds uses our remote neural segmentation models. Sign in or sign up to get 5 free background removals per day.
          </p>
          <div className="py-2.5">
            <Link
              to="/login?from=/image/image-remove-bg"
              className="inline-flex items-center justify-center font-extrabold text-xs px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-600 hover:to-red-600 text-white shadow-lg shadow-orange-500/20 transition-all w-full"
            >
              Sign In to Unlock
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Paywall Banner */}
          {!isAllowed && (
            <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-4 text-sm leading-relaxed mb-6">
              <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-slate-200">Daily limit exceeded!</span>
                <p className="mt-1 text-slate-400">
                  Upgrade to Premium to remove more backgrounds (5 free operations daily limit reached).
                </p>
              </div>
            </div>
          )}

          {/* Grid workspace columns layout */}
          <div className="relative grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Side Previews */}
        <div className="lg:col-span-8 space-y-6">
          
          {isAllowed && imagesQueue.length === 0 && (
            <ImageUpload
              multiple={true}
              onImagesSelected={handleImagesSelected}
            />
          )}

          {/* Compare slider preview card */}
          {imagesQueue.length > 0 && activeImage && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden shadow-sm flex flex-col">
              
              {/* Toolbar */}
              <div className="px-5 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500">
                  Preview: {activeImage.name}
                </span>
                
                {status === 'done' && (
                  <span className="text-[10px] bg-emerald-500/10 text-emerald-500 font-black uppercase px-2 py-0.5 rounded-full border border-emerald-500/20">
                    Background Removed
                  </span>
                )}
                {status === 'processing' && (
                  <span className="text-[10px] bg-violet-500/10 text-violet-500 font-black uppercase px-2 py-0.5 rounded-full border border-violet-500/20 animate-pulse">
                    AI Removing BG...
                  </span>
                )}
                {status === 'error' && (
                  <button 
                    onClick={() => fetchPreview(activeImage)}
                    className="text-[10px] bg-red-500/10 text-red-500 font-black uppercase px-2.5 py-1 rounded-lg border border-red-500/20 hover:bg-red-500 hover:text-white transition"
                  >
                    Retry Processing
                  </button>
                )}
              </div>

              {/* Slider Viewport Frame */}
              <div 
                ref={sliderRef}
                onMouseMove={(e) => isSliding && handleSliderMove(e.clientX)}
                onTouchMove={handleTouchMove}
                onMouseDown={() => setIsSliding(true)}
                onTouchStart={() => setIsSliding(true)}
                onMouseUp={() => setIsSliding(false)}
                onTouchEnd={() => setIsSliding(false)}
                className="relative min-h-[400px] max-h-[500px] overflow-hidden flex items-center justify-center p-6 select-none bg-slate-50/20 cursor-ew-resize"
              >
                {status === 'processing' && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-950/70 gap-4 p-8 text-center">
                    <div className="h-9 w-9 rounded-full border-3 border-violet-600 border-t-transparent animate-spin shadow" />
                    <div className="w-full max-w-xs space-y-2">
                      <span className="text-xs font-extrabold text-slate-500 dark:text-slate-400 block animate-pulse">
                        {uploadPercent < 100 ? `Uploading image...` : 'Executing segment detection models...'}
                      </span>
                      {uploadPercent > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-extrabold block">{uploadPercent}%</span>
                          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden shadow-inner">
                            <div 
                              className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-100"
                              style={{ width: `${uploadPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {status === 'error' && (
                  <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-red-500/5 gap-3 p-6 text-center">
                    <AlertTriangle className="h-8 w-8 text-red-500" />
                    <span className="text-xs font-bold text-red-500">Failed to remove background locally.</span>
                    <p className="text-[10px] text-slate-400 max-w-sm">
                      The segment model encountered an error. Click retry above or ensure the image contains clear subjects.
                    </p>
                  </div>
                )}

                {/* Compare Viewport layers */}
                {status === 'done' && processedUrl && (
                  <div className="relative w-full h-[360px] max-w-[540px] rounded-2xl overflow-hidden shadow border border-slate-200 dark:border-slate-800">
                    
                    {/* Before: Original (Underneath) */}
                    <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
                      <img 
                        src={activeImage.previewUrl} 
                        alt="Before" 
                        className="w-full h-full object-contain pointer-events-none" 
                      />
                      <span className="absolute bottom-3 right-3 text-[9px] font-black uppercase text-slate-400 tracking-wider bg-black/40 px-2 py-0.5 rounded shadow z-10">
                        Before (Original)
                      </span>
                    </div>

                    {/* After: Processed Transparent PNG (Top Layer, Clipped) */}
                    <div 
                      className="absolute inset-0 flex items-center justify-center"
                      style={{ 
                        clipPath: `inset(0 ${100 - sliderPct}% 0 0)`,
                        ...checkerboardStyle
                      }}
                    >
                      <img 
                        src={processedUrl} 
                        alt="After" 
                        className="w-full h-full object-contain pointer-events-none" 
                      />
                      <span className="absolute bottom-3 left-3 text-[9px] font-black uppercase text-violet-500 tracking-wider bg-violet-500/10 px-2 py-0.5 rounded border border-violet-500/20 shadow z-10">
                        After (Transparent PNG)
                      </span>
                    </div>

                    {/* Slider Split Line Handle */}
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-violet-500 shadow z-10 flex items-center justify-center cursor-ew-resize"
                      style={{ left: `${sliderPct}%` }}
                    >
                      <div className="h-8 w-8 rounded-full bg-white dark:bg-slate-900 border border-violet-500 shadow flex items-center justify-center select-none text-[10px] font-extrabold text-violet-500">
                        ↔
                      </div>
                    </div>
                  </div>
                )}

                {status === 'idle' && (
                  <div className="text-center text-slate-400 text-xs font-bold p-8">
                    Select an image to process background removal.
                  </div>
                )}

              </div>

            </div>
          )}

          {/* Error Success Messages */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-semibold flex items-center gap-2"
              >
                <AlertTriangle className="h-4.5 w-4.5" /> {errorMessage}
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl text-xs font-semibold flex items-center gap-2"
              >
                <CheckCircle className="h-4.5 w-4.5" /> {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Queue select details list */}
          {imagesQueue.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2">
                <span className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-2">
                  <FileImage className="h-4.5 w-4.5" /> Images Queue list ({imagesQueue.length})
                </span>
                <button
                  onClick={() => handleImagesSelected([])}
                  className="text-xs font-bold text-red-500 hover:underline"
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
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50'
                    }`}
                  >
                    <div className="aspect-video relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center border border-slate-200">
                      <img src={img.previewUrl} alt="" className="max-h-full max-w-full object-contain" />
                      
                      {/* Per-card Status overlays */}
                      {processingStatus[img.id] === 'processing' && (
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                          <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        </div>
                      )}
                      
                      {processingStatus[img.id] === 'error' && (
                        <div className="absolute inset-0 bg-red-900/60 flex flex-col items-center justify-center gap-1">
                          <AlertTriangle className="h-4 w-4 text-white" />
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              fetchPreview(img);
                            }}
                            className="bg-white/20 hover:bg-white/30 text-white text-[8px] font-black px-1.5 py-0.5 rounded border border-white/20 transition uppercase"
                          >
                            Retry
                          </button>
                        </div>
                      )}

                      {processingStatus[img.id] === 'done' && (
                        <div className="absolute top-1.5 left-1.5 bg-emerald-500 text-white rounded-full p-0.5 shadow z-10">
                          <CheckCircle className="h-3 w-3" />
                        </div>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(img.id);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 hover:bg-red-650 text-white transition z-10"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 truncate px-1">{img.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right configurations aside */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2">
              Model Settings
            </h3>

            {/* Edge smoothing */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Edge smoothing</span>
              <input
                type="checkbox"
                checked={edgeSmoothing}
                onChange={(e) => setEdgeSmoothing(e.target.checked)}
                className="h-4.5 w-4.5 accent-violet-600 cursor-pointer"
              />
            </div>

            {/* Hair refinement */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Hair refinement</span>
              <input
                type="checkbox"
                checked={hairRefinement}
                onChange={(e) => setHairRefinement(e.target.checked)}
                className="h-4.5 w-4.5 accent-violet-600 cursor-pointer"
              />
            </div>

            {/* Shadow preservation */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Shadow preservation</span>
              <input
                type="checkbox"
                checked={shadowPreservation}
                onChange={(e) => setShadowPreservation(e.target.checked)}
                className="h-4.5 w-4.5 accent-violet-600 cursor-pointer"
              />
            </div>

            {/* Auto crop empty borders */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-850 pt-3 pb-2">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Auto crop borders</span>
              <input
                type="checkbox"
                checked={autoCrop}
                onChange={(e) => setAutoCrop(e.target.checked)}
                className="h-4.5 w-4.5 accent-violet-600 cursor-pointer"
              />
            </div>

            {/* Action buttons */}
            <div className="border-t border-slate-100 dark:border-slate-855 pt-4 space-y-2.5">
              <button
                onClick={() => handleExecuteDownload(false)}
                disabled={isProcessingBatch || imagesQueue.length === 0 || !isAllowed || status !== 'done'}
                className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-750 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-violet-600/20 transition flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" /> Download PNG
              </button>

              {imagesQueue.length > 1 && (
                <button
                  onClick={() => handleExecuteDownload(true)}
                  disabled={isProcessingBatch || !isAllowed}
                  className="w-full py-3 rounded-2xl bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 border border-indigo-600/50"
                >
                  <Layers className="h-4 w-4" /> Batch Process (ZIP)
                </button>
              )}

              <button
                onClick={handleReset}
                disabled={imagesQueue.length === 0}
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950 font-semibold text-xs transition"
              >
                Reset Configuration
              </button>
            </div>

          </div>

          <div className="p-5.5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <Sparkles className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
            <p>
              Employs ONNX runtime segmentation models to execute contour edge detection locally. Auto-crop strips surrounding transparent pixel regions.
            </p>
          </div>
        </div>

        {isProcessingBatch && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/80 backdrop-blur-sm gap-4 p-8 text-center select-none rounded-3xl">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent shadow-lg shadow-violet-500/20" />
            <div className="w-full max-w-xs space-y-3">
              <span className="text-sm font-black text-slate-200 block animate-pulse">
                {uploadPercent < 100 ? `Uploading batch queue...` : 'Compiling transparent ZIP output...'}
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
      </div>
      </>
      )}
    </div>
  );
}
