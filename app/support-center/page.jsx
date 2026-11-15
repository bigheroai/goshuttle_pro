'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const SupportCenter = dynamic(() => import('@/views/support-center'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <SupportCenter />;
}
