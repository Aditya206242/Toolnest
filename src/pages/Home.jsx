import { useState, useMemo } from 'react';
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
    <div>
      <SEO 
        title="ToolNest - Free Online Local PDF & Image Utilities"
        description="Process PDF files, compress images, and decode tokens directly in your browser cache. Secure execution with zero uploads and zero latency."
        canonicalUrl={`${originUrl}/`}
        jsonLdSchema={homeSchema}
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-20 pb-16 px-6">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-500/10 dark:bg-indigo-500/5 blur-3xl rounded-full pointer-events-none"></div>
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 text-xs font-bold mb-6 tracking-wide uppercase border border-indigo-500/20">
            <Star className="h-3.5 w-3.5 fill-current" /> Client-Side Processing • 100% Secure
          </div>
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight leading-none mb-6">
            Instant Utility Tools. <br />
            <span className="bg-gradient-to-r from-violet-500 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
              No Uploads. No Waiting.
            </span>
          </h1>
          <p className="text-lg sm:text-xl text-slate-500 dark:text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Free high-performance developer tools, converters, and calculators. Because operations happen inside your browser, your data never hits our servers.
          </p>

          {/* Search Bar */}
          <div className="max-w-xl mx-auto relative group">
            <div className="absolute -inset-1 rounded-2xl bg-gradient-to-r from-violet-600 to-indigo-600 opacity-20 blur group-focus-within:opacity-40 transition duration-300"></div>
            <div className="relative flex items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2 shadow-xl shadow-slate-200/20 dark:shadow-none">
              <Search className="h-5 w-5 text-slate-400 ml-3 shrink-0" />
              <input 
                type="text" 
                placeholder="Search tools (e.g. PDF, JSX, AdSense)..." 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-transparent px-4 py-2.5 focus:outline-none text-sm dark:text-slate-100"
              />
              <span className="hidden sm:inline bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-400 dark:text-slate-500 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 mr-2 shrink-0 select-none">
                Ctrl + K
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Explore Section */}
      <section id="explore" className="max-w-7xl mx-auto px-6 py-12">
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-6 mb-10 gap-6">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Our Tool Clusters</h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">Select a category or search above to find tools.</p>
          </div>

          {/* Categories Grid */}
          <div className="flex flex-wrap gap-2">
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
                className={`px-4.5 py-2 rounded-xl text-sm font-semibold transition border ${
                  activeCategory === cat.id 
                    ? 'bg-violet-600 text-white border-violet-600 shadow-md shadow-violet-600/10' 
                    : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Tools Grid */}
        {filteredTools.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTools.map(tool => {
              const Icon = tool.icon;
              return (
                <a key={tool.id} href={tool.href} className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl hover:border-indigo-500/50 hover:shadow-xl dark:hover:shadow-none dark:hover:bg-slate-900/80 transition-all duration-300 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-500/10 group-hover:text-indigo-500 transition-colors">
                        <Icon className="h-6 w-6 text-slate-500 dark:text-slate-400 group-hover:text-indigo-400" />
                      </div>
                      {tool.badge && (
                        <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30">
                          {tool.badge}
                        </span>
                      )}
                    </div>
                    <h3 className="text-lg font-bold group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                      {tool.title}
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {tool.desc}
                    </p>
                  </div>
                  <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-400 group-hover:text-indigo-500 dark:group-hover:text-indigo-400 transition-colors">
                    <span>LAUNCH TOOL</span>
                    <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1.5 transition-transform" />
                  </div>
                </a>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-slate-100/50 dark:bg-slate-900/30 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
            <Wrench className="h-10 w-10 mx-auto text-slate-400 animate-pulse mb-4" />
            <h3 className="text-lg font-bold">No tools found</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">Try search expressions like "pdf", "converter", or select other tags.</p>
          </div>
        )}
      </section>

      {/* Featured Interactive Tool: AdSense Calculator */}
      <section id="calculator" className="max-w-5xl mx-auto px-6 py-12">
        <div className="relative rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-8 md:p-12 shadow-xl">
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 dark:bg-violet-600/5 blur-3xl pointer-events-none rounded-full"></div>
          
          <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-7">
              <span className="text-xs font-extrabold tracking-widest text-indigo-500 uppercase">Live Utility Tool Demonstration</span>
              <h2 className="text-3xl font-black tracking-tight mt-2 mb-4">AdSense Earnings & RPM Calculator</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
                Bootstrap models rely heavily on knowing your web metrics. Adjust page views and RPM values to simulate passive traffic revenue streams.
              </p>

              {/* Slider Inputs */}
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span className="text-slate-600 dark:text-slate-300">Monthly Page Views</span>
                    <span className="text-violet-600 dark:text-violet-400">{pageViews.toLocaleString()} views</span>
                  </div>
                  <input 
                    type="range" 
                    min="1000" 
                    max="1000000" 
                    step="5000"
                    value={pageViews} 
                    onChange={(e) => setPageViews(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                </div>

                <div>
                  <div className="flex justify-between text-sm font-semibold mb-2">
                    <span className="text-slate-600 dark:text-slate-300">Page RPM (Earnings per 1,000 views)</span>
                    <span className="text-violet-600 dark:text-violet-400">₹{pageRPM}</span>
                  </div>
                  <input 
                    type="range" 
                    min="10" 
                    max="1000" 
                    step="5"
                    value={pageRPM} 
                    onChange={(e) => setPageRPM(Number(e.target.value))}
                    className="w-full h-2 bg-slate-200 dark:bg-slate-800 rounded-lg appearance-none cursor-pointer accent-violet-600"
                  />
                </div>
              </div>
            </div>

            {/* Calculations Result Panel */}
            <div className="lg:col-span-5 bg-slate-50 dark:bg-slate-950 border border-slate-200/50 dark:border-slate-800/80 rounded-2xl p-6 flex flex-col justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-6">Estimated Income</h3>
                <div className="space-y-6">
                  <div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Daily Earnings</span>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">₹{calculatorEarnings.daily.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Monthly Earnings</span>
                    <p className="text-3xl font-black bg-gradient-to-r from-violet-500 to-indigo-500 bg-clip-text text-transparent">₹{calculatorEarnings.monthly.toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 dark:text-slate-500">Yearly Earnings</span>
                    <p className="text-2xl font-extrabold text-slate-900 dark:text-slate-100">₹{calculatorEarnings.yearly.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <div className="mt-8 pt-4 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-emerald-500" /> Math calculated inside local React engine.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-7xl mx-auto px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-extrabold tracking-tight">Flexible Monetization Model</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">Scale and support the platform via low-cost tiers.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 max-w-3xl mx-auto gap-8">
          {/* Free Plan */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold">Standard Free</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Perfect for casual users who need instant tasks completed.</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold">₹0</span>
                <span className="text-slate-500">/ forever</span>
              </div>
              <ul className="space-y-3.5 text-sm">
                <li className="flex items-center gap-3"><Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" /> Full client-side processing</li>
                <li className="flex items-center gap-3"><Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" /> 10 files per tool / day limit</li>
                <li className="flex items-center gap-3"><Check className="h-4.5 w-4.5 text-indigo-500 shrink-0" /> standard community support</li>
              </ul>
            </div>
            <button className="mt-8 w-full py-3 rounded-xl border border-slate-300 dark:border-slate-800 hover:border-slate-400 dark:hover:border-slate-700 font-semibold text-sm transition">
              Use Free Tools
            </button>
          </div>

          {/* Premium Plan */}
          <div className="relative bg-white dark:bg-slate-900 border-2 border-violet-600 p-8 rounded-2xl flex flex-col justify-between shadow-xl">
            <span className="absolute top-0 right-8 transform -translate-y-1/2 bg-violet-600 text-white text-[10px] font-extrabold uppercase px-3 py-1 rounded-full tracking-widest">
              POPULAR
            </span>
            <div>
              <h3 className="text-xl font-bold">ToolNest Premium</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">Unlimited operations, no ad banners, and private storage APIs.</p>
              <div className="my-6">
                <span className="text-4xl font-extrabold">₹199</span>
                <span className="text-slate-500">/ month</span>
              </div>
              <ul className="space-y-3.5 text-sm">
                <li className="flex items-center gap-3"><Check className="h-4.5 w-4.5 text-violet-500 shrink-0" /> Unlimited operations</li>
                <li className="flex items-center gap-3"><Check className="h-4.5 w-4.5 text-violet-500 shrink-0" /> Ads-free platform interface</li>
                <li className="flex items-center gap-3"><Check className="h-4.5 w-4.5 text-violet-500 shrink-0" /> API Access keys (10,000 reqs/mo)</li>
                <li className="flex items-center gap-3"><Check className="h-4.5 w-4.5 text-violet-500 shrink-0" /> Priority execution pipelines</li>
              </ul>
            </div>
            <button className="mt-8 w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-lg shadow-violet-600/25 transition">
              Upgrade to Premium
            </button>
          </div>
        </div>
      </section>

      {/* Dynamic SEO FAQ Section */}
      <section className="max-w-4xl mx-auto px-6 py-16 border-t border-slate-200 dark:border-slate-800/80 mt-12">
        <div className="text-center mb-10">
          <HelpCircle className="h-10 w-10 mx-auto text-violet-500 mb-3" />
          <h2 className="text-2xl md:text-3xl font-black tracking-tight">Frequently Asked Questions</h2>
          <p className="text-xs text-slate-400 mt-1.5">Quick answers to standard operational parameters.</p>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-2">
              Are my files uploaded to any servers?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              No! All processing for PDF merges, compressions, image resizes, and metadata cleaning happens directly in your browser's local memory using WebAssembly and client-side scripts. Your documents never touch our servers.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-2">
              How does the pricing subscription work?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              We offer a generous free tier for standard local tools, and a premium tier for advanced AI-driven features like background erasure and high-resolution upscaling.
            </p>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl">
            <h3 className="text-sm font-extrabold text-slate-800 dark:text-slate-100 mb-2">
              Can I use ToolNest on mobile devices?
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Yes, our tool interfaces are fully responsive and optimized for mobile, tablet, and desktop viewports.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
