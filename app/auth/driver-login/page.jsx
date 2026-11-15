'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const DriverLogin = dynamic(() => import('@/views/auth/DriverLogin'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <DriverLogin />;
}
