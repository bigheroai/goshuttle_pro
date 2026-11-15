'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const FleetLiveMap = dynamic(() => import('@/views/fleet-live-map'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <FleetLiveMap />;
}
