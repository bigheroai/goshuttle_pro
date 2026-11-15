'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const CorporateBillingLedger = dynamic(() => import('@/views/corporate-billing-ledger'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <CorporateBillingLedger />;
}
