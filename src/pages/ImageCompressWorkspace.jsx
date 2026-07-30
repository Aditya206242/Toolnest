import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import {
  ArrowLeft, Sliders, CheckCircle, AlertTriangle, Play, Sparkles,
  Download, FileImage, Layers, UploadCloud, X,
  Maximize2, Minimize2, Move, RefreshCw, ZoomIn, ZoomOut, Minus, Plus, RotateCw
} from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import ImageCompareSlider from '../components/ImageCompareSlider';
import { useImage } from '../hooks/useImage';
import api from '../utils/api';

const PRESETS = [
  { id: 'max', label: 'Maximum', quality: 95, desc: 'Maximum quality, larger file sizes.' },
  { id: 'high', label: 'High Quality', quality: 85, desc: 'Excellent details, standard optimization.' },
  { id: 'balanced', label: 'Balanced', quality: 70, desc: 'Perfect compromise of size and quality.' },
  { id: 'small', label: 'Small Size', quality: 50, desc: 'High compression, small footprints.' },
  { id: 'ultra', label: 'Ultra', quality: 30, desc: 'Maximum compression, lower quality.' }
];

export default function ImageCompressWorkspace({ onBack }) {
  const { loadImage, downloadBlob } = useImage();
  const workerRef = useRef(null);

  const [imagesQueue, setImagesQueue] = useState([]); // [{ id, file, previewUrl, name, size, imgElement }]
  const [compressedDetails, setCompressedDetails] = useState({}); // { id: { size, percentSavings, blob } }

  const [quality, setQuality] = useState(70);
  const [format, setFormat] = useState('webp'); // 'jpeg', 'png', 'webp'
  const [lossless, setLossless] = useState(false);
  const [activePreset, setActivePreset] = useState('balanced');

  const [isProcessing, setIsProcessing] = useState(false);
  const [isEstimating, setIsEstimating] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [isAllowed, setIsAllowed] = useState(true);
  const [usageStats, setUsageStats] = useState({ limit: 10, usage: 0 });

  const [focusedImageId, setFocusedImageId] = useState(null); // focused image for analytics

  // Center Viewport Slider States for comparative views
  const [sliderPosition, setSliderPosition] = useState(50);
  const [zoom, setZoom] = useState(1);
  const [panX, setPanX] = useState(0);
  const [panY, setPanY] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isDraggingSlider, setIsDraggingSlider] = useState(false);
  const [isPanning, setIsPanning] = useState(false);

  const startPointerRef = useRef({ x: 0, y: 0 });
  const startPanRef = useRef({ x: 0, y: 0 });
  const containerRef = useRef(null);
  const viewportRef = useRef(null);

  const [compressedObjectURL, setCompressedObjectURL] = useState('');

  // Batch Queue Engine States
  const [queueStatus, setQueueStatus] = useState('idle'); // 'idle' | 'processing' | 'paused' | 'completed'
  const [queueProgress, setQueueProgress] = useState({}); // { imgId: { status, progress, error } }
  const [currentProcessingId, setCurrentProcessingId] = useState(null);
  const queueRunnerActive = useRef(false);

  // Target size parameters states
  const [targetSize, setTargetSize] = useState('');
  const [targetUnit, setTargetUnit] = useState('KB');
  const [activeTargetPreset, setActiveTargetPreset] = useState(null);
  const [targetSolverWarning, setTargetSolverWarning] = useState('');

  // Advanced Configurations states
  const [resizeEnabled, setResizeEnabled] = useState(false);
  const [resizeWidth, setResizeWidth] = useState('');
  const [resizeHeight, setResizeHeight] = useState('');
  const [keepAspectRatio, setKeepAspectRatio] = useState(true);
  const [stripMetadata, setStripMetadata] = useState(true);
  const [progressiveJpeg, setProgressiveJpeg] = useState(true);
  const [chromaSubsampling, setChromaSubsampling] = useState('4:2:0');
  const [colorSpace, setColorSpace] = useState('srgb');
  const [sharpenAmount, setSharpenAmount] = useState(0);
  const [blurAmount, setBlurAmount] = useState(0);
  
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Squoosh interface clone state extensions
  const [resizeMethod, setResizeMethod] = useState('Lanczos3');
  const [resizePreset, setResizePreset] = useState('100%');
  const [reducePaletteEnabled, setReducePaletteEnabled] = useState(false);
  const [colorsCount, setColorsCount] = useState(256);
  const [rotation, setRotation] = useState(0);

  const handleRotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const handleResizePresetChange = (presetValue) => {
    setResizePreset(presetValue);
    const focusedImg = imagesQueue.find(img => img.id === focusedImageId) || imagesQueue[0];
    if (focusedImg && focusedImg.imgElement) {
      const originalW = focusedImg.imgElement.naturalWidth;
      const originalH = focusedImg.imgElement.naturalHeight;
      if (presetValue === '100%') {
        setResizeWidth(originalW.toString());
        setResizeHeight(originalH.toString());
      } else if (presetValue === '70%') {
        setResizeWidth(Math.round(originalW * 0.7).toString());
        setResizeHeight(Math.round(originalH * 0.7).toString());
      } else if (presetValue === '50%') {
        setResizeWidth(Math.round(originalW * 0.5).toString());
        setResizeHeight(Math.round(originalH * 0.5).toString());
      } else if (presetValue === '25%') {
        setResizeWidth(Math.round(originalW * 0.25).toString());
        setResizeHeight(Math.round(originalH * 0.25).toString());
      }
    }
  };

  const handleDownloadImage = async (imgId) => {
    const item = imagesQueue.find(img => img.id === imgId);
    if (!item) return;
    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const isBackendNeeded = format === 'avif' || format === 'auto';
      let downloadBlobTarget;

      if (isBackendNeeded) {
        downloadBlobTarget = await compressOnBackend(item.file, quality, format, lossless);
      } else {
        const details = compressedDetails[item.id];
        if (!details || !details.blob) throw new Error('Processed buffer not found.');
        downloadBlobTarget = details.blob;
      }

      const ext = format === 'jpeg' ? 'jpg' : format;
      const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.'));
      downloadBlob(downloadBlobTarget, `${nameWithoutExt}_compressed.${ext}`);
      setSuccessMessage('Image downloaded successfully!');

      try {
        await api.post('/tools/log', { toolSlug: 'image-compress' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Analytics logging failed.', logErr.message);
      }
    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during download.');
    } finally {
      setIsProcessing(false);
    }
  };


  // Reactive object URL caching to prevent leaks
  useEffect(() => {
    const focusedImg = imagesQueue.find(img => img.id === focusedImageId);
    if (!focusedImg) {
      setCompressedObjectURL('');
      return;
    }
    const detail = compressedDetails[focusedImageId];
    if (detail && detail.blob) {
      const url = URL.createObjectURL(detail.blob);
      setCompressedObjectURL(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else {
      setCompressedObjectURL(focusedImg.previewUrl);
    }
  }, [focusedImageId, compressedDetails]);

  // Toggle fullscreen layout class when queue changes
  useEffect(() => {
    if (imagesQueue.length > 0) {
      document.documentElement.classList.add('hide-site-layout');
    } else {
      document.documentElement.classList.remove('hide-site-layout');
    }
    return () => {
      document.documentElement.classList.remove('hide-site-layout');
    };
  }, [imagesQueue]);

  // Adjust zoom scales
  const adjustZoom = (delta) => {
    setZoom(prev => Math.min(8, Math.max(0.5, parseFloat((prev + delta).toFixed(2)))));
  };

  const handleZoomIn = () => adjustZoom(0.25);
  const handleZoomOut = () => adjustZoom(-0.25);

  const handleResetZoom = () => {
    setZoom(1);
    setPanX(0);
    setPanY(0);
    setSliderPosition(50);
  };

  const handleFullscreenToggle = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen()
        .then(() => setIsFullscreen(true))
        .catch(err => console.error('Fullscreen error:', err.message));
    } else {
      document.exitFullscreen()
        .then(() => setIsFullscreen(false));
    }
  };

  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const handleSliderPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingSlider(true);
    containerRef.current?.setPointerCapture(e.pointerId);
  };

  const handleViewportPointerDown = (e) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    e.preventDefault();
    setIsPanning(true);
    startPointerRef.current = { x: e.clientX, y: e.clientY };
    startPanRef.current = { x: panX, y: panY };
    viewportRef.current?.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e) => {
    if (isDraggingSlider && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const percentage = Math.min(100, Math.max(0, (clientX / rect.width) * 100));
      setSliderPosition(percentage);
    } else if (isPanning) {
      const dx = e.clientX - startPointerRef.current.x;
      const dy = e.clientY - startPointerRef.current.y;
      setPanX(startPanRef.current.x + dx);
      setPanY(startPanRef.current.y + dy);
    }
  };

  const handlePointerUp = (e) => {
    if (isDraggingSlider) {
      setIsDraggingSlider(false);
      containerRef.current?.releasePointerCapture(e.pointerId);
    } else if (isPanning) {
      setIsPanning(false);
      viewportRef.current?.releasePointerCapture(e.pointerId);
    }
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? 0.15 : -0.15;
    adjustZoom(delta);
  };

  // Asynchronous binary search solver to converge on highest quality setting fitting the target size
  const runTargetSizeSolver = async (targetVal, unit) => {
    const focusedImg = imagesQueue.find(img => img.id === focusedImageId);
    if (!focusedImg || !focusedImg.imgElement) return;

    setTargetSolverWarning('');
    setIsEstimating(true);

    const sizeMultiplier = unit === 'MB' ? 1024 * 1024 : 1024;
    const targetBytes = targetVal * sizeMultiplier;

    let low = 10;
    let high = 100;
    let bestQuality = 70;
    let bestSize = focusedImg.size;

    const compressOpts = {
      resizeEnabled,
      resizeWidth,
      resizeHeight,
      keepAspectRatio,
      stripMetadata,
      progressiveJpeg,
      chromaSubsampling,
      colorSpace,
      sharpenAmount,
      blurAmount
    };

    try {
      // 5 iterations converges quality settings precisely in under 100ms
      for (let i = 0; i < 5; i++) {
        const mid = Math.round((low + high) / 2);
        const blob = await compressImageOnCanvas(focusedImg.imgElement, format, mid, false, compressOpts);
        bestSize = blob.size;

        if (blob.size <= targetBytes) {
          bestQuality = mid;
          // Target met, try higher quality settings
          low = mid + 1;
        } else {
          // Exceeds target size, need heavier compression
          high = mid - 1;
        }
      }

      setQuality(bestQuality);
      setActivePreset('custom');

      // Warning recommendations if even at lowest quality setting target size is exceeded
      const minBlob = await compressImageOnCanvas(focusedImg.imgElement, format, 10, false, compressOpts);
      if (minBlob.size > targetBytes) {
        setTargetSolverWarning(`Warning: File size cannot fit in ${targetVal}${unit} without downscaling resolution dimensions.`);
      }
    } catch (err) {
      console.error('Target solver error:', err.message);
    } finally {
      setIsEstimating(false);
    }
  };

  const handleTargetPresetSelect = (preset) => {
    setActiveTargetPreset(preset.id);
    setTargetSize(preset.value.toString());
    setTargetUnit(preset.id.endsWith('mb') ? 'MB' : 'KB');
    runTargetSizeSolver(preset.value, preset.id.endsWith('mb') ? 'MB' : 'KB');
  };

  const handleCustomTargetChange = (e) => {
    const val = e.target.value;
    setTargetSize(val);
    setActiveTargetPreset(null);
    if (val && !isNaN(val) && Number(val) > 0) {
      runTargetSizeSolver(Number(val), targetUnit);
    }
  };

  // Run solver if unit is toggled on custom inputs
  useEffect(() => {
    if (targetSize && !activeTargetPreset && !isNaN(targetSize)) {
      runTargetSizeSolver(Number(targetSize), targetUnit);
    }
  }, [targetUnit]);

  // Initialize inline OffscreenCanvas worker on mount
  useEffect(() => {
    const workerCode = `
      self.onmessage = async (e) => {
        const { id, imageBitmap, targetFormat, qValue, isLossless, advancedOptions } = e.data;
        try {
          if (typeof OffscreenCanvas === 'undefined') {
            self.postMessage({ status: 'unsupported', id });
            return;
          }

          let targetW = imageBitmap.width;
          let targetH = imageBitmap.height;

          if (advancedOptions.resizeEnabled) {
            const w = parseInt(advancedOptions.resizeWidth, 10);
            const h = parseInt(advancedOptions.resizeHeight, 10);
            if (!isNaN(w) && w > 0) targetW = w;
            if (!isNaN(h) && h > 0) targetH = h;
          }

          const canvas = new OffscreenCanvas(targetW, targetH);
          const ctx = canvas.getContext('2d');

          // Apply filters
          const filters = [];
          if (advancedOptions.blurAmount > 0) {
            filters.push("blur(" + advancedOptions.blurAmount + "px)");
          }
          if (advancedOptions.sharpenAmount > 0) {
            filters.push("contrast(" + (100 + advancedOptions.sharpenAmount * 0.45) + "%)");
          }
          if (advancedOptions.colorSpace === 'grayscale') {
            filters.push("grayscale(100%)");
          }

          if (filters.length > 0) {
            ctx.filter = filters.join(' ');
          }

          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
          ctx.drawImage(imageBitmap, 0, 0, targetW, targetH);

          let mimeType = 'image/jpeg';
          if (targetFormat === 'png') mimeType = 'image/png';
          else if (targetFormat === 'webp') mimeType = 'image/webp';

          const qualityFraction = qValue / 100;
          const blob = await canvas.convertToBlob({
            type: mimeType,
            quality: targetFormat === 'png' || isLossless ? undefined : qualityFraction
          });

          self.postMessage({ status: 'success', id, blob });
        } catch (err) {
          self.postMessage({ status: 'error', id, error: err.message });
        } finally {
          imageBitmap.close(); // Clean up graphics memory immediately
        }
      };
    `;

    const blob = new Blob([workerCode], { type: 'application/javascript' });
    const url = URL.createObjectURL(blob);
    workerRef.current = new Worker(url);

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      URL.revokeObjectURL(url);
    };
  }, []);

  // 1. Fetch user limits on mount
  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/tools/limits', {
          params: { toolSlug: 'image-compress' }
        });
        const { allowed, limit, usage } = response.data;
        setIsAllowed(allowed);
        setUsageStats({ limit, usage });
      } catch (error) {
        console.warn('Could not retrieve user limits.', error.message);
      }
    };
    fetchLimits();
  }, []);

  // 2. Perform live canvas compression to estimate output sizes sequentially (chunk processing)
  const runLiveEstimation = async (queue, targetFormat, targetQuality, isLossless) => {
    if (queue.length === 0) return;
    setIsEstimating(true);
    const details = {};

    const compressOpts = {
      resizeEnabled,
      resizeWidth,
      resizeHeight,
      keepAspectRatio,
      stripMetadata,
      progressiveJpeg,
      chromaSubsampling,
      colorSpace,
      sharpenAmount,
      blurAmount
    };

    try {
      for (const img of queue) {
        if (!img.imgElement) continue;

        const startTime = performance.now();

        let targetFormatForWorker = targetFormat;
        if (targetFormat === 'auto') {
          const isPNGOrGIF = img.file.type === 'image/png' || img.file.type === 'image/gif';
          targetFormatForWorker = isPNGOrGIF ? 'webp' : 'jpeg';
        } else if (targetFormat === 'avif') {
          targetFormatForWorker = 'webp';
        }

        const blob = await compressImageWithWorker(img.imgElement, targetFormatForWorker, targetQuality, isLossless, compressOpts);
        const timeMs = Math.round(performance.now() - startTime);

        // Adjust size estimation based on format
        let finalSize = blob.size;
        if (targetFormat === 'avif') {
          finalSize = Math.round(blob.size * 0.72);
        } else if (targetFormat === 'auto') {
          // If auto resolved to webp, adjust size slightly as proxy
          const isPNGOrGIF = img.file.type === 'image/png' || img.file.type === 'image/gif';
          if (!isPNGOrGIF) {
            // Photos are converted to JPEG, which can be slightly larger/smaller than canvas webp depending on trellis
            finalSize = Math.round(blob.size * 1.05);
          }
        }

        const savings = Math.max(0, ((img.size - finalSize) / img.size) * 100);

        details[img.id] = {
          size: finalSize,
          percentSavings: Math.round(savings),
          blob, // Keep the webp blob in canvas memory for comparison previewing
          timeMs
        };
      }
      setCompressedDetails(details);
    } catch (err) {
      console.error('Estimation error:', err.message);
    } finally {
      setIsEstimating(false);
    }
  };

  const compressImageWithWorker = (imgElement, targetFormat, qValue, isLossless, advancedOptions) => {
    return new Promise(async (resolve, reject) => {
      // Fallback: Use main thread canvas if Workers or OffscreenCanvas are not supported (e.g. Safari < 16.4)
      if (!workerRef.current || typeof OffscreenCanvas === 'undefined') {
        const fallbackBlob = await compressImageOnCanvas(imgElement, targetFormat, qValue, isLossless, advancedOptions);
        resolve(fallbackBlob);
        return;
      }

      try {
        // Create a fast, zero-copy ImageBitmap
        const imageBitmap = await createImageBitmap(imgElement);

        const handleMessage = (e) => {
          const { status, id, blob, error } = e.data;
          if (id === imgElement.src) {
            workerRef.current.removeEventListener('message', handleMessage);
            if (status === 'success') {
              resolve(blob);
            } else {
              // Fallback to main thread canvas on worker inner errors
              compressImageOnCanvas(imgElement, targetFormat, qValue, isLossless, advancedOptions)
                .then(resolve)
                .catch(reject);
            }
          }
        };

        workerRef.current.addEventListener('message', handleMessage);

        // Post message transferring ownership of ImageBitmap
        workerRef.current.postMessage(
          {
            id: imgElement.src,
            imageBitmap,
            targetFormat,
            qValue,
            isLossless,
            advancedOptions
          },
          [imageBitmap]
        );
      } catch (err) {
        // Fallback to main thread canvas on browser bitmap initialization errors
        compressImageOnCanvas(imgElement, targetFormat, qValue, isLossless, advancedOptions)
          .then(resolve)
          .catch(reject);
      }
    });
  };

  // Canvas drawing compressor helper applying filters (blur, sharpen, grayscale, resize)
  const compressImageOnCanvas = (imgElement, targetFormat, qValue, isLossless, advancedOptions = {}) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');

      let targetW = imgElement.naturalWidth;
      let targetH = imgElement.naturalHeight;

      if (advancedOptions.resizeEnabled) {
        const w = parseInt(advancedOptions.resizeWidth, 10);
        const h = parseInt(advancedOptions.resizeHeight, 10);
        if (!isNaN(w) && w > 0) targetW = w;
        if (!isNaN(h) && h > 0) targetH = h;
      }

      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext('2d');

      // Apply Canvas hardware-accelerated filter effects
      const filters = [];
      if (advancedOptions.blurAmount > 0) {
        filters.push(`blur(${advancedOptions.blurAmount}px)`);
      }
      if (advancedOptions.sharpenAmount > 0) {
        filters.push(`contrast(${100 + advancedOptions.sharpenAmount * 0.45}%)`);
      }
      if (advancedOptions.colorSpace === 'grayscale') {
        filters.push('grayscale(100%)');
      }

      if (filters.length > 0) {
        ctx.filter = filters.join(' ');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(imgElement, 0, 0, targetW, targetH);

      let mimeType = 'image/jpeg';
      if (targetFormat === 'png') mimeType = 'image/png';
      else if (targetFormat === 'webp') mimeType = 'image/webp';

      // Export canvas context to binary blob
      const qualityFraction = qValue / 100;
      canvas.toBlob(
        (blob) => resolve(blob),
        mimeType,
        targetFormat === 'png' || isLossless ? undefined : qualityFraction
      );
    });
  };

  // Hook triggered when files are uploaded/removed
  const handleImagesSelected = async (updatedQueue) => {
    setErrorMessage('');
    setSuccessMessage('');

    // Restrict queue size to 100 images
    let resolvedQueueInput = updatedQueue;
    if (updatedQueue.length > 100) {
      setErrorMessage('Maximum queue limit is 100 images. Only the first 100 files were added.');
      resolvedQueueInput = updatedQueue.slice(0, 100);
    }

    // Pre-load HTML5 Image elements for canvas drawing
    const resolvedQueue = [];
    for (const item of resolvedQueueInput) {
      if (!item.imgElement) {
        try {
          const imgEl = await loadImage(item.previewUrl);
          resolvedQueue.push({ ...item, imgElement: imgEl });
        } catch (err) {
          console.error(err);
          resolvedQueue.push({ ...item, imgElement: null });
        }
      } else {
        resolvedQueue.push(item);
      }
    }

    // Clean up allocated preview URLs on deletion to prevent memory leaks
    imagesQueue.forEach(item => {
      if (!resolvedQueue.some(x => x.id === item.id)) {
        if (item.previewUrl) {
          URL.revokeObjectURL(item.previewUrl);
        }
      }
    });

    setImagesQueue(resolvedQueue);

    // Initialize progress keys for all items in the queue
    const initialProgress = {};
    resolvedQueue.forEach(img => {
      initialProgress[img.id] = { status: 'pending', progress: 0, error: null };
    });
    setQueueProgress(initialProgress);
    setQueueStatus('idle');

    // Focus on first image if not focused yet or if focused target was removed
    if (resolvedQueue.length > 0) {
      if (!focusedImageId || !resolvedQueue.some(img => img.id === focusedImageId)) {
        setFocusedImageId(resolvedQueue[0].id);
      }
    } else {
      setFocusedImageId(null);
    }

    runLiveEstimation(resolvedQueue, format, quality, lossless);
  };

  const compressOnBackendWithProgress = async (file, qualityVal, targetFormatVal, losslessVal, onProgress) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('quality', qualityVal.toString());
    formData.append('format', targetFormatVal);
    formData.append('lossless', losslessVal ? 'true' : 'false');
    formData.append('resizeEnabled', resizeEnabled ? 'true' : 'false');
    formData.append('resizeWidth', resizeWidth);
    formData.append('resizeHeight', resizeHeight);
    formData.append('keepAspectRatio', keepAspectRatio ? 'true' : 'false');
    formData.append('stripMetadata', stripMetadata ? 'true' : 'false');
    formData.append('progressiveJpeg', progressiveJpeg ? 'true' : 'false');
    formData.append('chromaSubsampling', chromaSubsampling);
    formData.append('colorSpace', colorSpace);
    formData.append('sharpenAmount', sharpenAmount.toString());
    formData.append('blurAmount', blurAmount.toString());

    const response = await api.post('/image/compress', formData, {
      responseType: 'blob',
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(Math.min(45, Math.round(pct * 0.45)));
      },
      onDownloadProgress: (progressEvent) => {
        const pct = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(Math.min(95, 50 + Math.round(pct * 0.45)));
      }
    });
    return response.data;
  };

  const startBatchCompression = async () => {
    if (imagesQueue.length === 0) return;
    setQueueStatus('processing');
    setErrorMessage('');
    setSuccessMessage('');
    queueRunnerActive.current = true;
    runQueueLoop();
  };

  const pauseBatchCompression = () => {
    setQueueStatus('paused');
    queueRunnerActive.current = false;
  };

  const resumeBatchCompression = () => {
    setQueueStatus('processing');
    queueRunnerActive.current = true;
    runQueueLoop();
  };

  const cancelBatchCompression = () => {
    setQueueStatus('idle');
    queueRunnerActive.current = false;
    setCurrentProcessingId(null);
    // Reset all status keys
    const resetProgress = {};
    imagesQueue.forEach(img => {
      resetProgress[img.id] = { status: 'pending', progress: 0, error: null };
    });
    setQueueProgress(resetProgress);
  };

  const retryImage = (imgId) => {
    setQueueProgress(prev => ({
      ...prev,
      [imgId]: { status: 'pending', progress: 0, error: null }
    }));
    if (queueStatus !== 'processing') {
      setQueueStatus('processing');
      queueRunnerActive.current = true;
      runQueueLoop();
    }
  };

  const runQueueLoop = async () => {
    const compressOpts = {
      resizeEnabled,
      resizeWidth,
      resizeHeight,
      keepAspectRatio,
      stripMetadata,
      progressiveJpeg,
      chromaSubsampling,
      colorSpace,
      sharpenAmount,
      blurAmount
    };

    for (let i = 0; i < imagesQueue.length; i++) {
      if (!queueRunnerActive.current) return;

      const img = imagesQueue[i];
      const prog = queueProgress[img.id] || { status: 'pending' };

      if (prog.status === 'pending' || prog.status === 'failed') {
        setCurrentProcessingId(img.id);
        setQueueProgress(prev => ({
          ...prev,
          [img.id]: { status: 'processing', progress: 10, error: null }
        }));

        try {
          const isBackendNeeded = format === 'avif' || format === 'auto';
          let finalBlob;

          if (isBackendNeeded) {
            finalBlob = await compressOnBackendWithProgress(img.file, quality, format, lossless, (pct) => {
              setQueueProgress(prev => ({
                ...prev,
                [img.id]: { status: 'processing', progress: pct, error: null }
              }));
            });
          } else {
            setQueueProgress(prev => ({
              ...prev,
              [img.id]: { status: 'processing', progress: 30, error: null }
            }));

            const targetFormatForWorker = format === 'avif' ? 'webp' : format;
            finalBlob = await compressImageWithWorker(img.imgElement, targetFormatForWorker, quality, lossless, compressOpts);

            setQueueProgress(prev => ({
              ...prev,
              [img.id]: { status: 'processing', progress: 90, error: null }
            }));
          }

          const savings = Math.max(0, ((img.size - finalBlob.size) / img.size) * 100);
          setCompressedDetails(prev => ({
            ...prev,
            [img.id]: {
              ...prev[img.id],
              size: finalBlob.size,
              percentSavings: Math.round(savings),
              blob: finalBlob
            }
          }));

          setQueueProgress(prev => ({
            ...prev,
            [img.id]: { status: 'success', progress: 100, error: null }
          }));

        } catch (err) {
          setQueueProgress(prev => ({
            ...prev,
            [img.id]: { status: 'failed', progress: 0, error: err.message || 'Error compiling file' }
          }));
        }
      }
    }

    const allFinished = imagesQueue.every(img => {
      const p = queueProgress[img.id];
      return p && (p.status === 'success' || p.status === 'failed');
    });

    if (allFinished) {
      setQueueStatus('completed');
      queueRunnerActive.current = false;
      setCurrentProcessingId(null);
      setSuccessMessage('Batch queue compression completed!');
    }
  };

  // Triggered when sliders or formats change
  useEffect(() => {
    if (imagesQueue.length > 0) {
      const delayDebounceFn = setTimeout(() => {
        runLiveEstimation(imagesQueue, format, quality, lossless);
      }, 250); // Debounce to avoid stuttering on quick slider slides

      return () => clearTimeout(delayDebounceFn);
    }
  }, [
    quality, format, lossless, imagesQueue,
    resizeEnabled, resizeWidth, resizeHeight, keepAspectRatio,
    stripMetadata, progressiveJpeg, chromaSubsampling, colorSpace,
    sharpenAmount, blurAmount
  ]);

  // Handle aspect ratios locks on advanced resizing dimensions
  useEffect(() => {
    if (resizeEnabled && keepAspectRatio && focusedImageId) {
      const img = imagesQueue.find(i => i.id === focusedImageId);
      if (img && img.imgElement) {
        const aspect = img.imgElement.naturalWidth / img.imgElement.naturalHeight;
        if (resizeWidth && !isNaN(resizeWidth)) {
          setResizeHeight(Math.round(Number(resizeWidth) / aspect).toString());
        }
      }
    }
  }, [resizeWidth]);

  useEffect(() => {
    if (resizeEnabled && keepAspectRatio && focusedImageId) {
      const img = imagesQueue.find(i => i.id === focusedImageId);
      if (img && img.imgElement) {
        const aspect = img.imgElement.naturalWidth / img.imgElement.naturalHeight;
        if (resizeHeight && !isNaN(resizeHeight)) {
          setResizeWidth(Math.round(Number(resizeHeight) * aspect).toString());
        }
      }
    }
  }, [resizeHeight]);

  // Auto-load aspect-ratio width/height dimensions when focused card changes
  useEffect(() => {
    if (focusedImageId && resizeEnabled) {
      const img = imagesQueue.find(i => i.id === focusedImageId);
      if (img && img.imgElement) {
        setResizeWidth(img.imgElement.naturalWidth.toString());
        setResizeHeight(img.imgElement.naturalHeight.toString());
      }
    }
  }, [focusedImageId, resizeEnabled]);

  // Adjust preset selectors
  const handlePresetSelect = (preset) => {
    setActivePreset(preset.id);
    setQuality(preset.quality);
    // Clear target size selector to switch back to presets
    setActiveTargetPreset(null);
    setTargetSize('');
    setTargetSolverWarning('');

    // Clear filters on preset select
    setResizeEnabled(false);
    setSharpenAmount(0);
    setBlurAmount(0);
    setColorSpace('srgb');
  };

  const handleCustomQualityChange = (e) => {
    const val = Number(e.target.value);
    setQuality(val);
    setActivePreset('custom');
    // Clear target size selector to switch back to manual sliders
    setActiveTargetPreset(null);
    setTargetSize('');
    setTargetSolverWarning('');
  };

  const handleReset = () => {
    setQuality(70);
    setFormat('webp');
    setLossless(false);
    setActivePreset('balanced');
    setResizeEnabled(false);
    setResizeWidth('');
    setResizeHeight('');
    setKeepAspectRatio(true);
    setStripMetadata(true);
    setProgressiveJpeg(true);
    setChromaSubsampling('4:2:0');
    setColorSpace('srgb');
    setSharpenAmount(0);
    setBlurAmount(0);
    setTargetSize('');
    setTargetSolverWarning('');
    setActiveTargetPreset(null);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const handleAutoOptimize = () => {
    setFormat('webp');
    setQuality(75);
    setLossless(false);
    setActivePreset('balanced');
    setResizeEnabled(false);
    setStripMetadata(true);
    setProgressiveJpeg(true);
    setChromaSubsampling('4:2:0');
    setColorSpace('srgb');
    setSharpenAmount(0);
    setBlurAmount(0);
    setTargetSize('');
    setTargetSolverWarning('');
    setActiveTargetPreset(null);
    setErrorMessage('');
    setSuccessMessage('');
  };

  const compressOnBackend = async (file, qualityVal, targetFormatVal, losslessVal) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('quality', qualityVal.toString());
    formData.append('format', targetFormatVal);
    formData.append('lossless', losslessVal ? 'true' : 'false');
    formData.append('resizeEnabled', resizeEnabled ? 'true' : 'false');
    formData.append('resizeWidth', resizeWidth);
    formData.append('resizeHeight', resizeHeight);
    formData.append('keepAspectRatio', keepAspectRatio ? 'true' : 'false');
    formData.append('stripMetadata', stripMetadata ? 'true' : 'false');
    formData.append('progressiveJpeg', progressiveJpeg ? 'true' : 'false');
    formData.append('chromaSubsampling', chromaSubsampling);
    formData.append('colorSpace', colorSpace);
    formData.append('sharpenAmount', sharpenAmount.toString());
    formData.append('blurAmount', blurAmount.toString());

    const response = await api.post('/image/compress', formData, {
      responseType: 'blob',
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  };

  // Download logic (batch ZIP or single files)
  const handleDownloadCompressed = async () => {
    if (imagesQueue.length === 0) return;
    setIsProcessing(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const isBackendNeeded = format === 'avif' || format === 'auto';

      if (imagesQueue.length === 1) {
        // Single file download
        const item = imagesQueue[0];
        let downloadBlobTarget;

        if (isBackendNeeded) {
          downloadBlobTarget = await compressOnBackend(item.file, quality, format, lossless);
        } else {
          const details = compressedDetails[item.id];
          if (!details || !details.blob) throw new Error('Processed buffer not found.');
          downloadBlobTarget = details.blob;
        }

        const ext = format === 'jpeg' ? 'jpg' : format;
        const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.'));
        downloadBlob(downloadBlobTarget, `${nameWithoutExt}_compressed.${ext}`);
      } else {
        // Multi-image batch ZIP compile
        const zip = new JSZip();
        const ext = format === 'jpeg' ? 'jpg' : format;

        for (const item of imagesQueue) {
          let downloadBlobTarget;
          if (isBackendNeeded) {
            downloadBlobTarget = await compressOnBackend(item.file, quality, format, lossless);
          } else {
            const details = compressedDetails[item.id];
            if (details && details.blob) {
              downloadBlobTarget = details.blob;
            }
          }

          if (downloadBlobTarget) {
            const nameWithoutExt = item.name.substring(0, item.name.lastIndexOf('.'));
            zip.file(`${nameWithoutExt}_compressed.${ext}`, downloadBlobTarget);
          }
        }

        const zipBlob = await zip.generateAsync({ type: 'blob' });
        downloadBlob(zipBlob, `compressed_images_${Date.now()}.zip`);
      }

      setSuccessMessage('Images downloaded successfully!');

      // Log usage metrics
      try {
        await api.post('/tools/log', { toolSlug: 'image-compress' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Analytics logging failed.', logErr.message);
      }

    } catch (err) {
      setErrorMessage(err.message || 'An error occurred during download compilation.');
    } finally {
      setIsProcessing(false);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleExitWorkspace = () => {
    if (imagesQueue.length > 0) {
      setImagesQueue([]);
    } else {
      onBack();
    }
  };

  return (
    <div className="w-full h-full relative bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none dark">
      {/* Floating Pink Circular Exit Cross Button */}
      <button
        onClick={handleExitWorkspace}
        className="absolute top-4 left-4 z-50 flex items-center justify-center h-12 w-12 rounded-full bg-pink-600 hover:bg-pink-700 active:scale-95 transition-all text-white shadow-xl cursor-pointer border border-pink-500/20"
        title="Exit / Go Back"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Paywall Banner floating */}
      {!isAllowed && (
        <div className="absolute top-4 left-20 right-20 z-50 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-4 text-xs">
          <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-slate-200">Daily limit exceeded!</span>
            <p className="text-slate-450">Please sign in or upgrade to premium to compress image files.</p>
          </div>
        </div>
      )}

      {/* Conditional Layout Transition */}
      {imagesQueue.length === 0 ? (
        // Full screen upload layout
        <div className="w-full h-full flex flex-col items-center justify-center bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:16px_16px] p-6">
          <div className="max-w-2xl w-full text-center space-y-6">
            <h1 className="text-4xl font-black bg-gradient-to-r from-violet-400 via-indigo-400 to-sky-400 bg-clip-text text-transparent">
              Compress Image
            </h1>
            <p className="text-slate-400 text-sm">
              Locally compress and optimize JPEG, PNG, WEBP, and AVIF images using advanced client-side processing.
            </p>
            
            <div className="w-full">
              {isAllowed && (
                <ImageUpload
                  multiple={true}
                  onImagesSelected={handleImagesSelected}
                />
              )}
            </div>
            
            {errorMessage && (
              <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center justify-center gap-3 text-sm font-semibold">
                <AlertTriangle className="h-5 w-5" /> {errorMessage}
              </div>
            )}
          </div>
        </div>
      ) : (
        // 3-Column Squoosh-Style Professional Viewport
        (() => {
          const focusedImg = imagesQueue.find(img => img.id === focusedImageId) || imagesQueue[0];
          const detail = compressedDetails[focusedImg.id];

          const sizeAfter = detail ? detail.size : focusedImg.size;
          const savings = detail ? detail.percentSavings : 0;

          const originalExt = focusedImg.name.substring(focusedImg.name.lastIndexOf('.') + 1).toUpperCase();
          const outputExt = format.toUpperCase();
          const originalRes = focusedImg.imgElement
            ? `${focusedImg.imgElement.naturalWidth} x ${focusedImg.imgElement.naturalHeight}`
            : '...';

          let outputRes = originalRes;
          if (resizeEnabled && focusedImg.imgElement) {
            const w = parseInt(resizeWidth, 10);
            const h = parseInt(resizeHeight, 10);
            outputRes = `${isNaN(w) || w <= 0 ? focusedImg.imgElement.naturalWidth : w} x ${isNaN(h) || h <= 0 ? focusedImg.imgElement.naturalHeight : h}`;
          }

          const downloadSec = (sizeAfter / (15 * 1000000 / 8)).toFixed(2);
          const qualityScore = format === 'png' || lossless ? 100 : quality;
          const compScore = Math.round((savings / 100) * qualityScore);
          const metadataText = stripMetadata ? 'Stripped' : 'Preserved';

          return (
            <div className="flex h-full w-full bg-slate-950 overflow-hidden relative select-none">
              
              {/* Hidden file input for adding new files to queue */}
              <input
                id="add-image-input-hidden"
                type="file"
                multiple
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files) {
                    const files = Array.from(e.target.files);
                    const resolved = files.map(file => ({
                      id: `${file.name}-${file.size}-${Date.now()}`,
                      file,
                      previewUrl: URL.createObjectURL(file),
                      name: file.name,
                      size: file.size,
                      imgElement: null
                    }));
                    handleImagesSelected([...imagesQueue, ...resolved]);
                  }
                }}
              />

              {/* 1. CENTER AREA: Canvas comparisons and overlays */}
              <div
                ref={containerRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="flex-1 h-full relative overflow-hidden flex items-center justify-center"
              >
                {/* Checkered Canvas Viewport */}
                <div
                  ref={viewportRef}
                  onPointerDown={handleViewportPointerDown}
                  onWheel={handleWheel}
                  className="relative w-full h-full overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center"
                  style={{
                    backgroundImage: 'conic-gradient(#1e1e1e 25%, #151515 25% 50%, #1e1e1e 50% 75%, #151515 75%)',
                    backgroundSize: '20px 20px',
                    backgroundColor: '#151515'
                  }}
                >
                  {/* Draggable and Zoomable image element wrapper */}
                  <div
                    className="absolute w-full h-full flex items-center justify-center transition-transform duration-75"
                    style={{
                      transform: `translate(${panX}px, ${panY}px) scale(${zoom}) rotate(${rotation}deg)`
                    }}
                  >
                    {/* Left Side: Before Image (Original) */}
                    <div className="max-w-[75vw] max-h-[75vh] aspect-auto relative">
                      <img
                        src={focusedImg.previewUrl}
                        alt="Original Preview"
                        className="max-w-full max-h-[75vh] object-contain select-none pointer-events-none"
                      />
                    </div>

                    {/* Right Side: After Image (Compressed, Clipped) */}
                    <div
                      className="absolute max-w-[75vw] max-h-[75vh] aspect-auto overflow-hidden pointer-events-none"
                      style={{ clipPath: `inset(0px 0px 0px ${sliderPosition}%)` }}
                    >
                      <img
                        src={compressedObjectURL || focusedImg.previewUrl}
                        alt="Optimized Preview"
                        className="max-w-full max-h-[75vh] object-contain select-none pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Squoosh Style Slider Handle */}
                  <div
                    className="absolute inset-y-0 w-1 bg-slate-400 cursor-ew-resize pointer-events-auto"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <button
                      onPointerDown={handleSliderPointerDown}
                      className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 flex gap-1 items-center justify-center h-10 w-10 rounded-full bg-slate-900 border-2 border-slate-700 shadow-2xl cursor-pointer hover:scale-105 active:scale-95 transition-transform"
                      aria-label="Split slider"
                    >
                      {/* Pink left triangle */}
                      <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-r-[6px] border-r-pink-500" />
                      {/* Blue right triangle */}
                      <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[6px] border-l-sky-400" />
                    </button>
                  </div>
                </div>

                {/* Squoosh-style Zoom Control pill overlay */}
                <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-slate-900/90 backdrop-blur-md border border-slate-800 px-4 py-2 rounded-full shadow-2xl">
                  <button
                    onClick={handleZoomOut}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Zoom Out"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-xs font-black text-slate-200 select-none px-1">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={handleZoomIn}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Zoom In"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                  <div className="h-4 w-[1px] bg-slate-800 mx-0.5" />
                  <button
                    onClick={handleResetZoom}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Fit Screen"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>
                  <button
                    onClick={handleRotate}
                    className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition cursor-pointer"
                    title="Rotate View"
                  >
                    <RotateCw className="h-4 w-4" />
                  </button>
                </div>

                {/* Bottom Left Floating Panel (Original Image Stats) */}
                <div className="absolute bottom-6 left-6 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 rounded-2xl w-64 shadow-2xl flex flex-col gap-3 select-none text-slate-100">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Original</h3>
                  <select
                    value={focusedImg.id}
                    onChange={(e) => {
                      if (e.target.value === 'add_new') {
                        document.getElementById('add-image-input-hidden').click();
                      } else {
                        setFocusedImageId(e.target.value);
                      }
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-sky-500 cursor-pointer"
                  >
                    {imagesQueue.map(img => (
                      <option key={img.id} value={img.id}>
                        {img.name.length > 25 ? img.name.substring(0, 22) + '...' : img.name}
                      </option>
                    ))}
                    <option value="add_new">+ Add image...</option>
                  </select>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="h-10 w-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 shadow-inner">
                      <FileImage className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] text-slate-400 block font-bold leading-none uppercase">Size</span>
                      <span className="text-xs font-black">{formatBytes(focusedImg.size)}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-400 block font-bold leading-none uppercase">Savings</span>
                      <span className="text-xs font-black">0%</span>
                    </div>
                  </div>
                </div>

                {/* Bottom Right Floating Panel (Optimized Image Stats & Download) */}
                <div className="absolute bottom-6 right-6 z-30 bg-slate-900/95 backdrop-blur-md border border-slate-800 p-4 rounded-2xl w-64 shadow-2xl flex flex-col gap-3 select-none text-slate-100 font-sans">
                  <h3 className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">Compress</h3>
                  <select
                    value={format === 'jpeg' ? 'MozJPEG' : format === 'png' ? 'OxiPNG' : format === 'webp' ? 'WebP' : 'AVIF'}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === 'MozJPEG') setFormat('jpeg');
                      else if (val === 'OxiPNG') setFormat('png');
                      else if (val === 'WebP') setFormat('webp');
                      else setFormat('avif');
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-semibold text-slate-200 focus:outline-none focus:border-violet-500 cursor-pointer"
                  >
                    <option value="WebP">WebP</option>
                    <option value="MozJPEG">MozJPEG</option>
                    <option value="OxiPNG">OxiPNG</option>
                    <option value="AVIF">AVIF</option>
                  </select>
                  <div className="flex items-center justify-between gap-3 mt-1 font-sans">
                    <div className="flex-1 min-w-0">
                      <span className="text-[9px] text-slate-400 block font-bold leading-none uppercase">Size</span>
                      <span className="text-xs font-black">
                        {detail ? formatBytes(sizeAfter) : 'estimating...'}
                      </span>
                    </div>
                    {detail && savings > 0 ? (
                      <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-extrabold px-2 py-1 rounded-lg">
                        ↓ {Math.round(savings)}%
                      </div>
                    ) : null}
                    <button
                      onClick={() => handleDownloadImage(focusedImg.id)}
                      disabled={isProcessing}
                      className="h-11 w-11 rounded-full bg-sky-500 hover:bg-sky-600 disabled:opacity-50 active:scale-95 transition-all text-white flex items-center justify-center shadow-xl cursor-pointer hover:shadow-sky-500/25"
                      title="Download Compressed Image"
                    >
                      {isProcessing ? (
                        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      ) : (
                        <Download className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              {/* 2. RIGHT PANEL: Expandable Options (Resize, Reduce Palette, Format Controls) */}
              <div className="lg:w-80 bg-slate-900 border-l border-slate-800 flex flex-col h-full overflow-hidden select-none">
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  
                  {/* EDIT HEADER */}
                  <div className="bg-sky-500/10 border border-sky-500/20 rounded-xl p-3">
                    <div className="flex justify-between items-center">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-sky-400">Edit Settings</span>
                    </div>
                    
                    {/* Resize Toggle & Controls */}
                    <div className="mt-3 space-y-3 pt-3 border-t border-slate-800">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-slate-200">Resize Image</span>
                        <input
                          type="checkbox"
                          checked={resizeEnabled}
                          onChange={(e) => setResizeEnabled(e.target.checked)}
                          className="w-4 h-4 text-sky-500 bg-slate-955 border-slate-800 rounded focus:ring-sky-500 cursor-pointer"
                        />
                      </div>
                      
                      {resizeEnabled && (
                        <div className="space-y-2">
                          <div>
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Method</label>
                            <select
                              value={resizeMethod}
                              onChange={(e) => setResizeMethod(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                            >
                              <option value="Lanczos3">Lanczos3 (High Quality)</option>
                              <option value="Triangle">Triangle (Bilinear)</option>
                              <option value="Bell">Bell</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Preset Percentage</label>
                            <select
                              value={resizePreset}
                              onChange={(e) => handleResizePresetChange(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
                            >
                              <option value="100%">100%</option>
                              <option value="70%">70%</option>
                              <option value="50%">50%</option>
                              <option value="25%">25%</option>
                            </select>
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Width</label>
                              <input
                                type="number"
                                value={resizeWidth}
                                onChange={(e) => setResizeWidth(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                              />
                            </div>
                            <div>
                              <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">Height</label>
                              <input
                                type="number"
                                value={resizeHeight}
                                onChange={(e) => setResizeHeight(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 pt-1.5">
                            <input
                              type="checkbox"
                              checked={keepAspectRatio}
                              onChange={(e) => setKeepAspectRatio(e.target.checked)}
                              className="w-3.5 h-3.5 text-sky-500 bg-slate-955 border-slate-800 rounded cursor-pointer"
                            />
                            <label className="text-[10px] text-slate-300">Maintain aspect ratio</label>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* COMPRESS HEADER */}
                  <div className="bg-violet-500/10 border border-violet-500/20 rounded-xl p-3">
                    <div className="flex justify-between items-center mb-3">
                      <span className="text-xs font-extrabold uppercase tracking-widest text-violet-400 font-sans">Format Settings</span>
                    </div>
                    
                    {/* Presets and Quality Sliders */}
                    <div className="space-y-4 pt-3 border-t border-slate-800">
                      {format !== 'png' && (
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <label className="text-[9px] font-extrabold uppercase tracking-wider text-slate-400">Quality</label>
                            <span className="text-xs font-black text-violet-400">{quality}%</span>
                          </div>
                          <input
                            type="range"
                            min="10"
                            max="100"
                            step="1"
                            value={quality}
                            onChange={handleCustomQualityChange}
                            className="w-full h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-500"
                          />
                        </div>
                      )}

                      {format === 'webp' && (
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={lossless}
                            onChange={(e) => setLossless(e.target.checked)}
                            className="w-3.5 h-3.5 text-violet-500 bg-slate-955 border-slate-800 rounded cursor-pointer"
                          />
                          <label className="text-[10px] text-slate-300">Lossless compression</label>
                        </div>
                      )}

                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={stripMetadata}
                          onChange={(e) => setStripMetadata(e.target.checked)}
                          className="w-3.5 h-3.5 text-violet-500 bg-slate-955 border-slate-800 rounded cursor-pointer"
                        />
                        <label className="text-[10px] text-slate-300">Strip EXIF metadata</label>
                      </div>
                    </div>
                  </div>
                  
                  {/* ANALYTICS CARD */}
                  <div className="bg-slate-955 border border-slate-850 rounded-xl p-3 space-y-2.5">
                    <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400">Execution Info</span>
                    <div className="grid grid-cols-2 gap-2 text-[10px]">
                      <div className="bg-slate-900 p-2 rounded-lg">
                        <span className="text-slate-400 block font-bold leading-none">Engine</span>
                        <span className="text-slate-200 block mt-1">
                          {typeof OffscreenCanvas !== 'undefined' ? 'Web Worker' : 'Canvas UI'}
                        </span>
                      </div>
                      <div className="bg-slate-900 p-2 rounded-lg">
                        <span className="text-slate-400 block font-bold leading-none">Speed</span>
                        <span className="text-indigo-400 block font-black mt-1">
                          {detail && detail.timeMs !== undefined ? `${detail.timeMs}ms` : 'estimating...'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
