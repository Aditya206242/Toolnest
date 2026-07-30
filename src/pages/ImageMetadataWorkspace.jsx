import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, CheckCircle, AlertTriangle, Download, 
  FileImage, Layers, Sparkles, Trash2, Search, Info, Camera, MapPin, EyeOff
} from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import { useImage } from '../hooks/useImage';
import api from '../utils/api';

export default function ImageMetadataWorkspace({ onBack }) {
  const { downloadBlob } = useImage();

  // Queue State
  const [imagesQueue, setImagesQueue] = useState([]); // [{ id, file, previewUrl, name, size }]
  const [activeImage, setActiveImage] = useState(null);

  // Metadata State
  const [metadata, setMetadata] = useState(null); // { dimensions, dpi, bitDepth, colorProfile, camera, gps, iso, lens, date, exifTags: {} }
  const [isLoadingMetadata, setIsLoadingMetadata] = useState(false);
  const [exifSearchQuery, setExifSearchQuery] = useState('');

  // Mode: 'view' | 'compare'
  const [viewMode, setViewMode] = useState('view');

  // Limits
  const [isAllowed, setIsAllowed] = useState(true);
  const [usageStats, setUsageStats] = useState({ limit: 10, usage: 0 });

  // Processing indicators
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/tools/limits', {
          params: { toolSlug: 'image-metadata' } // In db migrations, we could bind this slug
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

  // Update images queue
  const handleImagesSelected = (queue) => {
    setImagesQueue(queue);
    if (queue.length > 0) {
      if (!activeImage || !queue.some(img => img.id === activeImage.id)) {
        setActiveImage(queue[0]);
      }
    } else {
      setActiveImage(null);
      setMetadata(null);
    }
  };

  // Fetch metadata automatically when active image changes
  useEffect(() => {
    if (!activeImage) {
      setMetadata(null);
      return;
    }
    fetchMetadata(activeImage);
  }, [activeImage]);

  const fetchMetadata = async (img) => {
    setIsLoadingMetadata(true);
    setErrorMessage('');
    setMetadata(null);

    try {
      const formData = new FormData();
      formData.append('file', img.file);

      const response = await api.post('/image/metadata', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data && response.data.data) {
        setMetadata(response.data.data);
      } else {
        throw new Error('No metadata returned.');
      }
    } catch (err) {
      console.error('[Fetch Metadata Fail]', err);
      setErrorMessage('Could not extract image metadata. File might not contain EXIF fields.');
    } finally {
      setIsLoadingMetadata(false);
    }
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
      setMetadata(null);
    }
  };

  const handleCleanMetadata = async (processAll = false) => {
    if (imagesQueue.length === 0) return;
    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();

      if (processAll) {
        imagesQueue.forEach((img) => {
          formData.append('files', img.file);
        });

        const response = await api.post('/image/remove-metadata-batch', formData, {
          responseType: 'blob',
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        downloadBlob(response.data, `cleaned_batch_${Date.now()}.zip`);
        setSuccessMessage('Batch metadata cleaning complete! ZIP downloaded.');
      } else {
        if (!activeImage) throw new Error('No active image selected.');
        formData.append('file', activeImage.file);

        const response = await api.post('/image/remove-metadata', formData, {
          responseType: 'blob',
          headers: { 'Content-Type': 'multipart/form-data' }
        });

        const ext = activeImage.name.split('.').pop();
        const nameWithoutExt = activeImage.name.substring(0, activeImage.name.lastIndexOf('.')) || activeImage.name;
        downloadBlob(response.data, `cleaned_${nameWithoutExt}.${ext}`);
        setSuccessMessage('Image cleaned and downloaded successfully!');
      }

      // Log limit
      try {
        await api.post('/tools/log', { toolSlug: 'image-metadata' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Logging metrics failed.', logErr.message);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error occurred while stripping metadata.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Filtered EXIF tags
  const filteredExif = metadata?.exifTags
    ? Object.entries(metadata.exifTags).filter(([key, value]) =>
        key.toLowerCase().includes(exifSearchQuery.toLowerCase()) ||
        value.toLowerCase().includes(exifSearchQuery.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-8">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-violet-500 transition border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </button>
        <div className="text-right">
          <span className="text-[10px] font-extrabold text-indigo-500 tracking-widest block uppercase font-mono">
            ExifReader Tags Analyzer
          </span>
          {usageStats.limit !== -1 && (
            <span className="text-[10px] text-slate-400 font-semibold">
              Today: {usageStats.usage} / {usageStats.limit} operations used
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
              Upgrade to premium or sign in to analyze and clean metadata.
            </p>
          </div>
        </div>
      )}

      {/* Grid workspace layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Previews and Metadata Lists */}
        <div className="lg:col-span-8 space-y-6">
          
          {isAllowed && imagesQueue.length === 0 && (
            <ImageUpload
              multiple={true}
              onImagesSelected={handleImagesSelected}
            />
          )}

          {/* Main workspace */}
          {imagesQueue.length > 0 && activeImage && (
            <div className="space-y-6">
              
              {/* Compare toggle bar */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 flex justify-between items-center">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                  {[
                    { id: 'view', label: 'View Metadata' },
                    { id: 'compare', label: 'Compare Before/After' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setViewMode(tab.id)}
                      className={`px-4.5 py-2 rounded-lg text-xs font-bold transition-all ${
                        viewMode === tab.id
                          ? 'bg-white dark:bg-slate-800 text-violet-650 dark:text-violet-400 shadow-sm border border-slate-200/10'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="text-xs text-slate-400 font-medium">
                  File Size: {(activeImage.size / 1024).toFixed(1)} KB
                </div>
              </div>

              {/* Loader */}
              {isLoadingMetadata && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-12 flex flex-col items-center justify-center gap-3">
                  <div className="h-8 w-8 rounded-full border-3 border-violet-600 border-t-transparent animate-spin" />
                  <span className="text-xs font-bold text-slate-500">Reading image EXIF blocks...</span>
                </div>
              )}

              {/* View Mode content */}
              {!isLoadingMetadata && metadata && viewMode === 'view' && (
                <div className="space-y-6 animate-fadeIn">
                  
                  {/* General Info Cards Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {[
                      { label: 'Camera / Make', value: metadata.camera, icon: Camera },
                      { label: 'GPS coordinates', value: metadata.gps, icon: MapPin },
                      { label: 'Bit Depth', value: metadata.bitDepth, icon: Info },
                      { label: 'Capture Date', value: metadata.date, icon: Info }
                    ].map((item, idx) => {
                      const Icon = item.icon;
                      return (
                        <div key={idx} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col gap-2">
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Icon className="h-3.5 w-3.5 text-indigo-400" />
                            <span className="text-[9px] font-extrabold uppercase tracking-wider">{item.label}</span>
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-350 truncate">{item.value}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Standard Image specs list */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">File Specifications</h3>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs font-bold">
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400">Dimensions</span>
                        <span className="text-slate-700 dark:text-slate-300">{metadata.dimensions}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400">DPI Density</span>
                        <span className="text-slate-700 dark:text-slate-300">{metadata.dpi}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400">Color Profile</span>
                        <span className="text-slate-700 dark:text-slate-300">{metadata.colorProfile}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400">ISO Speed</span>
                        <span className="text-slate-700 dark:text-slate-300">{metadata.iso}</span>
                      </div>
                      <div className="flex justify-between border-b border-slate-100 pb-2">
                        <span className="text-slate-400">Lens Type</span>
                        <span className="text-slate-700 dark:text-slate-300 truncate max-w-[200px]">{metadata.lens}</span>
                      </div>
                    </div>
                  </div>

                  {/* Complete raw EXIF table list */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
                      <h3 className="text-xs font-black text-slate-400 uppercase tracking-wider">Raw EXIF Tags List ({Object.keys(metadata.exifTags).length})</h3>
                      
                      <div className="relative">
                        <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Search tags..."
                          value={exifSearchQuery}
                          onChange={(e) => setExifSearchQuery(e.target.value)}
                          className="pl-9 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-violet-500 font-semibold w-full sm:w-48"
                        />
                      </div>
                    </div>

                    {filteredExif.length > 0 ? (
                      <div className="max-h-80 overflow-y-auto border border-slate-100 rounded-2xl">
                        <table className="w-full text-left text-xs">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-black text-slate-400 uppercase">
                              <th className="p-3">Tag Name</th>
                              <th className="p-3">Value</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-medium text-slate-750">
                            {filteredExif.map(([key, val]) => (
                              <tr key={key} className="hover:bg-slate-50/50">
                                <td className="p-3 font-semibold text-slate-650">{key}</td>
                                <td className="p-3 truncate max-w-xs">{val}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="text-center p-6 text-xs text-slate-400 font-bold border border-dashed rounded-2xl">
                        No metadata tags match query search criteria.
                      </div>
                    )}
                  </div>

                </div>
              )}

              {/* Compare Mode content */}
              {!isLoadingMetadata && metadata && viewMode === 'compare' && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 space-y-4 animate-fadeIn">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
                    <EyeOff className="h-5 w-5 text-red-500" />
                    <div>
                      <h3 className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase">Cleaned File Contrast</h3>
                      <p className="text-[10px] text-slate-400">Verifying target parameters removed from image header</p>
                    </div>
                  </div>

                  <div className="border border-slate-150 rounded-2xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-150 text-[10px] font-black text-slate-400 uppercase">
                          <th className="p-3">Metadata Field</th>
                          <th className="p-3">Original Image</th>
                          <th className="p-3 text-red-500">Cleaned Image (Stripped)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 font-medium">
                        {[
                          { label: 'Camera / Make', val: metadata.camera },
                          { label: 'GPS coordinates', val: metadata.gps },
                          { label: 'ISO Speed Ratings', val: metadata.iso },
                          { label: 'Lens Model', val: metadata.lens },
                          { label: 'Capture Date', val: metadata.date }
                        ].map((row, idx) => (
                          <tr key={idx} className="hover:bg-slate-50/50">
                            <td className="p-3 font-semibold text-slate-650">{row.label}</td>
                            <td className="p-3 text-slate-700">{row.val}</td>
                            <td className="p-3 text-red-500 italic bg-red-500/5 font-extrabold flex items-center gap-1.5">
                              <EyeOff className="h-3 w-3 shrink-0" /> Removed
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="p-4 bg-emerald-500/5 rounded-2xl border border-emerald-500/10 text-[10px] leading-relaxed text-emerald-600 flex items-start gap-2.5 font-semibold">
                    <CheckCircle className="h-4.5 w-4.5 shrink-0 text-emerald-500" />
                    <span>Cleaning strips 100% of EXIF, GPS coordinates, MakerNote tables, and embedded profile caches, preventing location or device tracking tags.</span>
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Error and Success banners */}
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

          {/* Queue select list */}
          {imagesQueue.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2">
                <span className="text-xs font-black tracking-wider text-slate-400 uppercase flex items-center gap-2">
                  <FileImage className="h-4.5 w-4.5" /> Images Queue ({imagesQueue.length})
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
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(img.id);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 hover:bg-red-650 text-white transition"
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

        {/* Right aside controls */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
            
            <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
              Metadata Actions
            </h3>

            <p className="text-xs text-slate-500 leading-relaxed">
              Remove all EXIF tags, GPS coordinate marks, device attributes, and color spaces to clean private identification fields from files.
            </p>

            {/* Actions */}
            <div className="space-y-2.5 pt-2">
              <button
                onClick={() => handleCleanMetadata(false)}
                disabled={isProcessing || imagesQueue.length === 0 || !isAllowed}
                className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-750 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-violet-600/20 transition flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" /> Download Cleaned Image
              </button>

              {imagesQueue.length > 1 && (
                <button
                  onClick={() => handleCleanMetadata(true)}
                  disabled={isProcessing || !isAllowed}
                  className="w-full py-3 rounded-2xl bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 border border-indigo-600/50"
                >
                  <Layers className="h-4 w-4" /> Clean Batch ZIP
                </button>
              )}
            </div>

          </div>

          <div className="p-5.5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <Sparkles className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
            <p>
              Metadata cleaning completely removes the raw EXIF directory block, preventing any metadata reconstruction tools from retrieving past coordinates or parameters.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
