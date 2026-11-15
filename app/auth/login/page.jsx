'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const AuthLogin = dynamic(() => import('@/views/auth/Login'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <AuthLogin />;
}
