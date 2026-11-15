'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const ResetPassword = dynamic(() => import('@/views/auth/ResetPassword'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <ResetPassword />;
}
