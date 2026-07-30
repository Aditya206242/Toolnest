import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Users, CreditCard, Wrench, Shield, Search, 
  Download, Edit, Trash2, Plus, 
  RefreshCw, BarChart2, Server, Lock, Settings, CheckCircle, XCircle, AlertTriangle
} from 'lucide-react';
import api from '../utils/api';
import SEO from '../components/SEO';
import { exportToCSV } from '../utils/csvExporter';

const PERMISSIONS_LIST = [
  'pdf_tools',
  'image_tools',
  'image_remove_bg',
  'image_ai_upscale',
  'blog_editor',
  'system_config'
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('overview'); // 'overview', 'users', 'payments', 'tools', 'permissions', 'blogs', 'logs'
  
  // Dashboard Analytics States
  const [overviewData, setOverviewData] = useState(null);
  const [users, setUsers] = useState([]);
  const [payments, setPayments] = useState([]);
  const [tools, setTools] = useState([]);
  const [blogs, setBlogs] = useState([]);
  const [activityLogs, setActivityLogs] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [liveStats, setLiveStats] = useState(null);

  // Filter States
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('');
  const [userVerifiedFilter, setUserVerifiedFilter] = useState('');
  const [userPlanFilter, setUserPlanFilter] = useState('');
  
  const [paymentSearch, setPaymentSearch] = useState('');
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('');
  
  const [logSearch, setLogSearch] = useState('');
  const [logActionFilter, setLogActionFilter] = useState('');

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 1. Fetch Overview Stats
  const fetchOverview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/admin/dashboard/overview');
      setOverviewData(res.data.data);
    } catch (err) {
      setError('Failed to fetch dashboard overview metrics.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // 2. Fetch Users
  const fetchUsers = async () => {
    try {
      const res = await api.get('/admin/dashboard/users', {
        params: { 
          search: userSearch || undefined, 
          role: userRoleFilter || undefined 
        }
      });
      // Apply verification and plan client filters for rich sorting
      let filtered = res.data.data;
      if (userVerifiedFilter !== '') {
        const target = userVerifiedFilter === '1';
        filtered = filtered.filter(u => !!u.is_verified === target);
      }
      if (userPlanFilter !== '') {
        filtered = filtered.filter(u => u.plan_name === userPlanFilter);
      }
      setUsers(filtered);
    } catch (err) {
      console.error('Failed to load users:', err.message);
    }
  };

  // 3. Fetch Payments
  const fetchPayments = async () => {
    try {
      const res = await api.get('/admin/dashboard/payments', {
        params: { search: paymentSearch || undefined }
      });
      let filtered = res.data.data;
      if (paymentStatusFilter !== '') {
        filtered = filtered.filter(p => p.status === paymentStatusFilter);
      }
      setPayments(filtered);
    } catch (err) {
      console.error('Failed to load payments:', err.message);
    }
  };

  // 4. Fetch Tools
  const fetchTools = async () => {
    try {
      const res = await api.get('/admin/dashboard/tools');
      setTools(res.data.data);
    } catch (err) {
      console.error('Failed to load tools:', err.message);
    }
  };

  // 5. Fetch Blogs
  const fetchBlogs = async () => {
    try {
      const res = await api.get('/blog/admin/blogs');
      setBlogs(res.data.data);
    } catch (err) {
      console.error('Failed to load blogs:', err.message);
    }
  };

  // 6. Fetch Logs
  const fetchLogs = async () => {
    try {
      const res = await api.get('/admin/dashboard/logs', {
        params: { search: logSearch || undefined, action: logActionFilter || undefined }
      });
      setActivityLogs(res.data.data);
    } catch (err) {
      console.error('Failed to load activity logs:', err.message);
    }
  };

  // 7. Fetch Permission Matrix
  const fetchPermissions = async () => {
    try {
      const res = await api.get('/admin/dashboard/permissions');
      setPermissions(res.data.data);
    } catch (err) {
      console.error('Failed to load permissions matrix:', err.message);
    }
  };

  // 8. Fetch Live System Stats
  const fetchLiveStats = async () => {
    try {
      const res = await api.get('/admin/dashboard/live-stats');
      setLiveStats(res.data.data);
    } catch (err) {
      console.error('Failed to load live status metrics:', err.message);
    }
  };

  // Fetch corresponding tab data
  useEffect(() => {
    if (activeTab === 'overview') {
      fetchOverview();
    } else if (activeTab === 'users') {
      fetchUsers();
    } else if (activeTab === 'payments') {
      fetchPayments();
    } else if (activeTab === 'tools') {
      fetchTools();
    } else if (activeTab === 'blogs') {
      fetchBlogs();
    } else if (activeTab === 'logs') {
      fetchLogs();
    } else if (activeTab === 'permissions') {
      fetchPermissions();
    }
  }, [
    activeTab, userSearch, userRoleFilter, userVerifiedFilter, userPlanFilter,
    paymentSearch, paymentStatusFilter, logSearch, logActionFilter
  ]);

  // Live Statistics Polling (Triggers every 5 seconds)
  useEffect(() => {
    let intervalId;
    if (activeTab === 'overview') {
      fetchLiveStats();
      intervalId = setInterval(fetchLiveStats, 5000);
    }
    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [activeTab]);

  // Handle Blog Post Deletion
  const handleDeleteBlogPost = async (id, title) => {
    if (window.confirm(`Are you sure you want to permanently delete: "${title}"?`)) {
      try {
        await api.delete(`/blog/admin/blogs/${id}`);
        setBlogs(prev => prev.filter(b => b.id !== id));
      } catch (err) {
        alert('Failed to delete blog post.');
      }
    }
  };

  // Handle User Role Change
  const handleRoleChange = async (userId, newRole) => {
    try {
      await api.put(`/admin/dashboard/users/${userId}/role`, { role: newRole });
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u));
      alert('User role updated successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update user role.');
    }
  };

  // Handle Feature Flag Change (Tool status toggle)
  const handleToolStatusChange = async (toolId, newStatus) => {
    try {
      await api.put(`/admin/dashboard/tools/${toolId}/status`, { status: newStatus });
      setTools(prev => prev.map(t => t.id === toolId ? { ...t, status: newStatus } : t));
      alert('Tool status updated successfully.');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update tool status.');
    }
  };

  // Handle Permission matrix toggle
  const handlePermissionToggle = async (role, permission, isAllowed) => {
    try {
      await api.put('/admin/dashboard/permissions', { role, permission, isAllowed });
      setPermissions(prev => 
        prev.map(p => p.role === role && p.permission === permission ? { ...p, is_allowed: isAllowed ? 1 : 0 } : p)
      );
    } catch (err) {
      alert('Failed to update permission setting.');
    }
  };

  // CSV Exporters
  const triggerUsersCSV = () => {
    exportToCSV(
      users,
      { id: 'User ID', email: 'Email', full_name: 'Name', role: 'Role', plan_name: 'Plan', created_at: 'Registered At' },
      'users_report.csv'
    );
  };

  const triggerPaymentsCSV = () => {
    exportToCSV(
      payments,
      { id: 'Payment ID', transaction_id: 'Txn ID', provider: 'Provider', amount: 'Amount', currency: 'Currency', status: 'Status', user_email: 'User Email', created_at: 'Paid At' },
      'payments_report.csv'
    );
  };

  const triggerLogsCSV = () => {
    exportToCSV(
      activityLogs,
      { id: 'Log ID', action: 'Action', details: 'Details', ip_address: 'IP Address', user_email: 'User Email', created_at: 'Timestamp' },
      'audit_logs.csv'
    );
  };

  // Helper formatting routines
  const formatDateTime = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      dateStyle: 'short',
      timeStyle: 'short'
    });
  };

  const formatUptime = (seconds) => {
    if (!seconds) return '0s';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs}h ${mins}m ${secs}s`;
  };

  // Custom visual SVG Line Chart helper component
  const SVGLineChart = ({ data, dataKey, colorGradStart, colorGradEnd, lineColor, maxValDefault = 100 }) => {
    if (!data || data.length === 0) {
      return (
        <div className="h-40 w-full flex items-center justify-center text-xs text-slate-400 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800">
          No data available for the past 7 days.
        </div>
      );
    }

    const points = data.map(item => parseFloat(item[dataKey] || 0));
    const maxVal = Math.max(...points, maxValDefault);
    const chartHeight = 120;
    const chartWidth = 460;
    const padding = 20;

    const coordinates = data.map((item, index) => {
      const x = padding + (index * (chartWidth - padding * 2)) / (data.length - 1 || 1);
      const val = parseFloat(item[dataKey] || 0);
      const y = chartHeight - padding - (val * (chartHeight - padding * 2)) / maxVal;
      return { x, y, label: item.date, val };
    });

    let linePath = `M ${coordinates[0].x} ${coordinates[0].y}`;
    let fillPath = `M ${coordinates[0].x} ${chartHeight} L ${coordinates[0].x} ${coordinates[0].y}`;

    for (let i = 1; i < coordinates.length; i++) {
      linePath += ` L ${coordinates[i].x} ${coordinates[i].y}`;
      fillPath += ` L ${coordinates[i].x} ${coordinates[i].y}`;
    }

    fillPath += ` L ${coordinates[coordinates.length - 1].x} ${chartHeight} Z`;

    return (
      <div className="w-full">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto overflow-visible">
          <defs>
            <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colorGradStart} stopOpacity="0.3" />
              <stop offset="100%" stopColor={colorGradEnd} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1={padding} y1={chartHeight - padding} x2={chartWidth - padding} y2={chartHeight - padding} stroke="rgba(148, 163, 184, 0.1)" strokeWidth="1" />
          <line x1={padding} y1={padding} x2={chartWidth - padding} y2={padding} stroke="rgba(148, 163, 184, 0.03)" strokeWidth="1" />

          <path d={fillPath} fill={`url(#grad-${dataKey})`} />
          <path d={linePath} fill="none" stroke={lineColor} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />

          {coordinates.map((pt, idx) => (
            <g key={idx} className="group cursor-pointer">
              <circle cx={pt.x} cy={pt.y} r="3" fill="#fff" stroke={lineColor} strokeWidth="1.5" />
              <title>{`${pt.label}: ${pt.val}`}</title>
            </g>
          ))}
        </svg>

        <div className="flex justify-between px-4 text-[8px] font-bold text-slate-400 dark:text-slate-500 mt-2">
          {coordinates.map((pt, idx) => (
            <span key={idx} className="truncate max-w-[50px]">{pt.label.split('-').slice(1).join('/')}</span>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO title="Administrative Control Center" robots="noindex, nofollow" />

      {/* Admin header */}
      <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-5 mb-10 pb-6 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-2.5">
            <Shield className="h-8 w-8 text-violet-500" /> Admin Control Center
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Configure system parameters, manage permissions matrix, analyze metrics, and audit system activities.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/blog/new"
            className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow-md transition"
          >
            <Plus className="h-4 w-4" /> Composer Workspace
          </Link>
          <button
            onClick={() => {
              if (activeTab === 'overview') { fetchOverview(); fetchLiveStats(); }
              else if (activeTab === 'users') fetchUsers();
              else if (activeTab === 'payments') fetchPayments();
              else if (activeTab === 'tools') fetchTools();
              else if (activeTab === 'blogs') fetchBlogs();
              else if (activeTab === 'logs') fetchLogs();
              else if (activeTab === 'permissions') fetchPermissions();
            }}
            className="p-2.5 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition text-slate-550 shrink-0"
            title="Refresh current panel"
          >
            <RefreshCw className="h-4.5 w-4.5" />
          </button>
        </div>
      </header>

      {/* Navigation tabs layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Side Tab items */}
        <aside className="lg:col-span-3 space-y-2">
          {[
            { id: 'overview', label: 'Dashboard Overview', icon: BarChart2 },
            { id: 'users', label: 'Users Management', icon: Users },
            { id: 'payments', label: 'Revenue Dashboard', icon: CreditCard },
            { id: 'tools', label: 'Tools & Feature Flags', icon: Wrench },
            { id: 'permissions', label: 'Permission Matrix', icon: Lock },
            { id: 'blogs', label: 'Blog CMS Editor', icon: Settings },
            { id: 'logs', label: 'Audit Trail Logs', icon: Shield }
          ].map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3.5 py-3 px-4.5 rounded-2xl text-xs font-bold transition-all text-left ${
                  activeTab === tab.id
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-600/15'
                    : 'text-slate-650 dark:text-slate-350 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-955 border border-slate-200 dark:border-slate-800/80'
                }`}
              >
                <Icon className="h-4.5 w-4.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </aside>

        {/* Right Side Tab details */}
        <main className="lg:col-span-9 space-y-6">

          {/* TAB 1: Overview Dashboard */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {loading || !overviewData ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl">
                  <div className="h-8 w-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
                  <span className="text-xs text-slate-400 font-bold mt-2">Loading overview metrics...</span>
                </div>
              ) : (
                <>
                  {/* Stats Row */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
                      <span className="text-[10px] font-black text-slate-450 dark:text-slate-505 uppercase tracking-widest">Total Revenue</span>
                      <span className="block text-2xl font-black text-violet-500 mt-2">₹{overviewData.stats.totalRevenue.toLocaleString()}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
                      <span className="text-[10px] font-black text-slate-450 dark:text-slate-505 uppercase tracking-widest">Total Accounts</span>
                      <span className="block text-2xl font-black text-slate-800 dark:text-slate-100 mt-2">{overviewData.stats.totalUsers}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
                      <span className="text-[10px] font-black text-slate-450 dark:text-slate-505 uppercase tracking-widest">Premium Users</span>
                      <span className="block text-2xl font-black text-indigo-500 mt-2">{overviewData.stats.premiumUsers}</span>
                    </div>
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm">
                      <span className="text-[10px] font-black text-slate-450 dark:text-slate-505 uppercase tracking-widest">Active Plans</span>
                      <span className="block text-2xl font-black text-emerald-500 mt-2">{overviewData.stats.activeSubs}</span>
                    </div>
                  </div>

                  {/* SVG Charts Panels */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                        Daily Tool Usage Requests (Past 7d)
                      </h3>
                      <SVGLineChart 
                        data={overviewData.charts.usageChart} 
                        dataKey="requests"
                        colorGradStart="#8b5cf6"
                        colorGradEnd="#c084fc"
                        lineColor="#7c3aed"
                        maxValDefault={50}
                      />
                    </div>
                    
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                      <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-4">
                        Billing Revenue (Past 7d)
                      </h3>
                      <SVGLineChart 
                        data={overviewData.charts.revenueChart} 
                        dataKey="revenue"
                        colorGradStart="#ec4899"
                        colorGradEnd="#f472b6"
                        lineColor="#db2777"
                        maxValDefault={1000}
                      />
                    </div>
                  </div>

                  {/* Real-time System Statistics Panel */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-3 mb-4">
                      <Server className="h-4 w-4 text-violet-500" />
                      <span>Live Server Statistics (Auto-polls every 5s)</span>
                    </div>

                    {liveStats ? (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 text-xs">
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl">
                          <span className="block font-bold text-slate-450 dark:text-slate-500">System Uptime</span>
                          <span className="block font-black text-slate-800 dark:text-slate-100 text-sm mt-1">{formatUptime(liveStats.serverUptime)}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl">
                          <span className="block font-bold text-slate-450 dark:text-slate-500">CPU Load (1m avg)</span>
                          <span className="block font-black text-slate-800 dark:text-slate-100 text-sm mt-1">{(liveStats.cpuLoad * 100).toFixed(1)}%</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl">
                          <span className="block font-bold text-slate-450 dark:text-slate-500">RAM Heap (Used/Total)</span>
                          <span className="block font-black text-slate-800 dark:text-slate-100 text-sm mt-1">
                            {Math.round(liveStats.memoryUsage.heapUsed / 1024 / 1024)}MB / {Math.round(liveStats.memoryUsage.heapTotal / 1024 / 1024)}MB
                          </span>
                        </div>
                        <div className="bg-slate-50 dark:bg-slate-950 p-4 border border-slate-200/60 dark:border-slate-800/80 rounded-2xl">
                          <span className="block font-bold text-slate-450 dark:text-slate-500">Active DB Connections</span>
                          <span className="block font-black text-slate-800 dark:text-slate-100 text-sm mt-1">{liveStats.database.activeConnections} threads</span>
                        </div>
                      </div>
                    ) : (
                      <p className="text-slate-450 italic text-xs">Waiting for live data metrics stream...</p>
                    )}
                  </div>

                  {/* Recent Activity Timeline */}
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                    <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800 pb-3 mb-5">
                      Recent System Activity Timeline
                    </h3>
                    
                    <div className="space-y-4">
                      {overviewData.timeline && overviewData.timeline.map((item) => (
                        <div key={item.id} className="flex gap-4.5 text-xs">
                          <div className="w-2 h-2 rounded-full bg-violet-600 ring-4 ring-violet-500/10 shrink-0 mt-1.5" />
                          <div className="min-w-0">
                            <span className="font-bold text-slate-800 dark:text-slate-100 block">
                              {item.action.replace(/_/g, ' ')}
                            </span>
                            <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5 leading-relaxed">
                              {item.details}
                            </p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {item.user_name || 'Guest'} ({item.user_email || 'anonymous'}) • {formatDateTime(item.created_at)} • IP: {item.ip_address || 'local'}
                            </span>
                          </div>
                        </div>
                      ))}
                      {overviewData.timeline && overviewData.timeline.length === 0 && (
                        <p className="text-xs text-slate-400 italic">No activity logs recorded.</p>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {/* TAB 2: Users Management */}
          {activeTab === 'users' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-56">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search accounts..."
                      value={userSearch}
                      onChange={(e) => setUserSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none transition"
                    />
                  </div>
                  
                  {/* Role filter */}
                  <select
                    value={userRoleFilter}
                    onChange={(e) => setUserRoleFilter(e.target.value)}
                    className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-650 dark:text-slate-350 outline-none transition"
                  >
                    <option value="">All Roles</option>
                    <option value="user">User Only</option>
                    <option value="premium">Premium Only</option>
                    <option value="admin">Admin Only</option>
                  </select>

                  {/* Verification status filter */}
                  <select
                    value={userVerifiedFilter}
                    onChange={(e) => setUserVerifiedFilter(e.target.value)}
                    className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-650 dark:text-slate-355 outline-none transition"
                  >
                    <option value="">All Verification</option>
                    <option value="1">Verified Accounts</option>
                    <option value="0">Unverified Accounts</option>
                  </select>

                  {/* Plan filter */}
                  <select
                    value={userPlanFilter}
                    onChange={(e) => setUserPlanFilter(e.target.value)}
                    className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-650 dark:text-slate-355 outline-none transition"
                  >
                    <option value="">All Subscription Plans</option>
                    <option value="free">Free Tier</option>
                    <option value="monthly">Monthly Tier</option>
                    <option value="yearly">Yearly Tier</option>
                  </select>
                </div>

                <button
                  onClick={triggerUsersCSV}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:border-violet-500/30 transition text-slate-550 shrink-0"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              </div>

              {/* Users grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 pl-4">Account</th>
                      <th className="p-4">Authorization</th>
                      <th className="p-4">Verification</th>
                      <th className="p-4">Active Plan</th>
                      <th className="p-4">Registered Date</th>
                      <th className="p-4 pr-4 text-right">Role Modifier</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {users.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors">
                        <td className="p-4 pl-4">
                          <span className="block font-bold text-slate-850 dark:text-slate-150">{item.full_name}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5">{item.email}</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            item.role === 'admin'
                              ? 'bg-red-500/10 text-red-500'
                              : item.role === 'premium'
                              ? 'bg-violet-500/10 text-violet-500'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                          }`}>
                            {item.role}
                          </span>
                        </td>
                        <td className="p-4">
                          {item.is_verified ? (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-emerald-500">
                              <CheckCircle className="h-3 w-3" /> VERIFIED
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] font-extrabold text-amber-500">
                              <AlertTriangle className="h-3 w-3" /> PENDING
                            </span>
                          )}
                        </td>
                        <td className="p-4 text-slate-655 dark:text-slate-350">
                          <span className="capitalize">{item.plan_name}</span>
                          {item.subscription_status && (
                            <span className="text-[10px] text-slate-450 ml-1.5 font-medium">({item.subscription_status})</span>
                          )}
                        </td>
                        <td className="p-4 text-slate-400 font-medium">
                          {new Date(item.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}
                        </td>
                        <td className="p-4 pr-4 text-right">
                          <select
                            value={item.role}
                            onChange={(e) => handleRoleChange(item.id, e.target.value)}
                            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg py-1 px-2 text-[10px] font-bold text-slate-600 outline-none transition focus:border-violet-500"
                          >
                            <option value="user">User</option>
                            <option value="premium">Premium</option>
                            <option value="admin">Admin</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {users.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400 italic">
                          No users matched search criteria.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 3: Revenue Dashboard & Payments Audit */}
          {activeTab === 'payments' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search transactions..."
                      value={paymentSearch}
                      onChange={(e) => setPaymentSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none transition"
                    />
                  </div>

                  {/* Status filter */}
                  <select
                    value={paymentStatusFilter}
                    onChange={(e) => setPaymentStatusFilter(e.target.value)}
                    className="py-2 px-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-655 dark:text-slate-350 outline-none transition"
                  >
                    <option value="">All Statuses</option>
                    <option value="succeeded">Succeeded</option>
                    <option value="failed">Failed</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>

                <button
                  onClick={triggerPaymentsCSV}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:border-violet-500/30 transition text-slate-550 shrink-0"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              </div>

              {/* Transactions grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-955 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 pl-4">Transaction ID</th>
                      <th className="p-4">Customer</th>
                      <th className="p-4">Provider</th>
                      <th className="p-4">Amount</th>
                      <th className="p-4">Status</th>
                      <th className="p-4 pr-4">Payment Date</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {payments.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                        <td className="p-4 pl-4 font-mono font-bold text-[10px] text-slate-800 dark:text-slate-100">
                          {item.transaction_id}
                        </td>
                        <td className="p-4">
                          <span className="block font-bold">{item.user_name}</span>
                          <span className="block text-[9px] text-slate-400">{item.user_email}</span>
                        </td>
                        <td className="p-4 capitalize text-slate-655 dark:text-slate-350">
                          {item.provider}
                        </td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                          ₹{item.amount} <span className="text-[9px] font-normal text-slate-400">{item.currency}</span>
                        </td>
                        <td className="p-4">
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            item.status === 'succeeded'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : item.status === 'failed'
                              ? 'bg-red-500/10 text-red-500'
                              : 'bg-amber-500/10 text-amber-500'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 pr-4 text-slate-400 font-medium">
                          {formatDateTime(item.created_at)}
                        </td>
                      </tr>
                    ))}
                    {payments.length === 0 && (
                      <tr>
                        <td colSpan="6" className="p-8 text-center text-slate-400 italic">
                          No transactions recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: Tools & Feature Flags */}
          {activeTab === 'tools' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Feature Flags / Tools Active States
                </h3>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 pl-4">Tool Module</th>
                      <th className="p-4">Category</th>
                      <th className="p-4">Accumulated Usage</th>
                      <th className="p-4">Feature Flag status</th>
                      <th className="p-4 pr-4 text-right">Switch Flag</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {tools.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                        <td className="p-4 pl-4 max-w-[200px]">
                          <span className="block font-bold text-slate-800 dark:text-slate-100">{item.name}</span>
                          <span className="block text-[10px] text-slate-400 mt-0.5 truncate">{item.description}</span>
                        </td>
                        <td className="p-4 capitalize text-slate-500 font-semibold">
                          {item.category}
                        </td>
                        <td className="p-4 font-bold text-slate-800 dark:text-slate-100">
                          {item.usage_count} request logs
                        </td>
                        <td className="p-4">
                          <span className={`inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded-full ${
                            item.status === 'active'
                              ? 'bg-emerald-500/10 text-emerald-500'
                              : item.status === 'beta'
                              ? 'bg-amber-500/10 text-amber-500'
                              : 'bg-red-500/10 text-red-500'
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="p-4 pr-4 text-right">
                          <select
                            value={item.status}
                            onChange={(e) => handleToolStatusChange(item.id, e.target.value)}
                            className="bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-lg py-1 px-2 text-[10px] font-bold text-slate-650 outline-none transition focus:border-violet-500"
                          >
                            <option value="active">Active</option>
                            <option value="beta">Beta (Flag)</option>
                            <option value="inactive">Inactive (Flag)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 5: Permission Matrix Configuration */}
          {activeTab === 'permissions' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              <div className="border-b border-slate-100 dark:border-slate-800 pb-3 flex items-center justify-between">
                <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Role Authorization Permissions Matrix
                </h3>
                <span className="text-[10px] text-amber-500 font-bold bg-amber-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                  <Lock className="h-3 w-3" /> Real-time DB Policy Engine
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 pl-4">System Permission Key</th>
                      <th className="p-4 text-center">User (Free)</th>
                      <th className="p-4 text-center">Premium User</th>
                      <th className="p-4 text-center">Administrator</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {PERMISSIONS_LIST.map((permissionKey) => {
                      const userAllowed = permissions.some(p => p.permission === permissionKey && p.role === 'user' && p.is_allowed);
                      const premiumAllowed = permissions.some(p => p.permission === permissionKey && p.role === 'premium' && p.is_allowed);
                      const adminAllowed = permissions.some(p => p.permission === permissionKey && p.role === 'admin' && p.is_allowed);

                      return (
                        <tr key={permissionKey} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                          <td className="p-4 pl-4">
                            <span className="font-bold text-slate-800 dark:text-slate-100 font-mono text-[11px]">{permissionKey}</span>
                            <span className="block text-[10px] text-slate-400 mt-0.5">Defines authorization limits on {permissionKey.replace(/_/g, ' ')} modules.</span>
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={userAllowed}
                              onChange={(e) => handlePermissionToggle('user', permissionKey, e.target.checked)}
                              className="h-4 w-4 text-violet-600 border-slate-350 rounded focus:ring-violet-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={premiumAllowed}
                              onChange={(e) => handlePermissionToggle('premium', permissionKey, e.target.checked)}
                              className="h-4 w-4 text-violet-600 border-slate-350 rounded focus:ring-violet-500 cursor-pointer"
                            />
                          </td>
                          <td className="p-4 text-center">
                            <input
                              type="checkbox"
                              checked={adminAllowed}
                              disabled
                              className="h-4 w-4 text-slate-300 dark:text-slate-700 bg-slate-100 dark:bg-slate-800 rounded cursor-not-allowed"
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: Blog CMS Editor */}
          {activeTab === 'blogs' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Articles Compiler Manager
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Link
                    to="/admin/categories"
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:border-violet-500/35 transition"
                  >
                    Manage Categories
                  </Link>
                  <Link
                    to="/admin/tags"
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:border-violet-500/35 transition"
                  >
                    Manage Tags
                  </Link>
                  <Link
                    to="/admin/blog/new"
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow transition"
                  >
                    <Plus className="h-4.5 w-4.5" /> Compose New
                  </Link>
                </div>
              </div>

              {/* Blogs Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-955 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 pl-4">Title</th>
                      <th className="p-4">Publishing Status</th>
                      <th className="p-4">Release Date</th>
                      <th className="p-4 pr-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {blogs.map((blog) => {
                      const isFuture = blog.published_at && new Date(blog.published_at) > new Date();
                      return (
                        <tr key={blog.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                          <td className="p-4 pl-4 max-w-[280px]">
                            <Link
                              to={`/blog/${blog.slug}`}
                              className="font-bold text-slate-800 dark:text-slate-100 hover:text-violet-500 transition truncate block"
                              title={blog.title}
                            >
                              {blog.title}
                            </Link>
                            <span className="block text-[9px] text-slate-400 mt-0.5 truncate">
                              By {blog.author_name} • slug: {blog.slug}
                            </span>
                          </td>
                          <td className="p-4">
                            {blog.status === 'draft' ? (
                              <span className="inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700">
                                Draft
                              </span>
                            ) : isFuture ? (
                              <span className="inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 border border-amber-500/25">
                                Scheduled
                              </span>
                            ) : (
                              <span className="inline-block text-[9px] font-extrabold uppercase px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
                                Published
                              </span>
                            )}
                          </td>
                          <td className="p-4 text-slate-400 font-medium">
                            {blog.published_at 
                              ? new Date(blog.published_at).toLocaleString() 
                              : 'Released Instantly'
                            }
                          </td>
                          <td className="p-4 pr-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                to={`/admin/blog/edit/${blog.id}`}
                                className="p-1 rounded bg-slate-100 dark:bg-slate-850 text-slate-500 hover:bg-violet-600 hover:text-white transition"
                                title="Edit Post"
                              >
                                <Edit className="h-3.5 w-3.5" />
                              </Link>
                              <button
                                onClick={() => handleDeleteBlogPost(blog.id, blog.title)}
                                className="p-1 rounded bg-slate-100 dark:bg-slate-855 text-slate-500 hover:bg-red-600 hover:text-white transition"
                                title="Delete Post"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {blogs.length === 0 && (
                      <tr>
                        <td colSpan="4" className="p-8 text-center text-slate-400 italic">
                          No blog posts created yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: Complete Audit Logs */}
          {activeTab === 'logs' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-5">
              
              {/* Toolbar */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                  <div className="relative w-full sm:w-60">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search audit details..."
                      value={logSearch}
                      onChange={(e) => setLogSearch(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-800 dark:text-slate-200 outline-none transition"
                    />
                  </div>
                  
                  <select
                    value={logActionFilter}
                    onChange={(e) => setLogActionFilter(e.target.value)}
                    className="py-2 px-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl text-xs text-slate-650 dark:text-slate-355 outline-none transition"
                  >
                    <option value="">All Actions</option>
                    <option value="USER_ROLE_CHANGE">Role modifications</option>
                    <option value="TOOL_STATUS_CHANGE">Feature flag changes</option>
                    <option value="PERMISSION_CHANGE">Permission matrix alterations</option>
                    <option value="ADMIN_LOGIN">Admin logins</option>
                  </select>
                </div>

                <button
                  onClick={triggerLogsCSV}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 text-xs font-bold px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:border-violet-500/30 transition text-slate-550 shrink-0"
                >
                  <Download className="h-4 w-4" /> Export CSV
                </button>
              </div>

              {/* Logs Grid */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-955 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                      <th className="p-4 pl-4">Timestamp</th>
                      <th className="p-4">Action</th>
                      <th className="p-4">Details</th>
                      <th className="p-4">Operator</th>
                      <th className="p-4 pr-4">Network IP</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                    {activityLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-955/20 transition-colors">
                        <td className="p-4 pl-4 text-slate-400 font-medium whitespace-nowrap">
                          {formatDateTime(log.created_at)}
                        </td>
                        <td className="p-4">
                          <span className="font-bold text-violet-500">
                            {log.action}
                          </span>
                        </td>
                        <td className="p-4 text-slate-655 dark:text-slate-350 max-w-[280px] truncate" title={log.details}>
                          {log.details}
                        </td>
                        <td className="p-4">
                          <span className="block font-bold">{log.user_name || 'Guest'}</span>
                          <span className="block text-[9px] text-slate-400">{log.user_email || 'anonymous'}</span>
                        </td>
                        <td className="p-4 pr-4 font-mono text-[10px] text-slate-400">
                          {log.ip_address || 'local'}
                        </td>
                      </tr>
                    ))}
                    {activityLogs.length === 0 && (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400 italic">
                          No audit logs matched search query.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
