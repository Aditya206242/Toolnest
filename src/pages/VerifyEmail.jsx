import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Zap, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import api from '../utils/api';

export default function VerifyEmail() {
  const { token } = useParams();
  const [status, setStatus] = useState('loading'); // loading | success | error
  const [message, setMessage] = useState('');

  useEffect(() => {
    let active = true;

    const verify = async () => {
      try {
        const response = await api.get(`/auth/verify-email/${token}`);
        if (active) {
          setStatus('success');
          setMessage(response.data.message || 'Your email has been verified.');
        }
      } catch (err) {
        if (active) {
          setStatus('error');
          setMessage(err.response?.data?.message || 'This verification link is invalid or has expired.');
        }
      }
    };

    verify();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <div className="w-full max-w-md text-center">
        <Link to="/" className="inline-flex items-center gap-3 mb-6">
          <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-500/20">
            <Zap className="h-7 w-7 text-white" />
          </div>
        </Link>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 shadow-xl shadow-slate-900/5">
          {status === 'loading' && (
            <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
              <p className="text-sm font-medium">Verifying your email...</p>
            </div>
          )}

          {status === 'success' && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-emerald-500/10 p-4 rounded-full border border-emerald-500/20 text-emerald-500">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Email Verified</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
              <Link
                to="/login"
                className="mt-3 px-6 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm shadow-lg shadow-violet-600/25 transition"
              >
                Sign In
              </Link>
            </div>
          )}

          {status === 'error' && (
            <div className="flex flex-col items-center gap-3">
              <div className="bg-red-500/10 p-4 rounded-full border border-red-500/20 text-red-500">
                <AlertCircle className="h-8 w-8" />
              </div>
              <h2 className="text-xl font-black text-slate-900 dark:text-slate-100">Verification Failed</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">{message}</p>
              <Link
                to="/"
                className="mt-3 px-6 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 font-semibold text-sm transition"
              >
                Return Home
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
