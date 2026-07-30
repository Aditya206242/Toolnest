import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  ArrowLeft, Save, Upload, X, AlertCircle, 
  HelpCircle, Settings, Share2, Globe, Cpu,
  History, RefreshCw, FileText, CheckCircle, FileCode
} from 'lucide-react';
import api from '../utils/api';
import SEO from '../components/SEO';
import RichTextEditor from '../components/RichTextEditor';

// Helper: Custom Markdown parser (compiled locally for offline import)
const markdownToHtml = (markdown) => {
  if (!markdown) return '';
  let html = markdown;
  
  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');
  
  // Blockquotes
  html = html.replace(/^\> (.*$)/gim, '<blockquote>$1</blockquote>');
  
  // Lists
  html = html.replace(/^\* (.*$)/gim, '<ul><li>$1</li></ul>');
  html = html.replace(/^\- (.*$)/gim, '<ul><li>$1</li></ul>');
  html = html.replace(/^\d+\. (.*$)/gim, '<ol><li>$1</li></ol>');
  
  // Fix groupings
  html = html.replace(/<\/ul>\s*<ul>/g, '');
  html = html.replace(/<\/ol>\s*<ol>/g, '');
  
  // Bold & Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/__(.*?)__/g, '<strong>$1</strong>');
  html = html.replace(/_(.*?)_/g, '<em>$1</em>');
  
  // Code block
  html = html.replace(/```([\s\S]*?)```/gm, '<pre><code>$1</code></pre>');
  html = html.replace(/`(.*?)`/g, '<code>$1</code>');
  
  // Links
  html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2">$1</a>');
  
  // Paragraphs
  const lines = html.split('\n');
  const paragraphs = lines.map(line => {
    line = line.trim();
    if (!line) return '';
    if (line.startsWith('<h') || line.startsWith('<blockquote') || line.startsWith('<ul') || line.startsWith('<ol') || line.startsWith('<pre') || line.startsWith('<li')) {
      return line;
    }
    return `<p>${line}</p>`;
  });
  
  return paragraphs.filter(p => p.length > 0).join('\n');
};

export default function BlogEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const [form, setForm] = useState({
    title: '',
    content: '',
    summary: '',
    featuredImage: '',
    slug: '',
    seoTitle: '',
    seoDescription: '',
    canonicalUrl: '',
    ogTitle: '',
    ogDescription: '',
    ogImage: '',
    twitterTitle: '',
    twitterDescription: '',
    twitterImage: '',
    status: 'draft',
    publishedAt: ''
  });

  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);

  const [activeTab, setActiveTab] = useState('editor'); // 'editor', 'seo', 'og', 'twitter'
  const [loading, setLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(isEditMode);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);
  const mdInputRef = useRef(null);

  // Auto-slug generation lock state
  const [autoSlug, setAutoSlug] = useState(!isEditMode);

  // Autosave states
  const [autosaveStatus, setAutosaveStatus] = useState('idle'); // 'idle', 'saving', 'saved', 'error'
  const [lastAutosaved, setLastAutosaved] = useState(null);

  // Version history state
  const [revisions, setRevisions] = useState([]);
  const [showRevisions, setShowRevisions] = useState(false);
  const [revisionsLoading, setRevisionsLoading] = useState(false);

  // Fetch taxonomy and post details on load
  useEffect(() => {
    const loadMetadata = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([
          api.get('/blog/categories'),
          api.get('/blog/tags')
        ]);
        setCategories(catRes.data.data);
        setTags(tagRes.data.data);

        if (isEditMode) {
          const postRes = await api.get(`/blog/admin/blogs/${id}`);
          const post = postRes.data.data;
          
          // Format date for datetime-local input
          let formattedDate = '';
          if (post.published_at) {
            const d = new Date(post.published_at);
            formattedDate = new Date(d.getTime() - d.getTimezoneOffset() * 60000)
              .toISOString()
              .slice(0, 16);
          }

          setForm({
            title: post.title || '',
            content: post.content || '',
            summary: post.summary || '',
            featuredImage: post.featured_image || '',
            slug: post.slug || '',
            seoTitle: post.seo_title || '',
            seoDescription: post.seo_description || '',
            canonicalUrl: post.canonical_url || '',
            ogTitle: post.og_title || '',
            ogDescription: post.og_description || '',
            ogImage: post.og_image || '',
            twitterTitle: post.twitter_title || '',
            twitterDescription: post.twitter_description || '',
            twitterImage: post.twitter_image || '',
            status: post.status || 'draft',
            publishedAt: formattedDate
          });
          setSelectedCategories(post.categoryIds || []);
          setSelectedTags(post.tagIds || []);
          setAutoSlug(false);
        }
      } catch (err) {
        setError('Failed to fetch details from servers.');
        console.error(err);
      } finally {
        setPageLoading(false);
      }
    };

    loadMetadata();
  }, [id, isEditMode]);

  // Draft Cache restoration for new articles
  useEffect(() => {
    if (!isEditMode) {
      const cached = localStorage.getItem('toolnest_draft_blog');
      if (cached) {
        try {
          const { form: draftForm, selectedCategories: draftCats, selectedTags: draftTags } = JSON.parse(cached);
          const confirmRestore = window.confirm('Restore unsaved draft from your local cache?');
          if (confirmRestore) {
            setForm(prev => ({ ...prev, ...draftForm }));
            setSelectedCategories(draftCats || []);
            setSelectedTags(draftTags || []);
          } else {
            localStorage.removeItem('toolnest_draft_blog');
          }
        } catch (e) {
          console.warn('Failed to parse local draft.', e);
        }
      }
    }
  }, [isEditMode]);

  // Handle Slug auto-generation from Title changes
  useEffect(() => {
    if (autoSlug && form.title) {
      const generated = form.title
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-')
        .replace(/^-+/, '')
        .replace(/-+$/, '');
      setForm(prev => ({ ...prev, slug: generated }));
    }
  }, [form.title, autoSlug]);

  // Debounced Autosave Effect
  useEffect(() => {
    if (!form.title && !form.content) return;

    setAutosaveStatus('saving');

    const debouncer = setTimeout(async () => {
      try {
        if (isEditMode) {
          const payload = {
            ...form,
            categoryIds: selectedCategories,
            tagIds: selectedTags,
            publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null
          };
          await api.put(`/blog/admin/blogs/${id}`, payload);
          setAutosaveStatus('saved');
          setLastAutosaved(new Date().toLocaleTimeString());
        } else {
          localStorage.setItem('toolnest_draft_blog', JSON.stringify({
            form,
            selectedCategories,
            selectedTags
          }));
          setAutosaveStatus('saved');
          setLastAutosaved(new Date().toLocaleTimeString());
        }
      } catch (err) {
        setAutosaveStatus('error');
        console.warn('[Autosave Error]', err.message);
      }
    }, 3000);

    return () => clearTimeout(debouncer);
  }, [form.title, form.content, form.summary, selectedCategories, selectedTags, form.status, form.publishedAt]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };

  const handleContentChange = (html) => {
    setForm(prev => ({ ...prev, content: html }));
  };

  // Taxonomies select handlers
  const handleCategoryCheckbox = (catId) => {
    setSelectedCategories(prev =>
      prev.includes(catId) ? prev.filter(id => id !== catId) : [...prev, catId]
    );
  };

  const handleTagCheckbox = (tagId) => {
    setSelectedTags(prev =>
      prev.includes(tagId) ? prev.filter(id => id !== tagId) : [...prev, tagId]
    );
  };

  // Image Upload handler
  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError('');
    
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await api.post('/blog/admin/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const { imageUrl } = response.data;
      
      setForm(prev => ({
        ...prev,
        featuredImage: imageUrl,
        ogImage: prev.ogImage || imageUrl,
        twitterImage: prev.twitterImage || imageUrl
      }));
      setSuccess('Image optimized and uploaded successfully.');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to upload featured image.');
    } finally {
      setUploading(false);
    }
  };

  const removeFeaturedImage = () => {
    setForm(prev => ({ ...prev, featuredImage: '' }));
  };

  // Markdown Import Handler
  const handleMarkdownImport = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const markdown = event.target.result;
      const html = markdownToHtml(markdown);
      setForm(prev => ({ ...prev, content: html }));
      setSuccess('Markdown parsed and loaded successfully!');
      setTimeout(() => setSuccess(''), 3000);
    };
    reader.readAsText(file);
    e.target.value = null; // Clear trigger
  };

  // Reading time counter
  const calculateReadingTime = () => {
    const cleanText = form.content.replace(/<[^>]*>/g, '');
    const wordCount = cleanText.trim().split(/\s+/).filter(w => w.length > 0).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  };

  // Version rollback queries
  const fetchRevisions = async () => {
    if (!isEditMode) return;
    setRevisionsLoading(true);
    try {
      const res = await api.get(`/blog/admin/blogs/${id}/revisions`);
      setRevisions(res.data.data);
    } catch (err) {
      console.warn('Failed to fetch revisions.', err.message);
    } finally {
      setRevisionsLoading(false);
    }
  };

  const executeRollback = async (revisionId) => {
    const confirm = window.confirm('Revert to this snapshot version? The current version will be archived automatically in the history log.');
    if (!confirm) return;

    try {
      setLoading(true);
      const res = await api.post(`/blog/admin/blogs/${id}/rollback/${revisionId}`);
      const rolled = res.data.data;
      
      setForm(prev => ({
        ...prev,
        title: rolled.title,
        content: rolled.content
      }));
      setSuccess('Article successfully reverted!');
      setShowRevisions(false);
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Rollback execution failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenRevisions = () => {
    setShowRevisions(true);
    fetchRevisions();
  };

  // SEO Score Analyzer
  const analyzeSEO = () => {
    let score = 0;
    const checklist = [];

    // Title Check
    const titleLen = form.title.length;
    if (titleLen >= 40 && titleLen <= 70) {
      score += 20;
      checklist.push({ label: 'Title length is ideal (40-70 chars)', passed: true });
    } else {
      checklist.push({ label: 'Title length must be between 40-70 characters', passed: false });
    }

    // Length Check
    const cleanText = form.content.replace(/<[^>]*>/g, '');
    const wordCount = cleanText.trim().split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount >= 300) {
      score += 20;
      checklist.push({ label: 'Post contains at least 300 words', passed: true });
    } else {
      checklist.push({ label: 'Add more content (minimum 300 words for ranking)', passed: false });
    }

    // Meta Description Check
    const seoDescLen = (form.seoDescription || form.summary || '').length;
    if (seoDescLen >= 120 && seoDescLen <= 160) {
      score += 20;
      checklist.push({ label: 'SEO/Meta description length is ideal (120-160 chars)', passed: true });
    } else {
      checklist.push({ label: 'Add descriptive metadata of 120-160 characters', passed: false });
    }

    // Subheadings structural tags
    if (form.content.includes('<h2') || form.content.includes('<h3')) {
      score += 15;
      checklist.push({ label: 'Uses H2 or H3 formatting headings', passed: true });
    } else {
      checklist.push({ label: 'Include subheadings (H2/H3 tags) for readability', passed: false });
    }

    // Image Set
    if (form.featuredImage) {
      score += 15;
      checklist.push({ label: 'Featured media set', passed: true });
    } else {
      checklist.push({ label: 'Add a featured post cover banner', passed: false });
    }

    // Links present
    if (form.content.includes('<a href=')) {
      score += 10;
      checklist.push({ label: 'Content includes hyperlinked keywords', passed: true });
    } else {
      checklist.push({ label: 'Insert outbound page links', passed: false });
    }

    return { score, checklist };
  };

  const { score: seoScore, checklist: seoChecklist } = analyzeSEO();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    if (!form.title || !form.content) {
      setError('Title and body content are required parameters.');
      setLoading(false);
      return;
    }

    const payload = {
      ...form,
      categoryIds: selectedCategories,
      tagIds: selectedTags,
      publishedAt: form.publishedAt ? new Date(form.publishedAt).toISOString() : null
    };

    try {
      if (isEditMode) {
        await api.put(`/blog/admin/blogs/${id}`, payload);
        setSuccess('Article successfully compiled and saved!');
      } else {
        const res = await api.post('/blog/admin/blogs', payload);
        // Clear local storage on successful server commit
        localStorage.removeItem('toolnest_draft_blog');
        setSuccess('Post successfully created and published!');
      }
      
      setTimeout(() => {
        navigate('/admin/blog');
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.message || 'Transaction error saving article contents.');
    } finally {
      setLoading(false);
    }
  };

  if (pageLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-violet-650 border-t-transparent animate-spin" />
        <span className="text-xs text-slate-400 font-bold animate-pulse">Initializing CMS Editor workspace...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO title={isEditMode ? 'Edit Article' : 'New Article'} robots="noindex, nofollow" />

      {/* Editor top header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8 pb-6 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/blog"
            className="p-2 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition"
          >
            <ArrowLeft className="h-4.5 w-4.5 text-slate-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 flex items-center gap-2">
              {isEditMode ? 'Edit Article' : 'Create New Article'}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-[10px] bg-slate-100 dark:bg-slate-800/80 text-slate-500 font-bold px-2 py-0.5 rounded-md">
                Estimated {calculateReadingTime()} min read
              </span>
              
              {/* Autosave status text overlay */}
              {autosaveStatus === 'saving' && (
                <span className="text-[10px] text-violet-500 font-black animate-pulse flex items-center gap-1">
                  <RefreshCw className="h-3 w-3 animate-spin" /> Caching content...
                </span>
              )}
              {autosaveStatus === 'saved' && (
                <span className="text-[10px] text-emerald-500 font-bold flex items-center gap-0.5">
                  ✓ Autosaved {lastAutosaved ? `@ ${lastAutosaved}` : ''}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          {isEditMode && (
            <button
              onClick={handleOpenRevisions}
              className="inline-flex items-center gap-1.5 text-xs font-black px-4 py-2.5 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-250 border border-slate-200 dark:border-slate-700/80 rounded-xl hover:bg-slate-200 transition"
            >
              <History className="h-4 w-4" /> Revisions
            </button>
          )}

          <button
            onClick={handleSubmit}
            disabled={loading}
            className="inline-flex items-center gap-2 text-xs font-bold px-5 py-2.5 bg-violet-650 hover:bg-violet-700 disabled:opacity-50 text-white rounded-xl shadow-lg shadow-violet-600/20 transition cursor-pointer border border-violet-600"
          >
            <Save className="h-4 w-4" />
            {loading ? 'Compiling...' : 'Save & Publish'}
          </button>
        </div>
      </header>

      {/* Alerts */}
      {error && (
        <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 text-red-500 text-sm rounded-2xl px-4 py-3.5 mb-6">
          <AlertCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}
      {success && (
        <div className="flex items-start gap-2.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm rounded-2xl px-4 py-3.5 mb-6">
          <CheckCircle className="h-5 w-5 mt-0.5 shrink-0" />
          <span>{success}</span>
        </div>
      )}

      {/* Primary layout columns */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Main Composition Panel */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section Tabs */}
          <div className="flex border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/40 p-1 rounded-xl">
            {['editor', 'seo', 'og', 'twitter'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-2 rounded-lg text-xs font-bold capitalize transition flex items-center justify-center gap-1.5 ${
                  activeTab === tab
                    ? 'bg-white dark:bg-slate-900 text-violet-500 shadow-sm border border-slate-200 dark:border-slate-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {tab === 'editor' && <Cpu className="h-4 w-4" />}
                {tab === 'seo' && <Globe className="h-4 w-4" />}
                {tab === 'og' && <Share2 className="h-4 w-4" />}
                {tab === 'twitter' && <Share2 className="h-4 w-4" />}
                {tab === 'editor' ? 'Composer' : tab}
              </button>
            ))}
          </div>

          {/* TAB 1: Editor Pane */}
          {activeTab === 'editor' && (
            <div className="space-y-5">
              
              {/* Title input */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-4 shadow-sm">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                    Post Title
                  </label>
                  <input
                    type="text"
                    name="title"
                    required
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Enter article title..."
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-violet-500 outline-none transition font-extrabold"
                  />
                </div>

                {/* Slug Input */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Post Slug
                    </label>
                    <button
                      type="button"
                      onClick={() => setAutoSlug(!autoSlug)}
                      className={`text-[10px] font-bold ${
                        autoSlug ? 'text-violet-500' : 'text-slate-400'
                      }`}
                    >
                      {autoSlug ? '✓ Auto-generating' : '✏ Edit Manually'}
                    </button>
                  </div>
                  <input
                    type="text"
                    name="slug"
                    value={form.slug}
                    onChange={handleChange}
                    disabled={autoSlug}
                    placeholder="post-slug-format"
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-4 text-xs text-slate-500 dark:text-slate-400 outline-none transition disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Summary field */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl shadow-sm">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Excerpt Summary / Intro
                </label>
                <textarea
                  name="summary"
                  rows="3"
                  value={form.summary}
                  onChange={handleChange}
                  placeholder="Provide a brief summary for sitemaps and meta descriptions..."
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-violet-500 outline-none transition resize-none"
                />
              </div>

              {/* Markdown import / rich text wrapper */}
              <div className="space-y-3.5">
                <div className="flex justify-between items-center px-1">
                  <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    Article Body
                  </label>
                  
                  {/* Markdown importer action button */}
                  <div>
                    <input
                      type="file"
                      ref={mdInputRef}
                      onChange={handleMarkdownImport}
                      accept=".md,.markdown,.txt"
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => mdInputRef.current?.click()}
                      className="text-[10px] font-black uppercase text-violet-550 border border-violet-500/20 px-2.5 py-1 rounded-lg bg-violet-500/5 hover:bg-violet-500 hover:text-white transition"
                    >
                      Import Markdown (.md)
                    </button>
                  </div>
                </div>

                <RichTextEditor 
                  value={form.content}
                  onChange={handleContentChange}
                />
              </div>
            </div>
          )}

          {/* TAB 2: General SEO Pane */}
          {activeTab === 'seo' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-5 shadow-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Custom SEO Title
                </label>
                <input
                  type="text"
                  name="seoTitle"
                  value={form.seoTitle}
                  onChange={handleChange}
                  placeholder={form.title || 'SEO Title Fallback'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-900 dark:text-slate-100 outline-none transition"
                />
                <span className="text-[10px] text-slate-400 block mt-1.5">
                  Optimal length: 50-60 characters. Recommended format: Title | ToolNest.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Custom SEO Description
                </label>
                <textarea
                  name="seoDescription"
                  rows="3"
                  value={form.seoDescription}
                  onChange={handleChange}
                  placeholder={form.summary || 'Provide SEO search page descriptions...'}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-900 dark:text-slate-100 outline-none transition resize-none"
                />
                <span className="text-[10px] text-slate-400 block mt-1.5">
                  Optimal length: 120-160 characters. Renders under search results snippets.
                </span>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Canonical URL
                </label>
                <input
                  type="url"
                  name="canonicalUrl"
                  value={form.canonicalUrl}
                  onChange={handleChange}
                  placeholder={`${window.location.origin}/blog/${form.slug}`}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-900 dark:text-slate-100 outline-none transition"
                />
                <span className="text-[10px] text-slate-400 block mt-1.5">
                  Avoids duplicate indexing when sharing identical contents across domains.
                </span>
              </div>
            </div>
          )}

          {/* TAB 3: Open Graph Pane */}
          {activeTab === 'og' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-5 shadow-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Facebook/OG Title
                </label>
                <input
                  type="text"
                  name="ogTitle"
                  value={form.ogTitle}
                  onChange={handleChange}
                  placeholder={form.seoTitle || form.title}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-900 dark:text-slate-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Facebook/OG Description
                </label>
                <textarea
                  name="ogDescription"
                  rows="3"
                  value={form.ogDescription}
                  onChange={handleChange}
                  placeholder={form.seoDescription || form.summary}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-900 dark:text-slate-100 outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Facebook/OG Image Link
                </label>
                <input
                  type="text"
                  name="ogImage"
                  value={form.ogImage}
                  onChange={handleChange}
                  placeholder={form.featuredImage}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-900 dark:text-slate-100 outline-none transition"
                />
              </div>
            </div>
          )}

          {/* TAB 4: Twitter Card Pane */}
          {activeTab === 'twitter' && (
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-3xl space-y-5 shadow-sm">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Twitter Card Title
                </label>
                <input
                  type="text"
                  name="twitterTitle"
                  value={form.twitterTitle}
                  onChange={handleChange}
                  placeholder={form.ogTitle || form.seoTitle || form.title}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-900 dark:text-slate-100 outline-none transition"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Twitter Card Description
                </label>
                <textarea
                  name="twitterDescription"
                  rows="3"
                  value={form.twitterDescription}
                  onChange={handleChange}
                  placeholder={form.ogDescription || form.seoDescription || form.summary}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-900 dark:text-slate-100 outline-none transition resize-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">
                  Twitter Card Image Link
                </label>
                <input
                  type="text"
                  name="twitterImage"
                  value={form.twitterImage}
                  onChange={handleChange}
                  placeholder={form.ogImage || form.featuredImage}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-3 px-4 text-xs text-slate-900 dark:text-slate-100 outline-none transition"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right Side: Options & Meta parameters */}
        <aside className="lg:col-span-1 space-y-6">
          
          {/* SEO Interactive Score Dial */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800/80 pb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-455">
                SEO Checklists
              </h3>
              <span className={`text-xs font-black px-2 py-0.5 rounded-full ${
                seoScore >= 80 
                  ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
                  : seoScore >= 50 
                    ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' 
                    : 'bg-red-500/10 text-red-500 border border-red-500/20'
              }`}>
                Score: {seoScore}/100
              </span>
            </div>

            <div className="space-y-2.5">
              {seoChecklist.map((item, index) => (
                <div key={index} className="flex items-start gap-2 text-xs">
                  {item.passed ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-slate-200 dark:border-slate-800 shrink-0 mt-0.5" />
                  )}
                  <span className={item.passed ? 'text-slate-600 dark:text-slate-350' : 'text-slate-400'}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* 1. Status Settings & Scheduling */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-5">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              Publish Status
            </h3>

            <div>
              <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                Release Flow
              </label>
              <select
                name="status"
                value={form.status}
                onChange={handleChange}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200 focus:border-violet-500 outline-none transition"
              >
                <option value="draft">Save as Draft</option>
                <option value="published">Publish Instantly / Schedule</option>
              </select>
            </div>

            {form.status === 'published' && (
              <div>
                <label className="block text-[10px] font-extrabold uppercase tracking-wide text-slate-400 mb-2">
                  Publication Schedule (Date/Time)
                </label>
                <input
                  type="datetime-local"
                  name="publishedAt"
                  value={form.publishedAt}
                  onChange={handleChange}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 px-3 text-xs text-slate-800 dark:text-slate-200 outline-none transition"
                />
                <span className="text-[9px] text-slate-400 block mt-1.5">
                  Leave blank to release immediately. Set a future date/time to schedule publishing.
                </span>
              </div>
            )}
          </div>

          {/* 2. Featured Image Uploader */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              Featured Image
            </h3>

            {form.featuredImage ? (
              <div className="relative aspect-video rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
                <img
                  src={form.featuredImage}
                  alt="Featured banner preview"
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={removeFeaturedImage}
                  className="absolute top-2.5 right-2.5 p-1.5 rounded-lg bg-black/60 hover:bg-red-600 text-white shadow transition"
                  title="Remove Featured Image"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border border-dashed border-slate-350 dark:border-slate-800 hover:border-violet-500 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/20 rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2"
              >
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept="image/*"
                  className="hidden"
                />
                <Upload className="h-6 w-6 text-slate-400 group-hover:scale-110 transition" />
                <span className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {uploading ? 'Processing Image...' : 'Click to Upload'}
                </span>
                <span className="block text-[10px] text-slate-400">
                  Resized & optimized to WebP automatically.
                </span>
              </div>
            )}
          </div>

          {/* 3. Taxonomy: Categories select */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              Categories
            </h3>
            
            <div className="max-h-[160px] overflow-y-auto space-y-2">
              {categories.map((cat) => (
                <label 
                  key={cat.id}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedCategories.includes(cat.id)}
                    onChange={() => handleCategoryCheckbox(cat.id)}
                    className="rounded border-slate-305 text-violet-600 focus:ring-violet-500"
                  />
                  <span>{cat.name}</span>
                </label>
              ))}
              {categories.length === 0 && (
                <p className="text-[10px] text-slate-400 italic">No categories created</p>
              )}
            </div>
          </div>

          {/* 4. Taxonomy: Tags select */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800/80 pb-3">
              Tags
            </h3>
            
            <div className="max-h-[160px] overflow-y-auto space-y-2">
              {tags.map((tag) => (
                <label 
                  key={tag.id}
                  className="flex items-center gap-2 text-xs font-semibold text-slate-650 dark:text-slate-300 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedTags.includes(tag.id)}
                    onChange={() => handleTagCheckbox(tag.id)}
                    className="rounded border-slate-305 text-violet-600 focus:ring-violet-500"
                  />
                  <span>{tag.name}</span>
                </label>
              ))}
              {tags.length === 0 && (
                <p className="text-[10px] text-slate-400 italic">No tags created</p>
              )}
            </div>
          </div>

        </aside>

      </div>

      {/* Revision history Modal Overlay */}
      {showRevisions && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl flex flex-col max-h-[80vh]">
            
            {/* Header */}
            <div className="px-6 py-4.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History className="h-4.5 w-4.5 text-violet-500" />
                <h3 className="text-sm font-black text-slate-900 dark:text-slate-100">
                  Revision Version History
                </h3>
              </div>
              <button 
                onClick={() => setShowRevisions(false)}
                className="p-1 rounded-lg text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {revisionsLoading ? (
                <div className="flex flex-col items-center justify-center py-10 gap-2">
                  <RefreshCw className="h-6 w-6 text-violet-500 animate-spin" />
                  <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Loading history logs...</span>
                </div>
              ) : revisions.length === 0 ? (
                <div className="text-center py-10 space-y-1">
                  <FileText className="h-8 w-8 text-slate-300 mx-auto" />
                  <p className="text-xs text-slate-400 font-bold">No historical edits recorded yet.</p>
                  <p className="text-[10px] text-slate-400">Making updates creates version snapshots automatically.</p>
                </div>
              ) : (
                revisions.map((rev) => (
                  <div 
                    key={rev.id} 
                    className="p-4 bg-slate-50 dark:bg-slate-950 border border-slate-250/60 dark:border-slate-850 rounded-2xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 hover:border-violet-500/30 transition"
                  >
                    <div className="space-y-1">
                      <p className="text-xs font-black text-slate-800 dark:text-slate-200 truncate max-w-[280px]">{rev.title}</p>
                      <div className="flex items-center gap-1.5 text-[9px] text-slate-400">
                        <span>Updated by {rev.author_name}</span>
                        <span>•</span>
                        <span>{new Date(rev.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => executeRollback(rev.id)}
                      className="px-3 py-1.5 bg-violet-650 hover:bg-violet-750 text-white rounded-lg text-[10px] font-black uppercase transition shrink-0 self-end sm:self-center"
                    >
                      Rollback
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
