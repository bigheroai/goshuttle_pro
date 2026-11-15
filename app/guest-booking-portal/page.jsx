'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const GuestBookingPortal = dynamic(() => import('@/views/guest-booking-portal'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <GuestBookingPortal />;
}
