import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, X, ArrowUp, ArrowDown, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { useImage } from '../hooks/useImage';

export default function ImageUpload({
  multiple = false,
  maxSize = 50 * 1024 * 1024, // 50MB default
  onImagesSelected,
  className = ''
}) {
  const { validateImage } = useImage();
  const [isDragActive, setIsDragActive] = useState(false);
  const [imageQueue, setImageQueue] = useState([]); // [{ id, file, previewUrl, name, size }]
  const [errorMessage, setErrorMessage] = useState('');
  const fileInputRef = useRef(null);

  // Cleanup object URLs on unmount to prevent browser memory leaks
  useEffect(() => {
    return () => {
      imageQueue.forEach((img) => URL.revokeObjectURL(img.previewUrl));
    };
  }, [imageQueue]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  const processFiles = (filesList) => {
    setErrorMessage('');
    const validImages = [];
    const filesToProcess = multiple ? Array.from(filesList) : [filesList[0]];

    for (const file of filesToProcess) {
      if (!file) continue;

      const error = validateImage(file, maxSize);
      if (error) {
        setErrorMessage(error);
        break;
      }

      validImages.push({
        id: Math.random().toString(36).substring(2, 9),
        file,
        previewUrl: URL.createObjectURL(file),
        name: file.name,
        size: file.size
      });
    }

    if (validImages.length > 0) {
      const updatedQueue = multiple ? [...imageQueue, ...validImages] : validImages;
      setImageQueue(updatedQueue);
      if (onImagesSelected) {
        onImagesSelected(updatedQueue);
      }
    }
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

  const removeImage = (id, previewUrl) => {
    URL.revokeObjectURL(previewUrl);
    const updatedQueue = imageQueue.filter(img => img.id !== id);
    setImageQueue(updatedQueue);
    if (onImagesSelected) {
      onImagesSelected(updatedQueue);
    }
  };

  const moveUp = (index) => {
    if (index === 0) return;
    setImageQueue(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index - 1];
      copy[index - 1] = temp;
      if (onImagesSelected) onImagesSelected(copy);
      return copy;
    });
  };

  const moveDown = (index) => {
    if (index === imageQueue.length - 1) return;
    setImageQueue(prev => {
      const copy = [...prev];
      const temp = copy[index];
      copy[index] = copy[index + 1];
      copy[index + 1] = temp;
      if (onImagesSelected) onImagesSelected(copy);
      return copy;
    });
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  return (
    <div className={`w-full ${className}`}>
      
      {/* 1. Drag & Drop Zone */}
      <div
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        onKeyDown={handleKeyDown}
        tabIndex={0}
        role="button"
        aria-label="Image drop zone. Drag and drop pictures, or click to browse."
        className={`relative group border-2 border-dashed rounded-3xl py-20 px-8 sm:py-28 text-center cursor-pointer transition focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 ${
          isDragActive
            ? 'border-violet-600 bg-violet-500/10'
            : 'border-slate-300 dark:border-slate-800 hover:border-violet-500 hover:bg-slate-50 dark:hover:bg-slate-900/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/avif,image/gif,image/tiff,image/x-tiff,image/heic,image/heif"
          multiple={multiple}
          onChange={handleFileChange}
          className="hidden"
        />

        <div className="flex flex-col items-center justify-center gap-5">
          <div className={`p-5 rounded-2xl transition-transform ${
            isDragActive 
              ? 'bg-violet-600 text-white scale-110' 
              : 'bg-slate-100 dark:bg-slate-900 text-slate-500 dark:text-slate-400 group-hover:scale-110'
          }`}>
            <ImageIcon className="h-10 w-10" />
          </div>

          <div>
            <p className="font-extrabold text-lg text-slate-800 dark:text-slate-100">
              Drag & Drop your images here, or <span className="text-violet-500 group-hover:underline">browse</span>
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-2 font-semibold">
              Supports: JPG, JPEG, PNG, WEBP, AVIF, GIF, TIFF, HEIC • Max Size: {(maxSize / (1024 * 1024)).toFixed(0)}MB
            </p>
          </div>
        </div>
      </div>

      {/* 2. Error Message */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mt-4 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-start gap-3.5 text-sm"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <span className="font-bold block">Validation Failed</span>
              <p className="mt-0.5 font-medium text-slate-400">{errorMessage}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 3. Image Previews Grid */}
      <AnimatePresence>
        {imageQueue.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-6 space-y-4"
          >
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Selected Images ({imageQueue.length})
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              {imageQueue.map((img, index) => (
                <motion.div
                  key={img.id}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                  className="relative group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden p-3 flex flex-col gap-3 shadow-sm hover:border-violet-500/35 transition"
                >
                  {/* Thumbnail Card Visual */}
                  <div className="relative aspect-video rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                    <img
                      src={img.previewUrl}
                      alt={img.name}
                      className="max-h-full max-w-full object-contain"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const parent = e.target.parentElement;
                        if (parent) {
                          const placeholder = parent.querySelector('.preview-fallback');
                          if (placeholder) placeholder.style.display = 'flex';
                        }
                      }}
                    />
                    <div className="preview-fallback hidden absolute inset-0 flex flex-col items-center justify-center bg-slate-100/50 dark:bg-slate-950 text-slate-400 gap-1.5 p-3 text-center">
                      <ImageIcon className="h-6 w-6 text-indigo-400" />
                      <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">
                        {img.name.split('.').pop().toUpperCase()} Format
                      </span>
                      <span className="text-[8px] text-slate-400">Preview Not Available</span>
                    </div>

                    {/* Delete overlay control */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        removeImage(img.id, img.previewUrl);
                      }}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white shadow-md transition"
                      title="Remove image"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Meta descriptions & order handlers */}
                  <div className="flex items-center justify-between gap-3 min-w-0">
                    <div className="min-w-0 w-full">
                      <span className="block font-bold text-xs text-slate-800 dark:text-slate-200 truncate">
                        {img.name}
                      </span>
                      <span className="block text-[10px] text-slate-400 mt-0.5">
                        {formatBytes(img.size)}
                      </span>
                    </div>

                    {multiple && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          onClick={() => moveUp(index)}
                          disabled={index === 0}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
                          title="Move order left"
                        >
                          <ArrowUp className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => moveDown(index)}
                          disabled={index === imageQueue.length - 1}
                          className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-transparent"
                          title="Move order right"
                        >
                          <ArrowDown className="h-3 w-3" />
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
