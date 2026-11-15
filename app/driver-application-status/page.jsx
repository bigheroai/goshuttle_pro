'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const DriverApplicationStatus = dynamic(() => import('@/views/driver-application-status'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <DriverApplicationStatus />;
}
