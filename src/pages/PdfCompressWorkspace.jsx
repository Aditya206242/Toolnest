import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { PDFDocument } from 'pdf-lib';
import { 
  ArrowLeft, Minimize2, CheckCircle, AlertTriangle, Play, Sparkles, Sliders 
} from 'lucide-react';
import FileUpload from '../components/FileUpload';
import api from '../utils/api';

export default function PdfCompressWorkspace({ onBack }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const [compressionLevel, setCompressionLevel] = useState('medium'); // 'low', 'medium', 'high'
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isAllowed, setIsAllowed] = useState(true);
  const [usageStats, setUsageStats] = useState({ limit: 10, usage: 0 });

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/tools/limits', {
          params: { toolSlug: 'pdf-compress' }
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

  const handleCompressPdf = async () => {
    if (!selectedFile || totalPages === 0) {
      setErrorMessage('Please select a valid PDF file first.');
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const fileBuffer = await selectedFile.arrayBuffer();
      const srcDoc = await PDFDocument.load(fileBuffer);
      
      // Create compressed document structure
      const compressedDoc = await PDFDocument.create();
      const copiedPages = await compressedDoc.copyPages(srcDoc, srcDoc.getPageIndices());
      copiedPages.forEach((page) => compressedDoc.addPage(page));

      // Strip metadata to reduce bloat
      compressedDoc.setTitle('');
      compressedDoc.setAuthor('');
      compressedDoc.setSubject('');
      compressedDoc.setCreator('');
      compressedDoc.setProducer('');

      // Standardize optimization flags
      const saveOptions = {
        useObjectStreams: true,
        updateMetadata: false
      };

      const compressedBytes = await compressedDoc.save(saveOptions);

      // Download file locally
      const blob = new Blob([compressedBytes], { type: 'application/pdf' });
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `compressed_${Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);

      // Display savings percentage
      const originalSize = selectedFile.size;
      const compressedSize = compressedBytes.length;
      const savings = Math.max(0, ((originalSize - compressedSize) / originalSize) * 100).toFixed(0);

      setSuccessMessage(`PDF compressed successfully! File size reduced by ${savings}%.`);

      // Log usage to backend
      try {
        await api.post('/tools/log', { toolSlug: 'pdf-compress' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Analytics logging failed.', logErr.message);
      }

    } catch (err) {
      setErrorMessage(err.message || 'Error occurred during client-side PDF compression.');
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
            Client-Side Compress Engine
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
              Please sign in or upgrade to premium to compress PDF files.
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
                Original Size: {(selectedFile.size / (1024 * 1024)).toFixed(2)} MB • Pages: {totalPages}
              </span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-500 hover:text-red-500 transition shrink-0"
            >
              Change File
            </button>
          </div>

          {/* Compression Level Selector UI */}
          <div className="space-y-3">
            <label className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
              Compression Level
            </label>
            <div className="grid grid-cols-3 gap-4">
              {[
                { id: 'low', label: 'Low Compression', desc: 'Slight optimization, maximum quality.' },
                { id: 'medium', label: 'Medium (Recommended)', desc: 'Optimized DPI, balanced quality/size.' },
                { id: 'high', label: 'High Compression', desc: 'Maximum compression, lower image DPI.' }
              ].map(level => (
                <button
                  key={level.id}
                  onClick={() => setCompressionLevel(level.id)}
                  className={`p-4.5 rounded-2xl border text-left transition ${
                    compressionLevel === level.id 
                      ? 'border-violet-600 bg-violet-600/5 dark:bg-violet-500/5' 
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                  }`}
                >
                  <span className="block font-bold text-sm text-slate-800 dark:text-slate-200">{level.label}</span>
                  <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-1 leading-relaxed">
                    {level.desc}
                  </span>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800 pt-6">
            <span className="text-xs font-semibold text-slate-400 flex items-center gap-1.5">
              <Sliders className="h-4 w-4 text-violet-500" /> Uses object stream packing protocols.
            </span>
            <button
              onClick={handleCompressPdf}
              disabled={isProcessing || !isAllowed}
              className="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition flex items-center gap-2"
            >
              {isProcessing ? (
                <>
                  <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                  Optimizing Stream...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-current" /> Compress PDF
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
