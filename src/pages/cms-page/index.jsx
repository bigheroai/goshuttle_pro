import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import cmsService from '../../services/cmsService';

/**
 * Lightweight HTML sanitizer — strips <script>, <iframe>, on* attributes,
 * and javascript: hrefs to prevent XSS from CMS-stored content.
 */
function sanitizeHtml(html) {
  if (!html) return '';
  return (
    // Remove data: URIs in src (potential XSS vector)
    // Remove javascript: hrefs/srcs
    // Remove on* event handlers
    // Remove iframe tags
    // Remove script tags and their content
    html?.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')?.replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')?.replace(/\s+on\w+\s*=\s*["'][^"']*["']/gi, '')?.replace(/\s+on\w+\s*=\s*[^\s>]*/gi, '')?.replace(/href\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'href="#"')?.replace(/src\s*=\s*["']?\s*javascript:[^"'\s>]*/gi, 'src=""')?.replace(/src\s*=\s*["']?\s*data:[^"'\s>]*/gi, 'src=""')
  );
}

const CmsPage = () => {
  const { slug } = useParams();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (slug) loadPage(slug);
  }, [slug]);

  const loadPage = async (pageSlug) => {
    try {
      setLoading(true);
      setNotFound(false);
      const data = await cmsService?.getPageBySlug(pageSlug);
      if (!data || !data?.is_published) {
        setNotFound(true);
      } else {
        setPage(data);
      }
    } catch (err) {
      setNotFound(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center">
            <Icon name="Loader2" className="animate-spin mx-auto mb-3 text-blue-500" size={28} />
            <p className="text-gray-500 text-sm">Loading page...</p>
          </div>
        </div>
      </div>
    );
  }

  if (notFound) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="pt-16 flex items-center justify-center min-h-[60vh]">
          <div className="text-center max-w-md px-4">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Icon name="FileX" size={28} className="text-gray-400" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900 mb-2">Page Not Found</h1>
            <p className="text-gray-500 mb-6">This page is not available or has not been published yet.</p>
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              <Icon name="Home" size={16} />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <Helmet>
        <title>{page?.page_title} - GoShuttle</title>
        {page?.meta_description && (
          <meta name="description" content={page?.meta_description} />
        )}
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        <Header />

        <div className="pt-16">
          {/* Page Hero */}
          <div className="bg-white border-b border-gray-200">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 mb-4 transition-colors"
              >
                <Icon name="ArrowLeft" size={15} />
                Back to Home
              </Link>
              <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">{page?.page_title}</h1>
              {page?.updated_at && (
                <p className="text-sm text-gray-400 mt-2">
                  Last updated: {new Date(page?.updated_at)?.toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' })}
                </p>
              )}
            </div>
          </div>

          {/* Page Content */}
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="bg-white rounded-xl border border-gray-200 p-6 sm:p-10">
              <div
                className="prose prose-gray max-w-none
                  prose-headings:font-bold prose-headings:text-gray-900
                  prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg
                  prose-p:text-gray-600 prose-p:leading-relaxed
                  prose-ul:text-gray-600 prose-li:text-gray-600
                  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline"
                dangerouslySetInnerHTML={{ __html: sanitizeHtml(page?.page_content) }}
              />
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CmsPage;
