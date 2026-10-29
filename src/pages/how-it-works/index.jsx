import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Icon from '../../components/AppIcon';

const faqs = [
  {
    q: 'Can I book without creating an account?',
    a: 'Yes. Use the Guest Booking Portal at /guest-booking-portal. You\'ll receive a booking code by email that you can use to track or modify your trip at /booking-lookup-portal.'
  },
  {
    q: 'How far in advance can I book?',
    a: 'You can book up to 90 days in advance. Same-day bookings are accepted subject to vehicle availability.'
  },
  {
    q: 'What happens if I need to cancel?',
    a: 'Open your booking in the Booking Lookup Portal or your Customer Account, click "Cancel Booking", and select a reason. Cancellation policies vary by vehicle type and how far in advance you cancel.'
  },
  {
    q: 'How do I track my driver in real time?',
    a: 'Once your booking is confirmed and a driver is assigned, go to /live-tracking and enter your booking code. You\'ll see the driver\'s live location on the map.'
  },
  {
    q: 'Are the prices fixed or do they vary?',
    a: 'Base fares are fixed per route and vehicle type. Additional charges may apply for extra stops, late-night pickups, or tolls — these are shown in the booking summary before you confirm.'
  },
  {
    q: 'What is the Loyalty Rewards program?',
    a: 'Every completed booking earns loyalty points. Points can be redeemed for discounts on future bookings. View your balance and redeem points in your Customer Account under Loyalty Rewards.'
  }
];

const steps = [
  {
    icon: 'MapPin',
    color: 'blue',
    title: 'Choose Your Route',
    description: 'Enter your pickup location and destination. Our route network covers major cities, airports, and provincial hubs across the Philippines.',
    detail: 'Use the Smart Booking Portal for registered users or the Guest Booking Portal if you prefer not to sign up. The route calculator shows estimated travel time and distance before you commit.',
    link: '/smart-booking-portal',
    linkLabel: 'Open Booking Portal'
  },
  {
    icon: 'Car',
    color: 'purple',
    title: 'Pick Your Vehicle',
    description: 'Select from our fleet of vans, shuttles, and SUVs based on your group size and comfort preference.',
    detail: 'Each vehicle card shows capacity, amenities (A/C, WiFi, luggage space), and the base fare. Compare vehicles side by side in the Fleet Showcase before booking.',
    link: '/fleet-showcase',
    linkLabel: 'Browse the Fleet'
  },
  {
    icon: 'Clock',
    color: 'teal',
    title: 'Set Date & Time',
    description: 'Pick your travel date and preferred pickup time. Availability is shown in real time — no double-bookings.',
    detail: 'You can schedule up to 90 days ahead. For recurring trips (e.g., weekly airport runs), corporate accounts support bulk scheduling from the Corporate Dashboard.',
    link: '/smart-booking-portal',
    linkLabel: 'Check Availability'
  },
  {
    icon: 'User',
    color: 'orange',
    title: 'Enter Passenger Details',
    description: 'Provide the primary passenger\'s name, contact number, and any special requirements (child seat, wheelchair access, extra luggage).',
    detail: 'For group bookings, you only need the lead passenger\'s details. Additional passengers can be noted in the special instructions field. All data is encrypted and never shared with third parties.',
    link: null,
    linkLabel: null
  },
  {
    icon: 'CreditCard',
    color: 'green',
    title: 'Pay Securely',
    description: 'Complete payment via credit/debit card or supported e-wallets. Your booking is confirmed instantly.',
    detail: 'All transactions are processed through our secure payment gateway. You\'ll receive a booking confirmation email with your unique booking code immediately after payment.',
    link: null,
    linkLabel: null
  },
  {
    icon: 'Navigation',
    color: 'indigo',
    title: 'Track Your Trip',
    description: 'On the day of travel, track your driver\'s live location, get ETA updates, and contact your driver directly.',
    detail: 'Open /live-tracking and enter your booking code. The map updates every 30 seconds. Use the in-app messaging to send notes to your driver, or call them directly from the Driver Info card.',
    link: '/live-tracking',
    linkLabel: 'Open Live Tracking'
  }
];

const userTypes = [
  {
    icon: 'User',
    color: 'blue',
    title: 'Individual Traveller',
    description: 'Create a free account to save your preferences, earn loyalty points, and access your full booking history.',
    features: ['Saved pickup locations', 'Loyalty rewards on every trip', 'Full booking history', 'Preferred vehicle settings'],
    cta: '/auth/signup',
    ctaLabel: 'Create Free Account'
  },
  {
    icon: 'UserCheck',
    color: 'gray',
    title: 'Guest Traveller',
    description: 'Book without an account. Get a booking code by email and manage your trip from the Booking Lookup Portal.',
    features: ['No registration required', 'Email booking confirmation', 'Modify or cancel via booking code', 'Real-time tracking'],
    cta: '/guest-booking-portal',
    ctaLabel: 'Book as Guest'
  },
  {
    icon: 'Building2',
    color: 'teal',
    title: 'Corporate Client',
    description: 'Manage team travel, set budgets, and generate expense reports from a dedicated corporate dashboard.',
    features: ['Team member management', 'Monthly budget caps', 'Bulk booking tools', 'Downloadable expense reports'],
    cta: '/corporate-dashboard',
    ctaLabel: 'Corporate Dashboard'
  },
  {
    icon: 'Truck',
    color: 'orange',
    title: 'Fleet Partner',
    description: 'Register your fleet and drivers to receive bookings through the GoShuttle network.',
    features: ['Fleet & driver management', 'Booking assignment notifications', 'Performance dashboard', 'Revenue tracking'],
    cta: '/fleet-partner-registration-form',
    ctaLabel: 'Become a Partner'
  }
];

const colorMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', badge: 'bg-blue-100 text-blue-700', num: 'bg-blue-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-700', num: 'bg-purple-600' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'bg-teal-100 text-teal-600', badge: 'bg-teal-100 text-teal-700', num: 'bg-teal-600' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-100 text-orange-700', num: 'bg-orange-600' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-100 text-green-600', badge: 'bg-green-100 text-green-700', num: 'bg-green-600' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', num: 'bg-indigo-600' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'bg-gray-100 text-gray-600', badge: 'bg-gray-100 text-gray-700', num: 'bg-gray-600' }
};

export default function HowItWorks() {
  const [openFaq, setOpenFaq] = useState(null);

  return (
    <>
      <Helmet>
        <title>How It Works — GoShuttle Pro</title>
        <meta name="description" content="Learn how to book a shuttle, track your trip, and manage your travel with GoShuttle Pro." />
      </Helmet>
      <div className="min-h-screen bg-white">
        {/* Hero */}
        <div className="bg-gray-900 text-white">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-1.5 text-sm text-gray-300 mb-6">
              <Icon name="Zap" size={14} className="text-yellow-400" />
              Simple. Fast. Reliable.
            </div>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              How GoShuttle Works
            </h1>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto leading-relaxed">
              From booking to destination — here's everything you need to know about using GoShuttle Pro for your ground transportation needs.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-4 mt-8">
              <Link
                to="/smart-booking-portal"
                className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors text-sm"
              >
                <Icon name="Calendar" size={16} />
                Book Now
              </Link>
              <Link
                to="/guest-booking-portal"
                className="inline-flex items-center gap-2 bg-white/10 text-white font-medium px-6 py-3 rounded-lg hover:bg-white/20 transition-colors text-sm"
              >
                Book as Guest
              </Link>
            </div>
          </div>
        </div>

        {/* Booking Steps */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Book in 6 Simple Steps</h2>
            <p className="text-gray-500 max-w-xl mx-auto">The entire process takes under 5 minutes. Here's exactly what happens at each stage.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {steps?.map((step, idx) => {
              const c = colorMap?.[step?.color];
              return (
                <div key={idx} className={`rounded-xl border ${c?.border} ${c?.bg} p-6`}>
                  <div className="flex items-start gap-4">
                    <div className="flex-shrink-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c?.icon}`}>
                        <Icon name={step?.icon} size={20} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-xs font-bold text-white px-2 py-0.5 rounded-full ${c?.num}`}>
                          Step {idx + 1}
                        </span>
                      </div>
                      <h3 className="font-bold text-gray-900 mb-1">{step?.title}</h3>
                      <p className="text-sm text-gray-600 mb-2">{step?.description}</p>
                      <p className="text-xs text-gray-500 leading-relaxed">{step?.detail}</p>
                      {step?.link && (
                        <Link
                          to={step?.link}
                          className="inline-flex items-center gap-1 text-xs font-medium text-gray-700 hover:text-gray-900 mt-3 transition-colors"
                        >
                          {step?.linkLabel}
                          <Icon name="ArrowRight" size={12} />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* User Types */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Which Account Type is Right for You?</h2>
              <p className="text-gray-500 max-w-xl mx-auto">GoShuttle serves individual travellers, corporate teams, guests, and fleet partners — each with a tailored experience.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {userTypes?.map((type, idx) => {
                const c = colorMap?.[type?.color];
                return (
                  <div key={idx} className="bg-white rounded-xl border border-gray-200 p-6 flex flex-col">
                    <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-4 ${c?.icon}`}>
                      <Icon name={type?.icon} size={22} />
                    </div>
                    <h3 className="font-bold text-gray-900 text-lg mb-1">{type?.title}</h3>
                    <p className="text-sm text-gray-500 mb-4 leading-relaxed">{type?.description}</p>
                    <ul className="space-y-2 mb-6 flex-1">
                      {type?.features?.map((f, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                          <Icon name="Check" size={14} className="text-green-500 flex-shrink-0" />
                          {f}
                        </li>
                      ))}
                    </ul>
                    <Link
                      to={type?.cta}
                      className={`inline-flex items-center justify-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-lg border transition-colors ${c?.border} ${c?.bg} ${c?.badge?.split(' ')?.[1]} hover:opacity-80`}
                    >
                      {type?.ctaLabel}
                      <Icon name="ArrowRight" size={14} />
                    </Link>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Key Features Strip */}
        <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-10">What's Included in Every Booking</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { icon: 'Shield', label: 'Verified Drivers' },
              { icon: 'Navigation', label: 'Live Tracking' },
              { icon: 'Mail', label: 'Email Confirmation' },
              { icon: 'MessageSquare', label: 'In-App Messaging' },
              { icon: 'Star', label: 'Loyalty Points' },
              { icon: 'Phone', label: '24/7 Support' }
            ]?.map((f, i) => (
              <div key={i} className="flex flex-col items-center text-center p-4 bg-gray-50 rounded-xl border border-gray-100">
                <div className="w-10 h-10 bg-gray-900 rounded-xl flex items-center justify-center mb-3">
                  <Icon name={f?.icon} size={18} className="text-white" />
                </div>
                <span className="text-xs font-semibold text-gray-700">{f?.label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section className="bg-gray-50 py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-10">
              <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3">Frequently Asked Questions</h2>
              <p className="text-gray-500">Quick answers to the questions we hear most often.</p>
            </div>
            <div className="space-y-3">
              {faqs?.map((faq, idx) => (
                <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-semibold text-gray-900 text-sm pr-4">{faq?.q}</span>
                    <Icon name={openFaq === idx ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-gray-400 flex-shrink-0" />
                  </button>
                  {openFaq === idx && (
                    <div className="px-5 pb-5">
                      <p className="text-sm text-gray-600 leading-relaxed">{faq?.a}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="bg-gray-900 text-white py-16">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">Ready to Ride?</h2>
            <p className="text-gray-400 mb-8">Book your first trip in under 5 minutes. No hidden fees, no surprises.</p>
            <div className="flex flex-wrap items-center justify-center gap-4">
              <Link
                to="/smart-booking-portal"
                className="inline-flex items-center gap-2 bg-white text-gray-900 font-semibold px-6 py-3 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Icon name="Calendar" size={16} />
                Book a Trip
              </Link>
              <Link
                to="/support-center"
                className="inline-flex items-center gap-2 bg-white/10 text-white font-medium px-6 py-3 rounded-lg hover:bg-white/20 transition-colors"
              >
                <Icon name="HelpCircle" size={16} />
                Contact Support
              </Link>
            </div>
          </div>
        </section>
      </div>
    </>
  );
}
