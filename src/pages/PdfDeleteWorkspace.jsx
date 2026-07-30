import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  ArrowLeft, Trash2, CheckCircle, AlertTriangle, Play, Sparkles, RefreshCw, X 
} from 'lucide-react';
import FileUpload from '../components/FileUpload';
import api from '../utils/api';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

export default function PdfDeleteWorkspace({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [pagesList, setPagesList] = useState([]); // [{ index, thumbUrl }]
  const [selectedPages, setSelectedPages] = useState([]); // Array of 0-indexed indices selected for deletion
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
          params: { toolSlug: 'pdf-delete-pages' }
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
    setSelectedPages([]);

    try {
      const buffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: buffer });
      const pdf = await loadingTask.promise;
      const count = pdf.numPages;

      const items = [];
      for (let i = 1; i <= count; i++) {
        const page = await pdf.getPage(i);
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
          thumbUrl: canvas.toDataURL()
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

  const togglePageSelection = (index) => {
    setSelectedPages(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      return [...prev, index];
    });
  };

  const selectAll = () => {
    setSelectedPages(pagesList.map(page => page.index));
  };

  const clearAll = () => {
    setSelectedPages([]);
  };

  const handleDeletePages = async () => {
    if (!selectedFile || pagesList.length === 0) return;

    if (selectedPages.length === 0) {
      setErrorMessage('Please select at least one page to delete.');
      return;
    }

    if (selectedPages.length >= pagesList.length) {
      setErrorMessage('Cannot delete all pages of a PDF document.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const buffer = await selectedFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer);
      
      // Sort indices descending to avoid index shifting bugs during removal
      const sortedIndices = [...selectedPages].sort((a, b) => b - a);

      for (const idx of sortedIndices) {
        pdfDoc.removePage(idx);
      }

      const modifiedBytes = await pdfDoc.save();

      // Download file locally
      const blob = new Blob([modifiedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `deleted_pages_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setSuccessMessage(`Successfully deleted ${selectedPages.length} pages and generated new PDF.`);
      
      // Clear selections and reload the newly modified document structure if needed,
      // but simple reset is user-friendly.
      setSelectedPages([]);
      
      // Log usage metrics
      try {
        await api.post('/tools/log', { toolSlug: 'pdf-delete-pages' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Analytics logging failed.', logErr.message);
      }

    } catch (err) {
      setErrorMessage(err.message || 'Error occurred while deleting PDF pages.');
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
            Client-Side Delete Pages Engine
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
              Please sign in or upgrade to premium to delete PDF pages.
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

      {/* Loading overlay */}
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
                Pages: {pagesList.length} • Selected for deletion: <span className="text-red-500 font-bold">{selectedPages.length}</span>
              </span>
            </div>
            <div className="flex gap-2 shrink-0 flex-wrap justify-center">
              <button
                onClick={selectAll}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:border-violet-500 hover:text-violet-500 transition"
              >
                Select All
              </button>
              <button
                onClick={clearAll}
                className="px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold hover:border-violet-500 hover:text-violet-500 transition"
              >
                Clear Selection
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
              const isSelected = selectedPages.includes(page.index);
              return (
                <div
                  key={page.index}
                  onClick={() => togglePageSelection(page.index)}
                  className={`group relative bg-white dark:bg-slate-900 border rounded-2xl p-4 text-center cursor-pointer transition shadow-sm ${
                    isSelected ? 'border-red-500/50 bg-red-500/5' : 'border-slate-200 dark:border-slate-800 hover:border-violet-500/40'
                  }`}
                >
                  <div className="relative aspect-[3/4] rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800/80 bg-slate-100 dark:bg-slate-950 flex items-center justify-center">
                    <img
                      src={page.thumbUrl}
                      alt={`Page ${page.index + 1}`}
                      className={`max-h-full max-w-full object-contain transition-opacity ${isSelected ? 'opacity-40' : ''}`}
                    />
                    
                    {/* Delete tag overlay when selected */}
                    {isSelected && (
                      <div className="absolute inset-0 bg-red-500/10 border border-red-500/25 flex items-center justify-center">
                        <div className="px-3 py-1.5 rounded-full bg-red-600 text-white font-extrabold text-[10px] tracking-widest flex items-center gap-1 shadow-md">
                          <X className="h-3 w-3" /> DELETE
                        </div>
                      </div>
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
              <Sparkles className="h-4 w-4 text-violet-500" /> Compiled locally in browser cache.
            </span>
            <button
              onClick={handleDeletePages}
              disabled={isProcessing || selectedPages.length === 0 || !isAllowed}
              className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-red-600/25 transition flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Deleting Pages...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4" /> Delete Selected Pages
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
