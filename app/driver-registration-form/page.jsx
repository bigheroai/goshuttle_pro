'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const DriverRegistrationForm = dynamic(() => import('@/views/driver-registration-form'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <DriverRegistrationForm />;
}
