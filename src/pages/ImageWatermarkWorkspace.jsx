import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, CheckCircle, AlertTriangle, Play, Sparkles, 
  Download, FileImage, Layers, HelpCircle, Type, ImageIcon,
  Sliders, Settings, RefreshCw, ZoomIn, ZoomOut, Move, Trash2, X
} from 'lucide-react';
import ImageUpload from '../components/ImageUpload';
import { useImage } from '../hooks/useImage';
import api from '../utils/api';

const PRESET_FONTS = [
  { label: 'Arial (Sans-Serif)', value: 'Arial' },
  { label: 'Georgia (Serif)', value: 'Georgia' },
  { label: 'Courier New (Monospace)', value: 'Courier New' },
  { label: 'Impact (Bold)', value: 'Impact' },
  { label: 'Times New Roman', value: 'Times New Roman' },
  { label: 'Verdana', value: 'Verdana' }
];

const PRESET_COLORS = [
  { name: 'White', value: '#ffffff' },
  { name: 'Black', value: '#000000' },
  { name: 'Red', value: '#ef4444' },
  { name: 'Blue', value: '#3b82f6' },
  { name: 'Yellow', value: '#eab308' },
  { name: 'Grey', value: '#64748b' }
];

export default function ImageWatermarkWorkspace({ onBack }) {
  const { loadImage, downloadBlob } = useImage();

  // Queue State
  const [imagesQueue, setImagesQueue] = useState([]); // [{ id, file, previewUrl, name, size }]
  const [activeImage, setActiveImage] = useState(null);

  // Common options
  const [watermarkType, setWatermarkType] = useState('text'); // 'text' | 'image' | 'svg'
  const [opacity, setOpacity] = useState(0.7);
  const [scale, setScale] = useState(0.3); // 10% to 100% of base image width
  const [rotation, setRotation] = useState(0);
  const [positionType, setPositionType] = useState('center'); // 'center', 'top-left', 'top-right', 'bottom-left', 'bottom-right', 'tile', 'custom'
  const [customX, setCustomX] = useState(0);
  const [customY, setCustomY] = useState(0);
  const [margin, setMargin] = useState(20);
  const [blendMode, setBlendMode] = useState('over');
  const [padding, setPadding] = useState(0);
  const [bgColor, setBgColor] = useState('#000000');
  const [bgOpacity, setBgOpacity] = useState(0);
  const [diagonalEnabled, setDiagonalEnabled] = useState(false);

  // Text watermark options
  const [text, setText] = useState('ToolNest');
  const [fontFamily, setFontFamily] = useState('Arial');
  const [fontSize, setFontSize] = useState(48);
  const [textColor, setTextColor] = useState('#ffffff');
  const [outlineColor, setOutlineColor] = useState('#000000');
  const [outlineWidth, setOutlineWidth] = useState(2);
  const [shadowEnabled, setShadowEnabled] = useState(true);
  const [shadowX, setShadowX] = useState(3);
  const [shadowY, setShadowY] = useState(3);
  const [shadowBlur, setShadowBlur] = useState(3);
  const [shadowColor, setShadowColor] = useState('#000000');
  const [customFontFile, setCustomFontFile] = useState(null);

  // Image watermark options
  const [logoFile, setLogoFile] = useState(null);
  const [logoImgEl, setLogoImgEl] = useState(null);
  const [logoPreviewUrl, setLogoPreviewUrl] = useState(null);

  // SVG watermark options
  const [svgFile, setSvgFile] = useState(null);
  const [svgImgEl, setSvgImgEl] = useState(null);
  const [svgPreviewUrl, setSvgPreviewUrl] = useState(null);

  // Undo / Redo History States
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const historyTimeoutRef = useRef(null);

  // Dragging and Snapping States
  const [canvasLayout, setCanvasLayout] = useState({ width: 0, height: 0 });
  const [isDraggingWm, setIsDraggingWm] = useState(false);
  const [dragStartWm, setDragStartWm] = useState({ offsetX: 0, offsetY: 0 });
  const [snapActiveX, setSnapActiveX] = useState(null);
  const [snapActiveY, setSnapActiveY] = useState(null);
  const [snapActiveXOffset, setSnapActiveXOffset] = useState(0);
  const [snapActiveYOffset, setSnapActiveYOffset] = useState(0);

  const wmWidthRef = useRef(100);
  const wmHeightRef = useRef(40);

  // View Options
  const [viewMode, setViewMode] = useState('transformed'); // 'transformed' | 'original' | 'compare'
  const [zoom, setZoom] = useState(1);
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

  // Processing indicators
  const [isProcessing, setIsProcessing] = useState(false);
  const [uploadPercent, setUploadPercent] = useState(0);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // Limits
  const [isAllowed, setIsAllowed] = useState(true);
  const [usageStats, setUsageStats] = useState({ limit: 10, usage: 0 });

  // Refs
  const canvasRef = useRef(null);
  const [loadedImgEl, setLoadedImgEl] = useState(null);

  useEffect(() => {
    const fetchLimits = async () => {
      try {
        const response = await api.get('/tools/limits', {
          params: { toolSlug: 'image-watermark' }
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

  // Update layout sizes on window / canvas resize
  useEffect(() => {
    if (!canvasRef.current) return;
    const updateLayout = () => {
      setCanvasLayout({
        width: canvasRef.current.clientWidth,
        height: canvasRef.current.clientHeight
      });
    };
    const observer = new ResizeObserver(updateLayout);
    observer.observe(canvasRef.current);
    updateLayout();
    return () => observer.disconnect();
  }, [loadedImgEl, watermarkType, text, fontFamily, fontSize, textColor, outlineColor, outlineWidth, logoImgEl, svgImgEl, scale]);

  // Load custom Google Font dynamically
  useEffect(() => {
    if (!fontFamily || fontFamily === 'Arial' || fontFamily === 'Georgia' || fontFamily === 'Courier New' || fontFamily === 'Impact' || fontFamily === 'Times New Roman' || fontFamily === 'Verdana' || fontFamily === 'CustomWatermarkFont') return;
    const linkId = `gfont-${fontFamily}`;
    if (!document.getElementById(linkId)) {
      const link = document.createElement('link');
      link.id = linkId;
      link.rel = 'stylesheet';
      link.href = `https://fonts.googleapis.com/css2?family=${fontFamily.replace(/\s+/g, '+')}:wght@700&display=swap`;
      document.head.appendChild(link);
    }
  }, [fontFamily]);

  // Initialize History state on base load
  useEffect(() => {
    if (loadedImgEl) {
      const initial = {
        watermarkType: 'text', opacity: 0.7, scale: 0.3, rotation: 0, positionType: 'center',
        customX: Math.round(loadedImgEl.naturalWidth / 2), customY: Math.round(loadedImgEl.naturalHeight / 2),
        margin: 20, text: 'ToolNest', fontFamily: 'Arial', fontSize: 48, textColor: '#ffffff',
        outlineColor: '#000000', outlineWidth: 2, shadowEnabled: true, shadowX: 3, shadowY: 3,
        shadowBlur: 3, shadowColor: '#000000', blendMode: 'over', padding: 0, bgOpacity: 0,
        bgColor: '#000000', diagonalEnabled: false
      };
      setHistory([initial]);
      setHistoryIndex(0);
    }
  }, [loadedImgEl]);

  // Save history state (with debouncing for sliders / typings)
  const pushHistory = (state) => {
    const cleanHistory = history.slice(0, historyIndex + 1);
    setHistory([...cleanHistory, state]);
    setHistoryIndex(cleanHistory.length);
  };

  const updateSetting = (setter, value, stateKey) => {
    setter(value);
    const updated = {
      watermarkType, opacity, scale, rotation, positionType,
      customX, customY, margin, text, fontFamily, fontSize,
      textColor, outlineColor, outlineWidth, shadowEnabled,
      shadowX, shadowY, shadowBlur, shadowColor,
      blendMode, padding, bgOpacity, bgColor, diagonalEnabled,
      [stateKey]: value
    };

    if (['text', 'opacity', 'scale', 'rotation', 'margin', 'padding', 'bgOpacity', 'fontSize', 'shadowX', 'shadowY', 'shadowBlur', 'customX', 'customY'].includes(stateKey)) {
      clearTimeout(historyTimeoutRef.current);
      historyTimeoutRef.current = setTimeout(() => {
        pushHistory(updated);
      }, 400);
    } else {
      pushHistory(updated);
    }
  };

  const handleUndo = () => {
    if (historyIndex > 0) {
      const prevIdx = historyIndex - 1;
      setHistoryIndex(prevIdx);
      applyHistoryState(history[prevIdx]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      const nextIdx = historyIndex + 1;
      setHistoryIndex(nextIdx);
      applyHistoryState(history[nextIdx]);
    }
  };

  const applyHistoryState = (state) => {
    if (!state) return;
    setWatermarkType(state.watermarkType);
    setOpacity(state.opacity);
    setScale(state.scale);
    setRotation(state.rotation);
    setPositionType(state.positionType);
    setCustomX(state.customX);
    setCustomY(state.customY);
    setMargin(state.margin);
    setText(state.text);
    setFontFamily(state.fontFamily);
    setFontSize(state.fontSize);
    setTextColor(state.textColor);
    setOutlineColor(state.outlineColor);
    setOutlineWidth(state.outlineWidth);
    setShadowEnabled(state.shadowEnabled);
    setShadowX(state.shadowX);
    setShadowY(state.shadowY);
    setShadowBlur(state.shadowBlur);
    setShadowColor(state.shadowColor);
    setBlendMode(state.blendMode || 'over');
    setPadding(state.padding || 0);
    setBgOpacity(state.bgOpacity || 0);
    setBgColor(state.bgColor || '#000000');
    setDiagonalEnabled(state.diagonalEnabled || false);
  };

  // Custom uploaded font loader
  const handleCustomFontUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCustomFontFile(file);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fontData = event.target.result;
        const fontFace = new FontFace('CustomWatermarkFont', fontData);
        await fontFace.load();
        document.fonts.add(fontFace);
        updateSetting(setFontFamily, 'CustomWatermarkFont', 'fontFamily');
      };
      reader.readAsArrayBuffer(file);
    } catch (err) {
      console.error('[Font Load Fail]', err);
    }
  };

  // Update images queue
  const handleImagesSelected = (queue) => {
    setImagesQueue(queue);
    if (queue.length > 0) {
      if (!activeImage || !queue.some(img => img.id === activeImage.id)) {
        setActiveImage(queue[0]);
      }
    } else {
      setActiveImage(null);
    }
  };

  // Load selected base image preview
  useEffect(() => {
    if (!activeImage) {
      setLoadedImgEl(null);
      return;
    }
    let isCurrent = true;
    loadImage(activeImage.previewUrl)
      .then((imgEl) => {
        if (isCurrent) {
          setLoadedImgEl(imgEl);
          setCustomX(Math.round(imgEl.naturalWidth / 2));
          setCustomY(Math.round(imgEl.naturalHeight / 2));
        }
      })
      .catch((err) => {
        console.error('Error loading base image preview:', err);
      });
    return () => {
      isCurrent = false;
    };
  }, [activeImage, loadImage]);

  // Load watermark logo image preview
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (logoPreviewUrl) {
      URL.revokeObjectURL(logoPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setLogoFile(file);
    setLogoPreviewUrl(preview);

    loadImage(preview)
      .then((imgEl) => {
        setLogoImgEl(imgEl);
        pushHistory({
          watermarkType, opacity, scale, rotation, positionType,
          customX, customY, margin, text, fontFamily, fontSize,
          textColor, outlineColor, outlineWidth, shadowEnabled,
          shadowX, shadowY, shadowBlur, shadowColor,
          blendMode, padding, bgOpacity, bgColor, diagonalEnabled
        });
      })
      .catch((err) => {
        console.error('Error loading logo preview:', err);
      });
  };

  // Load SVG file preview
  const handleSvgUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (svgPreviewUrl) {
      URL.revokeObjectURL(svgPreviewUrl);
    }

    const preview = URL.createObjectURL(file);
    setSvgFile(file);
    setSvgPreviewUrl(preview);

    loadImage(preview)
      .then((imgEl) => {
        setSvgImgEl(imgEl);
        pushHistory({
          watermarkType, opacity, scale, rotation, positionType,
          customX, customY, margin, text, fontFamily, fontSize,
          textColor, outlineColor, outlineWidth, shadowEnabled,
          shadowX, shadowY, shadowBlur, shadowColor,
          blendMode, padding, bgOpacity, bgColor, diagonalEnabled
        });
      })
      .catch((err) => {
        console.error('Error loading SVG preview:', err);
      });
  };

  // Cleanup object URLs on unmount
  useEffect(() => {
    return () => {
      if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
      if (svgPreviewUrl) URL.revokeObjectURL(svgPreviewUrl);
    };
  }, [logoPreviewUrl, svgPreviewUrl]);

  // Redraw preview canvas
  useEffect(() => {
    if (!loadedImgEl || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    const baseW = loadedImgEl.naturalWidth;
    const baseH = loadedImgEl.naturalHeight;

    canvas.width = baseW;
    canvas.height = baseH;

    // Draw base
    ctx.clearRect(0, 0, baseW, baseH);
    ctx.drawImage(loadedImgEl, 0, 0);

    const drawWatermark = (wmEl, wmW, wmH) => {
      const targetW = Math.max(10, Math.round(baseW * scale));
      const targetH = Math.max(10, Math.round(wmH * (targetW / wmW)));

      wmWidthRef.current = wmW;
      wmHeightRef.current = wmH;

      ctx.save();
      ctx.globalAlpha = opacity;

      // Apply Sharp-equivalent blend modes in Canvas context
      if (blendMode === 'multiply') ctx.globalCompositeOperation = 'multiply';
      else if (blendMode === 'screen') ctx.globalCompositeOperation = 'screen';
      else if (blendMode === 'overlay') ctx.globalCompositeOperation = 'overlay';
      else if (blendMode === 'darken') ctx.globalCompositeOperation = 'darken';
      else if (blendMode === 'lighten') ctx.globalCompositeOperation = 'lighten';
      else if (blendMode === 'difference') ctx.globalCompositeOperation = 'difference';
      else if (blendMode === 'exclusion') ctx.globalCompositeOperation = 'exclusion';
      else if (blendMode === 'color-dodge') ctx.globalCompositeOperation = 'color-dodge';
      else if (blendMode === 'color-burn') ctx.globalCompositeOperation = 'color-burn';
      else if (blendMode === 'hard-light') ctx.globalCompositeOperation = 'hard-light';
      else if (blendMode === 'soft-light') ctx.globalCompositeOperation = 'soft-light';
      else ctx.globalCompositeOperation = 'source-over';

      let left = 0;
      let top = 0;
      const tile = positionType === 'tile';

      if (tile) {
        // Tile grid rotation
        const stepX = targetW * 1.5;
        const stepY = targetH * 1.5;
        for (let x = 0; x < baseW; x += stepX) {
          for (let y = 0; y < baseH; y += stepY) {
            ctx.save();
            ctx.translate(x + targetW / 2, y + targetH / 2);
            ctx.rotate((rotation * Math.PI) / 180);
            ctx.drawImage(wmEl, -targetW / 2, -targetH / 2, targetW, targetH);
            ctx.restore();
          }
        }
      } else {
        if (positionType === 'top-left') {
          left = margin;
          top = margin;
        } else if (positionType === 'top-right') {
          left = baseW - targetW - margin;
          top = margin;
        } else if (positionType === 'bottom-left') {
          left = margin;
          top = baseH - targetH - margin;
        } else if (positionType === 'bottom-right') {
          left = baseW - targetW - margin;
          top = baseH - targetH - margin;
        } else if (positionType === 'custom') {
          left = customX - targetW / 2;
          top = customY - targetH / 2;
        } else {
          // Center
          left = (baseW - targetW) / 2;
          top = (baseH - targetH) / 2;
        }

        ctx.translate(left + targetW / 2, top + targetH / 2);
        ctx.rotate((rotation * Math.PI) / 180);
        ctx.drawImage(wmEl, -targetW / 2, -targetH / 2, targetW, targetH);
      }

      ctx.restore();
    };

    if (watermarkType === 'text') {
      const charWidth = fontSize * 0.6;
      const wmW = Math.round(text.length * charWidth + outlineWidth * 2 + Math.abs(shadowX) + shadowBlur * 2 + 40 + padding * 2);
      const wmH = Math.round(fontSize * 1.4 + outlineWidth * 2 + Math.abs(shadowY) + shadowBlur * 2 + 40 + padding * 2);

      const filterDef = shadowEnabled
        ? `<filter id="shadow" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="${shadowX}" dy="${shadowY}" stdDeviation="${shadowBlur}" flood-color="${shadowColor}" /></filter>`
        : '';
      const filterAttr = shadowEnabled ? 'filter="url(#shadow)"' : '';

      // Base64 custom font loading inside SVG stylesheet
      let fontFaceStyle = '';
      if (fontFamily === 'CustomWatermarkFont' && customFontFile) {
        // SVG renderer requires font URL to be completely inlined as base64 inside SVG markup
        // Since we read the customFontFile in memory, we can dynamically build this in Canvas redrawing if needed
        // But for local preview, as long as it's added to document.fonts, the browser renders it!
      }

      // Background rect markup if bgOpacity > 0
      let rectSvg = '';
      if (bgOpacity > 0) {
        const rw = wmW - 10;
        const rh = wmH - 10;
        rectSvg = `<rect x="5" y="5" width="${rw}" height="${rh}" fill="${bgColor}" fill-opacity="${bgOpacity}" rx="6" ry="6" />`;
      }

      const svgString = `
        <svg width="${wmW}" height="${wmH}" viewBox="0 0 ${wmW} ${wmH}" xmlns="http://www.w3.org/2000/svg">
          <defs>
            ${filterDef}
            <style>
              text {
                font-family: '${fontFamily}', sans-serif;
              }
            </style>
          </defs>
          ${rectSvg}
          <text
            x="50%"
            y="50%"
            text-anchor="middle"
            dominant-baseline="central"
            font-family="${fontFamily}"
            font-size="${fontSize}px"
            font-weight="bold"
            fill="${textColor}"
            ${outlineWidth > 0 ? `stroke="${outlineColor}" stroke-width="${outlineWidth}"` : ''}
            ${filterAttr}
          >${text.replace(/[<>&'"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;',"'":'&apos;','"':'&quot;'}[c]))}</text>
        </svg>
      `;

      const img = new Image();
      img.onload = () => {
        drawWatermark(img, wmW, wmH);
      };
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svgString);

    } else if (watermarkType === 'image' && logoImgEl) {
      drawWatermark(logoImgEl, logoImgEl.naturalWidth, logoImgEl.naturalHeight);
    } else if (watermarkType === 'svg' && svgImgEl) {
      drawWatermark(svgImgEl, svgImgEl.naturalWidth, svgImgEl.naturalHeight);
    }
  }, [
    loadedImgEl, watermarkType, text, fontFamily, fontSize, textColor, 
    outlineColor, outlineWidth, shadowEnabled, shadowX, shadowY, shadowBlur, 
    shadowColor, scale, opacity, rotation, positionType, customX, customY, margin, logoImgEl, svgImgEl, blendMode, padding, bgOpacity, bgColor
  ]);

  // Click-to-position on Custom placement mode
  const handleCanvasClick = (e) => {
    if (positionType !== 'custom' || !canvasRef.current) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    
    setCustomX(Math.round(x * scaleX));
    setCustomY(Math.round(y * scaleY));
  };

  // Reset transforms
  const handleReset = () => {
    setWatermarkType('text');
    setOpacity(0.7);
    setScale(0.3);
    setRotation(0);
    setPositionType('center');
    setMargin(20);
    setText('ToolNest');
    setFontFamily('Arial');
    setFontSize(48);
    setTextColor('#ffffff');
    setOutlineWidth(2);
    setOutlineColor('#000000');
    setShadowEnabled(true);
    setZoom(1);
    setPanOffset({ x: 0, y: 0 });
    setLogoFile(null);
    setLogoImgEl(null);
    if (logoPreviewUrl) URL.revokeObjectURL(logoPreviewUrl);
    setLogoPreviewUrl(null);
  };

  // Pointer events dragging operations for Custom position watermark overlay
  const handleWmPointerDown = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingWm(true);
    e.target.setPointerCapture(e.pointerId);

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const baseW = loadedImgEl?.naturalWidth || 1;
    const baseH = loadedImgEl?.naturalHeight || 1;
    const scaleX = baseW / (canvasLayout.width || 1);
    const scaleY = baseH / (canvasLayout.height || 1);

    setDragStartWm({
      offsetX: x - (customX / scaleX),
      offsetY: y - (customY / scaleY)
    });

    if (positionType !== 'custom') {
      setPositionType('custom');
    }
  };

  const handleWmPointerMove = (e) => {
    if (!isDraggingWm || !canvasRef.current) return;
    e.preventDefault();
    e.stopPropagation();

    const rect = canvasRef.current.getBoundingClientRect();
    const lx = e.clientX - rect.left - dragStartWm.offsetX;
    const ly = e.clientY - rect.top - dragStartWm.offsetY;

    const baseW = loadedImgEl?.naturalWidth || 1;
    const baseH = loadedImgEl?.naturalHeight || 1;
    const scaleX = baseW / (canvasLayout.width || 1);
    const scaleY = baseH / (canvasLayout.height || 1);

    let baseX = lx * scaleX;
    let baseY = ly * scaleY;

    // Approximate target scaled size
    const wmWidth = wmWidthRef.current || 100;
    const wmHeight = wmHeightRef.current || 40;
    const targetW = Math.max(10, Math.round(baseW * scale));
    const targetH = Math.max(10, Math.round(wmHeight * (targetW / wmWidth)));

    const threshX = 15 * scaleX;
    const threshY = 15 * scaleY;

    let activeX = null;
    let xOffset = 0;
    const centerBaseX = baseW / 2;
    const leftMarginBaseX = margin + targetW / 2;
    const rightMarginBaseX = baseW - targetW / 2 - margin;

    if (Math.abs(baseX - centerBaseX) < threshX) {
      baseX = centerBaseX;
      activeX = 'center';
      xOffset = canvasLayout.width / 2;
    } else if (Math.abs(baseX - leftMarginBaseX) < threshX) {
      baseX = leftMarginBaseX;
      activeX = 'left';
      xOffset = leftMarginBaseX / scaleX;
    } else if (Math.abs(baseX - rightMarginBaseX) < threshX) {
      baseX = rightMarginBaseX;
      activeX = 'right';
      xOffset = rightMarginBaseX / scaleX;
    }

    let activeY = null;
    let yOffset = 0;
    const centerBaseY = baseH / 2;
    const topMarginBaseY = margin + targetH / 2;
    const bottomMarginBaseY = baseH - targetH / 2 - margin;

    if (Math.abs(baseY - centerBaseY) < threshY) {
      baseY = centerBaseY;
      activeY = 'center';
      yOffset = canvasLayout.height / 2;
    } else if (Math.abs(baseY - topMarginBaseY) < threshY) {
      baseY = topMarginBaseY;
      activeY = 'top';
      yOffset = topMarginBaseY / scaleY;
    } else if (Math.abs(baseY - bottomMarginBaseY) < threshY) {
      baseY = bottomMarginBaseY;
      activeY = 'bottom';
      yOffset = bottomMarginBaseY / scaleY;
    }

    setSnapActiveX(activeX);
    setSnapActiveXOffset(xOffset);
    setSnapActiveY(activeY);
    setSnapActiveYOffset(yOffset);

    setCustomX(Math.round(Math.min(baseW, Math.max(0, baseX))));
    setCustomY(Math.round(Math.min(baseH, Math.max(0, baseY))));
  };

  const handleWmPointerUp = (e) => {
    if (!isDraggingWm) return;
    setIsDraggingWm(false);
    e.target.releasePointerCapture(e.pointerId);
    setSnapActiveX(null);
    setSnapActiveY(null);
    pushHistory({
      watermarkType, opacity, scale, rotation, positionType,
      customX, customY, margin, text, fontFamily, fontSize,
      textColor, outlineColor, outlineWidth, shadowEnabled,
      shadowX, shadowY, shadowBlur, shadowColor,
      blendMode, padding, bgOpacity, bgColor, diagonalEnabled
    });
  };

  // Dragging workspace background viewport (original image panning)
  const handleMouseDown = (e) => {
    if (e.button !== 0) return;
    if (positionType === 'custom') return;
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX - panOffset.x, y: e.clientY - panOffset.y });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPanOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const removeImage = (id) => {
    const updatedQueue = imagesQueue.filter(img => img.id !== id);
    setImagesQueue(updatedQueue);
    if (updatedQueue.length > 0) {
      if (activeImage.id === id) {
        setActiveImage(updatedQueue[0]);
      }
    } else {
      setActiveImage(null);
    }
  };

  // Submit to Backend
  const handleWatermarkExecute = async (processAll = false) => {
    if (imagesQueue.length === 0) return;
    setIsProcessing(true);
    setUploadPercent(0);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const formData = new FormData();
      formData.append('watermarkType', watermarkType);
      formData.append('opacity', opacity.toString());
      formData.append('scale', scale.toString());
      formData.append('rotation', rotation.toString());
      formData.append('positionType', positionType);
      formData.append('customX', customX.toString());
      formData.append('customY', customY.toString());
      formData.append('margin', margin.toString());
      formData.append('blendMode', blendMode);

      if (watermarkType === 'text') {
        formData.append('text', text);
        formData.append('font', fontFamily);
        formData.append('fontSize', fontSize.toString());
        formData.append('color', textColor);
        formData.append('outlineColor', outlineColor);
        formData.append('outlineWidth', outlineWidth.toString());
        formData.append('shadowEnabled', shadowEnabled ? 'true' : 'false');
        formData.append('shadowX', shadowX.toString());
        formData.append('shadowY', shadowY.toString());
        formData.append('shadowBlur', shadowBlur.toString());
        formData.append('shadowColor', shadowColor);
        formData.append('padding', padding.toString());
        formData.append('bgOpacity', bgOpacity.toString());
        formData.append('bgColor', bgColor);

        if (customFontFile) {
          formData.append('fontFile', customFontFile);
        }
      } else if (watermarkType === 'svg') {
        if (!svgFile) throw new Error('Please upload an SVG watermark file.');
        formData.append('watermark', svgFile);
      } else {
        if (!logoFile) throw new Error('Please upload a watermark logo image.');
        formData.append('watermark', logoFile);
      }

      if (processAll) {
        imagesQueue.forEach((img) => {
          formData.append('images', img.file);
        });

        const response = await api.post('/image/watermark-batch', formData, {
          responseType: 'blob',
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percent);
          }
        });

        downloadBlob(response.data, `watermarked_batch_${Date.now()}.zip`);
        setSuccessMessage('Batch watermarked successfully! ZIP archive downloaded.');
      } else {
        if (!activeImage) throw new Error('No active image selected.');
        formData.append('image', activeImage.file);

        const response = await api.post('/image/watermark', formData, {
          responseType: 'blob',
          headers: { 'Content-Type': 'multipart/form-data' },
          onUploadProgress: (progressEvent) => {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadPercent(percent);
          }
        });

        const ext = activeImage.name.split('.').pop();
        const nameWithoutExt = activeImage.name.substring(0, activeImage.name.lastIndexOf('.'));
        downloadBlob(response.data, `watermarked_${nameWithoutExt}.${ext}`);
        setSuccessMessage('Watermark applied and downloaded successfully!');
      }

      try {
        await api.post('/tools/log', { toolSlug: 'image-watermark' });
        setUsageStats(prev => ({ ...prev, usage: prev.usage + 1 }));
      } catch (logErr) {
        console.warn('Logging metrics failed.', logErr.message);
      }
    } catch (err) {
      setErrorMessage(err.message || 'Error occurred during watermarking.');
    } finally {
      setIsProcessing(false);
      setUploadPercent(0);
    }
  };

  const checkerboardStyle = {
    backgroundImage: 'linear-gradient(45deg, #e2e8f0 25%, transparent 25%), linear-gradient(-45deg, #e2e8f0 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #e2e8f0 75%), linear-gradient(-45deg, transparent 75%, #e2e8f0 75%)',
    backgroundSize: '16px 16px',
    backgroundPosition: '0 0, 0 8px, 8px -8px, -8px 0px',
    backgroundColor: '#f8fafc'
  };

  const handleExitWorkspace = () => {
    if (imagesQueue.length > 0) {
      setImagesQueue([]);
    } else {
      onBack();
    }
  };

  return (
    <div className="w-full h-full min-h-screen bg-slate-950 text-slate-100 p-8 pt-20 overflow-y-auto select-none dark relative">
      {/* Floating Pink Circular Exit Cross Button */}
      <button
        onClick={handleExitWorkspace}
        className="absolute top-4 left-4 z-50 flex items-center justify-center h-12 w-12 rounded-full bg-pink-600 hover:bg-pink-700 active:scale-95 transition-all text-white shadow-xl cursor-pointer border border-pink-500/20"
        title="Exit / Go Back"
      >
        <X className="h-6 w-6" />
      </button>

      {/* Paywall Banner */}
      {!isAllowed && (
        <div className="p-5 rounded-3xl bg-amber-500/10 border border-amber-500/20 text-amber-500 flex items-start gap-4 text-sm leading-relaxed mb-6">
          <AlertTriangle className="h-6 w-6 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block text-slate-200">Daily limit exceeded!</span>
            <p className="mt-1 text-slate-400">
              Upgrade to premium or sign in to watermark photos.
            </p>
          </div>
        </div>
      )}

      {/* Grid columns workspaces layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left column preview frames */}
        <div className="lg:col-span-8 space-y-6">
          
          {isAllowed && imagesQueue.length === 0 && (
            <ImageUpload
              multiple={true}
              onImagesSelected={handleImagesSelected}
            />
          )}

          {/* Interactive Live Canvas view */}
          {imagesQueue.length > 0 && activeImage && (
            <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 rounded-3xl overflow-hidden shadow-sm flex flex-col">
              
              <div className="bg-white dark:bg-slate-900 px-5 py-3 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-950 p-1 rounded-xl">
                  {[
                    { id: 'transformed', label: 'Watermarked' },
                    { id: 'original', label: 'Original' },
                    { id: 'compare', label: 'Compare' }
                  ].map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setViewMode(tab.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        viewMode === tab.id
                          ? 'bg-white dark:bg-slate-800 text-violet-650 dark:text-violet-400 shadow-sm'
                          : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-350'
                      }`}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2.5">
                  <button
                    onClick={() => setZoom(prev => Math.max(0.5, prev - 0.1))}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                  >
                    <ZoomOut className="h-3.5 w-3.5" />
                  </button>
                  <span className="text-xs font-black text-slate-500 w-12 text-center">
                    {Math.round(zoom * 100)}%
                  </span>
                  <button
                    onClick={() => setZoom(prev => Math.min(5, prev + 0.1))}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50"
                  >
                    <ZoomIn className="h-3.5 w-3.5" />
                  </button>
                  <button
                    onClick={handleUndo}
                    disabled={historyIndex <= 0}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 text-xs font-bold disabled:opacity-40"
                  >
                    Undo
                  </button>
                  <button
                    onClick={handleRedo}
                    disabled={historyIndex >= history.length - 1}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 text-xs font-bold disabled:opacity-40"
                  >
                    Redo
                  </button>
                  <button
                    onClick={() => { setZoom(1); setPanOffset({ x: 0, y: 0 }); }}
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 text-xs font-bold"
                  >
                    Reset
                  </button>
                </div>
              </div>

              {/* Viewport content */}
              <div 
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                className="relative min-h-[420px] max-h-[500px] overflow-hidden flex items-center justify-center p-8 select-none"
                style={checkerboardStyle}
              >
                {positionType === 'custom' ? (
                  <div className="absolute top-4 left-4 bg-violet-600 text-[10px] text-white font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow z-10 animate-pulse">
                    <Move className="h-3 w-3" /> Drag the violet frame box to reposition the watermark
                  </div>
                ) : (
                  <div className="absolute top-4 left-4 bg-black/60 backdrop-blur-sm text-[10px] text-slate-200 font-bold px-3 py-1.5 rounded-full flex items-center gap-2 shadow">
                    <Move className="h-3 w-3 text-indigo-400" /> Hold & drag workspace to pan (Preset: {positionType})
                  </div>
                )}

                {isProcessing && (
                  <div className="absolute inset-0 z-45 flex flex-col items-center justify-center bg-slate-955/85 backdrop-blur-sm gap-4 p-8 text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-4 border-violet-500 border-t-transparent shadow-lg shadow-violet-500/20" />
                    <div className="w-full max-w-xs space-y-3">
                      <span className="text-sm font-black text-slate-200 block animate-pulse">
                        {imagesQueue.length > 1 && uploadPercent < 100
                          ? `Uploading ${imagesQueue.length} files...`
                          : 'Processing Watermarks...'}
                      </span>
                      {uploadPercent > 0 && (
                        <div className="space-y-1.5">
                          <span className="text-[10px] text-slate-400 font-extrabold block">
                            {uploadPercent}% uploaded
                          </span>
                          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden shadow-inner border border-slate-700/50">
                            <div 
                              className="bg-gradient-to-r from-violet-500 to-indigo-500 h-full rounded-full transition-all duration-100 shadow"
                              style={{ width: `${uploadPercent}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <AnimatePresence mode="wait">
                  {viewMode === 'transformed' && (
                    <motion.div
                      key="transformed"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onMouseDown={handleMouseDown}
                      style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                        cursor: isDragging ? 'grabbing' : 'default',
                        transition: isDragging ? 'none' : 'transform 0.15s ease'
                      }}
                      className="origin-center shadow-xl max-w-full max-h-full"
                    >
                      <div className="relative" style={{ display: 'inline-block' }}>
                        <canvas 
                          ref={canvasRef} 
                          className="max-h-[360px] object-contain rounded border border-slate-200 dark:border-slate-800 shadow"
                        />

                        {/* Interactive Drag Frame Box */}
                        {canvasLayout.width > 0 && loadedImgEl && (
                          <div 
                            onPointerDown={handleWmPointerDown}
                            onPointerMove={handleWmPointerMove}
                            onPointerUp={handleWmPointerUp}
                            style={{
                              position: 'absolute',
                              left: `${customX / (loadedImgEl.naturalWidth / canvasLayout.width || 1)}px`,
                              top: `${customY / (loadedImgEl.naturalHeight / canvasLayout.height || 1)}px`,
                              width: `${Math.max(30, (Math.max(10, Math.round(loadedImgEl.naturalWidth * scale)) / loadedImgEl.naturalWidth) * canvasLayout.width)}px`,
                              height: `${Math.max(30, (((wmHeightRef.current || 40) * (Math.max(10, Math.round(loadedImgEl.naturalWidth * scale)) / (wmWidthRef.current || 100))) / loadedImgEl.naturalHeight) * canvasLayout.height)}px`,
                              transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
                              border: '2px dashed #8b5cf6',
                              borderRadius: '6px',
                              backgroundColor: isDraggingWm ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.05)',
                              cursor: isDraggingWm ? 'grabbing' : 'grab',
                              touchAction: 'none',
                              zIndex: 30
                            }}
                            title="Drag to position"
                          >
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                              <div className="h-1.5 w-1.5 rounded-full bg-violet-500" />
                            </div>
                          </div>
                        )}

                        {/* Snapping Guidelines visual overlays */}
                        {snapActiveX && (
                          <div 
                            className="absolute top-0 bottom-0 border-l border-dashed border-violet-500 pointer-events-none z-25"
                            style={{ left: `${snapActiveXOffset}px` }}
                          />
                        )}
                        {snapActiveY && (
                          <div 
                            className="absolute left-0 right-0 border-t border-dashed border-violet-500 pointer-events-none z-25"
                            style={{ top: `${snapActiveYOffset}px` }}
                          />
                        )}
                      </div>
                    </motion.div>
                  )}

                  {viewMode === 'original' && (
                    <motion.div
                      key="original"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      onMouseDown={handleMouseDown}
                      style={{
                        transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
                        cursor: isDragging ? 'grabbing' : 'grab',
                        transition: isDragging ? 'none' : 'transform 0.15s ease'
                      }}
                      className="origin-center max-w-full max-h-full"
                    >
                      <img
                        src={activeImage.previewUrl}
                        alt=""
                        className="max-h-[360px] object-contain rounded border border-slate-200 dark:border-slate-800 shadow"
                        draggable={false}
                      />
                    </motion.div>
                  )}

                  {viewMode === 'compare' && (
                    <motion.div
                      key="compare"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="grid grid-cols-2 gap-6 w-full p-4"
                    >
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black uppercase bg-slate-200 dark:bg-slate-800 text-slate-500 px-2.5 py-1 rounded-md">Original</span>
                        <div className="h-[280px] w-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-250/20 dark:border-slate-800 rounded-2xl p-2">
                          <img src={activeImage.previewUrl} alt="" className="max-h-full max-w-full object-contain rounded" draggable={false} />
                        </div>
                      </div>
                      <div className="flex flex-col items-center gap-2">
                        <span className="text-[10px] font-black uppercase bg-violet-100 dark:bg-violet-955/50 text-violet-500 px-2.5 py-1 rounded-md">Watermarked</span>
                        <div className="h-[280px] w-full flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-250/20 dark:border-slate-800 rounded-2xl p-2">
                          <canvas ref={canvasRef} className="max-h-full max-w-full object-contain rounded" />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>

              </div>

              {/* Status info bar */}
              <div className="bg-slate-100/60 dark:bg-slate-900/60 px-5 py-3 border-t border-slate-200 dark:border-slate-800 flex justify-between text-xs text-slate-500 font-bold">
                <span>File: {activeImage.name}</span>
                {positionType === 'custom' && (
                  <span className="text-violet-500">Position Target: X={customX} px, Y={customY} px</span>
                )}
                <span>Base Size: {canvasRef.current ? `${canvasRef.current.width}x${canvasRef.current.height}` : '...'}</span>
              </div>

            </div>
          )}

          {/* Status info error banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold flex items-center gap-2"
              >
                <AlertTriangle className="h-4.5 w-4.5" /> {errorMessage}
              </motion.div>
            )}
            {successMessage && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl text-xs font-bold flex items-center gap-2"
              >
                <CheckCircle className="h-4.5 w-4.5" /> {successMessage}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Queue select cards list */}
          {imagesQueue.length > 0 && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <div className="flex justify-between items-center pb-2">
                <span className="text-xs font-black tracking-wider text-slate-400 dark:text-slate-500 uppercase flex items-center gap-2">
                  <FileImage className="h-4.5 w-4.5" /> Images Queue Queue List ({imagesQueue.length})
                </span>
                <button
                  onClick={() => handleImagesSelected([])}
                  className="text-xs font-bold text-red-500 hover:underline"
                >
                  Clear All
                </button>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {imagesQueue.map((img) => (
                  <div
                    key={img.id}
                    onClick={() => setActiveImage(img)}
                    className={`relative p-2 rounded-2xl border cursor-pointer transition flex flex-col gap-2 ${
                      activeImage?.id === img.id
                        ? 'border-violet-500 bg-violet-500/5 ring-1 ring-violet-500 shadow-md shadow-violet-500/10'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 hover:bg-slate-50 dark:hover:bg-slate-900'
                    }`}
                  >
                    <div className="aspect-video relative rounded-lg overflow-hidden bg-slate-100 dark:bg-slate-950 flex items-center justify-center border border-slate-200 dark:border-slate-850">
                      <img src={img.previewUrl} alt="" className="max-h-full max-w-full object-contain" />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeImage(img.id);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 rounded bg-black/60 hover:bg-red-650 text-white transition"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 truncate px-1">{img.name}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Right column settings panel */}
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-6">
            
            {/* Watermark Type Selector */}
            <div>
              <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block mb-3">
                Watermark Type
              </label>
              <div className="grid grid-cols-3 gap-1 bg-slate-100 dark:bg-slate-950 p-1.5 rounded-2xl border border-slate-200/50 dark:border-slate-800/80">
                {[
                  { id: 'text', label: 'Text', icon: Type },
                  { id: 'image', label: 'Image', icon: ImageIcon },
                  { id: 'svg', label: 'SVG Vector', icon: FileImage }
                ].map(item => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.id}
                      onClick={() => updateSetting(setWatermarkType, item.id, 'watermarkType')}
                      className={`py-2 px-1.5 rounded-xl text-[10px] font-bold transition flex flex-col items-center justify-center gap-1 ${
                        watermarkType === item.id
                          ? 'bg-white dark:bg-slate-800 text-violet-650 dark:text-violet-400 shadow-sm border border-slate-200/20'
                          : 'text-slate-500 hover:text-slate-800'
                      }`}
                    >
                      <Icon className="h-3.5 w-3.5" />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom parameters block depending on watermarkType */}
            {watermarkType === 'text' ? (
              /* Text Configs */
              <div className="space-y-4">
                
                {/* Text String Input */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1.5">Watermark Text</label>
                  <input
                    type="text"
                    value={text}
                    onChange={(e) => updateSetting(setText, e.target.value, 'text')}
                    className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-violet-500 font-bold"
                    placeholder="Enter text..."
                  />
                </div>

                {/* Font & Font Size */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1.5">Font Style</label>
                    <select
                      value={fontFamily}
                      onChange={(e) => updateSetting(setFontFamily, e.target.value, 'fontFamily')}
                      className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-violet-500 font-semibold"
                    >
                      {PRESET_FONTS.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1.5">Size (px)</label>
                    <input
                      type="number"
                      value={fontSize}
                      onChange={(e) => updateSetting(setFontSize, parseInt(e.target.value, 10) || 12, 'fontSize')}
                      className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-violet-500 text-center font-bold"
                    />
                  </div>
                </div>

                {/* Custom TTF/OTF File upload */}
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1.5">Or Upload Custom Font (.ttf / .otf)</label>
                  <input
                    type="file"
                    accept=".ttf,.otf,.woff,.woff2"
                    onChange={handleCustomFontUpload}
                    className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-[10px] file:font-black file:bg-slate-100 file:text-slate-600 hover:file:bg-violet-100 transition file:cursor-pointer"
                  />
                  {customFontFile && (
                    <span className="text-[9px] text-emerald-500 block mt-1 font-bold">
                      Loaded custom font: {customFontFile.name}
                    </span>
                  )}
                </div>

                {/* Color Pickers & Presets */}
                <div className="space-y-3 pt-2">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase">Text color</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={textColor}
                        onChange={(e) => updateSetting(setTextColor, e.target.value, 'textColor')}
                        className="h-6 w-6 border border-slate-250 dark:border-slate-800 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={textColor}
                        onChange={(e) => updateSetting(setTextColor, e.target.value, 'textColor')}
                        className="w-20 bg-slate-50 dark:bg-slate-955 border border-slate-250 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-center font-bold"
                      />
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 justify-end">
                    {PRESET_COLORS.map(c => (
                      <button
                        key={c.name}
                        onClick={() => updateSetting(setTextColor, c.value, 'textColor')}
                        className={`h-5 w-5 rounded-full border ${textColor === c.value ? 'ring-2 ring-violet-500 border-white' : 'border-slate-200 dark:border-slate-800'}`}
                        style={{ backgroundColor: c.value }}
                      />
                    ))}
                  </div>
                </div>

                {/* Outline config */}
                <div className="border-t border-slate-100 dark:border-slate-850 pt-3.5 space-y-3">
                  <div className="flex justify-between items-center">
                    <label className="text-[10px] font-extrabold text-slate-400 uppercase">Text outline</label>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={outlineColor}
                        onChange={(e) => updateSetting(setOutlineColor, e.target.value, 'outlineColor')}
                        className="h-6 w-6 border border-slate-250 rounded cursor-pointer"
                      />
                      <input
                        type="number"
                        value={outlineWidth}
                        min={0}
                        max={15}
                        onChange={(e) => updateSetting(setOutlineWidth, parseInt(e.target.value, 10) || 0, 'outlineWidth')}
                        className="w-12 bg-slate-50 dark:bg-slate-955 border border-slate-250 rounded-lg py-0.5 text-[10px] text-center font-bold"
                      />
                      <span className="text-[10px] text-slate-400 font-bold">px</span>
                    </div>
                  </div>
                </div>

                {/* Shadow configuration */}
                <div className="border-t border-slate-100 dark:border-slate-855 pt-3.5 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Enable drop shadow</span>
                    <input
                      type="checkbox"
                      checked={shadowEnabled}
                      onChange={(e) => updateSetting(setShadowEnabled, e.target.checked, 'shadowEnabled')}
                      className="h-4.5 w-4.5 accent-violet-600"
                    />
                  </div>

                  {shadowEnabled && (
                    <div className="grid grid-cols-3 gap-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-855">
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Offset X</label>
                        <input
                          type="number"
                          value={shadowX}
                          onChange={(e) => updateSetting(setShadowX, parseInt(e.target.value, 10) || 0, 'shadowX')}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-center text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Offset Y</label>
                        <input
                          type="number"
                          value={shadowY}
                          onChange={(e) => updateSetting(setShadowY, parseInt(e.target.value, 10) || 0, 'shadowY')}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-center text-xs font-bold"
                        />
                      </div>
                      <div>
                        <label className="text-[9px] font-bold text-slate-400 uppercase block mb-1">Blur</label>
                        <input
                          type="number"
                          value={shadowBlur}
                          min={0}
                          onChange={(e) => updateSetting(setShadowBlur, parseInt(e.target.value, 10) || 0, 'shadowBlur')}
                          className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-center text-xs font-bold"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Padding & Background Plate Box */}
                <div className="border-t border-slate-100 dark:border-slate-850 pt-3.5 space-y-4">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block">Background Plate Box</label>
                  
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Plate Opacity</span>
                      <span className="text-xs font-black text-violet-500">{Math.round(bgOpacity * 100)}%</span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.0}
                      step={0.05}
                      value={bgOpacity}
                      onChange={(e) => updateSetting(setBgOpacity, parseFloat(e.target.value), 'bgOpacity')}
                      className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-650"
                    />
                  </div>

                  {bgOpacity > 0 && (
                    <div className="space-y-3.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Plate Color</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={bgColor}
                            onChange={(e) => updateSetting(setBgColor, e.target.value, 'bgColor')}
                            className="h-6 w-6 border border-slate-200 dark:border-slate-850 rounded cursor-pointer"
                          />
                          <input
                            type="text"
                            value={bgColor}
                            onChange={(e) => updateSetting(setBgColor, e.target.value, 'bgColor')}
                            className="w-20 bg-slate-50 dark:bg-slate-955 border border-slate-250 dark:border-slate-800 rounded-lg px-2.5 py-1 text-[10px] text-center font-bold"
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Text Padding</span>
                          <span className="text-xs font-black text-violet-500">{padding} px</span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={80}
                          value={padding}
                          onChange={(e) => updateSetting(setPadding, parseInt(e.target.value, 10) || 0, 'padding')}
                          className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-650"
                        />
                      </div>
                    </div>
                  )}
                </div>

              </div>
            ) : watermarkType === 'image' ? (
              /* Image logo options */
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1.5">Upload Logo Watermark</label>
                  <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:border-violet-500 transition">
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleLogoUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <ImageIcon className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                      {logoFile ? logoFile.name : 'Select custom watermark logo'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">PNG, JPG, or WEBP transparent files recommended</span>
                  </div>
                </div>

                {logoPreviewUrl && (
                  <div className="h-16 flex items-center justify-center p-2 border border-slate-200 dark:border-slate-850 rounded-xl bg-slate-50/40">
                    <img src={logoPreviewUrl} alt="Logo preview" className="max-h-full max-w-full object-contain" />
                  </div>
                )}

              </div>
            ) : (
              /* SVG file options */
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1.5">Upload SVG Watermark</label>
                  <div className="relative border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-center cursor-pointer hover:border-violet-500 transition">
                    <input
                      type="file"
                      accept=".svg"
                      onChange={handleSvgUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                    <FileImage className="h-6 w-6 text-slate-400 mx-auto mb-1.5" />
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300 block">
                      {svgFile ? svgFile.name : 'Select custom SVG vector'}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">Upload .svg file vector format</span>
                  </div>
                </div>

                {svgPreviewUrl && (
                  <div className="h-16 flex items-center justify-center p-2 border border-slate-200 dark:border-slate-855 rounded-xl bg-slate-50/40">
                    <img src={svgPreviewUrl} alt="SVG preview" className="max-h-full max-w-full object-contain" />
                  </div>
                )}
              </div>
            )}

            {/* Common Adjustments */}
            <div className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-4">
              
              {/* Scale slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Watermark Scale</span>
                  <span className="text-xs font-black text-violet-500">{Math.round(scale * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={2.0}
                  step={0.05}
                  value={scale}
                  onChange={(e) => updateSetting(setScale, parseFloat(e.target.value), 'scale')}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-650"
                />
              </div>

              {/* Opacity slider */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Opacity level</span>
                  <span className="text-xs font-black text-violet-500">{Math.round(opacity * 100)}%</span>
                </div>
                <input
                  type="range"
                  min={0.05}
                  max={1.0}
                  step={0.05}
                  value={opacity}
                  onChange={(e) => updateSetting(setOpacity, parseFloat(e.target.value), 'opacity')}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-650"
                />
              </div>

              {/* Rotation angle */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300">Rotation Angle</span>
                  <span className="text-xs font-black text-violet-500">{rotation}°</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  value={rotation}
                  onChange={(e) => updateSetting(setRotation, parseInt(e.target.value, 10), 'rotation')}
                  className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-650"
                />
              </div>

              {/* Blend Modes dropdown */}
              <div>
                <label className="text-[10px] font-extrabold text-slate-400 uppercase block mb-1.5">Composite Blend Mode</label>
                <select
                  value={blendMode}
                  onChange={(e) => updateSetting(setBlendMode, e.target.value, 'blendMode')}
                  className="w-full bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-violet-500 font-semibold"
                >
                  <option value="over">Normal Overlay (over)</option>
                  <option value="multiply">Multiply (multiply)</option>
                  <option value="screen">Screen (screen)</option>
                  <option value="overlay">Overlay (overlay)</option>
                  <option value="darken">Darken (darken)</option>
                  <option value="lighten">Lighten (lighten)</option>
                  <option value="difference">Difference (difference)</option>
                  <option value="exclusion">Exclusion (exclusion)</option>
                  <option value="color-dodge">Color Dodge (color-dodge)</option>
                  <option value="color-burn">Color Burn (color-burn)</option>
                  <option value="hard-light">Hard Light (hard-light)</option>
                  <option value="soft-light">Soft Light (soft-light)</option>
                </select>
              </div>

            </div>

            {/* Position Layout Alignment */}
            <div className="border-t border-slate-100 dark:border-slate-850 pt-4 space-y-4">
              <div className="flex justify-between items-center">
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 block">
                  Watermark Position Alignment
                </label>
                {/* Diagonal watermark checkbox toggle */}
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-950 px-2 py-0.5 rounded-lg border border-slate-200/50 dark:border-slate-800/80">
                  <span className="text-[8px] font-black uppercase text-slate-400">Diagonal</span>
                  <input
                    type="checkbox"
                    checked={diagonalEnabled}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setDiagonalEnabled(checked);
                      if (checked) {
                        setPositionType('center');
                        const baseW = loadedImgEl?.naturalWidth || 800;
                        const baseH = loadedImgEl?.naturalHeight || 600;
                        const angle = -Math.round((Math.atan2(baseH, baseW) * 180) / Math.PI);
                        setRotation(angle);
                        setScale(0.8);
                        pushHistory({
                          watermarkType, opacity, scale: 0.8, rotation: angle, positionType: 'center',
                          customX, customY, margin, text, fontFamily, fontSize,
                          textColor, outlineColor, outlineWidth, shadowEnabled,
                          shadowX, shadowY, shadowBlur, shadowColor,
                          blendMode, padding, bgOpacity, bgColor, diagonalEnabled: true
                        });
                      } else {
                        updateSetting(setDiagonalEnabled, false, 'diagonalEnabled');
                      }
                    }}
                    className="h-3.5 w-3.5 accent-violet-650 cursor-pointer"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: 'top-left', label: 'Top Left' },
                  { id: 'top-right', label: 'Top Right' },
                  { id: 'center', label: 'Center' },
                  { id: 'bottom-left', label: 'Bottom Left' },
                  { id: 'bottom-right', label: 'Bottom Right' },
                  { id: 'tile', label: 'Tiled grid' },
                  { id: 'custom', label: 'Drag Pos' }
                ].map(pos => (
                  <button
                    key={pos.id}
                    onClick={() => updateSetting(setPositionType, pos.id, 'positionType')}
                    className={`py-2 rounded-xl text-[10px] font-extrabold border transition ${
                      positionType === pos.id
                        ? 'bg-violet-600 border-violet-600 text-white shadow'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:border-slate-350'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>

              {/* Margins for standard alignments */}
              {positionType !== 'tile' && positionType !== 'custom' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[10px] font-extrabold text-slate-400 uppercase">Edge Margins</span>
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{margin} px</span>
                  </div>
                  <input
                    type="range"
                    min={5}
                    max={200}
                    value={margin}
                    onChange={(e) => updateSetting(setMargin, parseInt(e.target.value, 10), 'margin')}
                    className="w-full h-1 bg-slate-100 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-650"
                  />
                </div>
              )}

              {/* Custom offsets coordinate values inputs */}
              {positionType === 'custom' && (
                <div className="grid grid-cols-2 gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-2xl border border-slate-100 dark:border-slate-850">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Target X (px)</label>
                    <input
                      type="number"
                      value={customX}
                      onChange={(e) => updateSetting(setCustomX, parseInt(e.target.value, 10) || 0, 'customX')}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-center text-xs font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 block mb-1">Target Y (px)</label>
                    <input
                      type="number"
                      value={customY}
                      onChange={(e) => updateSetting(setCustomY, parseInt(e.target.value, 10) || 0, 'customY')}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 text-center text-xs font-bold"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Execute trigger actions */}
            <div className="border-t border-slate-100 dark:border-slate-855 pt-4 space-y-2.5">
              
              <button
                onClick={() => handleWatermarkExecute(false)}
                disabled={isProcessing || imagesQueue.length === 0 || !isAllowed || (watermarkType === 'image' && !logoFile) || (watermarkType === 'svg' && !svgFile)}
                className="w-full py-3 rounded-2xl bg-violet-600 hover:bg-violet-750 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-violet-600/20 transition flex items-center justify-center gap-2"
              >
                <Download className="h-4 w-4" /> Download Watermarked Image
              </button>

              {imagesQueue.length > 1 && (
                <button
                  onClick={() => handleWatermarkExecute(true)}
                  disabled={isProcessing || !isAllowed || (watermarkType === 'image' && !logoFile) || (watermarkType === 'svg' && !svgFile)}
                  className="w-full py-3 rounded-2xl bg-indigo-650 hover:bg-indigo-700 disabled:opacity-40 text-white font-bold text-sm shadow-lg shadow-indigo-600/20 transition flex items-center justify-center gap-2 border border-indigo-600/50"
                >
                  <Layers className="h-4 w-4" /> Watermark Batch (ZIP)
                </button>
              )}

              <button
                onClick={handleReset}
                disabled={imagesQueue.length === 0}
                className="w-full py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-950 font-semibold text-xs transition"
              >
                Reset Options
              </button>
            </div>

          </div>

          <div className="p-5.5 rounded-3xl bg-indigo-500/5 border border-indigo-500/10 flex items-start gap-3 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
            <Sparkles className="h-4.5 w-4.5 text-indigo-500 shrink-0" />
            <p>
              Applying watermarks via vector SVG structures preserves outlines, lettering spacing, and avoids pixelation during high resolution scaling.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}
