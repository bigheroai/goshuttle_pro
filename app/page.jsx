'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const Homepage = dynamic(() => import('@/views/homepage'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <Homepage />;
}
