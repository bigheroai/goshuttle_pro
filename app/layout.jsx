import '@/styles/tailwind.css';
import '@/styles/index.css';
import '@/styles/base.css';
import Providers from '@/app-shell/Providers';

const TITLE = 'GoShuttle Pro - Premium Transportation Service';
const DESCRIPTION =
  'Professional shuttle service in Metro Manila. Reliable corporate transportation with modern fleet and experienced drivers.';
const LOGO = '/assets/images/goshuttle-logo.png';

export const metadata = {
  metadataBase: new URL('https://goshuttle.ph'),
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: 'GoShuttle Pro' }],
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  icons: { icon: LOGO, apple: LOGO },
  openGraph: {
    type: 'website',
    url: 'https://goshuttle.ph/',
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'GoShuttle Pro',
    images: [LOGO],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: [LOGO],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0066cc',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://maps.googleapis.com" />
        <link rel="dns-prefetch" href="https://maps.gstatic.com" />
      </head>
      <body>
        <div id="root">
          <Providers>{children}</Providers>
        </div>
      </body>
    </html>
  );
}
