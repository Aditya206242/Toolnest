import { useState, useEffect, useRef, lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Zap, Moon, Sun, ExternalLink, User, LogOut, LayoutDashboard, BookOpen, Settings, Users, PenLine, Workflow, Crown } from 'lucide-react';
import ProtectedRoute from './components/ProtectedRoute';

// Lazy load pages
const Home = lazy(() => import('./pages/Home'));
const PdfCategory = lazy(() => import('./pages/PdfCategory'));
const ImageCategory = lazy(() => import('./pages/ImageCategory'));
const BlogList = lazy(() => import('./pages/BlogList'));
const BlogDetail = lazy(() => import('./pages/BlogDetail'));
const Login = lazy(() => import('./pages/Login'));
const Signup = lazy(() => import('./pages/Signup'));
const ForgotPassword = lazy(() => import('./pages/ForgotPassword'));
const ResetPassword = lazy(() => import('./pages/ResetPassword'));
const VerifyEmail = lazy(() => import('./pages/VerifyEmail'));
const NotFound = lazy(() => import('./pages/NotFound'));
const Pricing = lazy(() => import('./pages/Pricing'));
const Billing = lazy(() => import('./pages/Billing'));
const AccountSettings = lazy(() => import('./pages/AccountSettings'));
const TeamSettings = lazy(() => import('./pages/TeamSettings'));
const Signatures = lazy(() => import('./pages/Signatures'));
const Workflows = lazy(() => import('./pages/Workflows'));

// Admin CMS pages
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const BlogEditor = lazy(() => import('./pages/BlogEditor'));
const AdminCategories = lazy(() => import('./pages/AdminCategories'));
const AdminTags = lazy(() => import('./pages/AdminTags'));

function AppContent() {
  const [darkMode, setDarkMode] = useState(true);
  const { user, logout, isAuthenticated, isAdmin } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <Router>
      <div className={darkMode ? 'dark min-h-screen bg-slate-950 text-slate-100 transition-colors duration-300' : 'min-h-screen bg-slate-50 text-slate-800 transition-colors duration-300'}>
        
        {/* Shared Navigation Header */}
        <nav className="sticky top-0 z-50 backdrop-blur-md bg-white/70 dark:bg-slate-950/70 border-b border-slate-200 dark:border-slate-800 px-6 py-4 transition-colors">
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3">
              <div className="bg-gradient-to-tr from-violet-600 to-indigo-600 p-2.5 rounded-xl shadow-lg shadow-indigo-500/20">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <div>
                <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-violet-600 via-indigo-500 to-sky-500 bg-clip-text text-transparent">
                  ToolNest
                </span>
                <span className="hidden sm:inline-block text-[9px] bg-slate-100 dark:bg-slate-855 border border-slate-250/20 dark:border-slate-750 font-black text-slate-500 px-2 py-0.5 rounded-full uppercase tracking-wider ml-2.5">Beta</span>
              </div>
            </Link>

            <div className="hidden md:flex items-center gap-8 font-medium text-sm text-slate-600 dark:text-slate-300">
              <Link to="/" className="hover:text-violet-600 dark:hover:text-violet-400 transition">Home</Link>
              <Link to="/pdf" className="hover:text-violet-600 dark:hover:text-violet-400 transition">PDF Tools</Link>
              <Link to="/image" className="hover:text-violet-600 dark:hover:text-violet-400 transition">Image Tools</Link>
              <Link to="/blog" className="hover:text-violet-600 dark:hover:text-violet-400 transition">Blog</Link>
              <Link to="/pricing" className="hover:text-violet-600 dark:hover:text-violet-400 transition">Pricing</Link>
              {isAuthenticated && (
                <Link to="/billing" className="hover:text-violet-600 dark:hover:text-violet-400 transition">Billing</Link>
              )}
              {isAdmin && (
                <Link to="/admin/dashboard" className="flex items-center gap-1.5 text-violet-500 font-bold hover:text-violet-600 transition">
                  <LayoutDashboard className="h-4 w-4" /> Admin Console
                </Link>
              )}
            </div>

            <div className="flex items-center gap-4">
              <button 
                onClick={() => setDarkMode(!darkMode)} 
                className="p-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition text-slate-500 dark:text-slate-400"
                aria-label="Toggle Dark/Light Mode"
              >
                {darkMode ? <Sun className="h-5 w-5 text-amber-500" /> : <Moon className="h-5 w-5 text-slate-500" />}
              </button>

              {/* Dynamic Authentication Header Control */}
              {isAuthenticated ? (
                <div className="relative" ref={dropdownRef}>
                  <button 
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 focus:outline-none"
                    aria-label="User Menu"
                  >
                    <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-sm shadow-md hover:scale-105 active:scale-95 transition cursor-pointer select-none border-2 border-white dark:border-slate-800">
                      {user.fullName ? user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : user.email.slice(0, 2).toUpperCase()}
                    </div>
                  </button>

                  {/* Dropdown Menu */}
                  {dropdownOpen && (
                    <div className="absolute right-0 mt-3 w-64 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800/80 shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-3 duration-200">
                      
                      {/* User Info Header */}
                      <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center justify-center h-11 w-11 rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 font-extrabold text-base border border-violet-500/20">
                          {user.fullName ? user.fullName.charAt(0).toUpperCase() : user.email.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0">
                          <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
                            {user.fullName || 'User'}
                          </span>
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {user.email}
                          </span>
                        </div>
                      </div>

                      {/* Menu Links */}
                      <div className="p-1.5 space-y-0.5">
                        <Link 
                          to="/account/settings" 
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-violet-600 dark:hover:text-violet-400 transition"
                        >
                          <Settings className="h-4 w-4" />
                          Account settings
                        </Link>
                        <Link 
                          to="/team" 
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-violet-600 dark:hover:text-violet-400 transition"
                        >
                          <Users className="h-4 w-4" />
                          Team
                        </Link>
                        <Link 
                          to="/signatures" 
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-violet-600 dark:hover:text-violet-400 transition"
                        >
                          <PenLine className="h-4 w-4" />
                          Signatures
                        </Link>
                        <Link 
                          to="/workflows" 
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-850 hover:text-violet-600 dark:hover:text-violet-400 transition"
                        >
                          <Workflow className="h-4 w-4" />
                          Workflows
                        </Link>
                        <Link 
                          to="/pricing" 
                          onClick={() => setDropdownOpen(false)}
                          className="flex items-center justify-between px-3 py-2.5 text-xs font-bold rounded-xl text-amber-600 dark:text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-500/10 transition group"
                        >
                          <div className="flex items-center gap-2.5">
                            <Crown className="h-4 w-4 text-amber-500 fill-amber-500/20 group-hover:scale-110 transition duration-300" />
                            <span>Upgrade to Premium</span>
                          </div>
                          <span className="text-[9px] bg-amber-500 text-white px-1.5 py-0.5 rounded-md font-black uppercase tracking-wider scale-90">PRO</span>
                        </Link>
                      </div>

                      <hr className="border-slate-100 dark:border-slate-800 my-1" />

                      {/* Log Out */}
                      <div className="p-1.5">
                        <button 
                          onClick={() => {
                            setDropdownOpen(false);
                            logout();
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-xl text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition"
                        >
                          <LogOut className="h-4 w-4" />
                          Log out
                        </button>
                      </div>

                    </div>
                  )}
                </div>
              ) : (
                <Link 
                  to="/login"
                  className="sm:inline-flex items-center justify-center font-semibold text-sm px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-750 text-white shadow-lg shadow-violet-600/25 transition"
                >
                  Sign In
                </Link>
              )}
            </div>
          </div>
        </nav>

        {/* Route views mappings */}
        <main className="max-w-7xl mx-auto px-6 py-8">
          <Suspense fallback={
            <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
              <div className="h-10 w-10 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
              <span className="text-xs font-bold text-slate-400 dark:text-slate-500 animate-pulse">Loading ToolNest Workspaces...</span>
            </div>
          }>
            <Routes>
              {/* Public routes */}
              <Route path="/" element={<Home />} />
              <Route path="/pdf" element={<PdfCategory />} />
              <Route path="/pdf/:toolId" element={<PdfCategory />} />
              <Route path="/image" element={<ImageCategory />} />
              <Route path="/image/:toolId" element={<ImageCategory />} />
              
              {/* Auth endpoints */}
              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/verify-email/:token" element={<VerifyEmail />} />
              
              {/* Blog Public pages */}
              <Route path="/blog" element={<BlogList />} />
              <Route path="/blog/:slug" element={<BlogDetail />} />

              {/* Pricing & Billing Plans */}
              <Route path="/pricing" element={<Pricing />} />
              <Route 
                path="/billing" 
                element={
                  <ProtectedRoute allowedRoles={['user', 'premium', 'admin']}>
                    <Billing />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/account/settings" 
                element={
                  <ProtectedRoute allowedRoles={['user', 'premium', 'admin']}>
                    <AccountSettings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/team" 
                element={
                  <ProtectedRoute allowedRoles={['user', 'premium', 'admin']}>
                    <TeamSettings />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/signatures" 
                element={
                  <ProtectedRoute allowedRoles={['user', 'premium', 'admin']}>
                    <Signatures />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/workflows" 
                element={
                  <ProtectedRoute allowedRoles={['user', 'premium', 'admin']}>
                    <Workflows />
                  </ProtectedRoute>
                } 
              />

              {/* Guarded Admin CMS paths */}
              <Route 
                path="/admin/dashboard" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/blog" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminDashboard />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/blog/new" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <BlogEditor />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/blog/edit/:id" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <BlogEditor />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/categories" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminCategories />
                  </ProtectedRoute>
                } 
              />
              <Route 
                path="/admin/tags" 
                element={
                  <ProtectedRoute allowedRoles={['admin']}>
                    <AdminTags />
                  </ProtectedRoute>
                } 
              />

              {/* 404 Fallback page with proper robots and seo */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </Suspense>
        </main>

        {/* Shared Footer */}
        <footer className="border-t border-slate-200 dark:border-slate-800 py-10 px-6 bg-slate-100 dark:bg-slate-950 text-slate-500 text-sm mt-12">
          <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="bg-slate-200 dark:bg-slate-800 p-1.5 rounded-lg">
                <Zap className="h-5 w-5 text-indigo-500" />
              </div>
              <span className="font-extrabold text-slate-800 dark:text-slate-200 tracking-tight">ToolNest</span>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 text-xs">
              <a href="#terms" className="hover:text-slate-800 dark:hover:text-slate-200">Privacy Policy</a>
              <a href="#terms" className="hover:text-slate-800 dark:hover:text-slate-200">Terms of Use</a>
              <a href="/sitemap.xml" className="hover:text-slate-800 dark:hover:text-slate-200">Sitemap</a>
              <a href="/robots.txt" className="hover:text-slate-800 dark:hover:text-slate-200">Robots</a>
              <a href="#contact" className="hover:text-slate-800 dark:hover:text-slate-200">Contact Partner</a>
            </div>

            <p className="text-xs text-center md:text-right">
              © {new Date().getFullYear()} ToolNest Inc. Built for zero-latency execution.
            </p>
          </div>
        </footer>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
