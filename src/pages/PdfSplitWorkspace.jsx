import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
import JSZip from 'jszip';
import { 
  ArrowLeft, Columns, CheckCircle, AlertTriangle, Play, Sparkles, HelpCircle 
} from 'lucide-react';
import FileUpload from '../components/FileUpload';
import api from '../utils/api';

export default function PdfSplitWorkspace({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [rangeInput, setRangeInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isAllowed, setIsAllowed] = useState(true);
  const [usageStats, setUsageStats] = useState({ limit: 10, usage: 0 });

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/tools/limits', {
          params: { toolSlug: 'pdf-split' }
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
    try {
      const buffer = await file.arrayBuffer();
      const pdfDoc = await PDFDocument.load(buffer, {
        updateMetadata: false,
        ignoreEncryption: true
      });
      setTotalPages(pdfDoc.getPageCount());
      setSelectedFile(file);
    } catch (err) {
      if (err.message.includes('encrypted') || err.message.includes('password')) {
        setErrorMessage('This PDF file is password-protected. Please unlock it first.');
      } else {
        setErrorMessage('Failed to load PDF file. It might be corrupted.');
      }
      setSelectedFile(null);
      setTotalPages(0);
    }
  };

  const parseRangeGroups = (rangeString, maxPages) => {
    const groups = [];
    const segments = rangeString.split(',');

    for (const segment of segments) {
      const clean = segment.trim();
      if (!clean) continue;

      if (clean.includes('-')) {
        const [startStr, endStr] = clean.split('-');
        const start = Math.max(1, parseInt(startStr, 10));
        const end = Math.min(maxPages, parseInt(endStr, 10));
        
        if (!isNaN(start) && !isNaN(end) && start <= end) {
          const indices = [];
          for (let i = start; i <= end; i++) {
            indices.push(i - 1);
          }
          groups.push({ label: `${start}-${end}`, indices });
        }
      } else {
        const pageNum = parseInt(clean, 10);
        if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= maxPages) {
          groups.push({ label: `${pageNum}`, indices: [pageNum - 1] });
        }
      }
    }

    return groups;
  };

  const handleSplitPdf = async () => {
    if (!selectedFile || totalPages === 0) {
      setErrorMessage('Please select a valid PDF file first.');
      return;
    }

    if (!rangeInput.trim()) {
      setErrorMessage('Please enter page ranges (e.g. 1-3, 5).');
      return;
    }

    const groups = parseRangeGroups(rangeInput, totalPages);
    if (groups.length === 0) {
      setErrorMessage('Specified ranges are invalid or out of bounds.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const fileBuffer = await selectedFile.arrayBuffer();
      const srcDoc = await PDFDocument.load(fileBuffer);
      
      const zip = new JSZip();

      // For each range group, compile a separate PDF and add to zip
      for (const group of groups) {
        const subDoc = await PDFDocument.create();
        const copiedPages = await subDoc.copyPages(srcDoc, group.indices);
        copiedPages.forEach((page) => subDoc.addPage(page));
        
        const subBytes = await subDoc.save();
        zip.file(`split_${group.label}.pdf`, subBytes);
      }

      // Compile zip blob and trigger local download
      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const blobUrl = URL.createObjectURL(zipBlob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `split_${Date.now()}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      setSuccessMessage('PDF split successfully and downloaded as ZIP!');

      // Log usage to backend
      try {
        await api.post('/tools/log', { toolSlug: 'pdf-split' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Analytics logging failed.', logErr.message);
      }

    } catch (err) {
      setErrorMessage(err.message || 'Error occurred during client-side PDF splitting.');
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
            Client-Side Split Engine
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
              Please sign in or upgrade to premium to split PDF files.
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

      {/* Workspace panel */}
      {selectedFile && totalPages > 0 && (
        <div className="space-y-6">
          <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl flex flex-col md:flex-row gap-6 items-center">
            <div className="h-16 w-12 rounded-lg bg-red-500/10 border border-red-500/20 flex flex-col justify-between p-1.5 shrink-0 select-none">
              <span className="text-[9px] font-black text-red-500">PDF</span>
              <span className="text-[9px] font-bold text-slate-400 block text-right">{totalPages}P</span>
            </div>
            <div className="text-center md:text-left min-w-0 w-full">
              <span className="block font-bold text-slate-800 dark:text-slate-200 truncate">{selectedFile.name}</span>
              <span className="block text-xs font-semibold text-slate-400 mt-1">
                Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Total Pages: <span className="text-indigo-500 font-bold">{totalPages}</span>
              </span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 hover:text-red-500 transition shrink-0"
            >
              Change File
            </button>
          </div>

          <div className="space-y-3">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Specify Split Ranges
            </label>
            <div className="relative flex items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-2">
              <Columns className="h-5 w-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                placeholder="e.g. 1-3, 5, 8-10"
                value={rangeInput}
                onChange={(e) => setRangeInput(e.target.value)}
                className="w-full bg-transparent px-4 py-2.5 focus:outline-none text-sm dark:text-slate-100"
              />
            </div>
            <div className="flex gap-2 items-start text-xs text-slate-400 dark:text-slate-500 bg-slate-100/40 dark:bg-slate-900/30 p-4.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/50">
              <HelpCircle className="h-4.5 w-4.5 text-indigo-400 shrink-0" />
              <div>
                <span className="font-bold text-slate-700 dark:text-slate-300 block mb-0.5">Range Formatting Help</span>
                Use hyphens for contiguous ranges (e.g. <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">1-5</code>) and commas to separate multiple splits (e.g. <code className="bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded text-[10px]">1-2, 5, 7-9</code>). Each range segment will compile into its own PDF inside the downloaded ZIP file.
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Sparkles className="h-4 w-4 text-violet-500" /> Compiled locally in browser memory.
            </span>
            <button
              onClick={handleSplitPdf}
              disabled={isProcessing || !rangeInput.trim() || !isAllowed}
              className="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Splitting Ranges...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" /> Split PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
