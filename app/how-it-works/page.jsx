'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const HowItWorks = dynamic(() => import('@/views/how-it-works'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <HowItWorks />;
}
