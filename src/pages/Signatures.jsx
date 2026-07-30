import { useState, useRef, useEffect } from 'react';
import { PenTool, Type, Upload, Trash2, Download, Check, RefreshCw, Save } from 'lucide-react';
import SEO from '../components/SEO';

const FONTS = [
  { name: 'Elegant Cursive', className: 'font-serif italic tracking-wider font-light text-2xl' },
  { name: 'Modern Hand', className: 'font-sans italic tracking-wide text-2xl font-semibold' },
  { name: 'Brush Script', className: 'font-mono italic tracking-normal text-2xl font-bold' },
];

export default function Signatures() {
  const [activeTab, setActiveTab] = useState('draw');
  const [savedSignatures, setSavedSignatures] = useState([]);
  
  // Draw Tab state
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [brushColor, setBrushColor] = useState('#000000');
  const [brushWidth, setBrushWidth] = useState(3);
  
  // Type Tab state
  const [typedName, setTypedName] = useState('');
  const [selectedFont, setSelectedFont] = useState(0);
  
  // Upload Tab state
  const [uploadedImage, setUploadedImage] = useState(null);

  useEffect(() => {
    // Load from local storage
    const saved = localStorage.getItem('toolnest_saved_signatures');
    if (saved) {
      setSavedSignatures(JSON.parse(saved));
    }
  }, []);

  // Set up canvas context listeners for drawing
  useEffect(() => {
    if (activeTab !== 'draw' || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  }, [activeTab]);

  // Start Drawing
  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.beginPath();
    ctx.moveTo(offsetX, offsetY);
    ctx.strokeStyle = brushColor;
    ctx.lineWidth = brushWidth;
    setIsDrawing(true);
  };

  // Draw
  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;
    const ctx = canvasRef.current.getContext('2d');
    ctx.lineTo(offsetX, offsetY);
    ctx.stroke();
  };

  // Stop Drawing
  const stopDrawing = () => {
    if (!isDrawing) return;
    const ctx = canvasRef.current.getContext('2d');
    ctx.closePath();
    setIsDrawing(false);
  };

  // Clear Canvas
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Save Signature
  const saveSignature = (dataUrl) => {
    const newSig = {
      id: Date.now().toString(),
      dataUrl,
      createdAt: new Date().toLocaleDateString(),
      type: activeTab
    };
    const updated = [newSig, ...savedSignatures];
    setSavedSignatures(updated);
    localStorage.setItem('toolnest_saved_signatures', JSON.stringify(updated));
  };

  const handleSaveDraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Check if canvas is empty
    const buffer = new Uint32Array(
      canvas.getContext('2d').getImageData(0, 0, canvas.width, canvas.height).data.buffer
    );
    const hasDraw = buffer.some(color => color !== 0);
    if (!hasDraw) {
      alert('Please draw your signature first.');
      return;
    }
    const url = canvas.toDataURL('image/png');
    saveSignature(url);
    clearCanvas();
  };

  const handleSaveType = () => {
    if (!typedName.trim()) {
      alert('Please type your name first.');
      return;
    }
    // Render text to canvas to get dataURL
    const canvas = document.createElement('canvas');
    canvas.width = 400;
    canvas.height = 150;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#ffffff00'; // transparent
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    ctx.fillStyle = brushColor;
    ctx.font = `italic 40px ${selectedFont === 0 ? 'Georgia' : selectedFont === 1 ? 'Arial' : 'Courier'}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(typedName, canvas.width / 2, canvas.height / 2);
    
    const url = canvas.toDataURL('image/png');
    saveSignature(url);
    setTypedName('');
  };

  const handleUploadImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setUploadedImage(event.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveUpload = () => {
    if (!uploadedImage) {
      alert('Please upload an image first.');
      return;
    }
    saveSignature(uploadedImage);
    setUploadedImage(null);
  };

  const handleDelete = (id) => {
    const updated = savedSignatures.filter(s => s.id !== id);
    setSavedSignatures(updated);
    localStorage.setItem('toolnest_saved_signatures', JSON.stringify(updated));
  };

  return (
    <div className="max-w-5xl mx-auto py-10 px-4">
      <SEO title="My Signatures - ToolNest" description="Create, draw, and save digital signatures to eSign PDF documents online." />

      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
          My Signatures
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Create digital signatures for quickly signing PDF contracts, invoices, and documents.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creation Box (Left) */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 overflow-hidden shadow-sm backdrop-blur-sm">
            {/* Tabs Header */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
              <button
                onClick={() => setActiveTab('draw')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition ${
                  activeTab === 'draw'
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                <PenTool className="h-4 w-4" />
                Draw
              </button>
              <button
                onClick={() => setActiveTab('type')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition ${
                  activeTab === 'type'
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                <Type className="h-4 w-4" />
                Type
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`flex-1 flex items-center justify-center gap-2 py-4 text-xs font-bold uppercase tracking-wider border-b-2 cursor-pointer transition ${
                  activeTab === 'upload'
                    ? 'border-violet-600 text-violet-600 dark:text-violet-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700'
                }`}
              >
                <Upload className="h-4 w-4" />
                Upload
              </button>
            </div>

            {/* Tab Contents */}
            <div className="p-6">
              
              {/* Draw Tab */}
              {activeTab === 'draw' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between gap-4 text-xs font-bold text-slate-500">
                    <div className="flex items-center gap-3">
                      <span>Color:</span>
                      {['#000000', '#0f2cf7', '#f70f0f'].map((col) => (
                        <button
                          key={col}
                          onClick={() => setBrushColor(col)}
                          className={`h-5 w-5 rounded-full border cursor-pointer flex items-center justify-center transition-all ${
                            brushColor === col ? 'scale-110 shadow-sm border-slate-400' : 'border-transparent'
                          }`}
                          style={{ backgroundColor: col }}
                        >
                          {brushColor === col && <Check className="h-3 w-3 text-white" />}
                        </button>
                      ))}
                    </div>

                    <div className="flex items-center gap-3">
                      <span>Brush size:</span>
                      <input
                        type="range"
                        min="1"
                        max="8"
                        value={brushWidth}
                        onChange={(e) => setBrushWidth(Number(e.target.value))}
                        className="w-24 accent-violet-600"
                      />
                    </div>
                  </div>

                  <div className="relative rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 overflow-hidden">
                    <canvas
                      ref={canvasRef}
                      width={500}
                      height={200}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                      className="w-full h-[200px] cursor-crosshair touch-none"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-4 mt-2">
                    <button
                      onClick={clearCanvas}
                      className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer transition"
                    >
                      <RefreshCw className="h-3.5 w-3.5" />
                      Clear Pad
                    </button>

                    <button
                      onClick={handleSaveDraw}
                      className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-750 text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-violet-600/25"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Signature
                    </button>
                  </div>
                </div>
              )}

              {/* Type Tab */}
              {activeTab === 'type' && (
                <div className="space-y-6">
                  <div>
                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                      Type Your Name
                    </label>
                    <input
                      type="text"
                      maxLength={40}
                      value={typedName}
                      onChange={(e) => setTypedName(e.target.value)}
                      placeholder="e.g. John Doe"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-3 px-4 text-sm focus:border-violet-500 focus:outline-none dark:text-slate-100 font-semibold"
                    />
                  </div>

                  {typedName.trim() && (
                    <div className="space-y-4">
                      <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                        Choose a Style
                      </span>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {FONTS.map((font, idx) => (
                          <button
                            key={idx}
                            onClick={() => setSelectedFont(idx)}
                            className={`p-5 rounded-xl border text-left cursor-pointer transition-all ${
                              selectedFont === idx
                                ? 'border-violet-500 bg-violet-500/5 ring-1 ring-violet-500'
                                : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900/50'
                            }`}
                          >
                            <div className="text-[10px] uppercase font-black text-slate-400 tracking-wider mb-2">{font.name}</div>
                            <div className={`${font.className} text-slate-800 dark:text-slate-100 truncate py-1`}>
                              {typedName}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end mt-2">
                    <button
                      onClick={handleSaveType}
                      disabled={!typedName.trim()}
                      className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-750 text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-violet-600/25 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Save className="h-3.5 w-3.5" />
                      Save Style
                    </button>
                  </div>
                </div>
              )}

              {/* Upload Tab */}
              {activeTab === 'upload' && (
                <div className="space-y-4">
                  {!uploadedImage ? (
                    <div className="border-2 border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-950/20 flex flex-col items-center">
                      <Upload className="h-10 w-10 text-slate-400 mb-3" />
                      <span className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1">
                        Select a signature image (PNG, JPG)
                      </span>
                      <span className="block text-[10px] text-slate-400 mb-4">
                        Transparent backgrounds work best. Max 2MB.
                      </span>
                      <label className="bg-violet-600 hover:bg-violet-750 text-white px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition shadow-md">
                        Browse Files
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleUploadImage}
                          className="hidden"
                        />
                      </label>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="relative rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/40 p-4 flex items-center justify-center">
                        <img
                          src={uploadedImage}
                          alt="Uploaded Signature Preview"
                          className="max-h-[150px] object-contain"
                        />
                        <button
                          onClick={() => setUploadedImage(null)}
                          className="absolute top-3 right-3 p-1.5 rounded-lg bg-red-500 text-white hover:bg-red-600 transition"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>

                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => setUploadedImage(null)}
                          className="inline-flex items-center gap-2 border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-400 cursor-pointer transition"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleSaveUpload}
                          className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-750 text-white px-5 py-2.5 rounded-xl text-xs font-bold cursor-pointer transition shadow-lg shadow-violet-600/25"
                        >
                          <Save className="h-3.5 w-3.5" />
                          Save Upload
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Saved Signatures List (Right) */}
        <div className="lg:col-span-1">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm sticky top-24">
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
              <Check className="h-5 w-5 text-violet-500" />
              Saved Signatures
            </h2>

            {savedSignatures.length === 0 ? (
              <div className="text-center py-10">
                <PenTool className="h-8 w-8 text-slate-300 dark:text-slate-700 mx-auto mb-2.5" />
                <span className="block text-xs font-bold text-slate-400 dark:text-slate-500">No saved signatures.</span>
                <span className="block text-[10px] text-slate-400 dark:text-slate-600 mt-1">Create one using the editor.</span>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-1">
                {savedSignatures.map((sig) => (
                  <div
                    key={sig.id}
                    className="relative border border-slate-200 dark:border-slate-800/80 rounded-xl bg-slate-50/20 dark:bg-slate-950/20 p-3 flex flex-col group hover:border-violet-500/50 transition duration-300"
                  >
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[10px] uppercase font-black text-slate-400 tracking-wider">
                        Created: {sig.createdAt}
                      </span>
                      <div className="flex gap-1.5 opacity-80 group-hover:opacity-100 transition duration-300">
                        <a
                          href={sig.dataUrl}
                          download={`signature-${sig.id}.png`}
                          className="p-1 rounded-md hover:bg-slate-200/50 dark:hover:bg-slate-800 text-slate-500 hover:text-slate-750 transition"
                          title="Download Signature"
                        >
                          <Download className="h-3.5 w-3.5" />
                        </a>
                        <button
                          onClick={() => handleDelete(sig.id)}
                          className="p-1 rounded-md hover:bg-red-500/10 text-slate-400 hover:text-red-500 transition"
                          title="Delete Signature"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-lg p-3 flex justify-center items-center h-20 overflow-hidden">
                      <img
                        src={sig.dataUrl}
                        alt="Saved Signature"
                        className="max-h-full max-w-full object-contain dark:invert"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
