import React, { useState, lazy, Suspense } from 'react';
import { Helmet } from 'react-helmet';
import Header from '../../components/ui/Header';
import HeroSection from './components/HeroSection';

// Lazy-load below-fold sections to reduce main-thread work (improves FID/TTI)
const LiveFleetStatus = lazy(() => import('./components/LiveFleetStatus'));
const RoutePopularityIndicators = lazy(() => import('./components/RoutePopularityIndicators'));
const FeaturedServices = lazy(() => import('./components/FeaturedServices'));
const CustomerTestimonials = lazy(() => import('./components/CustomerTestimonials'));
const TrustSignals = lazy(() => import('./components/TrustSignals'));
const Footer = lazy(() => import('./components/Footer'));

// Lightweight skeleton placeholder to prevent CLS while lazy sections load
const SectionSkeleton = ({ height = 'h-64' }) =>
<div className={`w-full ${height} bg-gray-100 animate-pulse`} aria-hidden="true" />;


const Homepage = () => {
  const [selectedRoute, setSelectedRoute] = useState(null);

  const handleRouteSelection = (route) => {
    setSelectedRoute(route);
    document.querySelector('.hero-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    });
  };

  // JSON-LD structured data for local business (SEO/conversion)
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "TransportationCompany",
    "name": "GoShuttle Pro",
    "url": "https://goshuttle.ph",
    "logo": "https://img.rocket.new/generatedImages/rocket_gen_img_1aba63848-1777874818620.png",
    "description": "Professional shuttle service in Metro Manila. Reliable corporate transportation with modern fleet and experienced drivers.",
    "areaServed": {
      "@type": "Place",
      "name": "Metro Manila, Philippines"
    },
    "contactPoint": {
      "@type": "ContactPoint",
      "contactType": "customer service",
      "availableLanguage": ["English", "Filipino"]
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.9",
      "reviewCount": "1200",
      "bestRating": "5"
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>GoShuttle Pro - Premium Transportation Solutions | Your Journey, Our Commitment</title>
        <meta name="description" content="Experience seamless ground transportation with GoShuttle Pro. Real-time tracking, professional drivers, corporate solutions, and guaranteed punctuality. Book your premium shuttle service today." />
        <meta name="keywords" content="shuttle service, van booking, corporate transportation, airport transfer, Philippines transport, premium shuttle, real-time tracking" />
        <meta property="og:title" content="GoShuttle Pro - Premium Transportation Solutions" />
        <meta property="og:description" content="Seamless ground transportation with real-time tracking and professional service. Book your journey with confidence." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://goshuttle.ph/" />
        <meta property="og:image" content="https://goshuttle.ph/assets/images/goshuttle-vertical-1762404728137.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:image" content="https://goshuttle.ph/assets/images/goshuttle-vertical-1762404728137.png" />
        <link rel="canonical" href="https://goshuttle.ph/" />
        <script type="application/ld+json">{JSON.stringify(structuredData)}</script>
      </Helmet>

      <Header />
      
      <main className="pt-16">
        {/* HeroSection is above-fold — NOT lazy loaded (critical for LCP) */}
        <div className="hero-section">
          <HeroSection onRouteSelect={handleRouteSelection} />
        </div>

        {/* Below-fold sections: lazy loaded to reduce initial JS parse/execute time (FID) */}
        <Suspense fallback={<SectionSkeleton height="h-48" />}>
          <LiveFleetStatus />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height="h-64" />}>
          <RoutePopularityIndicators onRouteClick={handleRouteSelection} />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height="h-96" />}>
          <FeaturedServices />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height="h-96" />}>
          <CustomerTestimonials />
        </Suspense>
        <Suspense fallback={<SectionSkeleton height="h-96" />}>
          <TrustSignals />
        </Suspense>
      </main>

      <Suspense fallback={<SectionSkeleton height="h-48" />}>
        <Footer />
      </Suspense>
    </div>);

};

export default Homepage;