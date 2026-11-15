'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const AdminLogin = dynamic(() => import('@/views/auth/AdminLogin'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <AdminLogin />;
}
