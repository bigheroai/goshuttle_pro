import React, { useState } from 'react';
import { Helmet } from 'react-helmet';
import { Link } from 'react-router-dom';
import Icon from '../../components/AppIcon';

const sections = [
  {
    id: 'overview',
    label: 'Dashboard Overview',
    icon: 'TrendingUp',
    color: 'blue',
    title: 'Admin Dashboard Overview',
    intro: 'The Admin Dashboard is your central command center. Access it at /admin-dashboard after logging in with admin credentials.',
    steps: [
      {
        heading: 'Logging In',
        body: 'Navigate to /admin/auth/login and enter your admin email and password. Only accounts with the "admin" role can access the dashboard — regular users are redirected to their customer account automatically.'
      },
      {
        heading: 'Reading the Stats Bar',
        body: 'The top of the Overview tab shows four live counters: Total Vehicles, Total Users, Total Bookings, and Active Bookings. These pull directly from the database on every page load.'
      },
      {
        heading: 'Switching Tabs',
        body: 'Use the left sidebar (desktop) or the horizontal scroll menu (mobile) to jump between modules: Overview, Revenue, Payments, Users, Bookings, Fleet, Rate Sheets, Destinations, Routes, Corporate, Partners, Audit Trail, Notification Logs, and Settings.'
      }
    ]
  },
  {
    id: 'revenue',
    label: 'Revenue Charts',
    icon: 'BarChart2',
    color: 'emerald',
    title: 'Revenue Analytics',
    intro: 'The Revenue tab provides a visual breakdown of all financial activity on the platform — track earnings, payment methods, and performance trends over time.',
    steps: [
      {
        heading: 'Selecting a Time Period',
        body: 'Use the period selector at the top-right of the Revenue tab to switch between 7-day, 30-day, and 90-day views. All charts update instantly to reflect the selected range.'
      },
      {
        heading: 'KPI Summary Cards',
        body: 'Four cards at the top show: Total Revenue (sum of all paid bookings), Total Bookings, Payment Success Rate (%), and Total Refunds issued — all for the selected period.'
      },
      {
        heading: 'Revenue Over Time (Line Chart)',
        body: 'The line chart plots daily revenue for the selected period. Hover over any data point to see the exact amount collected on that date.'
      },
      {
        heading: 'Payments by Method (Bar Chart)',
        body: 'See a breakdown of transaction volume by payment method: GCash, Maya, Card, GrabPay, QR Ph, Cash, and others. Use this to understand which channels your customers prefer.'
      },
      {
        heading: 'Payment Status Distribution (Pie Chart)',
        body: 'The pie chart shows the proportion of payments that are paid, pending, failed, refunded, or cancelled. A high "failed" slice may indicate a PayMongo configuration issue.'
      },
      {
        heading: 'Revenue by Vehicle Type & Destination Zone',
        body: 'Two horizontal bar charts show which vehicle types and destination zones generate the most revenue. Use these to make pricing and fleet allocation decisions.'
      }
    ]
  },
  {
    id: 'payments',
    label: 'Payments',
    icon: 'CreditCard',
    color: 'violet',
    title: 'Payments Management',
    intro: 'The Payments tab gives you a full ledger of every transaction processed through the platform, with the ability to issue refunds directly from the admin panel.',
    steps: [
      {
        heading: 'Viewing All Payments',
        body: 'The payments table lists every transaction with: Booking ID, passenger name, amount, payment method (with icon), date, and status badge (pending / confirmed / paid / failed / refunded / cancelled).'
      },
      {
        heading: 'Searching and Filtering',
        body: 'Use the search bar to find payments by booking ID or passenger name. Use the status filter dropdown to narrow the list to a specific payment state (e.g., show only "failed" payments).'
      },
      {
        heading: 'Viewing Payment Details',
        body: 'Click any row to expand the detail panel showing the full payment breakdown: PayMongo payment ID, method details, booking route, vehicle, and timestamps.'
      },
      {
        heading: 'Issuing a Refund',
        body: 'Click the "Refund" button on any paid or confirmed payment row. The system calls PayMongo\'s /v1/refunds API automatically, then updates the booking status to "cancelled" and payment status to "refunded" in the database. A confirmation prompt appears before processing.'
      },
      {
        heading: 'Sorting Columns',
        body: 'Click any column header (Amount, Date, Status) to sort the table ascending or descending. This helps identify the largest transactions or most recent activity quickly.'
      }
    ]
  },
  {
    id: 'users',
    label: 'User Management',
    icon: 'Users',
    color: 'green',
    title: 'Managing Users',
    intro: 'The Users tab lets you view, search, and manage all registered accounts including customers, drivers, and corporate users.',
    steps: [
      {
        heading: 'Viewing All Users',
        body: 'Open the Users tab. The table lists every user profile with their name, email, role, company affiliation, and registration date. Use the search bar to filter by name or email.'
      },
      {
        heading: 'Changing a User Role',
        body: 'Click the action menu (⋮) next to any user and select "Edit Role". Available roles are: customer, driver, corporate, partner, and admin. Changes take effect immediately.'
      },
      {
        heading: 'Suspending or Deleting Accounts',
        body: 'From the same action menu, choose "Suspend" to temporarily block access or "Delete" to permanently remove the account. Deletions are logged in the Audit Trail.'
      },
      {
        heading: 'Viewing User Details',
        body: 'Click any user row to expand their full profile: contact info, booking history, loyalty points balance, and linked company (for corporate accounts).'
      }
    ]
  },
  {
    id: 'bookings',
    label: 'Booking Management',
    icon: 'Calendar',
    color: 'purple',
    title: 'Managing Bookings',
    intro: 'The Bookings tab gives you full visibility and control over every reservation in the system — guest and registered alike.',
    steps: [
      {
        heading: 'Filtering Bookings',
        body: 'Use the status filter (Pending, Confirmed, In Progress, Completed, Cancelled) and the date range picker to narrow down the list. You can also search by booking code or passenger name.'
      },
      {
        heading: 'Confirming or Cancelling a Booking',
        body: 'Click the booking row to open its detail panel. Use the "Confirm" or "Cancel" button at the top. Cancellations require a reason which is stored and shown to the customer.'
      },
      {
        heading: 'Assigning a Driver',
        body: 'In the booking detail panel, click "Assign Driver". A modal lists available drivers filtered by vehicle type and availability. Select a driver and click Save — the customer receives an automatic notification.'
      },
      {
        heading: 'Resending Confirmation Emails',
        body: 'Open any booking and click "Resend Email". This triggers the send-booking-confirmation edge function using the current email template stored in the database.'
      },
      {
        heading: 'Exporting Bookings',
        body: 'Click the Export button (top-right of the Bookings tab) to download a CSV of the current filtered view. Useful for reconciliation and reporting.'
      }
    ]
  },
  {
    id: 'fleet',
    label: 'Fleet Management',
    icon: 'Car',
    color: 'orange',
    title: 'Managing the Fleet',
    intro: 'Add, edit, and retire vehicles. Each vehicle record controls what customers see in the booking flow.',
    steps: [
      {
        heading: 'Adding a New Vehicle',
        body: 'Click "+ Add Vehicle" in the Fleet tab. Fill in: vehicle name, type (Van, Shuttle, SUV, etc.), capacity, plate number, base fare, and upload a photo. Click Save — the vehicle is immediately available for booking.'
      },
      {
        heading: 'Editing Vehicle Details',
        body: 'Click any vehicle card to open the edit form. You can update pricing, capacity, availability status, and photos. Changes reflect in the booking portal in real time.'
      },
      {
        heading: 'Setting Availability',
        body: 'Toggle the "Available" switch on any vehicle to take it offline (e.g., for maintenance). Unavailable vehicles are hidden from customers but remain in your records.'
      },
      {
        heading: 'Uploading Vehicle Images',
        body: 'Use the image upload field in the vehicle form. Images are stored in Supabase Storage. Recommended size: 1200×800px, max 5MB per image.'
      }
    ]
  },
  {
    id: 'ratesheet',
    label: 'Rate Sheets',
    icon: 'DollarSign',
    color: 'amber',
    title: 'Rate Sheet Management',
    intro: 'Rate Sheets define the pricing structure for each route and vehicle type combination. Changes here directly affect what customers are quoted during booking.',
    steps: [
      {
        heading: 'Viewing Existing Rate Sheets',
        body: 'The Rate Sheets tab lists all active pricing rules with: route name, vehicle type, base fare, per-km rate, and effective date. Use the search bar to filter by route or vehicle type.'
      },
      {
        heading: 'Creating a New Rate Sheet',
        body: 'Click "+ Add Rate Sheet". Select the origin zone, destination zone, vehicle type, and enter the base fare and any additional per-km or per-passenger charges. Set an effective date and click Save.'
      },
      {
        heading: 'Editing a Rate Sheet',
        body: 'Click any rate sheet row to open the edit form. Update pricing fields as needed. Changes take effect immediately for new bookings — existing confirmed bookings retain their original quoted price.'
      },
      {
        heading: 'Deactivating a Rate Sheet',
        body: 'Toggle the "Active" switch on any rate sheet to disable it without deleting the record. Inactive rate sheets are excluded from the booking pricing engine but remain in the database for historical reference.'
      }
    ]
  },
  {
    id: 'destinations',
    label: 'Destination Restrictions',
    icon: 'MapPin',
    color: 'red',
    title: 'Destination Restrictions',
    intro: 'Control which destinations are available for booking. Use this to temporarily disable routes, restrict certain zones, or manage operational coverage.',
    steps: [
      {
        heading: 'Viewing Destination Settings',
        body: 'The Destinations tab shows all configured destination zones with their current status (enabled/disabled) and any restriction notes.'
      },
      {
        heading: 'Enabling or Disabling a Destination',
        body: 'Toggle the switch next to any destination to enable or disable it. Disabled destinations are hidden from the booking portals immediately — customers cannot select them as pickup or drop-off points.'
      },
      {
        heading: 'Adding a Restriction Note',
        body: 'Click the edit icon next to a destination to add a restriction note (e.g., "Road closure until May 15"). This note is stored internally and visible only to admins.'
      },
      {
        heading: 'Saving Changes',
        body: 'All destination restriction changes are saved to the app_settings table in Supabase. The booking portals read these settings in real time, so no page reload is required on the customer side.'
      }
    ]
  },
  {
    id: 'routes',
    label: 'Route Management',
    icon: 'Route',
    color: 'cyan',
    title: 'Route Management',
    intro: 'Define and manage the route network that powers the booking flow. Routes link origin and destination zones and determine which vehicles are eligible for each trip.',
    steps: [
      {
        heading: 'Viewing All Routes',
        body: 'The Routes tab lists every configured route with: route name, origin, destination, distance (km), estimated duration, and active status.'
      },
      {
        heading: 'Adding a New Route',
        body: 'Click "+ Add Route". Enter the route name, select origin and destination zones, set the estimated distance and travel time, and choose which vehicle types are permitted on this route. Click Save.'
      },
      {
        heading: 'Editing a Route',
        body: 'Click any route row to open the edit form. You can update the name, zones, distance, duration, and permitted vehicle types. Changes apply immediately to the booking flow.'
      },
      {
        heading: 'Activating or Deactivating a Route',
        body: 'Toggle the "Active" switch to enable or disable a route. Inactive routes are hidden from customers in the booking portals but remain in the system for historical bookings.'
      }
    ]
  },
  {
    id: 'corporate',
    label: 'Corporate Management',
    icon: 'Building2',
    color: 'teal',
    title: 'Managing Corporate Accounts',
    intro: 'Corporate clients get dedicated accounts with team management, budget tracking, and bulk booking capabilities.',
    steps: [
      {
        heading: 'Creating a Corporate Account',
        body: 'In the Corporate tab, click "+ New Company". Enter the company name, billing contact, credit limit, and assigned account manager. An invitation email is sent to the billing contact.'
      },
      {
        heading: 'Managing Team Members',
        body: 'Open a company record and go to the Team tab. Add or remove employees by email. Each employee can book under the company account up to the set credit limit.'
      },
      {
        heading: 'Setting Budget Limits',
        body: 'In the company record, set a monthly or per-booking budget cap. When a booking would exceed the cap, it is flagged for admin approval before confirmation.'
      },
      {
        heading: 'Viewing Corporate Reports',
        body: 'Click "Generate Report" inside any company record to download a PDF or CSV of all bookings, spend by employee, and remaining budget for the selected period.'
      }
    ]
  },
  {
    id: 'partners',
    label: 'Partner Management',
    icon: 'Handshake',
    color: 'indigo',
    title: 'Managing Fleet Partners',
    intro: 'Fleet partners supply vehicles and drivers under the GoShuttle network. This tab manages their onboarding, fleet, and performance.',
    steps: [
      {
        heading: 'Approving Partner Applications',
        body: 'New applications from /fleet-partner-registration-form appear here with "Pending" status. Review the submitted business info, fleet inventory, and partnership agreement, then click "Approve" or "Reject".'
      },
      {
        heading: 'Viewing Partner Fleets',
        body: 'Click any approved partner to see their registered vehicles and assigned drivers. You can add vehicles on their behalf or flag vehicles for inspection.'
      },
      {
        heading: 'Managing Partner Drivers',
        body: 'Each partner has a driver roster. You can approve or suspend individual drivers, view their license documents, and see their assignment history.'
      },
      {
        heading: 'Partner Performance',
        body: 'The partner detail view shows completion rate, average rating, and total trips. Use this data to prioritize high-performing partners for premium bookings.'
      }
    ]
  },
  {
    id: 'audit',
    label: 'Audit Trail',
    icon: 'History',
    color: 'gray',
    title: 'Audit Trail',
    intro: 'Every significant admin action is logged automatically. Use the Audit Trail to investigate changes and maintain accountability.',
    steps: [
      {
        heading: 'Reading the Log',
        body: 'Each entry shows: timestamp, the admin who performed the action, the action type (e.g., "booking_cancelled", "user_role_changed"), and the affected record ID.'
      },
      {
        heading: 'Filtering by Action Type',
        body: 'Use the Action Type dropdown to filter for specific events like role changes, deletions, or booking status updates. Combine with the date range picker for precise investigations.'
      },
      {
        heading: 'Exporting Audit Logs',
        body: 'Click Export to download the current filtered view as CSV. Useful for compliance reviews and internal audits.'
      }
    ]
  },
  {
    id: 'notifications',
    label: 'Notification Logs',
    icon: 'Bell',
    color: 'yellow',
    title: 'Notification Logs',
    intro: 'Track every email and SMS sent through the platform. Debug delivery issues and confirm customers received their communications.',
    steps: [
      {
        heading: 'Viewing Sent Notifications',
        body: 'The Notification Logs tab lists all outbound messages with: recipient, channel (email/SMS), template used, send timestamp, and delivery status (Sent, Failed, Pending).'
      },
      {
        heading: 'Investigating Failed Deliveries',
        body: 'Click any "Failed" entry to see the error message returned by Resend (email) or Twilio (SMS). Common causes: invalid email address, unverified sender domain, or SMS number format issues.'
      },
      {
        heading: 'Manually Retrying a Notification',
        body: 'For failed booking confirmations, go to the Bookings tab, open the booking, and use "Resend Email". Direct retry from the Notification Logs tab is not available — always re-trigger from the source record.'
      }
    ]
  },
  {
    id: 'settings',
    label: 'App Settings',
    icon: 'Settings',
    color: 'rose',
    title: 'App Settings',
    intro: 'Configure platform-wide settings including company info, email templates, PayMongo payment gateway, and notification preferences.',
    steps: [
      {
        heading: 'Company Information',
        body: 'Update your company name, logo, contact email, phone number, and address. These values appear in booking confirmation emails and the customer-facing footer.'
      },
      {
        heading: 'Email Template Editor',
        body: 'Go to Settings → Email Templates. Select a template (Customer Confirmation, Admin Notification, Booking Cancelled, Welcome Email), edit the subject and HTML body, insert variable chips (e.g. {{passenger_name}}, {{booking_code}}), preview the rendered output, and Save. No edge function redeploy needed — templates are fetched from the database at send time.'
      },
      {
        heading: 'Sending a Test Email',
        body: 'In the Email Template Editor, click "Send Test Email" and enter a recipient address. The edge function renders the current template with sample data and delivers it immediately.'
      },
      {
        heading: 'Notification Role Settings',
        body: 'Under Settings → Notifications, configure which roles receive which alerts (e.g., admins get new booking alerts, drivers get assignment alerts). Toggle each role-event combination on or off.'
      },
      {
        heading: 'PayMongo Gateway Configuration',
        body: 'Go to Settings → Payments to configure the PayMongo gateway. Toggle between Test Mode and Live Mode using the switch at the top. Enter your Public Key and Secret Key for both environments. Supported payment methods include GCash, Maya, Card, GrabPay, QR Ph, Online Banking, and BillEase — toggle each on or off. Add your Webhook Secret for payment event verification. Set the checkout description, statement descriptor, and redirect URLs for successful and failed payments. Click Save to persist all settings to the database.'
      },
      {
        heading: 'Understanding Test vs. Live Mode',
        body: 'When Test Mode is active, a "TEST MODE" badge appears in the booking portals and all transactions use your PayMongo test keys — no real charges are made. Switch to Live Mode only when you are ready to accept real payments. The booking portals read this setting in real time from the database.'
      },
      {
        heading: 'PayMongo Webhook Setup',
        body: 'To receive automatic payment confirmations, register your webhook URL in the PayMongo dashboard: https://goshuttle6927.builtwithrocket.new/functions/v1/paymongo-webhook. The webhook handler processes payment.paid (marks booking as paid/confirmed), payment.failed (marks booking as failed), and source.chargeable (auto-charges and confirms) events. Paste your PayMongo webhook secret into the Webhook Secret field in Settings → Payments.'
      }
    ]
  }
];

const colorMap = {
  blue: { bg: 'bg-blue-50', border: 'border-blue-200', icon: 'bg-blue-100 text-blue-600', badge: 'bg-blue-100 text-blue-700', dot: 'bg-blue-500' },
  green: { bg: 'bg-green-50', border: 'border-green-200', icon: 'bg-green-100 text-green-600', badge: 'bg-green-100 text-green-700', dot: 'bg-green-500' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'bg-purple-100 text-purple-600', badge: 'bg-purple-100 text-purple-700', dot: 'bg-purple-500' },
  orange: { bg: 'bg-orange-50', border: 'border-orange-200', icon: 'bg-orange-100 text-orange-600', badge: 'bg-orange-100 text-orange-700', dot: 'bg-orange-500' },
  teal: { bg: 'bg-teal-50', border: 'border-teal-200', icon: 'bg-teal-100 text-teal-600', badge: 'bg-teal-100 text-teal-700', dot: 'bg-teal-500' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'bg-indigo-100 text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', dot: 'bg-indigo-500' },
  gray: { bg: 'bg-gray-50', border: 'border-gray-200', icon: 'bg-gray-100 text-gray-600', badge: 'bg-gray-100 text-gray-700', dot: 'bg-gray-500' },
  yellow: { bg: 'bg-yellow-50', border: 'border-yellow-200', icon: 'bg-yellow-100 text-yellow-600', badge: 'bg-yellow-100 text-yellow-700', dot: 'bg-yellow-500' },
  rose: { bg: 'bg-rose-50', border: 'border-rose-200', icon: 'bg-rose-100 text-rose-600', badge: 'bg-rose-100 text-rose-700', dot: 'bg-rose-500' },
  emerald: { bg: 'bg-emerald-50', border: 'border-emerald-200', icon: 'bg-emerald-100 text-emerald-600', badge: 'bg-emerald-100 text-emerald-700', dot: 'bg-emerald-500' },
  violet: { bg: 'bg-violet-50', border: 'border-violet-200', icon: 'bg-violet-100 text-violet-600', badge: 'bg-violet-100 text-violet-700', dot: 'bg-violet-500' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', icon: 'bg-amber-100 text-amber-600', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-500' },
  red: { bg: 'bg-red-50', border: 'border-red-200', icon: 'bg-red-100 text-red-600', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500' },
  cyan: { bg: 'bg-cyan-50', border: 'border-cyan-200', icon: 'bg-cyan-100 text-cyan-600', badge: 'bg-cyan-100 text-cyan-700', dot: 'bg-cyan-500' }
};

export default function AdminHowTo() {
  const [activeSection, setActiveSection] = useState('overview');
  const [expandedSteps, setExpandedSteps] = useState({});

  const current = sections?.find(s => s?.id === activeSection);
  const colors = colorMap?.[current?.color] || colorMap?.blue;

  const toggleStep = (idx) => {
    setExpandedSteps(prev => ({ ...prev, [`${activeSection}-${idx}`]: !prev?.[`${activeSection}-${idx}`] }));
  };

  return (
    <>
      <Helmet>
        <title>Admin How-To Guide — GoShuttle Pro</title>
      </Helmet>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-gray-900 text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center gap-3 mb-3">
              <Link to="/admin-dashboard" className="text-gray-400 hover:text-white transition-colors text-sm flex items-center gap-1">
                <Icon name="ChevronLeft" size={16} />
                Admin Dashboard
              </Link>
            </div>
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center flex-shrink-0">
                <Icon name="BookOpen" size={24} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Admin How-To Guide</h1>
                <p className="text-gray-400 mt-1 text-sm sm:text-base">Step-by-step instructions for every backend admin feature in GoShuttle Pro.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row gap-8">

            {/* Sidebar Nav */}
            <aside className="lg:w-64 flex-shrink-0">
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden sticky top-6">
                <div className="px-4 py-3 border-b border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Sections</p>
                </div>
                <nav className="p-2">
                  {sections?.map(section => {
                    const c = colorMap?.[section?.color];
                    const isActive = activeSection === section?.id;
                    return (
                      <button
                        key={section?.id}
                        onClick={() => setActiveSection(section?.id)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all mb-0.5 ${
                          isActive ? `${c?.bg} ${c?.badge?.split(' ')?.[1]}` : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${isActive ? c?.icon : 'bg-gray-100 text-gray-500'}`}>
                          <Icon name={section?.icon} size={14} />
                        </div>
                        <span className={`text-sm font-medium ${isActive ? 'text-gray-900' : ''}`}>{section?.label}</span>
                        {isActive && <Icon name="ChevronRight" size={14} className="ml-auto text-gray-400" />}
                      </button>
                    );
                  })}
                </nav>
              </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 min-w-0">
              <div className={`rounded-xl border ${colors?.border} ${colors?.bg} p-6 mb-6`}>
                <div className="flex items-center gap-3 mb-2">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors?.icon}`}>
                    <Icon name={current?.icon} size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-gray-900">{current?.title}</h2>
                </div>
                <p className="text-gray-600 text-sm leading-relaxed">{current?.intro}</p>
              </div>

              <div className="space-y-3">
                {current?.steps?.map((step, idx) => {
                  const key = `${activeSection}-${idx}`;
                  const isOpen = expandedSteps?.[key] !== false; // default open
                  return (
                    <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                      <button
                        onClick={() => toggleStep(idx)}
                        className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-gray-50 transition-colors"
                      >
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold text-white ${colors?.dot}`}>
                          {idx + 1}
                        </div>
                        <span className="font-semibold text-gray-900 flex-1">{step?.heading}</span>
                        <Icon name={isOpen ? 'ChevronUp' : 'ChevronDown'} size={16} className="text-gray-400 flex-shrink-0" />
                      </button>
                      {isOpen && (
                        <div className="px-5 pb-5 pt-1">
                          <div className="ml-11">
                            <p className="text-gray-600 text-sm leading-relaxed">{step?.body}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Navigation between sections */}
              <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200">
                {(() => {
                  const idx = sections?.findIndex(s => s?.id === activeSection);
                  const prev = sections?.[idx - 1];
                  const next = sections?.[idx + 1];
                  return (
                    <>
                      {prev ? (
                        <button
                          onClick={() => setActiveSection(prev?.id)}
                          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                        >
                          <Icon name="ArrowLeft" size={16} />
                          <span>{prev?.label}</span>
                        </button>
                      ) : <div />}
                      {next ? (
                        <button
                          onClick={() => setActiveSection(next?.id)}
                          className="flex items-center gap-2 text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors ml-auto"
                        >
                          <span>{next?.label}</span>
                          <Icon name="ArrowRight" size={16} />
                        </button>
                      ) : (
                        <Link
                          to="/admin-dashboard"
                          className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700 transition-colors ml-auto"
                        >
                          <span>Back to Dashboard</span>
                          <Icon name="ExternalLink" size={16} />
                        </Link>
                      )}
                    </>
                  );
                })()}
              </div>
            </main>
          </div>
        </div>
      </div>
    </>
  );
}
