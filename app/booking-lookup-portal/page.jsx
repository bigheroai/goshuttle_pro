'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const BookingLookupPortal = dynamic(() => import('@/views/booking-lookup-portal'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <BookingLookupPortal />;
}
