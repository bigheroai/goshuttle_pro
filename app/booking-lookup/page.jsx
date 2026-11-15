'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const BookingLookup = dynamic(() => import('@/views/booking-lookup'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <BookingLookup />;
}
