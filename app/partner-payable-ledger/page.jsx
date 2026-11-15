'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const PartnerPayableLedger = dynamic(() => import('@/views/partner-payable-ledger'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <PartnerPayableLedger />;
}
