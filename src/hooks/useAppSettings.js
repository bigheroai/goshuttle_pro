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

  // Enhanced safe DOM element removal helper with multiple verification layers
  const safeRemoveChild = (parent, child) => {
    try {
      // Multiple safety checks to prevent removeChild errors
      if (!parent || !child) {
        return false;
      }
      
      // Check if parent exists and has the contains method
      if (typeof parent?.contains !== 'function') {
        return false;
      }
      
      // Check if child is actually a child of the parent
      if (!parent?.contains(child)) {
        return false;
      }
      
      // Additional check: verify parent is still in the document
      if (!document?.contains(parent)) {
        return false;
      }
      
      // Check if child still has a parent node
      if (!child?.parentNode) {
        return false;
      }
      
      // Verify the parent node is the expected parent
      if (child?.parentNode !== parent) {
        return false;
      }
      
      parent?.removeChild(child);
      return true;
    } catch (error) {
      console.warn('Safe remove child warning:', error?.message);
      // Fallback: try using remove() method
      try {
        if (child && typeof child?.remove === 'function') {
          child?.remove();
          return true;
        }
      } catch (fallbackError) {
        console.warn('Fallback remove failed:', fallbackError?.message);
      }
    }
    return false;
  };

  // Enhanced safe DOM element removal using remove() method with additional checks
  const safeRemoveElement = (element) => {
    try {
      if (!element) {
        return false;
      }
      
      // Check if element is still in the DOM
      if (!document?.contains(element)) {
        return false;
      }
      
      // Check if element has a parent node
      if (!element?.parentNode) {
        return false;
      }
      
      // Use modern remove() method first (preferred)
      if (typeof element?.remove === 'function') {
        element?.remove();
        return true;
      }
      
      // Fallback to removeChild if remove() not available
      if (element?.parentNode && typeof element?.parentNode?.removeChild === 'function') {
        element?.parentNode?.removeChild(element);
        return true;
      }
    } catch (error) {
      console.warn('Safe remove element warning:', error?.message);
    }
    return false;
  };

  // Debounced favicon update to prevent multiple simultaneous operations
  let faviconUpdateTimeout = null;
  
  // Dynamically update favicon with enhanced safety and cache busting
  const updateFavicon = (faviconUrl) => {
    if (!faviconUrl) return;

    // Clear any pending favicon updates
    if (faviconUpdateTimeout) {
      clearTimeout(faviconUpdateTimeout);
    }

    faviconUpdateTimeout = setTimeout(() => {
      try {
        // Remove existing favicon links safely with enhanced verification
        const existingFavicons = document.querySelectorAll('link[rel*="icon"]');
        existingFavicons?.forEach(link => {
          // Double-check the element still exists before removal
          if (document?.contains(link)) {
            safeRemoveElement(link);
          }
        });

        // Add cache busting parameter to force refresh
        const cacheBuster = `?v=${Date.now()}`;
        const faviconUrlWithCache = faviconUrl + cacheBuster;

        // Add new favicon with multiple formats for better browser support
        const iconTypes = [
          { rel: 'icon', type: 'image/x-icon', href: faviconUrlWithCache },
          { rel: 'shortcut icon', type: 'image/x-icon', href: faviconUrlWithCache },
          { rel: 'apple-touch-icon', href: faviconUrlWithCache },
          { rel: 'apple-touch-icon-precomposed', href: faviconUrlWithCache }
        ];

        iconTypes?.forEach(iconConfig => {
          try {
            // Verify document.head exists before appending
            if (!document?.head) {
              console.warn('document.head not available for favicon creation');
              return;
            }
            
            const link = document.createElement('link');
            link.rel = iconConfig?.rel;
            if (iconConfig?.type) link.type = iconConfig?.type;
            link.href = iconConfig?.href;
            
            document.head?.appendChild(link);
          } catch (error) {
            console.warn('Error creating favicon link:', error?.message);
          }
        });

        // Enhanced favicon refresh process with better error handling
        setTimeout(() => {
          let tempLink = null;
          try {
            // Verify document.head is still available
            if (!document?.head) {
              console.warn('document.head not available for favicon refresh');
              return;
            }
            
            tempLink = document.createElement('link');
            tempLink.rel = 'icon';
            tempLink.href = 'data:image/x-icon;base64,';
            document.head?.appendChild(tempLink);
            
            setTimeout(() => {
              // Enhanced safe removal with existence verification
              if (tempLink && document?.contains(tempLink)) {
                safeRemoveElement(tempLink);
              }
              
              // Re-add the correct favicon with additional safety checks
              try {
                if (!document?.head) {
                  console.warn('document.head not available for final favicon');
                  return;
                }
                
                const finalLink = document.createElement('link');
                finalLink.rel = 'icon';
                finalLink.type = 'image/x-icon';
                finalLink.href = faviconUrlWithCache;
                document.head?.appendChild(finalLink);
              } catch (error) {
                console.warn('Error creating final favicon link:', error?.message);
              }
            }, 100);
          } catch (error) {
            console.warn('Error in favicon refresh process:', error?.message);
            // Clean up tempLink if it was created but caused an error
            if (tempLink && document?.contains(tempLink)) {
              safeRemoveElement(tempLink);
            }
          }
        }, 100);
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

      // Remove old meta tags that might conflict
      const metaTagsToRemove = [
        { type: 'name', value: 'description' },
        { type: 'name', value: 'keywords' },
        { type: 'property', value: 'og:title' },
        { type: 'property', value: 'og:description' },
        { type: 'property', value: 'og:image' },
        { type: 'property', value: 'og:url' },
        { type: 'property', value: 'og:type' },
        { type: 'property', value: 'og:site_name' },
        { type: 'name', value: 'twitter:card' },
        { type: 'name', value: 'twitter:title' },
        { type: 'name', value: 'twitter:description' },
        { type: 'name', value: 'twitter:image' }
      ];

      metaTagsToRemove?.forEach(tag => {
        removeMetaTag(tag?.type, tag?.value);
      });

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

  // Helper function to remove existing meta tags safely with enhanced checks
  const removeMetaTag = (attribute, attributeValue) => {
    try {
      const existingElement = document.querySelector(`meta[${attribute}="${attributeValue}"]`);
      if (existingElement && document?.contains(existingElement)) {
        safeRemoveElement(existingElement);
      }
    } catch (error) {
      console.warn('Error removing meta tag:', error?.message);
    }
  };

  // Helper function to update or create meta tags safely
  const updateMetaTag = (attribute, attributeValue, content) => {
    if (!content) return;

    try {
      // Remove existing tag first
      removeMetaTag(attribute, attributeValue);

      // Verify document.head exists before creating new meta tag
      if (!document?.head) {
        console.warn('document.head not available for meta tag creation');
        return;
      }

      // Create new tag
      const element = document.createElement('meta');
      element?.setAttribute(attribute, attributeValue);
      element?.setAttribute('content', content);
      document.head?.appendChild(element);
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