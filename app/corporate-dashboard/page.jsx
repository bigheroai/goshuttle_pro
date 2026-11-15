'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const CorporateDashboard = dynamic(() => import('@/views/corporate-dashboard'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <CorporateDashboard />;
}
