import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, File, X, AlertCircle, CheckCircle } from 'lucide-react';

export default function FileUpload({
  accept = 'application/pdf',
  acceptLabel = 'PDF',
  maxSize = 10 * 1024 * 1024, // 10MB default
  multiple = false,
  onFilesSelected,
  onFileRejected,
  className = ''
}) {
  const [isDragActive, setIsDragActive] = useState(false);
  const [files, setFiles] = useState([]);
  const [validationError, setValidationError] = useState('');
  const [uploadProgress, setUploadProgress] = useState({});
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef(null);

  // Focus helper for keyboard accessibility
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const validateFile = (file) => {
    // Validate file type
    const acceptedTypes = accept.split(',').map((type) => type.trim());
    const isAcceptedType = acceptedTypes.some((type) => {
      if (type.startsWith('.')) {
        return file.name.endsWith(type);
      }
      return file.type === type;
    });

    if (!isAcceptedType) {
      return `Invalid format. Only ${acceptLabel} files are allowed.`;
    }

    // Validate file size
    if (file.size > maxSize) {
      const sizeMb = (maxSize / (1024 * 1024)).toFixed(0);
      return `File size is too large. Limit is ${sizeMb}MB.`;
    }

    return null;
  };

  const processFiles = (selectedFiles) => {
    setValidationError('');
    const validFilesList = [];
    let errorMsg = '';

    const filesToProcess = multiple ? Array.from(selectedFiles) : [selectedFiles[0]];

    for (const file of filesToProcess) {
      if (!file) continue;
      const error = validateFile(file);
      if (error) {
        errorMsg = error;
        if (onFileRejected) onFileRejected(file, error);
        break;
      }
      validFilesList.push(file);
    }

    if (errorMsg) {
      setValidationError(errorMsg);
      return;
    }

    if (validFilesList.length > 0) {
      const updatedFiles = multiple ? [...files, ...validFilesList] : validFilesList;
      setFiles(updatedFiles);
      
      // Simulate file upload progress
      simulateProgress(validFilesList);
      
      if (onFilesSelected) {
        onFilesSelected(updatedFiles);
      }
    }
  };

  const simulateProgress = (newFiles) => {
    setLoading(true);
    newFiles.forEach((file) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        setUploadProgress((prev) => ({
          ...prev,
          [file.name]: progress
        }));
        if (progress >= 100) {
          clearInterval(interval);
          // Check if all files completed loading
          setUploadProgress((prev) => {
            const allFinished = Object.values({ ...prev, [file.name]: 100 }).every(
              (val) => val === 100
            );
            if (allFinished) setLoading(false);
            return { ...prev, [file.name]: 100 };
          });
        }
      }, 50);
    });
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragActive(true);
    } else if (e.type === 'dragleave') {
      setIsDragActive(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      processFiles(e.target.files);
    }
  };

  const removeFile = (indexToRemove, fileName) => {
    const updatedFiles = files.filter((_, idx) => idx !== indexToRemove);
    setFiles(updatedFiles);
    
    // Cleanup progress logs
    setUploadProgress((prev) => {
      const copy = { ...prev };
      delete copy[fileName];
      return copy;
    });

    if (onFilesSelected) {
      onFilesSelected(updatedFiles);
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
    <div className={`w-full ${className}`}>
      {/* Upload Zone container */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label={`Upload zone. Drag & drop files or click to upload. Allowed format: ${acceptLabel}`}
        className={`relative group border-2 border-dashed rounded-3xl p-8 text-center cursor-pointer transition-all focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ${
          isDragActive
            ? 'border-violet-600 bg-violet-500/10'
            : 'border-slate-300 dark:border-slate-800 hover:border-violet-500 hover:bg-slate-50 dark:hover:bg-slate-900/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-4">
          <div className={`p-4 rounded-2xl transition-transform ${
            isDragActive 
              ? 'bg-violet-600 text-white scale-110' 
              : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:scale-110'
          }`}>
            <Upload className="h-7 w-7" />
          </div>

          <div>
            <p className="font-bold text-base text-slate-700 dark:text-slate-200">
              Drag & Drop your files here, or <span className="text-violet-500 group-hover:underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-1.5 font-medium">
              Supported formats: {acceptLabel} • Max Size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
            </p>
          </div>
        </div>
      </div>

      {/* Validation Error Banner */}
      <AnimatePresence>
        {validationError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4.5 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-start gap-3.5 text-sm"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <span className="font-bold block">Validation Failed</span>
              <p className="mt-0.5 font-medium">{validationError}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* File List */}
      <AnimatePresence>
        {files.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 space-y-3"
          >
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Selected Files ({files.length})
            </h4>

            {files.map((file, idx) => {
              const progress = uploadProgress[file.name] || 0;
              const isDone = progress >= 100;

              return (
                <motion.div
                  key={file.name + idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-4.5 rounded-2xl flex items-center justify-between gap-4 group"
                >
                  <div className="flex items-center gap-3 w-full min-w-0">
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400 shrink-0">
                      <File className="h-5 w-5" />
                    </div>

                    <div className="w-full min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate">
                          {file.name}
                        </span>
                        <span className="text-xs font-semibold text-slate-400 dark:text-slate-500 shrink-0">
                          {formatBytes(file.size)}
                        </span>
                      </div>

                      {/* Progress Bar Container */}
                      <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden">
                        <div
                          className="bg-violet-600 h-full rounded-full transition-all duration-150"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    {isDone ? (
                      <CheckCircle className="h-5 w-5 text-emerald-500" />
                    ) : (
                      <div className="h-5 w-5 rounded-full border-2 border-slate-300 border-t-violet-600 animate-spin" />
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFile(idx, file.name);
                      }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-red-500 transition text-slate-400 dark:text-slate-500"
                      aria-label={`Remove file ${file.name}`}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
