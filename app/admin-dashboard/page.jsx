'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const AdminDashboard = dynamic(() => import('@/views/admin-dashboard'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <AdminDashboard />;
}
