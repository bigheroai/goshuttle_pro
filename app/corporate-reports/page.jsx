'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const CorporateReports = dynamic(() => import('@/views/corporate-reports'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <CorporateReports />;
}
