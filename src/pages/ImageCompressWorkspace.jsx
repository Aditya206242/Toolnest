import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import JSZip from 'jszip';
import {
  ArrowLeft, Sliders, CheckCircle, AlertTriangle, Play, Sparkles,
  Download, FileImage, Layers, UploadCloud, X,
  Maximize2, Minimize2, Move, RefreshCw, ZoomIn, ZoomOut
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

  return (
    <div className="space-y-6">
      {/* Header controls */}
      <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-violet-500 transition border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900"
          aria-label="Back to Image Category catalog"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Catalog
        </button>
        <div className="text-right">
          <span className="text-[10px] font-extrabold text-indigo-500 tracking-widest block uppercase">
            Squoosh Experience optimization
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
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-4 text-sm leading-relaxed">
          <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-slate-200">Daily limit exceeded!</span>
            <p className="mt-1 text-slate-400">
              Please sign in or upgrade to premium to compress image files.
            </p>
          </div>
        </div>
      )}

      {/* Conditional Layout Transition */}
      {imagesQueue.length === 0 ? (
        // Upload Area view when no files uploaded
        <div className="max-w-3xl mx-auto py-10">
          {isAllowed && (
            <ImageUpload
              multiple={true}
              onImagesSelected={handleImagesSelected}
            />
          )}

          {errorMessage && (
            <div className="mt-6 p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 flex items-center gap-3 text-sm font-semibold">
              <AlertTriangle className="h-5 w-5" /> {errorMessage}
            </div>
          )}
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
            <div className="flex flex-col lg:flex-row gap-6 min-h-[75vh] w-full bg-slate-90/50 dark:bg-slate-950/20 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800">

              {/* 1. LEFT PANEL: Carousel Queue & Original details */}
              <div className="lg:w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-6 select-none justify-between">
                <div className="space-y-6">
                  {/* File Upload zone trigger */}
                  <label className="group flex flex-col items-center justify-center border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-violet-500 rounded-2xl p-4.5 cursor-pointer text-center bg-slate-50/50 dark:bg-slate-950/20 transition-colors">
                    <UploadCloud className="h-6.5 w-6.5 text-slate-400 group-hover:text-violet-500 mb-1" />
                    <span className="text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">Add Images</span>
                    <input
                      type="file"
                      multiple
                      accept="image/*"
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
                      className="hidden"
                    />
                  </label>

                  {/* Thumbnail queue */}
                  {imagesQueue.length > 1 && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Uploaded Queue</label>
                      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
                        {imagesQueue.map(img => {
                          const isFocused = img.id === focusedImg.id;
                          const prog = queueProgress[img.id] || { status: 'pending', progress: 0 };
                          return (
                            <div
                              key={img.id}
                              onClick={() => setFocusedImageId(img.id)}
                              className={`relative h-12 w-16 shrink-0 rounded-lg border-2 cursor-pointer transition overflow-hidden ${isFocused ? 'border-violet-500 ring-2 ring-violet-500/10' : 'border-slate-200 dark:border-slate-850 hover:border-slate-350'
                                }`}
                            >
                              <img src={img.previewUrl} className="h-full w-full object-cover" alt="" />

                              {/* Queue Status Overlay */}
                              {prog.status === 'processing' && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[9px] text-white font-black z-10">
                                  {prog.progress}%
                                </div>
                              )}
                              {prog.status === 'success' && (
                                <div className="absolute bottom-0.5 right-0.5 bg-emerald-500 text-white rounded-full p-0.5 shadow-md z-10">
                                  <svg className="h-2.5 w-2.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                                  </svg>
                                </div>
                              )}
                              {prog.status === 'failed' && (
                                <div className="absolute inset-0 bg-red-600/90 flex flex-col items-center justify-center gap-0.5 z-10">
                                  <span className="text-[8px] text-white font-extrabold uppercase leading-none">Fail</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      retryImage(img.id);
                                    }}
                                    className="px-1 py-0.5 bg-white text-red-600 rounded text-[7px] font-black hover:bg-slate-100 transition"
                                  >
                                    Retry
                                  </button>
                                </div>
                              )}

                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  const updated = imagesQueue.filter(x => x.id !== img.id);
                                  handleImagesSelected(updated);
                                }}
                                className="absolute top-0.5 right-0.5 p-0.5 bg-red-500 text-white rounded-full hover:bg-red-650 transition z-20"
                                title="Remove image"
                              >
                                <X className="h-2 w-2" />
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Batch Queue Processing Controls */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Queue Processing
                    </label>

                    {/* Overall Progress Indicator */}
                    {imagesQueue.length > 0 && (
                      (() => {
                        const successes = Object.values(queueProgress).filter(x => x.status === 'success').length;
                        const failures = Object.values(queueProgress).filter(x => x.status === 'failed').length;
                        const total = imagesQueue.length;
                        const ratio = Math.round(((successes + failures) / total) * 100) || 0;

                        return (
                          <div className="space-y-2 bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-850/80">
                            <div className="flex justify-between items-center text-[9px] font-bold text-slate-500 dark:text-slate-400">
                              <span>Queue Progress</span>
                              <span>{successes + failures} / {total} ({ratio}%)</span>
                            </div>
                            <div className="w-full bg-slate-205 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-300"
                                style={{ width: `${ratio}%` }}
                              />
                            </div>
                            <div className="flex gap-2 justify-between items-center text-[8px] font-bold text-slate-400">
                              <span>Successes: <span className="text-emerald-500 font-black">{successes}</span></span>
                              <span>Failures: <span className="text-red-500 font-black">{failures}</span></span>
                            </div>
                          </div>
                        );
                      })()
                    )}

                    {/* Action buttons */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {queueStatus === 'idle' && (
                        <button
                          onClick={startBatchCompression}
                          className="col-span-2 py-2 px-3 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-black shadow-md transition"
                        >
                          Start Batch processing
                        </button>
                      )}

                      {queueStatus === 'processing' && (
                        <>
                          <button
                            onClick={pauseBatchCompression}
                            className="py-2 px-3 bg-amber-500 hover:bg-amber-600 text-white rounded-xl text-xs font-black shadow-md transition"
                          >
                            Pause Queue
                          </button>
                          <button
                            onClick={cancelBatchCompression}
                            className="py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl text-xs font-bold transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {queueStatus === 'paused' && (
                        <>
                          <button
                            onClick={resumeBatchCompression}
                            className="py-2 px-3 bg-violet-600 hover:bg-violet-755 text-white rounded-xl text-xs font-black shadow-md transition"
                          >
                            Resume Queue
                          </button>
                          <button
                            onClick={cancelBatchCompression}
                            className="py-2 px-3 bg-slate-100 hover:bg-slate-205 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl text-xs font-bold transition"
                          >
                            Cancel
                          </button>
                        </>
                      )}

                      {queueStatus === 'completed' && (
                        <button
                          onClick={cancelBatchCompression}
                          className="col-span-2 py-2 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-500 rounded-xl text-xs font-bold transition"
                        >
                          Reset Engine
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Original image details */}
                  <div className="space-y-3.5 pt-4 border-t border-slate-100 dark:border-slate-800">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">Image Information</label>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-850/50">
                        <span className="text-[10px] font-bold text-slate-400">File Name</span>
                        <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 truncate max-w-[150px]" title={focusedImg.name}>
                          {focusedImg.name}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-850/50">
                        <span className="text-[10px] font-bold text-slate-400">Original Size</span>
                        <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
                          {formatBytes(focusedImg.size)}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-850/50">
                        <span className="text-[10px] font-bold text-slate-400">Resolution</span>
                        <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
                          {originalRes}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-850/50">
                        <span className="text-[10px] font-bold text-slate-400">Format</span>
                        <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
                          {originalExt}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1 border-b border-slate-50 dark:border-slate-850/50">
                        <span className="text-[10px] font-bold text-slate-400">Color Space</span>
                        <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200 uppercase">
                          {colorSpace === 'grayscale' ? 'Grayscale' : 'sRGB'}
                        </span>
                      </div>

                      <div className="flex items-center justify-between py-1">
                        <span className="text-[10px] font-bold text-slate-400">Metadata Status</span>
                        <span className="text-[10px] font-extrabold text-slate-700 dark:text-slate-200">
                          {metadataText}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Add a quick remove single active file button */}
                {imagesQueue.length === 1 && (
                  <button
                    onClick={() => handleImagesSelected([])}
                    className="w-full py-2.5 rounded-xl border border-red-500/20 text-red-500 hover:bg-red-500/5 text-xs font-bold transition flex items-center justify-center gap-1.5"
                  >
                    <X className="h-4 w-4" /> Remove File
                  </button>
                )}
              </div>

              {/* 2. CENTER PANEL: Draggable comparative viewport (zoom, pan, fit) */}
              <div
                ref={containerRef}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                className="flex-1 min-h-[500px] lg:min-h-[60vh] bg-slate-950 flex flex-col justify-between relative overflow-hidden select-none"
              >
                {/* Drag comparison zone */}
                <div
                  ref={viewportRef}
                  onPointerDown={handleViewportPointerDown}
                  onWheel={handleWheel}
                  className="relative flex-1 overflow-hidden cursor-grab active:cursor-grabbing flex items-center justify-center bg-[radial-gradient(#ffffff04_1px,transparent_1px)] [background-size:16px_16px]"
                >
                  <div
                    className="absolute w-full h-full flex items-center justify-center transition-transform duration-75"
                    style={{ transform: `translate(${panX}px, ${panY}px) scale(${zoom})` }}
                  >
                    {/* Before frame (Original) */}
                    <div className="max-w-[75vw] max-h-[55vh] aspect-auto relative">
                      <img
                        src={focusedImg.previewUrl}
                        alt="Original Frame before compression"
                        className="max-w-full max-h-[55vh] object-contain select-none pointer-events-none"
                      />
                    </div>

                    {/* After frame (Clipped Compressed) */}
                    <div
                      className="absolute max-w-[75vw] max-h-[55vh] aspect-auto overflow-hidden pointer-events-none"
                      style={{ clipPath: `inset(0px 0px 0px ${sliderPosition}%)` }}
                    >
                      <img
                        src={compressedObjectURL || focusedImg.previewUrl}
                        alt="Compressed output preview frame"
                        className="max-w-full max-h-[55vh] object-contain select-none pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* Vertical Separator line & Slider handle button */}
                  <div
                    className="absolute inset-y-0 w-1 bg-violet-500 cursor-ew-resize pointer-events-auto"
                    style={{ left: `${sliderPosition}%` }}
                  >
                    <button
                      onPointerDown={handleSliderPointerDown}
                      className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 p-2.5 rounded-full border-4 shadow-xl bg-violet-650 text-white transition-transform ${isDraggingSlider ? 'scale-110 border-white bg-violet-755' : 'border-violet-500 bg-violet-600 hover:scale-105'
                        }`}
                      aria-label="Drag middle comparison bar"
                    >
                      <Move className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {/* Floating side sizing details */}
                  <div className="absolute top-4 left-4 p-2 rounded-lg bg-black/60 backdrop-blur-md border border-white/10 pointer-events-none">
                    <span className="text-[9px] font-extrabold text-slate-400 block tracking-wider uppercase">Original</span>
                    <span className="text-[10px] font-black text-white">{formatBytes(focusedImg.size)}</span>
                  </div>
                  <div className="absolute top-4 right-4 p-2 rounded-lg bg-violet-950/60 backdrop-blur-md border border-violet-500/20 pointer-events-none text-right">
                    <span className="text-[9px] font-extrabold text-violet-400 block tracking-wider uppercase">Optimized</span>
                    <span className="text-[10px] font-black text-white">
                      {detail ? formatBytes(sizeAfter) : 'estimating...'}
                    </span>
                  </div>
                </div>

                {/* Bottom Zoom & View Toolbar */}
                <div className="p-3 border-t border-slate-900 bg-slate-950/80 backdrop-blur-sm flex justify-center items-center gap-3">
                  <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-slate-900 border border-slate-850">
                    <button
                      onClick={handleZoomOut}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                      title="Zoom Out (-)"
                    >
                      <ZoomOut className="h-3.5 w-3.5" />
                    </button>

                    <span className="text-[10px] font-extrabold px-2.5 text-slate-400 select-none">
                      {Math.round(zoom * 100)}%
                    </span>

                    <button
                      onClick={handleZoomIn}
                      className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition"
                      title="Zoom In (+)"
                    >
                      <ZoomIn className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={handleResetZoom}
                    className="p-2 rounded-xl border border-slate-855 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-[10px] font-extrabold"
                    title="Fit bounds and center screen"
                  >
                    <RefreshCw className="h-3.5 w-3.5" /> Fit
                  </button>

                  <button
                    onClick={handleFullscreenToggle}
                    className="p-2 rounded-xl border border-slate-855 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition flex items-center gap-1.5 text-[10px] font-extrabold"
                    title="Fullscreen compare"
                  >
                    {isFullscreen ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
                    <span>Fullscreen</span>
                  </button>
                </div>
              </div>

              {/* 3. RIGHT PANEL: Compression Settings Controls */}
              <div className="lg:w-80 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-6 overflow-y-auto justify-between max-h-[80vh] lg:max-h-none">

                <div className="space-y-6">
                  {/* Format Selection buttons */}
                  <div>
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5">
                      Output Format
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {['auto', 'webp', 'jpeg', 'png', 'avif'].map(fmt => (
                        <button
                          key={fmt}
                          onClick={() => setFormat(fmt)}
                          className={`py-1.5 rounded-lg text-[9px] font-black tracking-wide uppercase transition border ${format === fmt
                            ? 'bg-violet-600 border-violet-600 text-white'
                            : 'bg-slate-50 dark:bg-slate-950 text-slate-655 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-350'
                            }`}
                        >
                          {fmt}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Quality Presets */}
                  {format !== 'png' && (
                    <div>
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-2.5">
                        Compression Presets
                      </label>
                      <div className="space-y-1.5">
                        {[
                          { id: 'max', label: 'Maximum Quality', quality: 95 },
                          { id: 'high', label: 'High Quality', quality: 85 },
                          { id: 'balanced', label: 'Balanced', quality: 70 },
                          { id: 'small', label: 'Small Size', quality: 50 },
                          { id: 'ultra', label: 'Ultra Compression', quality: 30 }
                        ].map(preset => (
                          <button
                            key={preset.id}
                            onClick={() => handlePresetSelect(preset)}
                            className={`w-full p-2.5 rounded-xl border text-left transition flex justify-between items-center ${activePreset === preset.id
                              ? 'border-violet-600 bg-violet-600/5 dark:bg-violet-500/5'
                              : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 bg-slate-50 dark:bg-slate-950/60'
                              }`}
                          >
                            <span className="block font-bold text-[10px] text-slate-800 dark:text-slate-200">{preset.label}</span>
                            <span className="text-[10px] font-black text-violet-500 dark:text-violet-400">{preset.quality}%</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Quality slider */}
                  {format !== 'png' && (
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                          Quality Factor
                        </label>
                        <span className="text-xs font-black text-violet-500 dark:text-violet-400">{quality}%</span>
                      </div>
                      <input
                        type="range"
                        min="10"
                        max="100"
                        step="1"
                        value={quality}
                        onChange={handleCustomQualityChange}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
                      />
                    </div>
                  )}

                  {/* Target File Sizer presets */}
                  {format !== 'png' && (
                    <div className="space-y-3 border-t border-slate-100 dark:border-slate-800 pt-4.5">
                      <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                        Target File Size
                      </label>

                      <div className="flex gap-1.5 flex-wrap">
                        {[
                          { label: '100 KB', id: '100kb', value: 100 },
                          { label: '200 KB', id: '200kb', value: 200 },
                          { label: '500 KB', id: '500kb', value: 500 },
                          { label: '1 MB', id: '1mb', value: 1024 },
                          { label: '2 MB', id: '2mb', value: 2048 }
                        ].map(p => (
                          <button
                            key={p.id}
                            onClick={() => handleTargetPresetSelect(p)}
                            className={`px-2.5 py-1 rounded-lg text-[9px] font-extrabold border transition ${activeTargetPreset === p.id
                              ? 'bg-violet-600 border-violet-600 text-white animate-pulse'
                              : 'bg-slate-50 dark:bg-slate-950 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-350'
                              }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>

                      <div className="flex items-center bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl p-1">
                        <input
                          type="number"
                          placeholder="Custom limit"
                          value={targetSize}
                          onChange={handleCustomTargetChange}
                          className="w-full bg-transparent px-2.5 py-1 focus:outline-none text-[10px] dark:text-slate-100"
                        />
                        <select
                          value={targetUnit}
                          onChange={(e) => setTargetUnit(e.target.value)}
                          className="bg-white dark:bg-slate-900 border border-slate-250 dark:border-slate-800 rounded text-[9px] font-bold px-1 py-0.5 focus:outline-none dark:text-slate-200"
                        >
                          <option value="KB">KB</option>
                          <option value="MB">MB</option>
                        </select>
                      </div>

                      {targetSolverWarning && (
                        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/15 text-amber-500 text-[9px] font-semibold flex items-start gap-2">
                          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                          <p>{targetSolverWarning}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Reset / Auto Optimize quick buttons */}
                  {format !== 'png' && (
                    <div className="grid grid-cols-2 gap-2 border-t border-slate-100 dark:border-slate-800 pt-4">
                      <button
                        onClick={handleReset}
                        className="py-2 px-2.5 rounded-lg border border-slate-200 dark:border-slate-800 text-[10px] font-bold hover:bg-slate-50 dark:hover:bg-slate-950 transition text-slate-500 dark:text-slate-400"
                      >
                        Reset Defaults
                      </button>
                      <button
                        onClick={handleAutoOptimize}
                        className="py-2 px-2.5 rounded-lg bg-violet-650 hover:bg-violet-750 text-white text-[10px] font-black shadow-md transition flex items-center justify-center gap-1"
                      >
                        <Sparkles className="h-3 w-3" /> Auto Optimize
                      </button>
                    </div>
                  )}

                  {/* Advanced settings widgets */}
                  {format !== 'png' && (
                    <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-3.5">
                      <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="w-full flex items-center justify-between text-[10px] font-extrabold uppercase tracking-wider text-slate-400 hover:text-violet-500 transition select-none"
                      >
                        <span>Advanced Parameters</span>
                        <span>{showAdvanced ? '▼' : '▲'}</span>
                      </button>

                      {showAdvanced && (
                        <div className="space-y-3.5 pt-1">
                          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-205/20 dark:border-slate-800/80">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-655 dark:text-slate-350">EXIF Metadata Removal</span>
                              <input
                                type="checkbox"
                                checked={stripMetadata}
                                onChange={(e) => setStripMetadata(e.target.checked)}
                                className="h-3.5 w-3.5 accent-violet-600 cursor-pointer"
                              />
                            </div>

                            {format === 'jpeg' && (
                              <div className="flex items-center justify-between border-t border-slate-200/40 dark:border-slate-800/40 pt-2">
                                <span className="text-[9px] font-bold text-slate-655 dark:text-slate-350">Progressive JPEG</span>
                                <input
                                  type="checkbox"
                                  checked={progressiveJpeg}
                                  onChange={(e) => setProgressiveJpeg(e.target.checked)}
                                  className="h-3.5 w-3.5 accent-violet-600 cursor-pointer"
                                />
                              </div>
                            )}

                            {format === 'webp' && (
                              <div className="flex items-center justify-between border-t border-slate-200/40 dark:border-slate-800/40 pt-2">
                                <span className="text-[9px] font-bold text-slate-655 dark:text-slate-350">Lossless Encoding</span>
                                <input
                                  type="checkbox"
                                  checked={lossless}
                                  onChange={(e) => setLossless(e.target.checked)}
                                  className="h-3.5 w-3.5 accent-violet-600 cursor-pointer"
                                />
                              </div>
                            )}

                            {format === 'jpeg' && (
                              <div className="flex items-center justify-between border-t border-slate-200/40 dark:border-slate-800/40 pt-2">
                                <span className="text-[9px] font-bold text-slate-655 dark:text-slate-350">Chroma Subsampling</span>
                                <select
                                  value={chromaSubsampling}
                                  onChange={(e) => setChromaSubsampling(e.target.value)}
                                  className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded text-[9px] font-bold px-1 py-0.5 focus:outline-none dark:text-slate-350"
                                >
                                  <option value="4:2:0">4:2:0</option>
                                  <option value="4:4:4">4:4:4</option>
                                </select>
                              </div>
                            )}

                            <div className="flex items-center justify-between border-t border-slate-200/40 dark:border-slate-800/40 pt-2">
                              <span className="text-[9px] font-bold text-slate-655 dark:text-slate-350">Color Space</span>
                              <select
                                value={colorSpace}
                                onChange={(e) => setColorSpace(e.target.value)}
                                className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded text-[9px] font-bold px-1 py-0.5 focus:outline-none dark:text-slate-350"
                              >
                                <option value="srgb">sRGB</option>
                                <option value="grayscale">Grayscale</option>
                              </select>
                            </div>
                          </div>

                          <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-205/20 dark:border-slate-800/80 space-y-2.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-655 dark:text-slate-350">Resize Outputs</span>
                              <input
                                type="checkbox"
                                checked={resizeEnabled}
                                onChange={(e) => setResizeEnabled(e.target.checked)}
                                className="h-3.5 w-3.5 accent-violet-600 cursor-pointer"
                              />
                            </div>

                            {resizeEnabled && (
                              <div className="space-y-2 pt-1 border-t border-slate-200/40 dark:border-slate-800/40">
                                <div className="grid grid-cols-2 gap-1.5">
                                  <div>
                                    <label className="text-[8px] font-bold text-slate-400 block mb-0.5 uppercase">Width (px)</label>
                                    <input
                                      type="number"
                                      value={resizeWidth}
                                      onChange={(e) => setResizeWidth(e.target.value)}
                                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-violet-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="text-[8px] font-bold text-slate-400 block mb-0.5 uppercase">Height (px)</label>
                                    <input
                                      type="number"
                                      value={resizeHeight}
                                      onChange={(e) => setResizeHeight(e.target.value)}
                                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-850 rounded px-2 py-0.5 text-xs focus:outline-none focus:border-violet-500"
                                    />
                                  </div>
                                </div>
                                <div className="flex items-center justify-between pt-1">
                                  <span className="text-[8px] font-bold text-slate-400">Lock Aspect Ratio</span>
                                  <input
                                    type="checkbox"
                                    checked={keepAspectRatio}
                                    onChange={(e) => setKeepAspectRatio(e.target.checked)}
                                    className="h-3 w-3 accent-violet-600 cursor-pointer"
                                  />
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="space-y-2.5 bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-205/20 dark:border-slate-800/80">
                            <div>
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-bold text-slate-655 dark:text-slate-350">Sharpen Filter</span>
                                <span className="text-[9px] font-black text-violet-505">{sharpenAmount}%</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                step="1"
                                value={sharpenAmount}
                                onChange={(e) => setSharpenAmount(Number(e.target.value))}
                                className="w-full h-1 bg-slate-200 dark:bg-slate-850 rounded appearance-none cursor-pointer accent-violet-600"
                              />
                            </div>

                            <div className="border-t border-slate-200/40 dark:border-slate-800/40 pt-2">
                              <div className="flex justify-between items-center mb-1">
                                <span className="text-[9px] font-bold text-slate-655 dark:text-slate-350">Blur Filter</span>
                                <span className="text-[9px] font-black text-violet-505">{blurAmount}px</span>
                              </div>
                              <input
                                type="range"
                                min="0"
                                max="10"
                                step="1"
                                value={blurAmount}
                                onChange={(e) => setBlurAmount(Number(e.target.value))}
                                className="w-full h-1 bg-slate-200 dark:bg-slate-850 rounded appearance-none cursor-pointer accent-violet-600"
                              />
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Live Analytics Panel widget */}
                  <div className="border-t border-slate-100 dark:border-slate-800 pt-4.5 space-y-4">
                    <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block">
                      Professional Compression Analytics
                    </label>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Original Size</span>
                        <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 block mt-0.5">
                          {formatBytes(focusedImg.size)}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Compressed Size</span>
                        <span className="text-[10px] font-black text-violet-500 block mt-0.5">
                          {detail ? formatBytes(sizeAfter) : 'estimating...'}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Saved Size</span>
                        <span className="text-[10px] font-black text-emerald-500 block mt-0.5">
                          {detail ? formatBytes(Math.max(0, focusedImg.size - sizeAfter)) : '...'}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Compression %</span>
                        <span className="text-[10px] font-black text-emerald-500 block mt-0.5">
                          -{savings}%
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Original Res</span>
                        <span className="text-[10px] font-semibold text-slate-700 dark:text-slate-205 block mt-0.5">
                          {originalRes}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Output Res</span>
                        <span className="text-[10px] font-bold text-slate-705 dark:text-slate-200 block mt-0.5">
                          {outputRes}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Original Format</span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mt-0.5">
                          {originalExt}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Output Format</span>
                        <span className="text-[10px] font-black text-indigo-500 block mt-0.5">
                          {outputExt}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Estimated Quality</span>
                        <span className="text-[10px] font-black text-violet-500 block mt-0.5">
                          {qualityScore}%
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Est. Download Size</span>
                        <span className="text-[10px] font-black text-slate-800 dark:text-slate-100 block mt-0.5">
                          {detail ? formatBytes(sizeAfter) : 'estimating...'}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Compression Ratio</span>
                        <span className="text-[10px] font-black text-indigo-500 block mt-0.5">
                          {sizeAfter > 0 ? (focusedImg.size / sizeAfter).toFixed(2) : '1.00'} : 1
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Metadata Removed</span>
                        <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mt-0.5">
                          {stripMetadata ? 'Yes (EXIF Stripped)' : 'No (Preserved)'}
                        </span>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-955 p-3 rounded-xl border border-slate-100 dark:border-slate-800 col-span-2 flex items-center justify-between">
                        <div>
                          <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Processing latency</span>
                          <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-400 block mt-0.5">
                            {typeof OffscreenCanvas !== 'undefined' ? 'Isolated Web Worker' : 'Main Canvas Fallback'}
                          </span>
                        </div>
                        <div className="text-right">
                          <span className="text-[8px] font-bold text-slate-400 block tracking-wider uppercase">Execution Speed</span>
                          <span className="text-[10px] font-black text-indigo-500 block mt-0.5">
                            {detail && detail.timeMs !== undefined ? `${detail.timeMs}ms` : 'estimating...'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Actions Download trigger */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-850">
                  <button
                    onClick={handleDownloadCompressed}
                    disabled={isProcessing || imagesQueue.length === 0 || !isAllowed}
                    className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-violet-600/25 transition flex items-center justify-center gap-2"
                  >
                    {isProcessing ? (
                      <>
                        <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                        <span>Compiling ZIP...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4.5 w-4.5" />
                        <span>Download Optimized {imagesQueue.length > 1 ? 'ZIP' : originalExt}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })()
      )}
    </div>
  );
}
