'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const CustomerAccount = dynamic(() => import('@/views/customer-account'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <CustomerAccount />;
}
