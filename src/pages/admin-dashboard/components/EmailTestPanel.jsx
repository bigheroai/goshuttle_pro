import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;
const RESEND_API_KEY = import.meta.env?.VITE_RESEND_API_KEY;

const TEST_TEMPLATES = [
  {
    id: 'customer_confirmation',
    label: 'Customer Confirmation',
    description: 'Booking confirmation sent to the customer after a booking is placed.',
    icon: 'CheckCircle',
    color: 'green',
    edgeFunction: 'send-booking-confirmation',
    payload: (email) => ({
      type: 'customer_confirmation',
      to_email: email,
      customer_email: email,
      resend_api_key: RESEND_API_KEY,
      booking_data: {
        booking_id: 'TEST-' + Date.now(),
        booking_code: 'GS-TEST-001',
        customer_name: 'Test Customer',
        customer_email: email,
        pickup_location: 'NAIA Terminal 3, Pasay City',
        dropoff_location: 'Makati CBD, Ayala Avenue',
        vehicle_name: 'Toyota HiAce Executive',
        vehicle_plate: 'ABC 1234',
        fleet_type: 'Shuttle Van',
        passenger_count: 4,
        pickup_date: new Date()?.toISOString(),
        pickup_time: '10:00 AM',
        total_cost: '2500.00',
        status: 'confirmed',
        confirm_url: 'https://goshuttle.ph/booking-lookup-portal?code=GS-TEST-001',
      },
    }),
  },
  {
    id: 'admin_notification',
    label: 'Admin Notification',
    description: 'Alert sent to admin when a new booking is submitted.',
    icon: 'Bell',
    color: 'blue',
    edgeFunction: 'send-admin-notification',
    payload: (email) => ({
      type: 'admin_notification',
      to_email: email,
      admin_email: email,
      resend_api_key: RESEND_API_KEY,
      booking_data: {
        booking_id: 'TEST-' + Date.now(),
        booking_code: 'GS-TEST-002',
        customer_name: 'Test Customer',
        customer_email: 'customer@test.com',
        pickup_location: 'NAIA Terminal 3, Pasay City',
        dropoff_location: 'Makati CBD, Ayala Avenue',
        vehicle_name: 'Toyota HiAce Executive',
        passenger_count: 4,
        pickup_date: new Date()?.toISOString(),
        total_cost: '2500.00',
        status: 'pending',
        payment_method: 'GCash',
      },
    }),
  },
  {
    id: 'guest_booking',
    label: 'Guest Booking',
    description: 'Confirmation email for guest (non-registered) bookings.',
    icon: 'UserCheck',
    color: 'amber',
    edgeFunction: 'send-guest-booking-notification',
    payload: (email) => ({
      type: 'guest_confirmation',
      to_email: email,
      customer_email: email,
      guest_email: email,
      resend_api_key: RESEND_API_KEY,
      booking_data: {
        booking_id: 'TEST-' + Date.now(),
        booking_code: 'GS-GUEST-003',
        guest_name: 'Guest Traveler',
        guest_email: email,
        guest_phone: '+63 917 123 4567',
        pickup_location: 'Clark International Airport, Pampanga',
        dropoff_location: 'BGC, Taguig City',
        vehicle_name: 'Nissan NV350 Urvan',
        passenger_count: 6,
        pickup_date: new Date()?.toISOString(),
        total_cost: '3200.00',
        status: 'confirmed',
        lookup_url: 'https://goshuttle.ph/booking-lookup-portal?code=GS-GUEST-003',
      },
    }),
  },
  {
    id: 'welcome_email',
    label: 'Welcome Email',
    description: 'Welcome email sent to new users upon registration.',
    icon: 'Star',
    color: 'purple',
    edgeFunction: 'send-booking-confirmation',
    payload: (email) => ({
      type: 'welcome_email',
      to_email: email,
      customer_email: email,
      resend_api_key: RESEND_API_KEY,
      booking_data: {
        customer_name: 'New User',
        customer_email: email,
        approved_date: new Date()?.toLocaleDateString('en-PH'),
        login_url: 'https://goshuttle.ph/auth/login',
      },
    }),
  },
  {
    id: 'corporate',
    label: 'Corporate Email',
    description: 'Corporate booking confirmation for business accounts.',
    icon: 'Briefcase',
    color: 'indigo',
    edgeFunction: 'send-email-notification',
    payload: (email) => {
      const bookingId = 'TEST-' + Date.now();
      return {
        to: email,
        subject: `✅ Corporate Booking Confirmed - ${bookingId}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
            <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #4f46e5; margin-bottom: 10px;">🏢 Corporate Booking Confirmed</h1>
                <p style="color: #6b7280; font-size: 16px;">GoShuttle Pro — Corporate Account</p>
              </div>
              <p style="color: #374151;">Dear Corporate Manager,</p>
              <p style="color: #6b7280; line-height: 1.6;">Your corporate booking has been confirmed. Here are the details:</p>
              <div style="background-color: #eef2ff; padding: 20px; border-radius: 6px; border-left: 4px solid #4f46e5; margin-bottom: 20px;">
                <h3 style="color: #3730a3; margin-bottom: 15px;">📋 Booking Details</h3>
                <table style="width: 100%; border-collapse: collapse;">
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #374151;">Booking ID:</td>
                    <td style="padding: 8px 0; color: #6b7280;">${bookingId}</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #374151;">Company:</td>
                    <td style="padding: 8px 0; color: #6b7280;">Acme Corporation</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #374151;">Route:</td>
                    <td style="padding: 8px 0; color: #6b7280;">Ortigas Center, Pasig City → NAIA Terminal 3</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #374151;">Vehicle:</td>
                    <td style="padding: 8px 0; color: #6b7280;">Toyota Alphard Executive</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #374151;">Passengers:</td>
                    <td style="padding: 8px 0; color: #6b7280;">3</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #374151;">Cost Center:</td>
                    <td style="padding: 8px 0; color: #6b7280;">SALES-001</td>
                  </tr>
                  <tr style="border-bottom: 1px solid #e5e7eb;">
                    <td style="padding: 8px 0; font-weight: bold; color: #374151;">Approved By:</td>
                    <td style="padding: 8px 0; color: #6b7280;">Finance Manager</td>
                  </tr>
                  <tr>
                    <td style="padding: 8px 0; font-weight: bold; color: #374151;">Total Cost:</td>
                    <td style="padding: 8px 0; color: #059669; font-weight: bold; font-size: 18px;">₱4,500.00</td>
                  </tr>
                </table>
              </div>
              <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro — Corporate Booking System</p>
              </div>
            </div>
          </div>
        `,
        emailType: 'corporate',
        resend_api_key: RESEND_API_KEY,
      };
    },
  },
];

const COLOR_STYLES = {
  green:  { bg: 'bg-green-50',  border: 'border-green-200',  icon: 'text-green-600',  badge: 'bg-green-100 text-green-700',  btn: 'bg-green-600 hover:bg-green-700' },
  blue:   { bg: 'bg-blue-50',   border: 'border-blue-200',   icon: 'text-blue-600',   badge: 'bg-blue-100 text-blue-700',   btn: 'bg-blue-600 hover:bg-blue-700' },
  amber:  { bg: 'bg-amber-50',  border: 'border-amber-200',  icon: 'text-amber-600',  badge: 'bg-amber-100 text-amber-700',  btn: 'bg-amber-500 hover:bg-amber-600' },
  purple: { bg: 'bg-purple-50', border: 'border-purple-200', icon: 'text-purple-600', badge: 'bg-purple-100 text-purple-700', btn: 'bg-purple-600 hover:bg-purple-700' },
  indigo: { bg: 'bg-indigo-50', border: 'border-indigo-200', icon: 'text-indigo-600', badge: 'bg-indigo-100 text-indigo-700', btn: 'bg-indigo-600 hover:bg-indigo-700' },
};

const EmailTestPanel = () => {
  const [testEmail, setTestEmail] = useState('daniel_k_ray@bighero.ai');
  const [sending, setSending] = useState({});
  const [results, setResults] = useState({});
  const [globalMessage, setGlobalMessage] = useState(null);
  const [sendingAll, setSendingAll] = useState(false);

  const setResult = (id, result) => {
    setResults(prev => ({ ...prev, [id]: result }));
  };

  const sendTest = async (template) => {
    const email = testEmail?.trim();
    if (!email) {
      setGlobalMessage({ type: 'error', text: 'Please enter a test email address first.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(email)) {
      setGlobalMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setSending(prev => ({ ...prev, [template?.id]: true }));
    setResult(template?.id, { status: 'sending', text: 'Sending...' });
    setGlobalMessage(null);

    try {
      const payload = template?.payload(email);
      const response = await fetch(`${SUPABASE_URL}/functions/v1/${template?.edgeFunction}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(payload),
      });

      let data = null;
      try { data = await response?.json(); } catch (_) {}

      if (response?.ok && data?.success !== false) {
        setResult(template?.id, {
          status: 'success',
          text: `Delivered to ${email}`,
          timestamp: new Date()?.toLocaleTimeString('en-PH'),
          messageId: data?.id || data?.messageId || null,
        });
      } else {
        const errMsg = data?.error || data?.message || `HTTP ${response?.status}`;
        setResult(template?.id, {
          status: 'error',
          text: errMsg,
          timestamp: new Date()?.toLocaleTimeString('en-PH'),
        });
      }
    } catch (err) {
      setResult(template?.id, {
        status: 'error',
        text: err?.message || 'Network error — check your connection.',
        timestamp: new Date()?.toLocaleTimeString('en-PH'),
      });
    } finally {
      setSending(prev => ({ ...prev, [template?.id]: false }));
    }
  };

  const sendAllTests = async () => {
    const email = testEmail?.trim();
    if (!email) {
      setGlobalMessage({ type: 'error', text: 'Please enter a test email address first.' });
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(email)) {
      setGlobalMessage({ type: 'error', text: 'Please enter a valid email address.' });
      return;
    }

    setSendingAll(true);
    setGlobalMessage({ type: 'info', text: `Sending all 5 test emails to ${email}...` });
    setResults({});

    for (const template of TEST_TEMPLATES) {
      await sendTest(template);
      // Small delay between sends to avoid rate limiting
      await new Promise(r => setTimeout(r, 600));
    }

    setSendingAll(false);
    setGlobalMessage({ type: 'success', text: `All test emails dispatched to ${email}. Check results below.` });
  };

  const clearResults = () => {
    setResults({});
    setGlobalMessage(null);
  };

  const successCount = Object.values(results)?.filter(r => r?.status === 'success')?.length;
  const errorCount = Object.values(results)?.filter(r => r?.status === 'error')?.length;
  const totalSent = successCount + errorCount;

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Panel Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
              <Icon name="FlaskConical" size={20} className="text-white" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Comprehensive Email Test Panel</h3>
              <p className="text-blue-100 text-xs mt-0.5">Send test emails for all 5 template types and verify delivery</p>
            </div>
          </div>
          {totalSent > 0 && (
            <div className="flex items-center gap-2">
              {successCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                  <Icon name="CheckCircle" size={11} />
                  {successCount} sent
                </span>
              )}
              {errorCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-red-500 text-white">
                  <Icon name="XCircle" size={11} />
                  {errorCount} failed
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="p-6 space-y-5">
        {/* Email Input + Send All */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wide">
              Test Recipient Email
            </label>
            <Input
              type="email"
              value={testEmail}
              onChange={(e) => setTestEmail(e?.target?.value)}
              placeholder="your@email.com"
              className="w-full text-sm"
            />
            <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
              <span>✅</span>
              <span>Domain <strong>goshuttle.ph</strong> is verified — emails can be sent to any recipient.</span>
            </p>
          </div>
          <div className="flex items-end gap-2">
            <button
              onClick={sendAllTests}
              disabled={sendingAll || !testEmail?.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-blue-600 hover:bg-blue-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {sendingAll ? (
                <Icon name="Loader2" size={15} className="animate-spin" />
              ) : (
                <Icon name="SendHorizonal" size={15} />
              )}
              {sendingAll ? 'Sending All...' : 'Send All Tests'}
            </button>
            {totalSent > 0 && (
              <button
                onClick={clearResults}
                className="inline-flex items-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors whitespace-nowrap"
              >
                <Icon name="RotateCcw" size={14} />
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Global Message */}
        {globalMessage && (
          <div className={`flex items-center gap-2.5 p-3 rounded-lg text-sm border ${
            globalMessage?.type === 'success' ? 'bg-green-50 border-green-200 text-green-700' :
            globalMessage?.type === 'error'? 'bg-red-50 border-red-200 text-red-700' : 'bg-blue-50 border-blue-200 text-blue-700'
          }`}>
            <Icon
              name={globalMessage?.type === 'success' ? 'CheckCircle' : globalMessage?.type === 'error' ? 'AlertCircle' : 'Info'}
              size={15}
            />
            <span className="flex-1">{globalMessage?.text}</span>
            <button onClick={() => setGlobalMessage(null)} className="opacity-60 hover:opacity-100">
              <Icon name="X" size={13} />
            </button>
          </div>
        )}

        {/* Template Cards */}
        <div className="grid grid-cols-1 gap-3">
          {TEST_TEMPLATES?.map(template => {
            const colors = COLOR_STYLES?.[template?.color] || COLOR_STYLES?.blue;
            const result = results?.[template?.id];
            const isSending = sending?.[template?.id];

            return (
              <div
                key={template?.id}
                className={`rounded-lg border ${colors?.border} ${colors?.bg} overflow-hidden transition-all`}
              >
                <div className="flex items-center justify-between gap-4 px-4 py-3.5">
                  {/* Left: Icon + Info */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <div className="w-9 h-9 bg-white rounded-lg flex items-center justify-center shadow-sm flex-shrink-0">
                      <Icon name={template?.icon} size={16} className={colors?.icon} />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900">{template?.label}</p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-mono font-medium ${colors?.badge}`}>
                          {template?.id}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5 truncate">{template?.description}</p>
                    </div>
                  </div>

                  {/* Right: Status + Button */}
                  <div className="flex items-center gap-3 flex-shrink-0">
                    {/* Result Badge */}
                    {result && (
                      <div className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        result?.status === 'success' ? 'bg-green-100 text-green-700' :
                        result?.status === 'error'? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {result?.status === 'success' && <Icon name="CheckCircle" size={12} />}
                        {result?.status === 'error'   && <Icon name="XCircle" size={12} />}
                        {result?.status === 'sending' && <Icon name="Loader2" size={12} className="animate-spin" />}
                        <span className="max-w-[160px] truncate">{result?.text}</span>
                      </div>
                    )}

                    {/* Send Button */}
                    <button
                      onClick={() => sendTest(template)}
                      disabled={isSending || sendingAll}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${colors?.btn}`}
                    >
                      {isSending ? (
                        <Icon name="Loader2" size={12} className="animate-spin" />
                      ) : (
                        <Icon name="Send" size={12} />
                      )}
                      {isSending ? 'Sending...' : 'Send Test'}
                    </button>
                  </div>
                </div>

                {/* Expanded Result Detail */}
                {result?.status === 'success' && (
                  <div className="px-4 pb-3 pt-0">
                    <div className="bg-white/70 rounded-lg px-3 py-2 flex items-center gap-3 text-xs text-gray-600 border border-green-100">
                      <Icon name="MailCheck" size={13} className="text-green-600 flex-shrink-0" />
                      <span>
                        <strong>Delivered</strong> at {result?.timestamp}
                        {result?.messageId && (
                          <span className="ml-2 font-mono text-gray-400">ID: {result?.messageId}</span>
                        )}
                      </span>
                      <span className="ml-auto text-green-600 font-medium">✓ Verify in inbox</span>
                    </div>
                  </div>
                )}
                {result?.status === 'error' && (
                  <div className="px-4 pb-3 pt-0">
                    <div className="bg-white/70 rounded-lg px-3 py-2 flex items-start gap-3 text-xs text-red-600 border border-red-100">
                      <Icon name="AlertTriangle" size={13} className="flex-shrink-0 mt-0.5" />
                      <div>
                        <strong>Error at {result?.timestamp}:</strong>
                        <span className="ml-1 break-all">{result?.text}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Delivery Tips */}
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-4">
          <div className="flex items-start gap-3">
            <Icon name="Info" size={15} className="text-gray-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-gray-500 space-y-1">
              <p><strong className="text-gray-700">Delivery Tips:</strong></p>
              <ul className="space-y-0.5 list-disc list-inside">
                <li>Check your <strong>spam/junk folder</strong> if emails don't appear in inbox within 1–2 minutes.</li>
                <li>Emails are sent via <strong>Resend API</strong> through Supabase edge functions.</li>
                <li>Emails are sent from <strong>noreply@goshuttle.ph</strong> using the verified <strong>goshuttle.ph</strong> domain.</li>
                <li>A <strong>401 error</strong> means the Resend API key is invalid or missing — check <code className="bg-white px-1 rounded border border-gray-200">VITE_RESEND_API_KEY</code> in your .env file.</li>
                <li>A <strong>404/network error</strong> means the edge function is not deployed — deploy via Supabase CLI.</li>
                <li>Templates that show "Not in DB" still send using built-in HTML templates from the edge function.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTestPanel;
