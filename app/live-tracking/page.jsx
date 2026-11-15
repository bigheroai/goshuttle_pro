'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const LiveTracking = dynamic(() => import('@/views/live-tracking'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <LiveTracking />;
}
