'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const BookingConfirmedPage = dynamic(() => import('@/views/booking-confirmed'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <BookingConfirmedPage />;
}
