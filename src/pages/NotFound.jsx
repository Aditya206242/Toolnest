import { Link } from 'react-router-dom';
import { ShieldAlert, Home, FileText, ImageIcon, BookOpen } from 'lucide-react';
import SEO from '../components/SEO';

export default function NotFound() {
  return (
    <div className="min-h-[75vh] flex items-center justify-center px-6 text-center">
      <SEO 
        title="404 - Page Not Found"
        description="The requested workspace page could not be found on ToolNest."
        robots="noindex, nofollow" // SPRINT 4.0 SEO rule: do not index 404 pages
      />

      <div className="max-w-xl w-full">
        {/* Animated Icon Container */}
        <div className="relative inline-flex mb-8">
          <div className="absolute inset-0 bg-violet-600/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative bg-violet-600/10 border border-violet-500/20 p-6 rounded-3xl text-violet-500">
            <ShieldAlert className="h-16 w-16" />
          </div>
        </div>

        {/* 404 Copywriting */}
        <span className="block text-violet-500 font-extrabold text-sm tracking-widest uppercase mb-3">
          Error Code 404
        </span>
        <h1 className="text-4xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 mb-4">
          Workspace Not Found
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-base md:text-lg mb-10 max-w-md mx-auto leading-relaxed">
          The pipeline path you requested does not exist or has been shifted. Try searching our visual utilities list below.
        </p>

        {/* Navigation Alternatives (FAQ & Structure redirection) */}
        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto mb-8">
          <Link
            to="/"
            className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 hover:border-violet-500/40 dark:hover:bg-slate-900/60 hover:shadow-lg transition text-left"
          >
            <Home className="h-5 w-5 text-violet-500 shrink-0" />
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Home</span>
              <span className="text-[10px] text-slate-400">Back to dashboard</span>
            </div>
          </Link>

          <Link
            to="/pdf"
            className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 hover:border-violet-500/40 dark:hover:bg-slate-900/60 hover:shadow-lg transition text-left"
          >
            <FileText className="h-5 w-5 text-sky-500 shrink-0" />
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">PDF Tools</span>
              <span className="text-[10px] text-slate-400">Merge, compress, rotate</span>
            </div>
          </Link>

          <Link
            to="/image"
            className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 hover:border-violet-500/40 dark:hover:bg-slate-900/60 hover:shadow-lg transition text-left"
          >
            <ImageIcon className="h-5 w-5 text-amber-500 shrink-0" />
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Image Tools</span>
              <span className="text-[10px] text-slate-400">Resize, convert, strip EXIF</span>
            </div>
          </Link>

          <Link
            to="/blog"
            className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-slate-900 hover:border-violet-500/40 dark:hover:bg-slate-900/60 hover:shadow-lg transition text-left"
          >
            <BookOpen className="h-5 w-5 text-emerald-500 shrink-0" />
            <div>
              <span className="block text-xs font-bold text-slate-800 dark:text-slate-200">Blog CMS</span>
              <span className="text-[10px] text-slate-400">Read guides & updates</span>
            </div>
          </Link>
        </div>

        <Link
          to="/"
          className="inline-flex items-center justify-center font-bold text-sm px-6 py-3 rounded-2xl bg-violet-600 hover:bg-violet-750 text-white shadow-lg shadow-violet-600/25 transition"
        >
          Return to Dashboard
        </Link>
      </div>
    </div>
  );
}
