import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * Reusable SEO Meta and Structured JSON-LD Schema Injector Component.
 * Integrates metadata, OG tags, Twitter Cards, DNS preconnects, and schemas dynamically.
 */
export default function SEO({
  title,
  description,
  keywords,
  canonicalUrl,
  ogTitle,
  ogDescription,
  ogImage,
  ogType = 'website',
  twitterTitle,
  twitterDescription,
  twitterImage,
  twitterCard = 'summary_large_image',
  robots = 'index, follow',
  
  // Custom schema overrides
  jsonLdSchema = null,
  
  // Prop-driven structured schemas (SEO module enhancements)
  organizationSchema = false,
  toolSchema = null,      // { name, description, category }
  articleSchema = null,   // { headline, description, image, datePublished, dateModified, authorName }
  faqSchema = null,       // [{ question, answer }]
  breadcrumbSchema = null // [{ name, item }]
}) {
  const location = useLocation();

  useEffect(() => {
    const origin = window.location.origin;
    const currentUrl = `${origin}${location.pathname}${location.search}`;
    
    // Core details with fallbacks
    const metaTitle = title ? `${title} | ToolNest` : 'ToolNest - Direct Local PDF & Image Utility Tools';
    const metaDesc = description || 'Secure, local-first web utility suite. Compress images, split/merge PDFs, clean metadata without uploading files.';
    const finalCanonical = canonicalUrl || currentUrl;
    
    const finalOgTitle = ogTitle || title || 'ToolNest Utilities';
    const finalOgDesc = ogDescription || metaDesc;
    const finalOgImage = ogImage 
      ? (ogImage.startsWith('http') ? ogImage : `${origin}${ogImage}`) 
      : `${origin}/output-no-bg.png`; // Fallback to site logo
      
    const finalTwitterTitle = twitterTitle || finalOgTitle;
    const finalTwitterDesc = twitterDescription || finalOgDesc;
    const finalTwitterImage = twitterImage || finalOgImage;

    // Helper: Find or create meta tag
    const updateOrCreateMeta = (nameAttr, attrValue, contentValue) => {
      if (!contentValue) return;
      let el = document.querySelector(`meta[${nameAttr}="${attrValue}"]`);
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute(nameAttr, attrValue);
        document.head.appendChild(el);
      }
      el.setAttribute('content', contentValue);
    };

    // Helper: Find or create link tag (preconnect / dns-prefetch / canonical)
    const updateOrCreateLink = (relValue, hrefValue, attributes = {}) => {
      if (!hrefValue) return;
      let el = document.querySelector(`link[rel="${relValue}"][href="${hrefValue}"]`);
      if (!el) {
        el = document.createElement('link');
        el.setAttribute('rel', relValue);
        el.setAttribute('href', hrefValue);
        Object.keys(attributes).forEach(key => el.setAttribute(key, attributes[key]));
        document.head.appendChild(el);
      }
    };

    // Update document title
    document.title = metaTitle;

    // Update primary tags
    updateOrCreateMeta('name', 'description', metaDesc);
    updateOrCreateMeta('name', 'robots', robots);
    if (keywords) {
      updateOrCreateMeta('name', 'keywords', Array.isArray(keywords) ? keywords.join(', ') : keywords);
    }

    // Update Canonical Link (Duplicate Content Prevention)
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement('link');
      canonicalLink.setAttribute('rel', 'canonical');
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute('href', finalCanonical);

    // Update Open Graph tags
    updateOrCreateMeta('property', 'og:type', ogType);
    updateOrCreateMeta('property', 'og:title', finalOgTitle);
    updateOrCreateMeta('property', 'og:description', finalOgDesc);
    updateOrCreateMeta('property', 'og:image', finalOgImage);
    updateOrCreateMeta('property', 'og:url', finalCanonical);
    updateOrCreateMeta('property', 'og:site_name', 'ToolNest');

    // Update Twitter Cards tags
    updateOrCreateMeta('name', 'twitter:card', twitterCard);
    updateOrCreateMeta('name', 'twitter:title', finalTwitterTitle);
    updateOrCreateMeta('name', 'twitter:description', finalTwitterDesc);
    updateOrCreateMeta('name', 'twitter:image', finalTwitterImage);

    // --- Performance SEO & Core Web Vitals (DNS Prefetching & Preconnecting) ---
    // Preconnect to Google Fonts and local API endpoint servers to speed up assets lookup
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';
    updateOrCreateLink('preconnect', 'https://fonts.googleapis.com');
    updateOrCreateLink('preconnect', 'https://fonts.gstatic.com', { crossorigin: 'anonymous' });
    if (apiUrl.startsWith('http')) {
      updateOrCreateLink('preconnect', apiUrl);
      updateOrCreateLink('dns-prefetch', apiUrl);
    }

    // --- Structured JSON-LD Schema Generation ---
    const schemasToInject = [];

    // 1. Explicit Custom JSON-LD schema
    if (jsonLdSchema) {
      schemasToInject.push({
        '@context': 'https://schema.org',
        ...jsonLdSchema
      });
    }

    // 2. Organization Schema
    if (organizationSchema) {
      schemasToInject.push({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        '@id': `${origin}/#organization`,
        'name': 'ToolNest',
        'url': origin,
        'logo': `${origin}/output-no-bg.png`,
        'sameAs': [
          'https://twitter.com/toolnest',
          'https://github.com/toolnest'
        ]
      });
    }

    // 3. Tool / SoftwareApplication Schema
    if (toolSchema) {
      schemasToInject.push({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': toolSchema.name,
        'description': toolSchema.description || metaDesc,
        'applicationCategory': toolSchema.category === 'pdf' ? 'MultimediaApplication' : 'DesignApplication',
        'operatingSystem': 'All',
        'browserRequirements': 'Requires JavaScript. Requires HTML5.',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'USD'
        }
      });
    }

    // 4. Article / BlogPosting Schema
    if (articleSchema) {
      schemasToInject.push({
        '@context': 'https://schema.org',
        '@type': 'BlogPosting',
        'headline': articleSchema.headline || title,
        'description': articleSchema.description || description || metaDesc,
        'image': articleSchema.image ? (articleSchema.image.startsWith('http') ? articleSchema.image : `${origin}${articleSchema.image}`) : finalOgImage,
        'datePublished': articleSchema.datePublished,
        'dateModified': articleSchema.dateModified || articleSchema.datePublished,
        'author': {
          '@type': 'Person',
          'name': articleSchema.authorName || 'ToolNest Author'
        },
        'publisher': {
          '@type': 'Organization',
          'name': 'ToolNest',
          'logo': {
            '@type': 'ImageObject',
            'url': `${origin}/output-no-bg.png`
          }
        }
      });
    }

    // 5. FAQ Schema
    if (faqSchema && Array.isArray(faqSchema)) {
      schemasToInject.push({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': faqSchema.map(faq => ({
          '@type': 'Question',
          'name': faq.question,
          'acceptedAnswer': {
            '@type': 'Answer',
            'text': faq.answer
          }
        }))
      });
    }

    // 6. Breadcrumb Schema
    if (breadcrumbSchema && Array.isArray(breadcrumbSchema)) {
      schemasToInject.push({
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        'itemListElement': breadcrumbSchema.map((crumb, index) => ({
          '@type': 'ListItem',
          'position': index + 1,
          'name': crumb.name,
          'item': crumb.item.startsWith('http') ? crumb.item : `${origin}${crumb.item}`
        }))
      });
    }

    // Inject JSON-LD Schema tags into head
    let scriptLd = document.getElementById('json-ld-schema');
    if (schemasToInject.length > 0) {
      if (!scriptLd) {
        scriptLd = document.createElement('script');
        scriptLd.setAttribute('type', 'application/ld+json');
        scriptLd.setAttribute('id', 'json-ld-schema');
        document.head.appendChild(scriptLd);
      }
      scriptLd.textContent = JSON.stringify(schemasToInject.length === 1 ? schemasToInject[0] : schemasToInject);
    } else if (scriptLd) {
      scriptLd.remove();
    }

    // Cleanup on component unmount
    return () => {
      const scriptToRemove = document.getElementById('json-ld-schema');
      if (scriptToRemove) {
        scriptToRemove.remove();
      }
    };
  }, [
    title,
    description,
    keywords,
    canonicalUrl,
    ogTitle,
    ogDescription,
    ogImage,
    ogType,
    twitterTitle,
    twitterDescription,
    twitterImage,
    twitterCard,
    robots,
    jsonLdSchema,
    organizationSchema,
    toolSchema,
    articleSchema,
    faqSchema,
    breadcrumbSchema,
    location
  ]);

  return null; // SEO is a helper side-effect component
}
