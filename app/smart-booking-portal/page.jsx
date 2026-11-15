'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const SmartBookingPortal = dynamic(() => import('@/views/smart-booking-portal'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <SmartBookingPortal />;
}
