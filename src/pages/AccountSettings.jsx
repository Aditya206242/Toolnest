import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api, { setAccessToken } from '../utils/api';
import { User, Lock, Mail, Shield, CheckCircle, AlertCircle, Save, KeyRound } from 'lucide-react';
import SEO from '../components/SEO';

export default function AccountSettings() {
  const { user, refreshUser } = useAuth();
  const [fullName, setFullName] = useState(user?.fullName || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (password && password.length < 6) {
      setError('Password must be at least 6 characters long.');
      setLoading(false);
      return;
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match.');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/update-profile', {
        fullName,
        password: password || undefined,
      });

      if (response.data.status === 'success') {
        if (response.data.accessToken) {
          setAccessToken(response.data.accessToken);
        }
        await refreshUser();
        setSuccess('Profile updated successfully!');
        setPassword('');
        setConfirmPassword('');
      } else {
        setError(response.data.message || 'Failed to update profile.');
      }
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || 'An error occurred while updating profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto py-10 px-4">
      <SEO title="Account Settings - ToolNest" description="Manage your ToolNest account settings, profile information, and password." />
      
      <div className="mb-8">
        <h1 className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
          Account Settings
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-2">
          Manage your public profile, security options, and account preferences.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column - Profile Summary Card */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
            <div className="flex flex-col items-center text-center">
              <div className="relative group">
                <div className="h-24 w-24 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center text-white text-3xl font-black shadow-lg border-4 border-white dark:border-slate-800">
                  {fullName ? fullName.charAt(0).toUpperCase() : user?.email.charAt(0).toUpperCase()}
                </div>
              </div>

              <h2 className="mt-4 font-bold text-lg text-slate-800 dark:text-slate-100">{user?.fullName || 'User'}</h2>
              <span className="text-xs bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider mt-1.5 animate-pulse">
                {user?.role}
              </span>

              <div className="w-full border-t border-slate-100 dark:border-slate-800 my-5" />

              <div className="w-full space-y-3.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-400">
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-slate-400" />
                  <span className="truncate">{user?.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Shield className="h-4 w-4 text-slate-400" />
                  <span className="capitalize">Role: {user?.role}</span>
                </div>
                <div className="flex items-center gap-2">
                  {user?.isVerified ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-emerald-500" />
                      <span className="text-emerald-500 font-bold">Email Verified</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-4 w-4 text-amber-500" />
                      <span className="text-amber-500 font-bold">Verification Pending</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column - Forms */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/50 p-6 shadow-sm backdrop-blur-sm">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-6 flex items-center gap-2">
              <User className="h-5 w-5 text-violet-500" />
              Profile Details
            </h3>

            {success && (
              <div className="mb-6 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center gap-3 text-sm font-semibold">
                <CheckCircle className="h-5 w-5 shrink-0" />
                <span>{success}</span>
              </div>
            )}

            {error && (
              <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-3 text-sm font-semibold">
                <AlertCircle className="h-5 w-5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleUpdateProfile} className="space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Email Address (Non-editable)
                </label>
                <div className="flex rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-4 py-3 text-sm text-slate-400 select-none">
                  {user?.email}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-3 pl-12 pr-4 text-sm focus:border-violet-500 focus:outline-none dark:text-slate-100"
                  />
                </div>
              </div>

              <div className="border-t border-slate-100 dark:border-slate-800 my-6" />

              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-violet-500" />
                Change Password
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                Leave these blank if you do not want to change your password.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-3 pl-12 pr-4 text-sm focus:border-violet-500 focus:outline-none dark:text-slate-100"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-3.5 h-5 w-5 text-slate-400" />
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-transparent py-3 pl-12 pr-4 text-sm focus:border-violet-500 focus:outline-none dark:text-slate-100"
                    />
                  </div>
                </div>
              </div>

              <div className="mt-8 flex justify-end">
                <button
                  type="submit"
                  disabled={loading}
                  className="inline-flex items-center gap-2 font-bold text-sm px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-750 text-white shadow-lg shadow-violet-600/25 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  {loading ? 'Saving Changes...' : 'Save Settings'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
