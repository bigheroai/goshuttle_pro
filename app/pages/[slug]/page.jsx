'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const CmsPage = dynamic(() => import('@/views/cms-page'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <CmsPage />;
}
