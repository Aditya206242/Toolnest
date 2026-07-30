import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Calendar, User, Clock, Tag } from 'lucide-react';
import api from '../utils/api';
import SEO from '../components/SEO';

export default function BlogDetail() {
  const { slug } = useParams();
  const [blog, setBlog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchBlogDetail = async () => {
      setLoading(true);
      setError('');
      try {
        const response = await api.get(`/blog/${slug}`);
        setBlog(response.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'We could not fetch the details for this article.');
        console.error('Blog detail fetch error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBlogDetail();
  }, [slug]);

  // Format Date beautifully
  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-3">
        <div className="h-10 w-10 rounded-full border-4 border-violet-600 border-t-transparent animate-spin" />
        <span className="text-xs font-bold text-slate-400 dark:text-slate-500 animate-pulse">Loading Article Workspace...</span>
      </div>
    );
  }

  if (error || !blog) {
    return (
      <div className="max-w-xl mx-auto text-center py-20 px-6">
        <div className="p-4 rounded-full bg-red-500/10 border border-red-500/20 mb-6 text-red-500 inline-block">
          <ArrowLeft className="h-8 w-8" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 dark:text-slate-100 mb-2">Article Unavailable</h1>
        <p className="text-slate-500 dark:text-slate-400 text-sm mb-8 leading-relaxed">
          {error || 'This article seems to have been removed or unpublished.'}
        </p>
        <Link 
          to="/blog"
          className="inline-flex items-center justify-center font-bold text-xs px-5 py-2.5 rounded-xl bg-slate-150 hover:bg-slate-200 dark:bg-slate-900 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-350 transition"
        >
          Return to Blog Feed
        </Link>
      </div>
    );
  }

  const originUrl = window.location.origin;
  const blogUrl = `${originUrl}/blog/${blog.slug}`;
  const authorMail = blog.author_email || 'editorial@toolnest.com';
  
  // Format media paths
  const resolvedFeaturedImage = blog.featured_image 
    ? (blog.featured_image.startsWith('http') ? blog.featured_image : `${originUrl}${blog.featured_image}`)
    : `${originUrl}/output-no-bg.png`;

  // Compiling JSON-LD graph combining Article and Breadcrumb schemas
  const graphSchema = {
    "@graph": [
      {
        "@type": "BreadcrumbList",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "name": "Home", "item": `${originUrl}/` },
          { "@type": "ListItem", "position": 2, "name": "Blog", "item": `${originUrl}/blog` },
          { "@type": "ListItem", "position": 3, "name": blog.title, "item": blogUrl }
        ]
      },
      {
        "@type": "BlogPosting",
        "mainEntityOfPage": {
          "@type": "WebPage",
          "@id": blogUrl
        },
        "headline": blog.title,
        "description": blog.summary || blog.seo_description || 'In-depth guide from ToolNest developers.',
        "image": resolvedFeaturedImage,
        "datePublished": blog.published_at || blog.created_at,
        "dateModified": blog.updated_at || blog.created_at,
        "author": {
          "@type": "Person",
          "name": blog.author_name,
          "email": authorMail
        },
        "publisher": {
          "@type": "Organization",
          "name": "ToolNest",
          "logo": {
            "@type": "ImageObject",
            "url": `${originUrl}/output-no-bg.png`
          }
        }
      }
    ]
  };

  return (
    <article className="max-w-4xl mx-auto px-4 py-8">
      
      {/* SPRINT 4.0 Full SEO card injection */}
      <SEO 
        title={blog.seo_title || blog.title}
        description={blog.seo_description || blog.summary}
        canonicalUrl={blog.canonical_url || blogUrl}
        ogTitle={blog.og_title || blog.seo_title || blog.title}
        ogDescription={blog.og_description || blog.seo_description || blog.summary}
        ogImage={blog.og_image || blog.featured_image}
        ogType="article"
        twitterTitle={blog.twitter_title || blog.og_title || blog.title}
        twitterDescription={blog.twitter_description || blog.og_description || blog.summary}
        twitterImage={blog.twitter_image || blog.og_image || blog.featured_image}
        jsonLdSchema={graphSchema}
      />

      {/* Back Button */}
      <Link 
        to="/blog"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-violet-500 transition mb-8"
      >
        <ArrowLeft className="h-4 w-4" /> BACK TO BLOG FEED
      </Link>

      {/* Article Header Meta */}
      <header className="mb-8">
        
        {/* Categories list */}
        {blog.categories && blog.categories.length > 0 && (
          <div className="flex gap-2 mb-4">
            {blog.categories.map(c => (
              <span 
                key={c.id}
                className="bg-violet-600/10 text-violet-600 dark:text-violet-400 text-[10px] font-black uppercase tracking-wider px-3 py-1 rounded-full border border-violet-500/15"
              >
                {c.name}
              </span>
            ))}
          </div>
        )}

        <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 dark:text-slate-100 leading-tight mb-6">
          {blog.title}
        </h1>

        {/* Author badge and date */}
        <div className="flex flex-wrap items-center gap-y-3 gap-x-6 pb-6 border-b border-slate-200 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400 font-medium">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-violet-600 flex items-center justify-center text-white font-extrabold text-[10px]">
              {blog.author_name.substring(0, 2).toUpperCase()}
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {blog.author_name}
            </span>
          </div>

          <span className="flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-slate-400" />
            {formatDate(blog.published_at || blog.created_at)}
          </span>

          <span className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-slate-400" />
            {blog.reading_time || 1} min read
          </span>
        </div>
      </header>

      {/* Large Featured Image */}
      {blog.featured_image && (
        <div className="aspect-video w-full rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 mb-10 shadow-sm">
          <img
            src={blog.featured_image.startsWith('http') ? blog.featured_image : `${import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1'}/../..${blog.featured_image}`}
            alt={blog.title}
            width="1200"
            height="675"
            className="w-full h-full object-cover"
          />
        </div>
      )}

      {/* Rich Text Article Body (rendered safely, styled via custom prose styles) */}
      <section 
        className="prose dark:prose-invert prose-slate dark:prose-violet max-w-none text-slate-800 dark:text-slate-200 font-sans leading-relaxed text-base space-y-6"
        dangerouslySetInnerHTML={{ __html: blog.content }}
        style={{
          lineHeight: '1.8',
          fontSize: '1.05rem'
        }}
      />

      {/* Tags Footer Section */}
      {blog.tags && blog.tags.length > 0 && (
        <div className="mt-12 pt-6 border-t border-slate-200 dark:border-slate-800 flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
            Related Tags:
          </span>
          {blog.tags.map(t => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60"
            >
              <Tag className="h-3 w-3 text-violet-500" />
              {t.name}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
