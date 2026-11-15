'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const OpsDashboard = dynamic(() => import('@/views/ops-dashboard'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <OpsDashboard />;
}
