import React from 'react';
import { Helmet } from 'react-helmet';
import { useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import SupportHero from './components/SupportHero';
import QuickActions from './components/QuickActions';
import SupportChannels from './components/SupportChannels';
import KnowledgeBase from './components/KnowledgeBase';
import LiveChat from './components/LiveChat';
import EmergencySupport from './components/EmergencySupport';
import ContactInfo from './components/ContactInfo';

const SupportCenter = () => {
  const navigate = useNavigate();

  const handleCreateTicket = () => {
    // Navigate to support ticket creation - scroll to SupportChannels section
    const el = document.getElementById('support-channels');
    if (el) {
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Helmet>
        <title>Support Center - GoShuttle Pro | 24/7 Customer Support &amp; Help</title>
        <meta
          name="description"
          content="Get comprehensive support for GoShuttle Pro. Access live chat, knowledge base, emergency assistance, and multiple contact channels for all your transportation needs."
        />
        <meta name="keywords" content="GoShuttle support, customer service, live chat, emergency assistance, help center, transportation support Philippines" />
        <meta property="og:title" content="Support Center - GoShuttle Pro" />
        <meta property="og:description" content="24/7 customer support with live chat, knowledge base, and emergency assistance for all your shuttle booking needs." />
        <meta property="og:type" content="website" />
        <link rel="canonical" href="https://goshuttle.ph/support-center" />
      </Helmet>

      <Header />

      <main className="pt-16">
        <SupportHero />
        <QuickActions />
        <div id="support-channels">
          <SupportChannels onCreateTicket={handleCreateTicket} />
        </div>
        <KnowledgeBase />
        <EmergencySupport />
        <ContactInfo />
        <LiveChat />
      </main>
    </div>
  );
};

export default SupportCenter;