import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search, Calendar, User, Clock, Tag, X, ArrowLeftRight } from 'lucide-react';
import api from '../utils/api';
import SEO from '../components/SEO';

export default function BlogList() {
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Read filter query params
  const searchQuery = searchParams.get('search') || '';
  const categoryQuery = searchParams.get('category') || '';
  const tagQuery = searchParams.get('tag') || '';
  const pageQuery = parseInt(searchParams.get('page')) || 1;

  const [blogs, setBlogs] = useState([]);
  const [categories, setCategories] = useState([]);
  const [tags, setTags] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Local state for debounced search text input
  const [searchInput, setSearchInput] = useState(searchQuery);

  // Sync search input if URL changes externally
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Fetch blogs when filters/params change
  useEffect(() => {
    const fetchBlogs = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get('/blog', {
          params: {
            page: pageQuery,
            limit: 6,
            search: searchQuery,
            category: categoryQuery,
            tag: tagQuery
          }
        });
        const { blogs: blogList, pagination: pagData } = response.data.data;
        setBlogs(blogList);
        setPagination(pagData);
      } catch (err) {
        setError('Failed to load blog posts. Please check your connection.');
        console.error('Blog fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogs();
  }, [searchQuery, categoryQuery, tagQuery, pageQuery]);

  // Fetch filter metadata (categories, tags) on mount
  useEffect(() => {
    const fetchMeta = async () => {
      try {
        const [catRes, tagRes] = await Promise.all([
          api.get('/blog/categories'),
          api.get('/blog/tags')
        ]);
        setCategories(catRes.data.data);
        setTags(tagRes.data.data);
      } catch (err) {
        console.warn('Failed to load category/tag metadata:', err.message);
      }
    };
    fetchMeta();
  }, []);

  // Update query params helper
  const updateParams = (newParams) => {
    const current = {};
    for (const [key, val] of searchParams.entries()) {
      current[key] = val;
    }
    const merged = { ...current, ...newParams };
    
    // Clean empty values to keep URL clean
    Object.keys(merged).forEach((key) => {
      if (!merged[key]) delete merged[key];
    });
    
    setSearchParams(merged);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateParams({ search: searchInput, page: 1 });
  };

  const handleCategorySelect = (slug) => {
    updateParams({ category: categoryQuery === slug ? '' : slug, page: 1 });
  };

  const handleTagSelect = (slug) => {
    updateParams({ tag: tagQuery === slug ? '' : slug, page: 1 });
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      updateParams({ page: newPage });
    }
  };

  const handleClearFilters = () => {
    setSearchInput('');
    setSearchParams({});
  };

  const hasActiveFilters = searchQuery || categoryQuery || tagQuery;

  // Format Date beautifully
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <SEO 
        title="Blog - Guides, Tutorials, & Local Utility Insights"
        description="Explore in-depth technical guides, optimization tutorials, security highlights, and updates on browser-based secure PDF & image processing."
        canonicalUrl={`${window.location.origin}/blog`}
        jsonLdSchema={{
          "@type": "BreadcrumbList",
          "itemListElement": [
            { "@type": "ListItem", "position": 1, "name": "Home", "item": `${window.location.origin}/` },
            { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${window.location.origin}/blog` }
          ]
        }}
      />

      {/* Header Banner */}
      <header className="text-center max-w-3xl mx-auto mb-16">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-violet-500 via-indigo-400 to-sky-400 bg-clip-text text-transparent mb-4">
          Insights & Guides
        </h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm md:text-base leading-relaxed">
          Learn how to perform advanced image manipulation, compress complex PDFs safely in your browser cache, and scale web applications cleanly.
        </p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        
        {/* Left Side: Filter Panels */}
        <aside className="lg:col-span-1 space-y-6">
          
          {/* 1. Search Box */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5">
              Search Posts
            </h3>
            <form onSubmit={handleSearchSubmit} className="relative">
              <input
                type="text"
                placeholder="Type keyword..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2.5 pl-3.5 pr-10 text-xs text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:border-violet-500 outline-none transition"
              />
              <button 
                type="submit"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-violet-500 transition"
              >
                <Search className="h-4 w-4" />
              </button>
            </form>
          </div>

          {/* 2. Categories Filter */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5">
              Categories
            </h3>
            <div className="space-y-1.5">
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.slug)}
                  className={`w-full flex items-center justify-between text-xs font-semibold py-2 px-3 rounded-lg transition-colors ${
                    categoryQuery === cat.slug
                      ? 'bg-violet-600 text-white'
                      : 'text-slate-600 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-950'
                  }`}
                >
                  <span>{cat.name}</span>
                  {categoryQuery === cat.slug && <X className="h-3 w-3" />}
                </button>
              ))}
              {categories.length === 0 && (
                <p className="text-[10px] text-slate-400 italic">No categories created</p>
              )}
            </div>
          </div>

          {/* 3. Tags Filter */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-sm">
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3.5">
              Filter by Tag
            </h3>
            <div className="flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => handleTagSelect(tag.slug)}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition ${
                    tagQuery === tag.slug
                      ? 'bg-violet-500/10 border-violet-500 text-violet-500 dark:text-violet-400'
                      : 'border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700 bg-slate-50/50 dark:bg-slate-950/50'
                  }`}
                >
                  <Tag className="h-2.5 w-2.5" />
                  <span>{tag.name}</span>
                </button>
              ))}
              {tags.length === 0 && (
                <p className="text-[10px] text-slate-400 italic">No tags created</p>
              )}
            </div>
          </div>

          {/* Clear Actions */}
          {hasActiveFilters && (
            <button
              onClick={handleClearFilters}
              className="w-full py-2.5 rounded-xl border border-dashed border-red-500/20 hover:border-red-500 bg-red-500/5 hover:bg-red-500/10 text-red-500 text-xs font-bold transition flex items-center justify-center gap-1.5"
            >
              <X className="h-3.5 w-3.5" /> Clear All Filters
            </button>
          )}
        </aside>

        {/* Right Side: Blog Feed Grid */}
        <main className="lg:col-span-3 space-y-10">
          
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[40vh] gap-3 bg-white/5 dark:bg-slate-900/10 border border-slate-200 dark:border-slate-800 rounded-3xl p-10">
              <div className="h-8 w-8 rounded-full border-2 border-violet-600 border-t-transparent animate-spin" />
              <span className="text-xs font-bold text-slate-400 animate-pulse">Fetching blog data...</span>
            </div>
          ) : error ? (
            <div className="p-8 border border-red-500/20 rounded-3xl bg-red-500/5 text-center text-red-500 text-sm">
              {error}
            </div>
          ) : blogs.length === 0 ? (
            <div className="text-center py-20 px-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
              <div className="inline-flex p-4 rounded-full bg-slate-100 dark:bg-slate-950 text-slate-400 dark:text-slate-500 mb-4">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-850 dark:text-slate-100">No blog posts found</h3>
              <p className="text-slate-400 text-xs max-w-sm mx-auto mt-1.5 mb-6">
                We couldn't find any articles matching your selected constraints. Try widening your filters.
              </p>
              {hasActiveFilters && (
                <button
                  onClick={handleClearFilters}
                  className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-750 text-slate-750 dark:text-slate-250 text-xs font-bold rounded-xl transition"
                >
                  Reset Search Queries
                </button>
              )}
            </div>
          ) : (
            <>
              {/* Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {blogs.map((blog) => (
                  <article
                    key={blog.id}
                    className="group relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl overflow-hidden hover:border-violet-500/40 hover:shadow-xl transition flex flex-col justify-between"
                  >
                    <div>
                      {/* Image Thumbnail */}
                      <Link to={`/blog/${blog.slug}`} className="block relative aspect-video overflow-hidden bg-slate-50 dark:bg-slate-950 border-b border-slate-150 dark:border-slate-800">
                        {blog.featured_image ? (
                          <img
                            src={blog.featured_image.startsWith('http') ? blog.featured_image : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/../..${blog.featured_image}`}
                            alt={blog.title}
                            loading="lazy" // Core Web Vitals Lazy loading
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            width="640"
                            height="360"
                          />
                        ) : (
                          <div className="w-full h-full flex flex-col items-center justify-center text-slate-350 dark:text-slate-700 bg-slate-100 dark:bg-slate-950 font-bold text-[10px]">
                            <Zap className="h-8 w-8 mb-2 text-violet-500/40" />
                            <span>NO PREVIEW AVAILABLE</span>
                          </div>
                        )}
                        
                        {/* Category badge absolute */}
                        {blog.categories && blog.categories.length > 0 && (
                          <span className="absolute top-3 left-3 bg-violet-600/90 text-white text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md">
                            {blog.categories[0].name}
                          </span>
                        )}
                      </Link>

                      {/* Card details */}
                      <div className="p-6">
                        <div className="flex items-center gap-4 text-[10px] text-slate-400 mb-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(blog.published_at || blog.created_at)}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {blog.reading_time || 1} min read
                          </span>
                        </div>

                        <h2 className="text-base font-bold text-slate-850 dark:text-slate-100 group-hover:text-violet-500 transition-colors line-clamp-2 leading-snug">
                          <Link to={`/blog/${blog.slug}`}>{blog.title}</Link>
                        </h2>
                        
                        <p className="text-slate-500 dark:text-slate-400 text-xs mt-2.5 line-clamp-3 leading-relaxed">
                          {blog.summary || blog.content.replace(/<[^>]*>/g, '').substring(0, 150)}
                        </p>
                      </div>
                    </div>

                    {/* Footer tags list */}
                    <div className="p-6 pt-0 mt-auto border-t border-slate-100 dark:border-slate-800/80 pt-4 flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[10px] font-semibold text-slate-500">
                        <User className="h-3.5 w-3.5 text-violet-500" />
                        {blog.author_name}
                      </span>
                      
                      <Link 
                        to={`/blog/${blog.slug}`}
                        className="text-[10px] font-extrabold text-violet-500 group-hover:underline flex items-center gap-1"
                      >
                        READ GUIDE ➜
                      </Link>
                    </div>
                  </article>
                ))}
              </div>

              {/* Dynamic Glassmorphism Pagination controls */}
              {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between border border-slate-200 dark:border-slate-800/60 p-4 rounded-2xl bg-white/40 dark:bg-slate-900/40 backdrop-blur">
                  <button
                    onClick={() => handlePageChange(pageQuery - 1)}
                    disabled={pageQuery === 1}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-xl text-xs font-bold transition"
                  >
                    Previous
                  </button>
                  <span className="text-xs text-slate-400 font-bold">
                    Page {pagination.currentPage} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => handlePageChange(pageQuery + 1)}
                    disabled={pageQuery === pagination.totalPages}
                    className="px-4 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-850 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent rounded-xl text-xs font-bold transition"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
