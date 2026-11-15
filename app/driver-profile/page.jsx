'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const DriverProfile = dynamic(() => import('@/views/driver-profile'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <DriverProfile />;
}
