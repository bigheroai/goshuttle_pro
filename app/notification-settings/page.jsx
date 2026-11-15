'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const NotificationSettings = dynamic(() => import('@/views/notification-settings'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <NotificationSettings />;
}
