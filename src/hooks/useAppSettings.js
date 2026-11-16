import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

export const useAppSettings = () => {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadAppSettings();
  }, []);

  const loadAppSettings = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        ?.from('app_settings')
        ?.select('*');

      if (error) {
        setError('Failed to load app settings: ' + error?.message);
        return;
      }

      // Convert array to object for easier access
      const settingsObj = {};
      data?.forEach(setting => {
        settingsObj[setting?.setting_key] = setting?.setting_value;
      });

      setSettings(settingsObj);

      // Update favicon and meta tags when settings load
      updateFavicon(settingsObj?.favicon_logo?.url);
      updateMetaTags(settingsObj);
    } catch (err) {
      setError('An unexpected error occurred while loading app settings');
    } finally {
      setLoading(false);
    }
  };

  // Most tags in <head> belong to React: the <Helmet> tags each page renders
  // and the Next.js metadata. Removing one of them makes React crash with
  // "Cannot read properties of null (reading 'removeChild')" when it later
  // unmounts the page, which swallowed the first click on links such as
  // Sign In and Sign Up. So existing tags are only ever updated in place, and
  // the only elements this hook ever adds are marked with OWNED_ATTR.
  const OWNED_ATTR = 'data-app-settings';

  const appendHeadElement = (tagName, attributes) => {
    if (typeof document === 'undefined' || !document.head) return null;
    const element = document.createElement(tagName);
    element.setAttribute(OWNED_ATTR, '');
    Object.entries(attributes).forEach(([name, value]) => {
      if (value) element.setAttribute(name, value);
    });
    document.head.appendChild(element);
    return element;
  };

  // Debounced favicon update to prevent multiple simultaneous operations
  let faviconUpdateTimeout = null;

  // Point the existing favicon links at the configured icon, with a cache
  // buster so the browser picks up the change.
  const updateFavicon = (faviconUrl) => {
    if (!faviconUrl || typeof document === 'undefined') return;

    if (faviconUpdateTimeout) {
      clearTimeout(faviconUpdateTimeout);
    }

    faviconUpdateTimeout = setTimeout(() => {
      try {
        const href = `${faviconUrl}${faviconUrl.includes('?') ? '&' : '?'}v=${Date.now()}`;
        const links = document.head?.querySelectorAll('link[rel*="icon"]') || [];
        links.forEach(link => link.setAttribute('href', href));

        if (links.length === 0) {
          appendHeadElement('link', { rel: 'icon', href });
          appendHeadElement('link', { rel: 'apple-touch-icon', href });
        }
      } catch (error) {
        console.error('Error updating favicon:', error?.message);
      }
    }, 50); // Small delay to prevent rapid successive calls
  };

  // Dynamically update meta tags for SEO and social sharing
  const updateMetaTags = (settingsObj) => {
    try {
      const metaTitle = settingsObj?.seo_meta_title || settingsObj?.company_name || 'GoShuttle Pro - Premium Transportation Service';
      const metaDescription = settingsObj?.seo_meta_description?.description || 'Professional shuttle service in Metro Manila. Reliable corporate transportation with modern fleet and experienced drivers.';
      const ogTitle = settingsObj?.og_title || metaTitle;
      const ogDescription = settingsObj?.og_description || metaDescription;
      const ogImage = settingsObj?.og_image?.url || settingsObj?.branding_logo?.url || '';
      const ogUrl = settingsObj?.og_url || window.location?.origin;
      const companyName = settingsObj?.company_name || 'GoShuttle Pro';

      // Update document title - this overrides the static HTML title
      document.title = metaTitle;

      // Update or create meta tags
      const metaTagsToAdd = [
        { type: 'name', name: 'description', content: metaDescription },
        { type: 'name', name: 'keywords', content: settingsObj?.seo_keywords || 'shuttle service, transportation, corporate travel, Metro Manila, Philippines' },
        { type: 'name', name: 'author', content: companyName },
        { type: 'name', name: 'robots', content: 'index, follow' },
        
        // Open Graph tags
        { type: 'property', name: 'og:title', content: ogTitle },
        { type: 'property', name: 'og:description', content: ogDescription },
        { type: 'property', name: 'og:image', content: ogImage },
        { type: 'property', name: 'og:url', content: ogUrl },
        { type: 'property', name: 'og:type', content: 'website' },
        { type: 'property', name: 'og:site_name', content: companyName },
        { type: 'property', name: 'og:locale', content: 'en_US' },

        // Twitter Card tags
        { type: 'name', name: 'twitter:card', content: 'summary_large_image' },
        { type: 'name', name: 'twitter:title', content: ogTitle },
        { type: 'name', name: 'twitter:description', content: ogDescription },
        { type: 'name', name: 'twitter:image', content: ogImage },

        // Additional SEO meta tags
        { type: 'name', name: 'application-name', content: companyName },
        { type: 'name', name: 'msapplication-TileColor', content: '#0066cc' },
        { type: 'name', name: 'theme-color', content: '#0066cc' }
      ];

      metaTagsToAdd?.forEach(tag => {
        if (tag?.content) {
          updateMetaTag(tag?.type, tag?.name, tag?.content);
        }
      });

      console.log('✅ Meta tags updated:', {
        title: metaTitle,
        description: metaDescription,
        ogImage: ogImage,
        companyName: companyName
      });
    } catch (error) {
      console.error('Error updating meta tags:', error?.message);
    }
  };

  // Update every matching meta tag in place, or add one if none exists.
  const updateMetaTag = (attribute, attributeValue, content) => {
    if (!content || typeof document === 'undefined') return;

    try {
      const existing = document.head?.querySelectorAll(`meta[${attribute}="${attributeValue}"]`) || [];
      if (existing.length > 0) {
        existing.forEach(element => element.setAttribute('content', content));
      } else {
        appendHeadElement('meta', { [attribute]: attributeValue, content });
      }
    } catch (error) {
      console.warn('Error updating meta tag:', error?.message);
    }
  };

  const getBrandingLogo = () => {
    return settings?.branding_logo?.url || null;
  };

  const getFaviconLogo = () => {
    return settings?.favicon_logo?.url || null;
  };

  const getMobileLogo = () => {
    return settings?.mobile_logo?.url || null;
  };

  const getAppLogoUrl = () => {
    return settings?.app_logo_url?.url || null;
  };

  const getCompanyName = () => {
    return settings?.company_name || 'GoShuttle Pro';
  };

  // Manually trigger meta tags update (useful after settings change)
  const refreshMetaTags = () => {
    try {
      console.log('🔄 Refreshing meta tags and favicon...');
      updateFavicon(settings?.favicon_logo?.url);
      updateMetaTags(settings);
      
      // Additional cache busting techniques with enhanced safety
      setTimeout(() => {
        try {
          // Force a favicon refresh in the address bar
          const head = document.head || document.getElementsByTagName('head')?.[0];
          if (!head) {
            console.warn('Document head not found for cache busting');
            return;
          }
          
          const links = head?.getElementsByTagName('link');
          
          if (links && links?.length > 0) {
            for (let i = 0; i < links?.length; i++) {
              const link = links?.[i];
              if (link?.rel && link?.rel?.includes('icon') && link?.href && document?.contains(link)) {
                try {
                  const href = link?.href;
                  link.href = href + (href?.includes('?') ? '&' : '?') + 'refresh=' + Date.now();
                } catch (linkError) {
                  console.warn('Error updating individual link:', linkError?.message);
                }
              }
            }
          }
        } catch (error) {
          console.warn('Error in cache busting:', error?.message);
        }
      }, 200);
    } catch (error) {
      console.error('Error refreshing meta tags:', error?.message);
    }
  };

  // Force immediate favicon and title update with enhanced safety
  const forceUpdate = () => {
    try {
      console.log('🚀 Force updating favicon and meta tags...');
      
      // Clear browser cache for favicon
      if (settings?.favicon_logo?.url) {
        updateFavicon(settings?.favicon_logo?.url);
      }
      
      // Update title immediately
      if (settings?.seo_meta_title || settings?.company_name) {
        document.title = settings?.seo_meta_title || settings?.company_name || 'GoShuttle Pro';
      }
      
      // Update all meta tags
      updateMetaTags(settings);
      
      // Show success message in console
      console.log('✅ Favicon and meta tags force updated! If you still see old favicon, try:');
      console.log('1. Hard refresh (Ctrl+F5 or Cmd+Shift+R)');
      console.log('2. Clear browser cache');
      console.log('3. Close and reopen the browser tab');
    } catch (error) {
      console.error('Error in force update:', error?.message);
    }
  };

  return {
    settings,
    loading,
    error,
    loadAppSettings,
    refreshMetaTags,
    forceUpdate,
    getBrandingLogo,
    getFaviconLogo,
    getMobileLogo,
    getAppLogoUrl,
    getCompanyName
  };
};

export default useAppSettings;