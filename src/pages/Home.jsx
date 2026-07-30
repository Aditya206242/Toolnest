import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { 
  Search, Image, FileText, Code, Percent, Wrench, Star, 
  Zap, ArrowRight, ShieldCheck, Check, HelpCircle 
} from 'lucide-react';
import SEO from '../components/SEO';

const TOOLS_CATALOG = [
  {
    id: 'pdf-compress',
    title: 'PDF Compressor',
    desc: 'Compress PDF files client-side without losing resolution.',
    category: 'pdf',
    badge: 'Popular',
    icon: FileText,
    href: '/pdf/pdf-compress',
    keywords: ['compress', 'size', 'minimize', 'reduce', 'shrink', 'optimise', 'optimizer', 'small']
  },
  {
    id: 'pdf-merge',
    title: 'PDF Merger',
    desc: 'Merge multiple PDF documents into a single file.',
    category: 'pdf',
    icon: FileText,
    href: '/pdf/pdf-merge',
    keywords: ['merge', 'combine', 'join', 'concat', 'add', 'together']
  },
  {
    id: 'pdf-split',
    title: 'PDF Splitter',
    desc: 'Extract pages or split a PDF into smaller files.',
    category: 'pdf',
    icon: FileText,
    href: '/pdf/pdf-split',
    keywords: ['split', 'cut', 'separate', 'divide', 'extract']
  },
  {
    id: 'pdf-rotate',
    title: 'Rotate PDF',
    desc: 'Rotate PDF pages clockwise or counterclockwise.',
    category: 'pdf',
    icon: FileText,
    href: '/pdf/pdf-rotate',
    keywords: ['rotate', 'turn', 'flip', 'angle', 'orientation']
  },
  {
    id: 'pdf-delete-pages',
    title: 'Delete PDF Pages',
    desc: 'Remove unwanted pages from a PDF document.',
    category: 'pdf',
    icon: FileText,
    href: '/pdf/pdf-delete-pages',
    keywords: ['delete', 'remove', 'erase', 'cut', 'clear']
  },
  {
    id: 'pdf-extract-pages',
    title: 'Extract PDF Pages',
    desc: 'Extract selected pages into a new PDF file.',
    category: 'pdf',
    icon: FileText,
    href: '/pdf/pdf-extract-pages',
    keywords: ['extract', 'get', 'pull', 'separate', 'select']
  },
  {
    id: 'image-compress',
    title: 'PNG/JPG Optimizer',
    desc: 'Reduce file size of images by up to 80% using browser canvas.',
    category: 'image',
    badge: 'Hot',
    icon: Image,
    href: '/image/image-compress',
    keywords: ['compress', 'size', 'optimize', 'optimise', 'shrink', 'minimize', 'reduce']
  },
  {
    id: 'image-resize',
    title: 'Resize Image',
    desc: 'Resize images by pixel or percentage dimensions.',
    category: 'image',
    icon: Image,
    href: '/image/image-resize',
    keywords: ['resize', 'dimensions', 'width', 'height', 'scale', 'pixels']
  },
  {
    id: 'image-crop',
    title: 'Crop Image',
    desc: 'Trim image boundaries with an interactive crop box.',
    category: 'image',
    icon: Image,
    href: '/image/image-crop',
    keywords: ['crop', 'cut', 'trim', 'area', 'frame']
  },
  {
    id: 'image-convert',
    title: 'Convert Image',
    desc: 'Convert images between JPG, PNG, WEBP, and AVIF.',
    category: 'image',
    icon: Image,
    href: '/image/image-convert',
    keywords: ['convert', 'format', 'png', 'jpg', 'webp', 'avif', 'jpeg']
  },
  {
    id: 'image-rotate',
    title: 'Rotate Image',
    desc: 'Rotate or flip images locally in the browser.',
    category: 'image',
    icon: Image,
    href: '/image/image-rotate',
    keywords: ['rotate', 'flip', 'turn', 'mirror']
  },
  {
    id: 'image-watermark',
    title: 'Watermark Image',
    desc: 'Add text or logo watermarks to your images.',
    category: 'image',
    icon: Image,
    href: '/image/image-watermark',
    keywords: ['watermark', 'text', 'logo', 'sign', 'stamp', 'overlay']
  },
  {
    id: 'image-remove-bg',
    title: 'Remove Background',
    desc: 'Erase image backgrounds and isolate subjects.',
    category: 'image',
    badge: 'AI Powered',
    icon: Image,
    href: '/image/image-remove-bg',
    keywords: ['remove', 'bg', 'background', 'erase', 'clear', 'transparent', 'isolate']
  },
  {
    id: 'image-ai-upscale',
    title: 'AI Upscale',
    desc: 'Upscale blurry images up to 4x while preserving quality.',
    category: 'image',
    badge: 'Premium',
    icon: Image,
    href: '/image/image-ai-upscale',
    keywords: ['upscale', 'ai', 'enlarge', 'resize', 'clearer', 'enhance', 'resolution', 'blurry']
  },
  {
    id: 'image-metadata',
    title: 'Image Metadata',
    desc: 'View and strip EXIF metadata from images.',
    category: 'image',
    icon: Image,
    href: '/image/image-metadata',
    keywords: ['metadata', 'exif', 'info', 'details', 'strip', 'clean', 'gps', 'camera']
  },
  {
    id: 'svg-to-jsx',
    title: 'SVG to JSX Converter',
    desc: 'Transform raw SVG paths into React/JSX functional components.',
    category: 'developer',
    icon: Code,
    href: '#dev',
    keywords: ['svg', 'jsx', 'react', 'code', 'convert', 'transform', 'component']
  },
  {
    id: 'jwt-decoder',
    title: 'JWT Token Decoder',
    desc: 'Verify and decode JSON Web Tokens locally in your browser.',
    category: 'developer',
    icon: Code,
    href: '#dev',
    keywords: ['jwt', 'token', 'decode', 'decrypt', 'parse', 'verify', 'json']
  },
  {
    id: 'adsense-calculator',
    title: 'AdSense RPM Calculator',
    desc: 'Calculate estimated daily, monthly, and yearly earnings.',
    category: 'calculators',
    badge: 'Interactive',
    icon: Percent,
    href: '#calculator',
    keywords: ['rpm', 'earnings', 'calculator', 'adsense', 'ad', 'revenue', 'money']
  },
  {
    id: 'freelance-rate',
    title: 'Freelance Rate Calculator',
    desc: 'Calculate your ideal hourly and project rates based on expenses.',
    category: 'calculators',
    icon: Percent,
    href: '#calculator',
    keywords: ['hourly', 'freelance', 'rate', 'calculator', 'price', 'salary', 'expenses']
  },
  {
    id: 'regex-tester',
    title: 'Regex Tester',
    desc: 'Write, debug, and test regular expressions with visual matching.',
    category: 'developer',
    icon: Code,
    href: '#dev',
    keywords: ['regex', 'regexp', 'test', 'match', 'expression', 'pattern']
  }
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('pdf');

  const VISIBLE_CATEGORIES = ['pdf', 'image', 'developer'];

  // AdSense Calculator State
  const [pageViews, setPageViews] = useState(50000);
  const [pageRPM, setPageRPM] = useState(150); // in INR

  // Filter tools based on search and category
  const filteredTools = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    
    return TOOLS_CATALOG.filter(tool => {
      // 1. Verify category match (if query is not empty, ignore category filter to allow searching everything!)
      const matchesCategory = VISIBLE_CATEGORIES.includes(tool.category) &&
        (query ? true : tool.category === activeCategory);
        
      if (!matchesCategory) return false;
      
      // 2. If no query, return true (matches category filter)
      if (!query) return true;
      
      // 3. Match individual words of search query in a fuzzy manner
      const searchWords = query.split(/\s+/).filter(Boolean);
      const targetText = `${tool.title} ${tool.desc} ${(tool.keywords || []).join(' ')}`.toLowerCase();
      
      return searchWords.every(word => {
        // Expand synonyms
        if (word === 'bg') {
          return targetText.includes('bg') || targetText.includes('background');
        }
        if (word === 'background') {
          return targetText.includes('bg') || targetText.includes('background');
        }
        return targetText.includes(word);
      });
    });
  }, [searchQuery, activeCategory]);

  // AdSense calculations
  const calculatorEarnings = useMemo(() => {
    const dailyViews = pageViews / 30;
    const dailyEarnings = (dailyViews / 1000) * pageRPM;
    const monthlyEarnings = (pageViews / 1000) * pageRPM;
    const yearlyEarnings = monthlyEarnings * 12;
    return {
      daily: Math.round(dailyEarnings),
      monthly: Math.round(monthlyEarnings),
      yearly: Math.round(yearlyEarnings)
    };
  }, [pageViews, pageRPM]);

  const originUrl = window.location.origin;

  // JSON-LD dynamic Organization & FAQ schemas
  const homeSchema = {
    "@graph": [
      {
        "@type": "Organization",
        "name": "ToolNest",
        "url": `${originUrl}/`,
        "logo": `${originUrl}/output-no-bg.png`
      },
      {
        "@type": "FAQPage",
        "mainEntity": [
          {
            "@type": "Question",
            "name": "Are my files uploaded to any servers?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "No! All processing for PDF merges, compressions, image resizes, and metadata cleaning happens directly in your browser's local memory using WebAssembly and client-side scripts. Your documents never touch our servers."
            }
          },
          {
            "@type": "Question",
            "name": "How does the pricing subscription work?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "We offer a generous free tier for standard local tools, and a premium tier for advanced AI-driven features like background erasure and high-resolution upscaling."
            }
          },
          {
            "@type": "Question",
            "name": "Can I use ToolNest on mobile devices?",
            "acceptedAnswer": {
              "@type": "Answer",
              "text": "Yes, our tool interfaces are fully responsive and optimized for mobile, tablet, and desktop viewports."
            }
          }
        ]
      }
    ]
  };

  return (
    <div className="max-w-7xl mx-auto px-6">
      <SEO 
        title="ToolNest - Free Online Local PDF & Image Utilities"
        description="Process PDF files, compress images, and decode tokens directly in your browser cache. Secure execution with zero uploads and zero latency."
        canonicalUrl={`${originUrl}/`}
        jsonLdSchema={homeSchema}
      />
      
      {/* Minimal Header / Hero */}
      <section className="text-center pt-16 pb-12">
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight mb-4 text-slate-900 dark:text-slate-100">
          Tool<span className="text-violet-600 dark:text-violet-400">Nest</span>
        </h1>
        <p className="text-base text-slate-500 dark:text-slate-400 max-w-lg mx-auto mb-8 leading-relaxed">
          Local, high-performance utilities. Your files never leave your device.
        </p>

        {/* Search Bar */}
        <div className="max-w-md mx-auto relative">
          <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-1.5 shadow-sm">
            <Search className="h-4.5 w-4.5 text-slate-400 ml-3 shrink-0" />
            <input 
              type="text" 
              placeholder="Search tools..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-transparent px-3 py-2 focus:outline-none text-sm dark:text-slate-100"
            />
          </div>
        </div>
      </section>

      {/* Cluster Navigation & Tools Grid */}
      <section className="pb-16">
        <div className="flex flex-wrap justify-center gap-2 mb-10">
          {[
            { id: 'pdf', label: 'PDF Tools' },
            { id: 'image', label: 'Image Tools' },
            { id: 'developer', label: 'Dev Tools' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition border ${
                activeCategory === cat.id 
                  ? 'bg-violet-600 text-white border-violet-600' 
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredTools.map(tool => {
              const Icon = tool.icon;
              const isInternal = tool.href.startsWith('/');
              const CardComponent = isInternal ? Link : 'a';
              const cardProps = isInternal ? { to: tool.href } : { href: tool.href };
              return (
                <CardComponent 
                  key={tool.id} 
                  {...cardProps} 
                  className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-violet-500/60 dark:hover:border-violet-500/40 p-5 rounded-xl transition duration-200 flex flex-col justify-between hover:shadow-md cursor-pointer"
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
                </CardComponent>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-100/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
            <Wrench className="h-8 w-8 mx-auto text-slate-400 animate-pulse mb-3" />
            <h3 className="text-sm font-bold">No tools found</h3>
          </div>
        )}
      </section>
    </div>
  );
}
