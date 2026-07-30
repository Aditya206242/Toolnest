import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Plus, Edit, Trash2, AlertCircle, Save } from 'lucide-react';
import api from '../utils/api';
import SEO from '../components/SEO';

export default function AdminTags() {
  const [tags, setTags] = useState([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState(null);
  const [editName, setEditName] = useState('');

  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchTags = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/blog/tags');
      setTags(response.data.data);
    } catch (err) {
      setError('Failed to fetch tags.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTags();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!name) return;
    setActionLoading(true);
    setError('');

    try {
      await api.post('/blog/admin/tags', { name });
      setName('');
      await fetchTags();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create tag.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!editName) return;
    setActionLoading(true);
    setError('');

    try {
      await api.put(`/blog/admin/tags/${editId}`, { name: editName });
      setEditId(null);
      setEditName('');
      await fetchTags();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update tag.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDelete = async (id, tagName) => {
    if (window.confirm(`Are you sure you want to permanently delete: "#${tagName}"? This will delete all relationships with blogs.`)) {
      setError('');
      try {
        await api.delete(`/blog/admin/tags/${id}`);
        setTags(prev => prev.filter(tag => tag.id !== id));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete tag.');
      }
    }
  };

  const startEdit = (tag) => {
    setEditId(tag.id);
    setEditName(tag.name);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO title="Manage Tags" robots="noindex, nofollow" />

      {/* Header */}
      <header className="flex items-center gap-3 mb-10 pb-6 border-b border-slate-200 dark:border-slate-800/80">
        <Link
          to="/admin/blog"
          className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-55 dark:hover:bg-slate-900 transition"
        >
          <ArrowLeft className="h-4.5 w-4.5 text-slate-500" />
        </Link>
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100">
            Tag Manager
          </h1>
          <p className="text-xs text-slate-400">
            Organize CMS taxonomy tags.
          </p>
        </div>
      </header>

      {/* Error alert */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-2xl px-4 py-3.5 mb-6">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Content grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Creation/Editing Forms */}
        <aside className="lg:col-span-1">
          {editId ? (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3">
                Update Tag
              </h2>
              <form onSubmit={handleUpdate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-1.5">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    required
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-violet-500"
                  />
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={actionLoading}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition disabled:opacity-55"
                  >
                    <Save className="h-3.5 w-3.5" /> Save Changes
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditId(null)}
                    className="px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-55 dark:hover:bg-slate-950 text-xs font-bold transition text-slate-550"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 pb-3">
                Create Tag
              </h2>
              <form onSubmit={handleCreate} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-1.5">
                    Tag Name
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. React"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-55 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-900 dark:text-slate-100 outline-none transition focus:border-violet-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={actionLoading}
                  className="w-full inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl shadow transition disabled:opacity-55"
                >
                  <Plus className="h-4 w-4" /> Add Tag
                </button>
              </form>
            </div>
          )}
        </aside>

        {/* Tags Table List */}
        <main className="lg:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 gap-3">
              <div className="h-8 w-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
              <span className="text-xs text-slate-400 font-bold">Querying tags...</span>
            </div>
          ) : tags.length === 0 ? (
            <div className="text-center p-20">
              <p className="text-slate-400 text-xs italic">No tags created yet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-950 text-[10px] font-black uppercase tracking-wider text-slate-500 border-b border-slate-200 dark:border-slate-800">
                    <th className="p-4 pl-6">Tag Name</th>
                    <th className="p-4">Slug</th>
                    <th className="p-4 pr-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 text-xs">
                  {tags.map((tag) => (
                    <tr key={tag.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-950/25 transition">
                      <td className="p-4 pl-6 font-bold text-slate-800 dark:text-slate-105">
                        #{tag.name}
                      </td>
                      <td className="p-4 text-slate-500 font-mono text-[10px]">
                        {tag.slug}
                      </td>
                      <td className="p-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => startEdit(tag)}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-850 hover:bg-violet-600 hover:text-white transition text-slate-500"
                            title="Edit Tag"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(tag.id, tag.name)}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-855 hover:bg-red-655 hover:text-white transition text-slate-550"
                            title="Delete Tag"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
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
    </div>
  );
}
