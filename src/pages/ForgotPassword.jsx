import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Zap, Mail, AlertCircle, CheckCircle2 } from 'lucide-react';
import api from '../utils/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(err.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
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
            Reset your password
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
            We'll email you a link to reset it
          </p>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl shadow-slate-900/5">
          {error && (
            <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-xl px-4 py-3 mb-6">
              <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {sent ? (
            <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-xl px-4 py-3">
              <CheckCircle2 className="h-4 w-4 mt-0.5 flex-shrink-0" />
              <span>If an account exists for that email, a reset link is on its way.</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-2">
                  Email
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 outline-none transition text-sm text-slate-900 dark:text-slate-100"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold text-sm shadow-lg shadow-violet-600/25 transition"
              >
                {submitting ? 'Sending...' : 'Send Reset Link'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-slate-500 dark:text-slate-400 mt-6">
          Remembered it?{' '}
          <Link to="/login" className="font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-400">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
