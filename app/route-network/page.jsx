'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const RouteNetwork = dynamic(() => import('@/views/route-network'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <RouteNetwork />;
}
