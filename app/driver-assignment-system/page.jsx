'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const DriverAssignmentSystem = dynamic(() => import('@/views/driver-assignment-system'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <DriverAssignmentSystem />;
}
