'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const DriverDocumentUpload = dynamic(() => import('@/views/driver-document-upload'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <DriverDocumentUpload />;
}
