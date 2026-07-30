import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Zap, ShieldAlert } from 'lucide-react';

export default function ProtectedRoute({ children, allowedRoles = [], requiresPremium = false }) {
  const { user, loading, isAuthenticated, isPremium } = useAuth();
  const location = useLocation();

  // Loading indicator for token silent-refresh on page initialization
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center">
        <div className="relative">
          <div className="h-16 w-16 rounded-full border-4 border-slate-800 border-t-indigo-600 animate-spin"></div>
          <Zap className="h-6 w-6 text-indigo-500 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse" />
        </div>
        <p className="text-slate-400 text-sm mt-4 tracking-wide font-medium">Securing session...</p>
      </div>
    );
  }

  // Not authenticated: redirect to login and preserve intended URL
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Role authorization guard
  if (allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20 mb-6 text-red-500">
          <ShieldAlert className="h-10 w-10" />
        </div>
        <h1 className="text-2xl font-black text-slate-100">Access Denied</h1>
        <p className="text-slate-400 text-sm max-w-sm mt-2 leading-relaxed">
          You do not have the required administrative permissions to access this control panel.
        </p>
        <a 
          href="/" 
          className="mt-6 px-5 py-2.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-sm font-semibold transition"
        >
          Return Home
        </a>
      </div>
    );
  }

  // Premium feature guard: display conversion screen instead of redirecting
  if (requiresPremium && !isPremium) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center max-w-lg mx-auto">
        <div className="bg-violet-600/10 p-5 rounded-3xl border border-violet-500/20 mb-6 text-violet-500 animate-bounce">
          <Zap className="h-12 w-12 fill-current" />
        </div>
        <h2 className="text-3xl font-black tracking-tight text-slate-100">Premium Tool Locked</h2>
        <p className="text-slate-400 text-sm mt-3 leading-relaxed">
          This operation utilizes high-performance advanced execution pipelines. Upgrade your plan to get unlimited, advertisement-free access.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row gap-4 w-full justify-center">
          <button className="px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-lg shadow-violet-600/25 transition">
            Upgrade to Premium for ₹199/mo
          </button>
          <a 
            href="/" 
            className="px-6 py-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 text-sm text-slate-300 font-semibold transition flex items-center justify-center"
          >
            Explore Free Tools
          </a>
        </div>
      </div>
    );
  }

  return children;
}
