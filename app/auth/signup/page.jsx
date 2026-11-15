'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const AuthSignup = dynamic(() => import('@/views/auth/Signup'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <AuthSignup />;
}
