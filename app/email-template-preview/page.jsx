'use client';

import dynamic from 'next/dynamic';
import PageLoader from '@/app-shell/PageLoader';

const EmailTemplatePreview = dynamic(() => import('@/views/email-template-preview'), { ssr: false, loading: PageLoader });

export default function Page() {
  return <EmailTemplatePreview />;
}
