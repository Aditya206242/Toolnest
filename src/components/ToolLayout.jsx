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
      <main className="max-w-4xl mx-auto space-y-8">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm">
          {children}
        </div>

        {/* 4. Instructions (Clean & Flat grid below) */}
        {instructions.length > 0 && (
          <section className="pt-8 border-t border-slate-200 dark:border-slate-800/80">
            <h2 className="text-sm font-black flex items-center gap-2 mb-4 text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              <HelpCircle className="h-4.5 w-4.5 text-violet-500" /> How to use this tool
            </h2>
            <ol className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs text-slate-500 dark:text-slate-400">
              {instructions.map((inst, idx) => (
                <li key={idx} className="flex gap-3">
                  <span className="font-extrabold text-violet-500 bg-violet-500/10 dark:bg-violet-500/25 h-5 w-5 rounded-full shrink-0 flex items-center justify-center text-[10px] select-none">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{inst}</p>
                </li>
              ))}
            </ol>
          </section>
        )}
      </main>
    </div>
  );
}
