'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const StaffDashboard = dynamic(() => import('@/views/staff-dashboard'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <StaffDashboard />;
}
