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
    href: '/pdf/pdf-compress'
  },
  {
    id: 'pdf-merge',
    title: 'PDF Merger',
    desc: 'Merge multiple PDF documents into a single file.',
    category: 'pdf',
    icon: FileText,
    href: '/pdf/pdf-merge'
  },
  {
    id: 'image-compress',
    title: 'PNG/JPG Optimizer',
    desc: 'Reduce file size of images by up to 80% using browser canvas.',
    category: 'image',
    badge: 'Hot',
    icon: Image,
    href: '/image/image-compress'
  },
  {
    id: 'svg-to-jsx',
    title: 'SVG to JSX Converter',
    desc: 'Transform raw SVG paths into React/JSX functional components.',
    category: 'developer',
    icon: Code,
    href: '#dev'
  },
  {
    id: 'jwt-decoder',
    title: 'JWT Token Decoder',
    desc: 'Verify and decode JSON Web Tokens locally in your browser.',
    category: 'developer',
    icon: Code,
    href: '#dev'
  },
  {
    id: 'adsense-calculator',
    title: 'AdSense RPM Calculator',
    desc: 'Calculate estimated daily, monthly, and yearly earnings.',
    category: 'calculators',
    badge: 'Interactive',
    icon: Percent,
    href: '#calculator'
  },
  {
    id: 'freelance-rate',
    title: 'Freelance Rate Calculator',
    desc: 'Calculate your ideal hourly and project rates based on expenses.',
    category: 'calculators',
    icon: Percent,
    href: '#calculator'
  },
  {
    id: 'regex-tester',
    title: 'Regex Tester',
    desc: 'Write, debug, and test regular expressions with visual matching.',
    category: 'developer',
    icon: Code,
    href: '#dev'
  }
];

export default function Home() {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState('all');

  // AdSense Calculator State
  const [pageViews, setPageViews] = useState(50000);
  const [pageRPM, setPageRPM] = useState(150); // in INR

  // Filter tools based on search and category
  const filteredTools = useMemo(() => {
    return TOOLS_CATALOG.filter(tool => {
      const matchesSearch = tool.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tool.desc.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = activeCategory === 'all' || tool.category === activeCategory;
      return matchesSearch && matchesCategory;
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
            { id: 'all', label: 'All Tools' },
            { id: 'pdf', label: 'PDF Tools' },
            { id: 'image', label: 'Image Tools' },
            { id: 'developer', label: 'Dev Tools' },
            { id: 'calculators', label: 'Calculators' }
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
