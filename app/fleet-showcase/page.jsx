'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const FleetShowcase = dynamic(() => import('@/views/fleet-showcase'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <FleetShowcase />;
}
