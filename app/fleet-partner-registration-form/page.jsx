'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const FleetPartnerRegistrationForm = dynamic(() => import('@/views/fleet-partner-registration-form'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <FleetPartnerRegistrationForm />;
}
