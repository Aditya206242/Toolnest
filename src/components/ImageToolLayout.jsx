import { HelpCircle, Shield, Sparkles, ChevronRight, Zap } from 'lucide-react';

export default function ImageToolLayout({
  title,
  description,
  badge = '',
  breadcrumbs = [],
  instructions = [],
  faqs = [],
  relatedTools = [],
  settingsPanel = null, // Custom parameters container
  children
}) {
  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* 1. Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-6 flex items-center gap-2 text-xs font-semibold text-slate-400 dark:text-slate-500">
          {breadcrumbs.map((crumb, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return (
              <div key={crumb.label + idx} className="flex items-center gap-2">
                {idx > 0 && <ChevronRight className="h-3.5 w-3.5" />}
                {isLast ? (
                  <span className="text-slate-600 dark:text-slate-400" aria-current="page">
                    {crumb.label}
                  </span>
                ) : (
                  <a href={crumb.href} className="hover:text-violet-500 transition">
                    {crumb.label}
                  </a>
                )}
              </div>
            );
          })}
        </nav>
      )}

      {/* 2. Title Block */}
      <header className="mb-10 flex flex-col items-start gap-3">
        <div className="flex items-center gap-3.5">
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            {title}
          </h1>
          {badge && (
            <span className="text-[10px] font-extrabold tracking-wider uppercase px-2.5 py-0.5 rounded-full bg-violet-100 dark:bg-violet-500/15 text-violet-600 dark:text-violet-400 border border-violet-200 dark:border-violet-500/30">
              {badge}
            </span>
          )}
        </div>
        <p className="text-slate-500 dark:text-slate-400 text-sm sm:text-base max-w-3xl leading-relaxed">
          {description}
        </p>
      </header>

      {/* 3. Side-by-Side Image Workspace Grid (12 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Side: Canvas / Uploader Area (8 cols on desktop) */}
        <main className="lg:col-span-8 space-y-6">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            {children}
          </div>

          {/* Ad Placement */}
          <div className="w-full bg-slate-100/50 dark:bg-slate-900/35 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-600 select-none">
            <span className="block mb-1 text-[10px] tracking-widest text-slate-400">SPONSORED PLACEMENT</span>
            AdSense Responsive Placement Container
          </div>
        </main>

        {/* Right Side: Options / Sliders & Guidelines (4 cols on desktop) */}
        <aside className="lg:col-span-4 space-y-6">
          {/* Custom Settings panel placeholder slot */}
          {settingsPanel && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <h2 className="text-base font-bold flex items-center gap-2.5 mb-4 text-slate-800 dark:text-slate-100">
                <SlidersIcon className="h-5 w-5 text-violet-500" /> Tool Configurations
              </h2>
              {settingsPanel}
            </section>
          )}

          {/* Guidelines */}
          {instructions.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <h2 className="text-base font-bold flex items-center gap-2.5 mb-4 text-slate-800 dark:text-slate-100">
                <HelpCircle className="h-5 w-5 text-indigo-500" /> Instructions
              </h2>
              <ol className="space-y-4 text-sm text-slate-500 dark:text-slate-400 list-none pl-0">
                {instructions.map((inst, idx) => (
                  <li key={idx} className="flex gap-3">
                    <span className="font-extrabold text-indigo-500 bg-indigo-500/10 dark:bg-indigo-500/25 h-6 w-6 rounded-full shrink-0 flex items-center justify-center text-xs select-none">
                      {idx + 1}
                    </span>
                    <p className="mt-0.5 leading-relaxed">{inst}</p>
                  </li>
                ))}
              </ol>
            </section>
          )}

          {/* Privacy Security Notice */}
          <section className="bg-emerald-500/5 border border-emerald-500/15 p-6 rounded-3xl">
            <h2 className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Shield className="h-4.5 w-4.5" /> Client-Side Processing
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
              Photos are processed in-memory in your local sandbox browser canvas. Images are not uploaded to servers, protecting data privacy and saving network bandwidth.
            </p>
          </section>

          {/* Category listings sidebar links */}
          {relatedTools.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <h2 className="text-base font-bold flex items-center gap-2.5 mb-4 text-slate-800 dark:text-slate-100">
                <Sparkles className="h-5 w-5 text-violet-500" /> Related Image Tools
              </h2>
              <ul className="space-y-3 pl-0 list-none m-0">
                {relatedTools.map((tool) => (
                  <li key={tool.id}>
                    <a
                      href={tool.href}
                      className="group flex items-center justify-between p-3 rounded-xl border border-slate-100 dark:border-slate-800/80 hover:border-violet-500/30 hover:bg-slate-50 dark:hover:bg-slate-950/50 transition"
                    >
                      <div className="min-w-0">
                        <span className="block font-bold text-xs text-slate-700 dark:text-slate-300 group-hover:text-violet-500 dark:group-hover:text-violet-400 transition truncate">
                          {tool.title}
                        </span>
                        <span className="block text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 truncate">
                          {tool.desc}
                        </span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-slate-400 group-hover:text-violet-500 group-hover:translate-x-1 transition-all shrink-0" />
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* FAQs details boxes */}
          {faqs.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2.5 text-slate-800 dark:text-slate-100 px-1">
                <Zap className="h-5 w-5 text-amber-500" /> FAQs
              </h2>
              <div className="space-y-3.5">
                {faqs.map((faq, idx) => (
                  <details
                    key={idx}
                    className="group bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4.5 cursor-pointer shadow-sm [&_summary::-webkit-details-marker]:hidden"
                  >
                    <summary className="flex items-center justify-between text-sm font-bold text-slate-700 dark:text-slate-200 select-none">
                      <span>{faq.q}</span>
                      <span className="text-slate-400 dark:text-slate-500 transition-transform group-open:rotate-185">
                        ▼
                      </span>
                    </summary>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-3 leading-relaxed border-t border-slate-100 dark:border-slate-800 pt-3 cursor-text">
                      {faq.a}
                    </p>
                  </details>
                ))}
              </div>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

// Icon helper
function SlidersIcon(props) {
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
      <line x1="4" x2="4" y1="21" y2="14" />
      <line x1="4" x2="4" y1="10" y2="3" />
      <line x1="12" x2="12" y1="21" y2="12" />
      <line x1="12" x2="12" y1="8" y2="3" />
      <line x1="20" x2="20" y1="21" y2="16" />
      <line x1="20" x2="20" y1="12" y2="3" />
      <line x1="2" x2="6" y1="14" y2="14" />
      <line x1="10" x2="14" y1="8" y2="8" />
      <line x1="18" x2="22" y1="16" y2="16" />
    </svg>
  );
}
