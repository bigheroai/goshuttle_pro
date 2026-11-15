'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const NotFound = dynamic(() => import('@/views/NotFound'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <NotFound />;
}
