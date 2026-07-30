import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import { 
  ArrowLeft, RefreshCw, CheckCircle, AlertTriangle, Play, Sparkles, 
  Download, FileImage, Layers
} from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import { useImage } from '../hooks/useImage';
import api from '../utils/api';

export default function ImageConvertWorkspace({ onBack }) {
  const { loadImage, downloadBlob } = useImage();

  const [imagesQueue, setImagesQueue] = useState([]); // [{ id, file, previewUrl, name, size, imgElement }]
  const [targetFormat, setTargetFormat] = useState('webp'); // 'webp', 'jpeg', 'png'

  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isAllowed, setIsAllowed] = useState(true);
  const [usageStats, setUsageStats] = useState({ limit: 10, usage: 0 });

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/tools/limits', {
          params: { toolSlug: 'image-convert' }
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
          resolved.push({ ...item, imgElement: imgEl });
        } catch (err) {
          resolved.push({ ...item, imgElement: null });
        }
      } else {
        resolved.push(item);
      }
    }
    setImagesQueue(resolved);
  };

  const handleConvertExecute = async () => {
    if (imagesQueue.length === 0) return;
    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const zip = new JSZip();
      const ext = targetFormat === 'jpeg' ? 'jpg' : targetFormat;

      for (const img of imagesQueue) {
        if (!img.imgElement) continue;

        // Draw onto HTML5 Canvas
        const canvas = document.createElement('canvas');
        canvas.width = img.imgElement.naturalWidth;
        canvas.height = img.imgElement.naturalHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img.imgElement, 0, 0);

        let mimeType = 'image/jpeg';
        if (targetFormat === 'png') mimeType = 'image/png';
        else if (targetFormat === 'webp') mimeType = 'image/webp';

        // Export as Blob
        const blob = await new Promise((resolve) => {
          canvas.toBlob((b) => resolve(b), mimeType);
        });

        const nameWithoutExt = img.name.substring(0, img.name.lastIndexOf('.'));
        const newFileName = `${nameWithoutExt}.${ext}`;

        if (imagesQueue.length === 1) {
          downloadBlob(blob, newFileName);
        } else {
          zip.file(newFileName, blob);
        }
      }

      if (imagesQueue.length > 1) {
        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `converted_images_${Date.now()}.zip`);
      }

      setSuccessMessage('Images converted successfully!');

      // Log usage
      try {
        await api.post('/tools/log', { toolSlug: 'image-convert' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Logging image convert failed.', logErr.message);
      }

    } catch (err) {
      setErrorMessage(err.message || 'Error occurred during image conversion.');
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
            Client-Side Image Conversion
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
              Please sign in or upgrade to premium to convert image formats.
            </p>
          </div>
        </div>
      )}

      {/* Columns */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left - File Queue */}
        <div className="lg:col-span-8 space-y-6">
          {isAllowed && (
            <ImageUpload
              multiple={true}
              onImagesSelected={handleImagesSelected}
            />
          )}

          {/* Status alerts */}
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

          {/* List display */}
          {imagesQueue.length > 0 && (
            <div className="space-y-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
                <FileImage className="h-4.5 w-4.5" /> Conversion Matrix
              </h3>
              
              <div className="space-y-3">
                {imagesQueue.map((img) => {
                  const originalExt = img.name.substring(img.name.lastIndexOf('.') + 1).toUpperCase();
                  const targetExt = targetFormat.toUpperCase();
                  
                  return (
                    <div 
                      key={img.id} 
                      className="flex items-center justify-between p-4 rounded-2xl border border-slate-100 dark:border-slate-850 bg-slate-50/50 dark:bg-slate-950/40 gap-4"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={img.previewUrl} alt="" className="h-10 w-12 object-cover rounded-lg border border-slate-200 dark:border-slate-800" />
                        <div className="min-w-0">
                          <span className="block font-bold text-xs text-slate-700 dark:text-slate-200 truncate">{img.name}</span>
                          <span className="block text-[9px] text-slate-400 mt-0.5 font-semibold">
                            Source: {originalExt}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-[10px] font-extrabold text-slate-400 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded">
                          {originalExt}
                        </span>
                        <span className="text-slate-400 text-xs">➔</span>
                        <span className="text-[10px] font-black text-violet-500 bg-violet-500/10 dark:bg-violet-500/25 px-2 py-0.5 rounded">
                          {targetExt}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right - Settings */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            
            {/* Format Selection */}
            <div>
              <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">
                Target Extension Format
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['webp', 'jpeg', 'png'].map(fmt => (
                  <button
                    key={fmt}
                    onClick={() => setTargetFormat(fmt)}
                    className={`py-2 px-3.5 rounded-xl text-xs font-bold transition border capitalize ${
                      targetFormat === fmt
                        ? 'bg-violet-600 border-violet-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-950 text-slate-655 border-slate-200 dark:border-slate-800 hover:border-slate-350'
                    }`}
                  >
                    {fmt}
                  </button>
                ))}
              </div>
            </div>

            {/* Execute Button */}
            <div className="pt-2">
              <button
                onClick={handleConvertExecute}
                disabled={isProcessing || imagesQueue.length === 0 || !isAllowed}
                className="w-full py-3 rounded-2xl bg-violet-650 hover:bg-violet-750 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition flex items-center justify-center gap-2"
              >
                {isProcessing ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                    Converting...
                  </>
                ) : (
                  <>
                    {imagesQueue.length > 1 ? (
                      <>
                        <Layers className="h-4 w-4" /> Convert Batch (ZIP)
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" /> Download Converted Image
                      </>
                    )}
                  </>
                )}
              </button>
            </div>

          </div>

          <div className="p-5.5 rounded-3xl bg-violet-650/5 border border-violet-500/15 flex items-start gap-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <RefreshCw className="h-4.5 w-4.5 text-violet-500 shrink-0" />
            <p>
              Output targets export using HTML5 canvas rendering contexts. Large dimensions format pixel mappings are supported.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
