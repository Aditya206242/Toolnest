import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
import { 
  ArrowLeft, ArrowUp, ArrowDown, Trash2, Files, 
  CheckCircle, AlertTriangle, Play, Sparkles 
} from 'lucide-react';
import FileUpload from '../components/FileUpload';
import api from '../utils/api';

export default function PdfMergeWorkspace({ onBack }) {
  const [filesQueue, setFilesQueue] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isAllowed, setIsAllowed] = useState(true);
  const [usageStats, setUsageStats] = useState({ limit: 10, usage: 0 });

  // Check usage limits on mount
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/tools/limits', {
          params: { toolSlug: 'pdf-merge' }
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

  // Parse page count of a PDF using pdf-lib
  const parsePageCount = async (file) => {
    try {
      const buffer = await file.arrayBuffer();
      // Load document minimally to count pages without compiling resources
      const pdfDoc = await PDFDocument.load(buffer, {
        updateMetadata: false,
        ignoreEncryption: true
      });
      return pdfDoc.getPageCount();
    } catch (err) {
      console.error('Failed to parse PDF pages count:', err.message);
      return 'Unknown';
    }
  };

  // Callback when files are dropped or browsed
  const handleFilesSelected = async (newFilesList) => {
    setErrorMessage('');
    setSuccessMessage('');
    
    // Process new files and resolve page counts
    const parsedFiles = [];
    for (const file of newFilesList) {
      // Avoid duplicate file reference addition in same queue
      if (filesQueue.some(item => item.file.name === file.name && item.file.size === file.size)) {
        continue;
      }
      
      const pageCount = await parsePageCount(file);
      parsedFiles.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        name: file.name,
        size: file.size,
        pageCount
      });
    }

    setFilesQueue(prev => [...prev, ...parsedFiles]);
  };

  // Reorder: Move file up in queue array
  const moveUp = (index) => {
    if (index === 0) return;
    setFilesQueue(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      return copy;
    });
  };

  // Reorder: Move file down in queue array
  const moveDown = (index) => {
    if (index === filesQueue.length - 1) return;
    setFilesQueue(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      return copy;
    });
  };

  // Remove file from queue
  const removeFile = (id) => {
    setFilesQueue(prev => prev.filter(file => file.id !== id));
  };

  // Execute client-side merging
  const handleMergePdf = async () => {
    if (filesQueue.length < 2) {
      setErrorMessage('At least two PDF files are required to perform a merge.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      // 1. Create a fresh document
      const mergedPdf = await PDFDocument.create();

      // 2. Iterate through files queue, load buffers, and copy pages
      for (const item of filesQueue) {
        const fileBuffer = await item.file.arrayBuffer();
        const srcDoc = await PDFDocument.load(fileBuffer);
        const pagesIndices = srcDoc.getPageIndices();
        const copiedPages = await mergedPdf.copyPages(srcDoc, pagesIndices);
        
        // Append all copied pages to the merged doc
        copiedPages.forEach((page) => mergedPdf.addPage(page));
      }

      // 3. Compile and save the merged PDF bytes
      const mergedBytes = await mergedPdf.save();

      // 4. Trigger browser local file download (No server upload!)
      const blob = new Blob([mergedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `merged_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setSuccessMessage('PDFs compiled and merged successfully!');
      
      // 5. Send usage metric logging ping to the backend
      try {
        await api.post('/tools/log', { toolSlug: 'pdf-merge' });
        // Refresh usage counters
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Analytics logging failed.', logErr.message);
      }

    } catch (err) {
      setErrorMessage(err.message || 'An unexpected error occurred during client-side PDF merging.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-8">
      {/* 1. Header controls */}
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
            Client-Side Merge Engine
          </span>
          {usageStats.limit !== -1 && (
            <span className="text-[10px] text-slate-400 font-semibold">
              Today: {usageStats.usage} / {usageStats.limit} free operations used
            </span>
          )}
        </div>
      </div>

      {/* Limit Exceeded warning paywall banner */}
      {!isAllowed && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-4 text-sm leading-relaxed mb-6">
          <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-slate-200">Daily limit exceeded!</span>
            <p className="mt-1 text-slate-400">
              You have used all free operations for today. Please sign in or upgrade to premium to merge unlimited PDF documents.
            </p>
          </div>
        </div>
      )}

      {/* 2. File Upload Zone */}
      {isAllowed && (
        <FileUpload
          accept="application/pdf"
          acceptLabel="PDF"
          multiple={true}
          onFilesSelected={handleFilesSelected}
        />
      )}

      {/* Error & Success status alerts */}
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

      {/* 3. Reorder Queue Panel */}
      {filesQueue.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center gap-2">
              <Files className="h-4 w-4" /> Merge Sequence Queue ({filesQueue.length} files)
            </h3>
            <span className="text-[10px] text-slate-500 font-medium">
              Drag file cards or use arrows to rearrange the compilation order.
            </span>
          </div>

          <div className="space-y-3">
            <AnimatePresence>
              {filesQueue.map((item, index) => {
                return (
                  <motion.div
                    key={item.id}
                    layout
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl flex items-center justify-between gap-4 shadow-sm"
                  >
                    {/* Visual Card Thumbnail Vector */}
                    <div className="flex items-center gap-4 min-w-0 w-full">
                      {/* PDF Thumbnail Sheet Mock */}
                      <div className="h-14 w-11 rounded-lg bg-red-500/5 dark:bg-red-500/10 border border-red-500/20 flex flex-col justify-between p-1.5 shrink-0 select-none">
                        <span className="text-[8px] font-extrabold text-red-500 tracking-wider">PDF</span>
                        <div className="w-full h-1 bg-red-500/20 rounded-full" />
                        <span className="text-[8px] font-black text-red-600 block text-right">
                          {item.pageCount}P
                        </span>
                      </div>

                      <div className="min-w-0">
                        <span className="block font-bold text-sm text-slate-800 dark:text-slate-200 truncate">
                          {item.name}
                        </span>
                        <div className="flex items-center gap-2 mt-1 text-[11px] font-semibold text-slate-400">
                          <span>{formatBytes(item.size)}</span>
                          <span>•</span>
                          <span className="text-indigo-500">{item.pageCount} pages</span>
                        </div>
                      </div>
                    </div>

                    {/* Reordering and removal controls */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* Move Up */}
                      <button
                        onClick={() => moveUp(index)}
                        disabled={index === 0}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/60 disabled:opacity-40 disabled:hover:bg-transparent text-slate-500"
                        title="Move item up"
                        aria-label={`Move ${item.name} up`}
                      >
                        <ArrowUp className="h-4 w-4" />
                      </button>

                      {/* Move Down */}
                      <button
                        onClick={() => moveDown(index)}
                        disabled={index === filesQueue.length - 1}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-950/60 disabled:opacity-40 disabled:hover:bg-transparent text-slate-500"
                        title="Move item down"
                        aria-label={`Move ${item.name} down`}
                      >
                        <ArrowDown className="h-4 w-4" />
                      </button>

                      {/* Remove */}
                      <button
                        onClick={() => removeFile(item.id)}
                        className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-red-50 dark:hover:bg-red-500/10 hover:text-red-500 text-slate-400 transition"
                        title="Remove from merge list"
                        aria-label={`Remove ${item.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      )}

      {/* 4. Action triggers */}
      {filesQueue.length > 0 && (
        <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-violet-500" /> Compiled locally using browser canvas buffers.
          </span>
          <button
            onClick={handleMergePdf}
            disabled={isProcessing || filesQueue.length < 2 || !isAllowed}
            className="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition flex items-center gap-2"
          >
            {isProcessing ? (
              <>
                <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                Merging Buffers...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 fill-current" /> Merge PDF
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
