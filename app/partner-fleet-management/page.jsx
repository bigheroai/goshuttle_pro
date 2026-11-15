'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const PartnerFleetManagement = dynamic(() => import('@/views/partner-fleet-management'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <PartnerFleetManagement />;
}
