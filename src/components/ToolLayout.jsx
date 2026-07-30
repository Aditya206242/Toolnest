import { HelpCircle, Shield, Sparkles, ChevronRight, Zap } from 'lucide-react';

export default function ToolLayout({
  title,
  description,
  badge = '',
  breadcrumbs = [],
  instructions = [],
  faqs = [],
  relatedTools = [],
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

      {/* 2. Tool Title Block */}
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

      {/* 3. Main Tool Workspace & Sidebar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Section: Active Workspace slot */}
        <main className="lg:col-span-8 space-y-8">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
            {children}
          </div>

          {/* AdSense Top Banner Placement */}
          <div className="w-full bg-slate-100/50 dark:bg-slate-900/35 border border-dashed border-slate-200 dark:border-slate-800/80 rounded-2xl p-6 text-center text-xs font-semibold text-slate-400 dark:text-slate-600 select-none">
            <span className="block mb-1 text-[10px] tracking-widest text-slate-400">SPONSORED PLACEMENT</span>
            AdSense Responsive Placement Container
          </div>
        </main>

        {/* Right Section: Instructions / Ads / FAQs / Sidebar Related Tools */}
        <aside className="lg:col-span-4 space-y-8">
          {/* Instructions Panel */}
          {instructions.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <h2 className="text-base font-bold flex items-center gap-2.5 mb-4 text-slate-800 dark:text-slate-100">
                <HelpCircle className="h-5 w-5 text-indigo-500" /> How to use this tool
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

          {/* Security Integrity Card */}
          <section className="bg-emerald-500/5 border border-emerald-500/15 p-6 rounded-3xl">
            <h2 className="text-sm font-bold flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
              <Shield className="h-4.5 w-4.5" /> Privacy & Data Protection
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-2.5 leading-relaxed">
              We utilize a client-side execution model. Files are loaded and modified inside your browser memory cache, meaning your document metrics and contents never reach our remote servers.
            </p>
          </section>

          {/* Related Tools Sidebar Grid */}
          {relatedTools.length > 0 && (
            <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
              <h2 className="text-base font-bold flex items-center gap-2.5 mb-4 text-slate-800 dark:text-slate-100">
                <Sparkles className="h-5 w-5 text-violet-500" /> Related Utility Tools
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

          {/* FAQs Container */}
          {faqs.length > 0 && (
            <section className="space-y-4">
              <h2 className="text-base font-bold flex items-center gap-2.5 text-slate-800 dark:text-slate-100 px-1">
                <Zap className="h-5 w-5 text-amber-500" /> Frequently Asked Questions
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
