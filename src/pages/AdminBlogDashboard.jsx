import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, Edit, Trash2, FolderPlus, Tag as TagIcon, 
  Calendar, BookOpen, AlertCircle, FileText, CheckCircle, Clock 
} from 'lucide-react';
import api from '../utils/api';
import SEO from '../components/SEO';

export default function AdminBlogDashboard() {
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch blogs on dashboard load
  const fetchBlogs = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/blog/admin/blogs');
      setBlogs(response.data.data);
    } catch (err) {
      setError('Failed to fetch administrative blog items.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBlogs();
  }, []);

  const handleDelete = async (id, title) => {
    if (window.confirm(`Are you sure you want to permanently delete: "${title}"?`)) {
      try {
        await api.delete(`/blog/admin/blogs/${id}`);
        setBlogs(prev => prev.filter(blog => blog.id !== id));
      } catch (err) {
        alert(err.response?.data?.message || 'Failed to delete blog post.');
      }
    }
  };

  // Compute status metrics
  const totalPosts = blogs.length;
  const publishedCount = blogs.filter(b => b.status === 'published' && (!b.published_at || new Date(b.published_at) <= new Date())).length;
  const scheduledCount = blogs.filter(b => b.status === 'published' && b.published_at && new Date(b.published_at) > new Date()).length;
  const draftCount = blogs.filter(b => b.status === 'draft').length;

  const getStatusBadge = (blog) => {
    const isFuture = blog.published_at && new Date(blog.published_at) > new Date();
    if (blog.status === 'draft') {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-550 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50">
          <FileText className="h-2.5 w-2.5" /> Draft
        </span>
      );
    }
    if (isFuture) {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/25">
          <Clock className="h-2.5 w-2.5 animate-pulse" /> Scheduled
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-500 border border-emerald-500/25">
        <CheckCircle className="h-2.5 w-2.5" /> Published
      </span>
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO title="Admin CMS Dashboard" robots="noindex, nofollow" />

      {/* Title & Action Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-10 pb-6 border-b border-slate-200 dark:border-slate-800/80">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-slate-100">
            Blog CMS Dashboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
            Manage your articles, schedules, tags, and categories.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/categories"
            className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:border-violet-500/30 transition"
          >
            <FolderPlus className="h-4 w-4 text-sky-500" /> Manage Categories
          </Link>
          <Link
            to="/admin/tags"
            className="inline-flex items-center gap-2 text-xs font-bold px-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 hover:border-violet-500/30 transition"
          >
            <TagIcon className="h-4 w-4 text-emerald-500" /> Manage Tags
          </Link>
          <Link
            to="/admin/blog/new"
            className="inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 bg-violet-600 hover:bg-violet-755 text-white rounded-xl shadow-lg shadow-violet-600/20 transition"
          >
            <Plus className="h-4 w-4" /> Create Article
          </Link>
        </div>
      </header>

      {/* Metrics Grid */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Total Articles
          </span>
          <span className="block text-3xl font-black text-slate-800 dark:text-slate-100 mt-2">
            {totalPosts}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Published
          </span>
          <span className="block text-3xl font-black text-emerald-500 mt-2">
            {publishedCount}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Scheduled
          </span>
          <span className="block text-3xl font-black text-amber-500 mt-2">
            {scheduledCount}
          </span>
        </div>
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-3xl shadow-sm flex flex-col justify-between">
          <span className="block text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500">
            Drafts
          </span>
          <span className="block text-3xl font-black text-slate-500 mt-2">
            {draftCount}
          </span>
        </div>
      </section>

      {/* Main Table List */}
      <main className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
        
        {loading ? (
          <div className="flex flex-col items-center justify-center p-20 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
            <span className="text-xs text-slate-400 font-bold">Loading dashboard logs...</span>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-red-500 text-sm">
            {error}
          </div>
        ) : blogs.length === 0 ? (
          <div className="text-center py-20 px-4">
            <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-550 mb-4">
              <BookOpen className="h-8 w-8" />
            </div>
            <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">No Articles Found</h3>
            <p className="text-slate-400 text-xs mt-1.5 mb-6">
              Create your very first blog post to kick off the CMS workflow.
            </p>
            <Link
              to="/admin/blog/new"
              className="inline-flex items-center gap-1.5 text-xs font-bold px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow transition"
            >
              <Plus className="h-4 w-4" /> Create First Article
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500 border-b border-slate-200 dark:border-slate-800">
                  <th className="p-4 pl-6">Article</th>
                  <th className="p-4">Status</th>
                  <th className="p-4">Taxonomy</th>
                  <th className="p-4">Publish Date</th>
                  <th className="p-4 pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                {blogs.map((blog) => (
                  <tr 
                    key={blog.id}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-colors"
                  >
                    {/* Post Banner / Title */}
                    <td className="p-4 pl-6 max-w-[280px]">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 shrink-0 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                          {blog.featured_image ? (
                            <img
                              src={blog.featured_image}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-slate-400">
                              N/A
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <Link 
                            to={`/blog/${blog.slug}`}
                            className="block font-bold text-slate-800 dark:text-slate-150 hover:text-violet-500 dark:hover:text-violet-400 truncate"
                            title={blog.title}
                          >
                            {blog.title}
                          </Link>
                          <span className="block text-[10px] text-slate-400 mt-0.5 truncate">
                            By {blog.author_name} • slug: {blog.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td className="p-4">
                      {getStatusBadge(blog)}
                    </td>

                    {/* Categories and Tags */}
                    <td className="p-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {blog.categories && blog.categories.map(c => (
                          <span 
                            key={c.id}
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-violet-500/10 text-violet-500 border border-violet-500/10"
                          >
                            {c.name}
                          </span>
                        ))}
                        {blog.tags && blog.tags.map(t => (
                          <span 
                            key={t.id}
                            className="text-[9px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400"
                          >
                            #{t.name}
                          </span>
                        ))}
                      </div>
                    </td>

                    {/* Publish / Creation Date */}
                    <td className="p-4 text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5" />
                        {blog.published_at 
                          ? new Date(blog.published_at).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) 
                          : 'Not set'
                        }
                      </span>
                    </td>

                    {/* Operation Action Triggers */}
                    <td className="p-4 pr-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Link
                          to={`/admin/blog/edit/${blog.id}`}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:border-violet-500 hover:text-violet-500 transition"
                          title="Edit Post"
                        >
                          <Edit className="h-4 w-4" />
                        </Link>
                        <button
                          onClick={() => handleDelete(blog.id, blog.title)}
                          className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-500 hover:bg-red-500/10 hover:border-red-550 hover:text-red-500 transition"
                          title="Delete Post"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  );
}
