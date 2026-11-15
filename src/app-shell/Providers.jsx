'use client';

import React, { useEffect } from 'react';
import ErrorBoundary from '@/components/ErrorBoundary';
import { AuthProvider } from '@/contexts/AuthContext';
import { useAppSettings } from '@/hooks/useAppSettings';

function AppSettingsSync() {
  // Load app settings to initialise favicon and meta tags from the database.
  const { loading, forceUpdate, settings } = useAppSettings();

  useEffect(() => {
    if (!loading && settings && Object.keys(settings)?.length > 0) {
      const t = setTimeout(() => forceUpdate(), 500);
      return () => clearTimeout(t);
    }
  }, [loading, settings, forceUpdate]);

  // Refresh favicon when the tab becomes visible again (mobile Safari fix).
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && !loading) {
        setTimeout(() => forceUpdate(), 100);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [loading, forceUpdate]);

  return null;
}

export default function Providers({ children }) {
  return (
    <AuthProvider>
      <ErrorBoundary>
        <AppSettingsSync />
        {children}
      </ErrorBoundary>
    </AuthProvider>
  );
}
