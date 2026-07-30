import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument, degrees } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  ArrowLeft, RotateCw, CheckCircle, AlertTriangle, Play, Sparkles, RefreshCw 
} from 'lucide-react';
import FileUpload from '../components/FileUpload';
import api from '../utils/api';

// Set cdn worker path for pdfjs to bypass Vite bundle worker compilation bugs
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export default function PdfRotateWorkspace({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [pagesList, setPagesList] = useState([]); // [{ index, thumbUrl, currentRotation }]
  const [pageRotations, setPageRotations] = useState({}); // { index: degrees }
  const [isProcessing, setIsProcessing] = useState(false);
  const [isLoadingPreviews, setIsLoadingPreviews] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isAllowed, setIsAllowed] = useState(true);
  const [usageStats, setUsageStats] = useState({ limit: 10, usage: 0 });

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/tools/limits', {
          params: { toolSlug: 'pdf-rotate' }
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

  const handleFileSelected = async (files) => {
    setErrorMessage('');
    setSuccessMessage('');
    if (files.length === 0) return;

    const file = files[0];
    setSelectedFile(file);
    setIsLoadingPreviews(true);
    setPagesList([]);
    setPageRotations({});

    try {
      const buffer = await file.arrayBuffer();
      
      // 1. Load pdfjs doc to render thumbnails
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      const count = pdf.numPages;

      const items = [];
      for (let i = 1; i <= count; i++) {
        const page = await pdf.getPage(i);
        // Get initial rotation from metadata
        const initialRotation = page.rotate || 0;

        // Render page onto canvas to extract data URL thumbnail
        const viewport = page.getViewport({ scale: 0.25 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        await page.render(renderContext).promise;

        items.push({
          index: i - 1,
          thumbUrl: canvas.toDataURL(),
          initialRotation
        });
      }

      setPagesList(items);
    } catch (err) {
      if (err.message.includes('encrypted') || err.message.includes('password')) {
        setErrorMessage('This PDF file is password-protected. Please unlock it first.');
      } else {
        setErrorMessage('Failed to load PDF previews: ' + err.message);
      }
      setSelectedFile(null);
    } finally {
      setIsLoadingPreviews(false);
    }
  };

  // Increment rotation state of a single page by 90 degrees
  const rotatePage = (index) => {
    setPageRotations(prev => {
      const current = prev[index] || 0;
      const next = (current + 90) % 360;
      return {
        ...prev,
        [index]: next
      };
    });
  };

  // Set rotation for all pages simultaneously
  const rotateAll = (angle) => {
    const nextRotations = {};
    pagesList.forEach(page => {
      nextRotations[page.index] = angle;
    });
    setPageRotations(nextRotations);
  };

  const handleApplyRotation = async () => {
    if (!selectedFile || pagesList.length === 0) return;

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      const total = pdfDoc.getPageCount();

      // Apply rotations in pdf-lib
      Object.entries(pageRotations).forEach(([idxStr, angle]) => {
        const idx = parseInt(idxStr, 10);
        if (idx >= 0 && idx < total && angle > 0) {
          const page = pdfDoc.getPage(idx);
          const currentRotation = page.getRotation().angle;
          const finalRotation = (currentRotation + angle) % 360;
          page.setRotation(degrees(finalRotation));
        }
      });

      const rotatedBytes = await pdfDoc.save();

      // Download file locally
      const blob = new Blob([rotatedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `rotated_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setSuccessMessage('Rotation settings applied successfully!');

      // Log usage metrics
      try {
        await api.post('/tools/log', { toolSlug: 'pdf-rotate' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Analytics logging failed.', logErr.message);
      }

    } catch (err) {
      setErrorMessage(err.message || 'Error occurred while rotating PDF pages.');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-4 mb-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-violet-500 transition border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900"
          aria-label="Back to PDF Category page"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </button>
        <div className="text-right">
          <span className="text-[10px] font-extrabold text-indigo-500 tracking-widest block uppercase">
            Client-Side Rotation Engine
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
              Please sign in or upgrade to premium to rotate PDF documents.
            </p>
          </div>
        </div>
      )}

      {/* Upload Zone */}
      {isAllowed && !selectedFile && (
        <FileUpload
          accept="application/pdf"
          acceptLabel="PDF"
          multiple={false}
          onFilesSelected={handleFileSelected}
        />
      )}

      {/* Previews Loading state overlay */}
      {isLoadingPreviews && (
        <div className="py-20 text-center space-y-4">
          <RefreshCw className="h-8 w-8 text-violet-500 animate-spin mx-auto" />
          <p className="text-sm font-semibold text-slate-400">Rendering visual page previews...</p>
        </div>
      )}

      {/* Alerts */}
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

      {/* Grid Previews Workspace */}
      {selectedFile && pagesList.length > 0 && (
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-center">
            <div className="text-center md:text-left min-w-0 w-full">
              <span className="block font-bold text-slate-800 dark:text-slate-200 truncate">{selectedFile.name}</span>
              <span className="block text-xs font-semibold text-slate-400 mt-1">
                Pages: {pagesList.length} • Click individual cards to rotate page by 90° clockwise
              </span>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap justify-center">
              <button
                onClick={() => rotateAll(90)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:border-violet-500 hover:text-violet-500 transition"
              >
                Rotate All 90°
              </button>
              <button
                onClick={() => rotateAll(180)}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:border-violet-500 hover:text-violet-500 transition"
              >
                Rotate All 180°
              </button>
              <button
                onClick={() => setSelectedFile(null)}
                className="px-4 py-2 rounded-xl border border-red-500/20 text-red-500 bg-red-500/5 text-xs font-bold hover:bg-red-500/10 transition"
              >
                Remove
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
            {pagesList.map((page) => {
              const rotation = pageRotations[page.index] || 0;
              return (
                <div
                  key={page.index}
                  onClick={() => rotatePage(page.index)}
                  className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-500/40 rounded-2xl p-4 text-center cursor-pointer transition shadow-sm"
                >
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                    <motion.img
                      src={page.thumbUrl}
                      alt={`Page ${page.index + 1}`}
                      className="max-h-full max-w-full object-contain"
                      animate={{ rotate: rotation }}
                      transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                    />
                    
                    {/* Rotate visual hover icon overlay */}
                    <div className="absolute inset-0 bg-violet-600/5 border border-violet-500/10 opacity-0 group-hover:opacity-100 flex items-center justify-center transition">
                      <div className="p-2.5 rounded-full bg-violet-600 text-white shadow-lg">
                        <RotateCw className="h-4.5 w-4.5" />
                      </div>
                    </div>

                    {rotation > 0 && (
                      <span className="absolute top-2 right-2 text-[9px] font-extrabold bg-violet-600 text-white px-2 py-0.5 rounded-md shadow-md">
                        {rotation}°
                      </span>
                    )}
                  </div>
                  <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 mt-3.5">
                    Page {page.index + 1}
                  </span>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" /> Compiled locally using browser canvas buffers.
            </span>
            <button
              onClick={handleApplyRotation}
              disabled={isProcessing || Object.keys(pageRotations).length === 0 || !isAllowed}
              className="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Applying Rotation...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" /> Apply Rotation
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
