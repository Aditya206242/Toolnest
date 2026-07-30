import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { 
  ArrowLeft, Sliders, CheckCircle, AlertTriangle, Play, Sparkles, 
  Download, FileImage, Layers, HelpCircle
} from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import { useImage } from '../hooks/useImage';
import api from '../utils/api';

export default function ImageResizeWorkspace({ onBack }) {
  const { loadImage, downloadBlob } = useImage();

  const [imagesQueue, setImagesQueue] = useState([]); // [{ id, file, previewUrl, name, size, imgElement, aspect }]
  
  const [resizeMode, setResizeMode] = useState('pixels'); // 'pixels' or 'percentage'
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [percentage, setPercentage] = useState(50); // 25, 50, 75
  const [lockAspectRatio, setLockAspectRatio] = useState(true);

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  
  const [isAllowed, setIsAllowed] = useState(true);
  const [usageStats, setUsageStats] = useState({ limit: 10, usage: 0 });

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/tools/limits', {
          params: { toolSlug: 'image-resize' }
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

  const handleImagesSelected = async (updatedQueue) => {
    setErrorMessage('');
    setSuccessMessage('');

    const resolved = [];
    for (const item of updatedQueue) {
      if (!item.imgElement) {
        try {
          const imgEl = await loadImage(item.previewUrl);
          const aspect = imgEl.naturalWidth / imgEl.naturalHeight;
          resolved.push({ ...item, imgElement: imgEl, aspect });
        } catch (err) {
          resolved.push({ ...item, imgElement: null, aspect: 1 });
        }
      } else {
        resolved.push(item);
      }
    }
    setImagesQueue(resolved);

    // Default initial height/width fields based on first uploaded image
    if (resolved.length > 0 && resolved[0].imgElement && !width) {
      setWidth(resolved[0].imgElement.naturalWidth.toString());
      setHeight(resolved[0].imgElement.naturalHeight.toString());
    }
  };

  const handleWidthChange = (val) => {
    setWidth(val);
    if (lockAspectRatio && val && !isNaN(val) && imagesQueue[0]?.aspect) {
      const num = parseFloat(val);
      setHeight(Math.round(num / imagesQueue[0].aspect).toString());
    }
  };

  const handleHeightChange = (val) => {
    setHeight(val);
    if (lockAspectRatio && val && !isNaN(val) && imagesQueue[0]?.aspect) {
      const num = parseFloat(val);
      setWidth(Math.round(num * imagesQueue[0].aspect).toString());
    }
  };

  const handleResizeExecute = async () => {
    if (imagesQueue.length === 0) return;
    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const zip = new JSZip();

      for (const img of imagesQueue) {
        if (!img.imgElement) continue;

        let targetWidth = img.imgElement.naturalWidth;
        let targetHeight = img.imgElement.naturalHeight;

        if (resizeMode === 'pixels') {
          const w = parseInt(width, 10);
          const h = parseInt(height, 10);
          if (isNaN(w) || isNaN(h) || w <= 0 || h <= 0) {
            throw new Error('Invalid dimensions specified.');
          }
          targetWidth = w;
          targetHeight = h;
        } else {
          const factor = percentage / 100;
          targetWidth = Math.round(img.imgElement.naturalWidth * factor);
          targetHeight = Math.round(img.imgElement.naturalHeight * factor);
        }

        // Draw resized frame on HTML5 Canvas
        const canvas = document.createElement('canvas');
        canvas.width = targetWidth;
        canvas.height = targetHeight;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(img.imgElement, 0, 0, targetWidth, targetHeight);

        // Convert canvas context to blob
        const blob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), img.file.type);
        });

        if (imagesQueue.length === 1) {
          downloadBlob(blob, `resized_${img.name}`);
        } else {
          zip.file(`resized_${img.name}`, blob);
        }
      }

      if (imagesQueue.length > 1) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `resized_images_${Date.now()}.zip`);
      }

      setSuccessMessage('Images resized successfully!');

      // Log usage
      try {
        await api.post('/tools/log', { toolSlug: 'image-resize' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Usage log fail.', logErr.message);
      }

    } catch (err) {
      setErrorMessage(err.message || 'Error occurred during image resizing.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-violet-500 transition border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900"
          aria-label="Back to catalog"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </button>
        <div className="text-right">
          <span className="text-[10px] font-extrabold text-indigo-500 tracking-widest block uppercase">
            Client-Side Image Sizing
          </span>
          {usageStats.limit !== -1 && (
            <span className="text-[10px] text-slate-400 font-semibold">
              Today: {usageStats.usage} / {usageStats.limit} free operations used
            </span>
          )}
        </div>
      </div>

      {/* Paywall Banner */}
      {!isAllowed && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-4 text-sm leading-relaxed mb-6">
          <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-slate-200">Daily limit exceeded!</span>
            <p className="mt-1 text-slate-400">
              Please sign in or upgrade to premium to resize images.
            </p>
          </div>
        </div>
      )}

      {/* Workspace columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column - Queue & Previews */}
        <div className="lg:col-span-8 space-y-6">
          {isAllowed && (
            <ImageUpload
              multiple={true}
              onImagesSelected={handleImagesSelected}
            />
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

          {/* Sizing display items info */}
          {imagesQueue.length > 0 && (
            <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <FileImage className="h-4.5 w-4.5" /> Dimensions Queue List
              </h3>
              
              <div className="space-y-3">
                {imagesQueue.map((img) => {
                  let targetW = '...';
                  let targetH = '...';

                  if (img.imgElement) {
                    if (resizeMode === 'pixels') {
                      targetW = width || '...';
                      targetH = height || '...';
                    } else {
                      targetW = Math.round(img.imgElement.naturalWidth * (percentage / 100)).toString();
                      targetH = Math.round(img.imgElement.naturalHeight * (percentage / 100)).toString();
                    }
                  }

                  return (
                    <div 
                      key={img.id} 
                      className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/40 gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={img.previewUrl} alt="" className="h-10 w-12 object-cover rounded-lg border border-slate-200 dark:border-slate-800" />
                        <div className="min-w-0">
                          <span className="block font-bold text-xs text-slate-700 dark:text-slate-200 truncate">{img.name}</span>
                          <span className="block text-[9px] text-slate-400 mt-0.5">
                            Original: {img.imgElement ? `${img.imgElement.naturalWidth} x ${img.imgElement.naturalHeight}` : 'loading...'}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[9px] text-slate-400 block uppercase font-bold tracking-wider">Target Size</span>
                        <span className="text-xs font-black text-slate-800 dark:text-slate-200 block mt-0.5">
                          {targetW} x {targetH} px
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column - Configurations */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            
            {/* Sizing Type */}
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">
                Resize By
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: 'pixels', label: 'Pixels' },
                  { id: 'percentage', label: 'Percentage' }
                ].map(mode => (
                  <button
                    key={mode.id}
                    onClick={() => setResizeMode(mode.id)}
                    className={`py-2 px-3.5 rounded-xl text-xs font-bold transition border ${
                      resizeMode === mode.id
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-655 border-slate-200 dark:border-slate-800 hover:border-slate-350'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Inputs pixel fields */}
            {resizeMode === 'pixels' ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 block mb-1.5 uppercase">Width (px)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1920"
                      value={width}
                      onChange={(e) => handleWidthChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 block mb-1.5 uppercase">Height (px)</label>
                    <input
                      type="number"
                      placeholder="e.g. 1080"
                      value={height}
                      onChange={(e) => handleHeightChange(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-slate-105/50 dark:border-slate-800/80 pt-4">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Lock Aspect Ratio</span>
                  <input
                    type="checkbox"
                    checked={lockAspectRatio}
                    onChange={(e) => setLockAspectRatio(e.target.checked)}
                    className="h-4 w-4 accent-violet-650 cursor-pointer"
                  />
                </div>
              </div>
            ) : (
              /* Percentage options */
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 block mb-3 uppercase">Dimensions percentage</label>
                <div className="grid grid-cols-3 gap-2">
                  {[25, 50, 75].map(pct => (
                    <button
                      key={pct}
                      onClick={() => setPercentage(pct)}
                      className={`py-2 rounded-xl text-xs font-black border transition ${
                        percentage === pct
                          ? 'bg-violet-650 border-violet-600 text-white'
                          : 'bg-slate-55 text-slate-500 border-slate-200 dark:border-slate-800'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Execute Button */}
            <div className="pt-2">
              <button
                onClick={handleResizeExecute}
                disabled={isProcessing || imagesQueue.length === 0 || !isAllowed}
                className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Rescaling...
                  </>
                ) : (
                  <>
                    {imagesQueue.length > 1 ? (
                      <>
                        <Layers className="h-4 w-4" /> Resize Batch (ZIP)
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" /> Download Resized Image
                      </>
                    )}
                  </>
                )}
              </button>
            </div>

          </div>

          <div className="p-5.5 rounded-3xl bg-violet-650/5 border border-violet-500/15 flex items-start gap-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <Sparkles className="h-4.5 w-4.5 text-violet-500 shrink-0" />
            <p>
              Uses bilinear interpolation filters during canvas drawing to preserve details and edges during scaling.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
