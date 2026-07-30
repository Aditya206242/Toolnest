import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Zap, Mail, Lock, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname || '/';

  const [form, setForm] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [lockoutTimeLeft, setLockoutTimeLeft] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (lockoutTimeLeft <= 0) return;

    const timer = setInterval(() => {
      setLockoutTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setError(''); // clear lockout error
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [lockoutTimeLeft]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    const result = await login(form.email, form.password);

    setSubmitting(false);

    if (result.success) {
      navigate(from, { replace: true });
    } else {
      setError(result.message);
      if (result.resetTime) {
        const secondsLeft = Math.max(0, Math.ceil((result.resetTime - Date.now()) / 1000));
        setLockoutTimeLeft(secondsLeft);
      } else {
        setLockoutTimeLeft(0);
      }
    }
  };

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center gap-3 mb-6">
            <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
              <Zap className="h-7 w-7 text-white" />
            </div>
          </Link>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Welcome back
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            Sign in to continue to your ToolNest workspace
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl shadow-slate-900/5">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl px-4 py-3 mb-6">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>
                {lockoutTimeLeft > 0 
                  ? `Too many authentication attempts. Please try again in ${formatTime(lockoutTimeLeft)}.`
                  : error}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="email"
                  name="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition text-sm text-slate-900 dark:text-slate-100"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  Password
                </label>
                <Link to="/forgot-password" className="text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
                  Forgot?
                </Link>
              </div>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  required
                  value={form.password}
                  onChange={handleChange}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-11 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition text-sm text-slate-900 dark:text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-violet-600/25 transition"
            >
              {submitting ? 'Signing in...' : 'Sign In'}
            </button>

            {/* Developer Quick-Login Shortcut */}
            <button
              type="button"
              onClick={async () => {
                setForm({ email: 'admin@toolnest.com', password: 'admin123' });
                setError('');
                setSubmitting(true);
                const result = await login('admin@toolnest.com', 'admin123');
                setSubmitting(false);
                if (result.success) {
                  navigate(from, { replace: true });
                } else {
                  setError(result.message);
                  if (result.resetTime) {
                    const secondsLeft = Math.max(0, Math.ceil((result.resetTime - Date.now()) / 1000));
                    setLockoutTimeLeft(secondsLeft);
                  } else {
                    setLockoutTimeLeft(0);
                  }
                }
              }}
              className="w-full mt-3 py-3 rounded-xl border border-violet-500/30 hover:border-violet-500 hover:bg-violet-500/5 text-violet-500 font-bold text-xs transition"
            >
              🔑 Developer Shortcut: Login as Admin
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Don't have an account?{' '}
          <Link to="/signup" className="font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
            Sign up for free
          </Link>
        </p>
      </div>
    </div>
  );
}
