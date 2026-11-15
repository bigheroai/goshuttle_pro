'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const AdminHowTo = dynamic(() => import('@/views/admin-how-to'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <AdminHowTo />;
}
