import React, { useEffect } from 'react';
import Routes from './Routes';
import { AuthProvider } from './contexts/AuthContext';
import { useAppSettings } from './hooks/useAppSettings';

const App = () => {
  // Load app settings to initialize favicon and meta tags
  const { loading, forceUpdate, settings } = useAppSettings();

  // Force update meta tags and favicon after initial load
  useEffect(() => {
    if (!loading && settings && Object.keys(settings)?.length > 0) {
      // Small delay to ensure DOM is ready
      setTimeout(() => {
        forceUpdate();
      }, 500);
    }
  }, [loading, settings, forceUpdate]);

  // Also listen for visibility change to refresh favicon (mobile Safari fix)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loading) {
        setTimeout(() => {
          forceUpdate();
        }, 100);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loading, forceUpdate]);

  // Disable right-click and inspect element
  useEffect(() => {
    // Disable right-click context menu
    const handleContextMenu = (e) => {
      e?.preventDefault();
      return false;
    };

    // Disable keyboard shortcuts for developer tools
    const handleKeyDown = (e) => {
      // Disable F12 (DevTools)
      if (e?.keyCode === 123) {
        e?.preventDefault();
        return false;
      }
      
      // Disable Ctrl+Shift+I (Inspect Element)
      if (e?.ctrlKey && e?.shiftKey && e?.keyCode === 73) {
        e?.preventDefault();
        return false;
      }
      
      // Disable Ctrl+Shift+J (Console)
      if (e?.ctrlKey && e?.shiftKey && e?.keyCode === 74) {
        e?.preventDefault();
        return false;
      }
      
      // Disable Ctrl+U (View Source)
      if (e?.ctrlKey && e?.keyCode === 85) {
        e?.preventDefault();
        return false;
      }
      
      // Disable Ctrl+Shift+C (Inspect Element)
      if (e?.ctrlKey && e?.shiftKey && e?.keyCode === 67) {
        e?.preventDefault();
        return false;
      }
    };

    // Add event listeners
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup function to remove event listeners
    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  return (
    <AuthProvider>
      <Routes />
    </AuthProvider>
  );
};

export default App;