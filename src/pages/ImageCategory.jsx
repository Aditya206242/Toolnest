import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Image as ImageIcon, ArrowLeft, Sliders, Scissors, Crop, 
  RefreshCw, RotateCw, Type, Sparkles, Wand2, Info, Minimize2
} from 'lucide-react';
import ImageToolLayout from '../components/ImageToolLayout';
import ImageUpload from '../components/ImageUpload';
import SEO from '../components/SEO';
import ImageCompressWorkspace from './ImageCompressWorkspace';
import ImageResizeWorkspace from './ImageResizeWorkspace';
import ImageConvertWorkspace from './ImageConvertWorkspace';
import ImageRotateWorkspace from './ImageRotateWorkspace';
import ImageWatermarkWorkspace from './ImageWatermarkWorkspace';
import ImageBgRemovalWorkspace from './ImageBgRemovalWorkspace';
import ImageUpscaleWorkspace from './ImageUpscaleWorkspace';
import api from '../utils/api';

const IMAGE_TOOLS = [
  {
    id: 'image-compress',
    title: 'Compress Image',
    desc: 'Reduce file size of JPG, PNG, WEBP, and AVIF photos locally in browser.',
    icon: Minimize2,
    badge: 'Popular',
    multiple: true,
    instructions: [
      'Upload one or multiple images using drag & drop or browse.',
      'Configure the quality/compression slider on the config panel.',
      'Click "Compress Images" to process and download your optimized files.'
    ],
    faqs: [
      { q: 'Will my image resolution be affected?', a: 'Quality is optimized to preserve details while decreasing byte size. You can adjust the quality slider to find your preferred balance.' }
    ]
  },
  {
    id: 'image-resize',
    title: 'Resize Image',
    desc: 'Change width and height dimensions of images in percentage or exact pixels.',
    icon: Sliders,
    multiple: true,
    instructions: [
      'Upload images into the uploader zone.',
      'Enter the target width and height in pixels or scale ratio.',
      'Click "Resize Images" to compile and save.'
    ],
    faqs: []
  },
  {
    id: 'image-crop',
    title: 'Crop Image',
    desc: 'Trim image boundary ratios using an interactive crop box selection overlay.',
    icon: Crop,
    multiple: false,
    instructions: [
      'Upload a single image.',
      'Drag the bounding crop markers over the image grid to specify bounds.',
      'Click "Crop Image" to download.'
    ],
    faqs: []
  },
  {
    id: 'image-convert',
    title: 'Convert Image',
    desc: 'Change image formats between JPG, PNG, WEBP, AVIF, and GIF instantly.',
    icon: RefreshCw,
    multiple: true,
    instructions: [
      'Upload target image files.',
      'Select the output conversion extension (e.g. convert to WEBP).',
      'Click "Convert Images" to start.'
    ],
    faqs: []
  },
  {
    id: 'image-rotate',
    title: 'Rotate Image',
    desc: 'Rotate images clockwise, counter-clockwise, or mirror-flip them.',
    icon: RotateCw,
    multiple: true,
    instructions: [
      'Upload your images.',
      'Rotate specific images using individual card rotation buttons.',
      'Click "Apply Rotations" to download.'
    ],
    faqs: []
  },
  {
    id: 'image-watermark',
    title: 'Watermark Image',
    desc: 'Add custom text overlays or logo watermarks over images.',
    icon: Type,
    multiple: false,
    instructions: [
      'Upload the target base image.',
      'Upload a logo image or enter watermark text.',
      'Position the overlay, adjust transparency/size, and apply.'
    ],
    faqs: []
  },
  {
    id: 'image-remove-bg',
    title: 'Remove Background',
    desc: 'Isolate key foreground subjects and erase background blocks instantly.',
    icon: Wand2,
    badge: 'AI Powered',
    multiple: false,
    instructions: [
      'Upload a single photo.',
      'Click "Erase Background" to trigger local AI edge-detection.',
      'Download the final transparent PNG file.'
    ],
    faqs: []
  },
  {
    id: 'image-ai-upscale',
    title: 'AI Upscale',
    desc: 'Increase resolution of blurry or low-res images up to 4x without losing quality.',
    icon: Sparkles,
    badge: 'Premium',
    multiple: false,
    instructions: [
      'Upload a low-resolution image.',
      'Select the upscale magnification ratio (2x or 4x).',
      'Click "Upscale Image" to execute.'
    ],
    faqs: []
  },
  {
    id: 'image-metadata',
    title: 'Image Metadata',
    desc: 'View camera EXIF tags, GPS coordinate logs, and strip private attributes from photos.',
    icon: Info,
    multiple: true,
    instructions: [
      'Upload target image files.',
      'Analyze the extracted EXIF specifications and GPS parameters.',
      'Click "Download Cleaned Image" to strip location tracking tags.'
    ],
    faqs: []
  }
];

export default function ImageCategory() {
  const { toolId } = useParams();
  const navigate = useNavigate();
  const [selectedImages, setSelectedImages] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);

  const activeTool = IMAGE_TOOLS.find(t => t.id === toolId) || null;

  const setActiveTool = (tool) => {
    if (tool) {
      navigate(`/image/${tool.id}`);
    } else {
      navigate('/image');
    }
  };

  const handleImagesSelected = (queue) => {
    setSelectedImages(queue);
    console.log(`[Image Foundation Log] Selected ${queue.length} images for ${activeTool?.title}.`);
  };

  const handleBackToCatalog = () => {
    navigate('/image');
    setSelectedImages([]);
  };

  const handleExecuteStub = async () => {
    if (selectedImages.length === 0) return;
    setIsProcessing(true);
    
    // Simulate compilation
    setTimeout(async () => {
      setIsProcessing(false);
      alert(`[Foundation Run Successful] Reusable upload component executed for ${activeTool.title} with ${selectedImages.length} images.`);
      
      try {
        await api.post('/tools/log', { toolSlug: activeTool.id });
      } catch (err) {
        console.warn('Logging image tool usage metrics failed.', err.message);
      }
      
      setSelectedImages([]);
    }, 1200);
  };

  if (activeTool) {
    const Breadcrumbs = [
      { label: 'Home', href: '/' },
      { label: 'Image Tools', href: '/image' },
      { label: activeTool.title }
    ];

    const related = IMAGE_TOOLS.filter(t => t.id !== activeTool.id).map(t => ({
      id: t.id,
      title: t.title,
      desc: t.desc,
      href: `/image/${t.id}`
    }));

    let workspace = null;
    if (activeTool.id === 'image-compress') workspace = <ImageCompressWorkspace onBack={handleBackToCatalog} />;
    else if (activeTool.id === 'image-resize') workspace = <ImageResizeWorkspace onBack={handleBackToCatalog} />;
    else if (activeTool.id === 'image-convert') workspace = <ImageConvertWorkspace onBack={handleBackToCatalog} />;
    else if (activeTool.id === 'image-rotate') workspace = <ImageRotateWorkspace onBack={handleBackToCatalog} />;
    else if (activeTool.id === 'image-watermark') workspace = <ImageWatermarkWorkspace onBack={handleBackToCatalog} />;
    else if (activeTool.id === 'image-remove-bg') workspace = <ImageBgRemovalWorkspace onBack={handleBackToCatalog} />;
    else if (activeTool.id === 'image-ai-upscale') workspace = <ImageUpscaleWorkspace onBack={handleBackToCatalog} />;
    else if (activeTool.id === 'image-metadata') workspace = <ImageMetadataWorkspace onBack={handleBackToCatalog} />;

    const seoComponent = (
      <SEO 
        title={`${activeTool.title} - Free Online Image Tool`}
        description={activeTool.desc}
        canonicalUrl={`${window.location.origin}/image/${activeTool.id}`}
        jsonLdSchema={{
          "@graph": [
            {
              "@type": "BreadcrumbList",
              "itemListElement": [
                { "@type": "ListItem", "position": 1, "name": "Home", "item": `${window.location.origin}/` },
                { "@type": "ListItem", "position": 2, "name": "Image Tools", "item": `${window.location.origin}/image` },
                { "@type": "ListItem", "position": 3, "name": activeTool.title, "item": `${window.location.origin}/image/${activeTool.id}` }
              ]
            },
            {
              "@type": "WebApplication",
              "name": activeTool.title,
              "description": activeTool.desc,
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "All",
              "browserRequirements": "Requires HTML5"
            }
          ]
        }}
      />
    );

    if (workspace) {
      return (
        <>
          {seoComponent}
          {workspace}
        </>
      );
    }

    return (
      <>
        {seoComponent}
        <ImageToolLayout
          title={activeTool.title}
          description={activeTool.desc}
          badge={activeTool.badge}
          breadcrumbs={Breadcrumbs}
          instructions={activeTool.instructions}
          faqs={activeTool.faqs || []}
          relatedTools={related}
        >
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-4 mb-4">
              <button
                onClick={handleBackToCatalog}
                className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-violet-500 transition border border-slate-200 dark:border-slate-800 px-3.5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900"
              >
                <ArrowLeft className="h-4 w-4" /> Back to Image Category
              </button>
              <span className="text-xs font-bold text-slate-400">FOUNDATION WORKSPACE</span>
            </div>

            <ImageUpload
              multiple={activeTool.multiple}
              onImagesSelected={handleImagesSelected}
            />

            {selectedImages.length > 0 && (
              <div className="mt-8 flex justify-end border-t border-slate-100 dark:border-slate-800 pt-6">
                <button
                  onClick={handleExecuteStub}
                  disabled={isProcessing}
                  className="px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-750 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-violet-600/20 transition flex items-center gap-2"
                >
                  {isProcessing ? (
                    <>
                      <div className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin" />
                      Processing Canvas...
                    </>
                  ) : (
                    `Execute ${activeTool.title}`
                  )}
                </button>
              </div>
            )}
          </div>
        </ImageToolLayout>
      </>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-12">
      <SEO 
        title="Image Utilities - Client-Side Optimization Toolkit"
        description="Resize, crop, rotate, watermark, upscale, or remove background from pictures locally in browser cache. Instant secure canvas modifications."
        canonicalUrl={`${window.location.origin}/image`}
        jsonLdSchema={{
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": `${window.location.origin}/` },
            { "@type": "ListItem", "position": 2, "name": "Image Tools", "item": `${window.location.origin}/image` }
          ]
        }}
      />
      <header className="mb-10 text-center md:text-left">
        <h1 className="text-3xl font-black tracking-tight mb-2 text-slate-900 dark:text-slate-100">Image Utilities</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm max-w-2xl leading-relaxed">
          Sleek, responsive client-side image editor toolkit. Quality modifications happen locally without server latency.
        </p>
      </header>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {IMAGE_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <div
              key={tool.id}
              onClick={() => setActiveTool(tool)}
              className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-xl hover:border-violet-500/60 dark:hover:border-violet-500/40 transition duration-200 hover:shadow-md cursor-pointer flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 group-hover:bg-violet-600 group-hover:text-white transition-colors duration-200">
                    <Icon className="h-5 w-5" />
                  </div>
                  {tool.badge && (
                    <span className="text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30">
                      {tool.badge}
                    </span>
                  )}
                </div>

                <h3 className="text-base font-extrabold text-slate-800 dark:text-slate-100 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                  {tool.title}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                  {tool.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// Icon helper
function MinimizeIcon(props) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 14h6v6" />
      <path d="M20 10h-6V4" />
      <path d="M14 10l7-7" />
      <path d="M10 14l-7 7" />
    </svg>
  );
}
