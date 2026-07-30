import { useCallback } from 'react';

export function useImage() {
  
  // 1. Converts a File object to a Promise-wrapped Data URL
  const fileToDataURL = useCallback((file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }, []);

  // 2. Loads an HTML5 Image Element from a source URL
  const loadImage = useCallback((src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous'; // Avoid tainted canvases for cross-domain drawings
      img.onload = () => resolve(img);
      img.onerror = (err) => reject(new Error('Failed to load image resource: ' + err.message));
      img.src = src;
    });
  }, []);

  // 3. Validates file requirements (formats, 50MB limits)
  const validateImage = useCallback((file, maxSize = 50 * 1024 * 1024) => {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/avif',
      'image/gif',
      'image/tiff',
      'image/x-tiff',
      'image/heic',
      'image/heif',
      'image/heic-sequence',
      'image/heif-sequence'
    ];

    if (!allowedTypes.includes(file.type)) {
      return 'Unsupported image format. Please upload a JPG, JPEG, PNG, WEBP, AVIF, GIF, TIFF, or HEIC image.';
    }

    if (file.size > maxSize) {
      const limitMb = (maxSize / (1024 * 1024)).toFixed(0);
      return `File size exceeds the limit. Maximum allowed size is ${limitMb}MB.`;
    }

    return null;
  }, []);

  // 4. Triggers client-side browser file download from Blob
  const downloadBlob = useCallback((blob, filename) => {
    const blobUrl = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);
  }, []);

  return {
    fileToDataURL,
    loadImage,
    validateImage,
    downloadBlob
  };
}
