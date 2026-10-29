import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';

import { sendEmailViaResend } from '../../../utils/resendEmailService';

// ─── Inline email template renderers ───────────────────────────────────────

const primaryColor = '#0ea5e9';
const accentColor = '#0369a1';

const containerStyle = {
  fontFamily: "'DM Sans', 'Helvetica Neue', Arial, sans-serif",
  maxWidth: '560px',
  margin: '0 auto',
  backgroundColor: '#ffffff',
  borderRadius: '10px',
  overflow: 'hidden',
  boxShadow: '0 2px 16px rgba(0,0,0,0.08)',
};

const headerBase = (bg) => ({
  background: bg,
  padding: '28px 28px 24px',
  textAlign: 'center',
  color: '#ffffff',
});

const sectionStyle = { padding: '20px 28px', borderBottom: '1px solid #f1f5f9' };
const labelStyle = { fontSize: '10px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '3px' };
const valueStyle = { fontSize: '13px', color: '#1e293b', fontWeight: '500' };

const FooterBlock = () => (
  <div style={{ padding: '20px 28px', backgroundColor: '#f8fafc', textAlign: 'center' }}>
    <p style={{ fontSize: '11px', color: '#94a3b8', margin: 0 }}>
      This is an automated email from GoShuttle. Please do not reply directly.
    </p>
    <p style={{ fontSize: '11px', color: '#cbd5e1', marginTop: '4px' }}>
      © 2024 GoShuttle · support@goshuttle.ph · www.goshuttle.ph
    </p>
  </div>
);

// ─── GoShuttle Staff Templates ──────────────────────────────────────────────

const BookingConfirmedTemplate = () => (
  <div style={containerStyle}>
    <div style={headerBase(`linear-gradient(135deg, ${primaryColor} 0%, ${accentColor} 100%)`)}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>🚐</div>
      <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>GoShuttle</div>
      <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Booking Confirmed!</div>
      <div style={{ fontSize: '12px', opacity: 0.85 }}>Your shuttle has been reserved</div>
      <div style={{ marginTop: '12px' }}>
        <span style={{ display: 'inline-block', backgroundColor: '#dcfce7', color: '#15803d', fontSize: '11px', fontWeight: '700', padding: '3px 12px', borderRadius: '20px' }}>✓ CONFIRMED</span>
      </div>
    </div>
    <div style={{ padding: '20px 28px 0', backgroundColor: '#f8fafc' }}>
      <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>Hi <strong>Maria Santos</strong>,</p>
      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>Your booking is confirmed. Here are your trip details.</p>
    </div>
    <div style={{ padding: '16px 28px', backgroundColor: '#f8fafc' }}>
      <div style={{ background: `linear-gradient(135deg, ${primaryColor}15, ${accentColor}10)`, border: `2px solid ${primaryColor}40`, borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '6px' }}>Booking Code</div>
        <div style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '0.15em', color: accentColor, fontFamily: 'monospace' }}>GSP-2024-001</div>
      </div>
    </div>
    <div style={sectionStyle}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>📍 Trip Details</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ backgroundColor: '#f0fdf4', borderRadius: '6px', padding: '10px', borderLeft: '3px solid #22c55e' }}>
          <div style={labelStyle}>Pickup</div>
          <div style={{ ...valueStyle, fontSize: '12px' }}>Makati City Hall</div>
        </div>
        <div style={{ backgroundColor: '#fef2f2', borderRadius: '6px', padding: '10px', borderLeft: '3px solid #f87171' }}>
          <div style={labelStyle}>Drop-off</div>
          <div style={{ ...valueStyle, fontSize: '12px' }}>NAIA Terminal 3</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
        <div><div style={labelStyle}>Date</div><div style={valueStyle}>Dec 25, 2024</div></div>
        <div><div style={labelStyle}>Time</div><div style={{ ...valueStyle, color: primaryColor, fontWeight: '700' }}>08:00 AM</div></div>
        <div><div style={labelStyle}>Passengers</div><div style={valueStyle}>2 pax</div></div>
      </div>
    </div>
    <FooterBlock />
  </div>
);

const BookingCancelledTemplate = () => (
  <div style={containerStyle}>
    <div style={headerBase('linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)')}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>❌</div>
      <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>GoShuttle</div>
      <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Booking Cancelled</div>
      <div style={{ fontSize: '12px', opacity: 0.85 }}>Your booking has been cancelled</div>
      <div style={{ marginTop: '12px' }}>
        <span style={{ display: 'inline-block', backgroundColor: '#fee2e2', color: '#b91c1c', fontSize: '11px', fontWeight: '700', padding: '3px 12px', borderRadius: '20px' }}>✗ CANCELLED</span>
      </div>
    </div>
    <div style={{ padding: '20px 28px', backgroundColor: '#fef2f2' }}>
      <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>Hi <strong>Maria Santos</strong>,</p>
      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>We're sorry to inform you that your booking has been cancelled.</p>
    </div>
    <div style={sectionStyle}>
      <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
        <div style={{ fontSize: '13px', fontWeight: '600', color: '#991b1b', marginBottom: '8px' }}>Cancelled Booking Details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div><div style={labelStyle}>Booking Code</div><div style={{ ...valueStyle, fontFamily: 'monospace' }}>GSP-2024-001</div></div>
          <div><div style={labelStyle}>Cancellation Date</div><div style={valueStyle}>Dec 24, 2024</div></div>
          <div><div style={labelStyle}>Route</div><div style={{ ...valueStyle, fontSize: '12px' }}>Makati → NAIA T3</div></div>
          <div><div style={labelStyle}>Refund Status</div><div style={{ ...valueStyle, color: '#059669' }}>Processing</div></div>
        </div>
      </div>
    </div>
    <div style={{ padding: '16px 28px' }}>
      <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>If you have questions about your cancellation or refund, please contact our support team.</p>
    </div>
    <FooterBlock />
  </div>
);

const PaymentReceivedTemplate = () => (
  <div style={containerStyle}>
    <div style={headerBase('linear-gradient(135deg, #10b981 0%, #059669 100%)')}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>💰</div>
      <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>GoShuttle</div>
      <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Payment Received</div>
      <div style={{ fontSize: '12px', opacity: 0.85 }}>Your payment has been processed</div>
      <div style={{ marginTop: '12px' }}>
        <span style={{ display: 'inline-block', backgroundColor: '#d1fae5', color: '#065f46', fontSize: '11px', fontWeight: '700', padding: '3px 12px', borderRadius: '20px' }}>✓ PAID</span>
      </div>
    </div>
    <div style={{ padding: '20px 28px', backgroundColor: '#f0fdf4' }}>
      <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>Hi <strong>Maria Santos</strong>,</p>
      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>We've received your payment. Here's your receipt.</p>
    </div>
    <div style={sectionStyle}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>🧾 Payment Receipt</div>
      <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', overflow: 'hidden' }}>
        {[
          { label: 'Booking Code', value: 'GSP-2024-001' },
          { label: 'Route', value: 'Makati City Hall → NAIA T3' },
          { label: 'Date', value: 'December 25, 2024' },
          { label: 'Passengers', value: '2 pax' },
          { label: 'Vehicle', value: 'Toyota Hi-Ace Shuttle' },
          { label: 'Payment Method', value: 'GCash' },
        ]?.map((row, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 14px', borderBottom: i < 5 ? '1px solid #f1f5f9' : 'none' }}>
            <span style={{ fontSize: '12px', color: '#64748b' }}>{row?.label}</span>
            <span style={{ fontSize: '12px', color: '#1e293b', fontWeight: '500' }}>{row?.value}</span>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 14px', backgroundColor: '#ecfdf5', borderTop: '2px solid #10b981' }}>
          <span style={{ fontSize: '14px', fontWeight: '700', color: '#065f46' }}>Total Paid</span>
          <span style={{ fontSize: '18px', fontWeight: '800', color: '#059669' }}>₱850.00</span>
        </div>
      </div>
    </div>
    <FooterBlock />
  </div>
);

// ─── GoShuttle Staff Notification: New Driver Sign-up ───────────────────────

const DriverSignupStaffTemplate = () => (
  <div style={containerStyle}>
    <div style={headerBase('linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)')}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>🔔</div>
      <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>GoShuttle Staff</div>
      <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>New Driver Application</div>
      <div style={{ fontSize: '12px', opacity: 0.85 }}>Action required — review in admin dashboard</div>
      <div style={{ marginTop: '12px' }}>
        <span style={{ display: 'inline-block', backgroundColor: '#dbeafe', color: '#1e40af', fontSize: '11px', fontWeight: '700', padding: '3px 12px', borderRadius: '20px' }}>🆕 PENDING REVIEW</span>
      </div>
    </div>
    <div style={{ padding: '20px 28px', backgroundColor: '#eff6ff' }}>
      <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>Hello <strong>GoShuttle Team</strong>,</p>
      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>A new driver/partner has submitted a registration application and is awaiting your review.</p>
    </div>
    <div style={sectionStyle}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>👤 Applicant Details</div>
      <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><div style={labelStyle}>Full Name</div><div style={valueStyle}>Juan dela Cruz</div></div>
          <div><div style={labelStyle}>Email</div><div style={{ ...valueStyle, fontSize: '12px' }}>juan@email.com</div></div>
          <div><div style={labelStyle}>Phone</div><div style={valueStyle}>+63 917 123 4567</div></div>
          <div><div style={labelStyle}>License No.</div><div style={{ ...valueStyle, fontFamily: 'monospace' }}>N01-23-456789</div></div>
          <div><div style={labelStyle}>Fleet Type</div><div style={valueStyle}>Shuttle Van</div></div>
          <div><div style={labelStyle}>Applied</div><div style={valueStyle}>Dec 24, 2024</div></div>
        </div>
      </div>
    </div>
    <div style={{ padding: '16px 28px' }}>
      <div style={{ backgroundColor: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#1e40af', fontWeight: '600', margin: '0 0 8px' }}>Review this application in the Admin Dashboard</p>
        <span style={{ display: 'inline-block', backgroundColor: '#1d4ed8', color: '#ffffff', fontSize: '12px', fontWeight: '700', padding: '8px 20px', borderRadius: '6px' }}>Go to Driver Management →</span>
      </div>
    </div>
    <FooterBlock />
  </div>
);

// ─── Partner Templates ──────────────────────────────────────────────────────

const PartnerWelcomeTemplate = () => (
  <div style={containerStyle}>
    <div style={headerBase('linear-gradient(135deg, #f59e0b 0%, #d97706 100%)')}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>🤝</div>
      <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>GoShuttle</div>
      <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>Welcome, Partner!</div>
      <div style={{ fontSize: '12px', opacity: 0.85 }}>Your application has been received</div>
      <div style={{ marginTop: '12px' }}>
        <span style={{ display: 'inline-block', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: '700', padding: '3px 12px', borderRadius: '20px' }}>📋 UNDER REVIEW</span>
      </div>
    </div>
    <div style={{ padding: '24px 28px', backgroundColor: '#fffbeb' }}>
      <p style={{ fontSize: '15px', color: '#334155', margin: 0 }}>Hi <strong>Juan dela Cruz</strong>,</p>
      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '8px', marginBottom: 0, lineHeight: '1.6' }}>
        Thank you for applying to become a GoShuttle driver/partner! We've received your application and our team is currently reviewing your details. You'll hear from us within <strong>2–3 business days</strong>.
      </p>
    </div>
    <div style={sectionStyle}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>📋 Your Application Summary</div>
      <div style={{ backgroundColor: '#f8fafc', borderRadius: '8px', padding: '14px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div><div style={labelStyle}>Full Name</div><div style={valueStyle}>Juan dela Cruz</div></div>
          <div><div style={labelStyle}>Application Date</div><div style={valueStyle}>Dec 24, 2024</div></div>
          <div><div style={labelStyle}>Fleet Type</div><div style={valueStyle}>Shuttle Van</div></div>
          <div><div style={labelStyle}>License No.</div><div style={{ ...valueStyle, fontFamily: 'monospace' }}>N01-23-456789</div></div>
        </div>
      </div>
    </div>
    <div style={{ padding: '16px 28px' }}>
      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px' }}>
        <div style={{ fontSize: '13px', fontWeight: '700', color: '#92400e', marginBottom: '8px' }}>📌 What Happens Next?</div>
        <ol style={{ margin: 0, paddingLeft: '18px', fontSize: '12px', color: '#78350f', lineHeight: '1.8' }}>
          <li>Our team reviews your submitted documents</li>
          <li>Background and license verification</li>
          <li>You'll receive an approval or follow-up email</li>
          <li>Once approved, you'll get access to the GoShuttle partner portal</li>
        </ol>
      </div>
    </div>
    <div style={{ padding: '0 28px 20px' }}>
      <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
        Questions? Contact us at <strong>partners@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong>
      </p>
    </div>
    <FooterBlock />
  </div>
);

const PartnerBookingTemplate = () => (
  <div style={containerStyle}>
    <div style={headerBase('linear-gradient(135deg, #f59e0b 0%, #b45309 100%)')}>
      <div style={{ fontSize: '24px', marginBottom: '6px' }}>🚐</div>
      <div style={{ fontSize: '20px', fontWeight: '800', marginBottom: '4px' }}>GoShuttle Partner</div>
      <div style={{ fontSize: '22px', fontWeight: '700', marginBottom: '4px' }}>New Booking Assigned</div>
      <div style={{ fontSize: '12px', opacity: 0.85 }}>A GoShuttle booking has been assigned to your fleet</div>
      <div style={{ marginTop: '12px' }}>
        <span style={{ display: 'inline-block', backgroundColor: '#fef3c7', color: '#92400e', fontSize: '11px', fontWeight: '700', padding: '3px 12px', borderRadius: '20px' }}>📦 NEW ASSIGNMENT</span>
      </div>
    </div>
    <div style={{ padding: '20px 28px 0', backgroundColor: '#fffbeb' }}>
      <p style={{ fontSize: '14px', color: '#334155', margin: 0 }}>Hi <strong>Partner Team</strong>,</p>
      <p style={{ fontSize: '13px', color: '#64748b', marginTop: '4px', marginBottom: 0 }}>A new GoShuttle booking has been assigned to your fleet. Please review the details below.</p>
    </div>
    <div style={{ padding: '16px 28px', backgroundColor: '#fffbeb' }}>
      <div style={{ background: 'linear-gradient(135deg, #fef3c715, #fde68a10)', border: '2px solid #fde68a', borderRadius: '8px', padding: '16px', textAlign: 'center' }}>
        <div style={{ fontSize: '10px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#64748b', marginBottom: '6px' }}>Booking Reference</div>
        <div style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '0.15em', color: '#b45309', fontFamily: 'monospace' }}>GSP-2024-001</div>
      </div>
    </div>
    <div style={sectionStyle}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '12px' }}>📍 Trip Details</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
        <div style={{ backgroundColor: '#f0fdf4', borderRadius: '6px', padding: '10px', borderLeft: '3px solid #22c55e' }}>
          <div style={labelStyle}>Pickup Location</div>
          <div style={{ ...valueStyle, fontSize: '12px' }}>Makati City Hall</div>
        </div>
        <div style={{ backgroundColor: '#fef2f2', borderRadius: '6px', padding: '10px', borderLeft: '3px solid #f87171' }}>
          <div style={labelStyle}>Drop-off Location</div>
          <div style={{ ...valueStyle, fontSize: '12px' }}>NAIA Terminal 3</div>
        </div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', marginTop: '10px' }}>
        <div><div style={labelStyle}>Date</div><div style={valueStyle}>Dec 25, 2024</div></div>
        <div><div style={labelStyle}>Time</div><div style={{ ...valueStyle, color: '#b45309', fontWeight: '700' }}>08:00 AM</div></div>
        <div><div style={labelStyle}>Passengers</div><div style={valueStyle}>2 pax</div></div>
      </div>
    </div>
    <div style={{ padding: '16px 28px', borderBottom: '1px solid #f1f5f9' }}>
      <div style={{ fontSize: '14px', fontWeight: '700', color: '#1e293b', marginBottom: '10px' }}>👤 Customer Info</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
        <div><div style={labelStyle}>Name</div><div style={valueStyle}>Maria Santos</div></div>
        <div><div style={labelStyle}>Phone</div><div style={valueStyle}>+63 917 000 0000</div></div>
      </div>
    </div>
    <div style={{ padding: '16px 28px' }}>
      <div style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '14px', textAlign: 'center' }}>
        <p style={{ fontSize: '13px', color: '#92400e', fontWeight: '600', margin: '0 0 8px' }}>Log in to your Partner Portal to manage this booking</p>
        <span style={{ display: 'inline-block', backgroundColor: '#d97706', color: '#ffffff', fontSize: '12px', fontWeight: '700', padding: '8px 20px', borderRadius: '6px' }}>View in Partner Portal →</span>
      </div>
    </div>
    <FooterBlock />
  </div>
);

// ─── Template config ────────────────────────────────────────────────────────

const TEMPLATES = [
  {
    id: 'booking_confirmed',
    label: 'Booking Confirmed',
    icon: 'CheckCircle',
    color: 'text-green-600',
    bg: 'bg-green-50 border-green-200',
    activeBg: 'bg-green-600',
    description: 'Sent to customers when their booking is confirmed',
    badge: 'Customer',
    badgeColor: 'bg-green-100 text-green-700',
    component: BookingConfirmedTemplate,
  },
  {
    id: 'booking_cancelled',
    label: 'Booking Cancelled',
    icon: 'XCircle',
    color: 'text-red-600',
    bg: 'bg-red-50 border-red-200',
    activeBg: 'bg-red-600',
    description: 'Sent when a booking is cancelled by admin or customer',
    badge: 'Customer',
    badgeColor: 'bg-red-100 text-red-700',
    component: BookingCancelledTemplate,
  },
  {
    id: 'payment_received',
    label: 'Payment Received',
    icon: 'CreditCard',
    color: 'text-emerald-600',
    bg: 'bg-emerald-50 border-emerald-200',
    activeBg: 'bg-emerald-600',
    description: 'Sent after a successful payment is processed',
    badge: 'Customer',
    badgeColor: 'bg-emerald-100 text-emerald-700',
    component: PaymentReceivedTemplate,
  },
  {
    id: 'driver_signup_staff',
    label: 'Driver Sign-up (Staff)',
    icon: 'Bell',
    color: 'text-blue-600',
    bg: 'bg-blue-50 border-blue-200',
    activeBg: 'bg-blue-600',
    description: 'Sent to GoShuttle staff when a new driver submits an application',
    badge: 'GoShuttle Staff',
    badgeColor: 'bg-blue-100 text-blue-700',
    component: DriverSignupStaffTemplate,
  },
  {
    id: 'partner_welcome',
    label: 'Partner Welcome',
    icon: 'Handshake',
    color: 'text-amber-600',
    bg: 'bg-amber-50 border-amber-200',
    activeBg: 'bg-amber-600',
    description: 'Welcome email sent to the driver/partner upon successful signup',
    badge: 'Partner',
    badgeColor: 'bg-amber-100 text-amber-700',
    component: PartnerWelcomeTemplate,
  },
  {
    id: 'partner_booking',
    label: 'Partner Booking Notification',
    icon: 'Truck',
    color: 'text-orange-600',
    bg: 'bg-orange-50 border-orange-200',
    activeBg: 'bg-orange-600',
    description: 'Sent to fleet partners when a GoShuttle booking is assigned to them',
    badge: 'Partner',
    badgeColor: 'bg-orange-100 text-orange-700',
    component: PartnerBookingTemplate,
  },
];

// ─── Main Modal ─────────────────────────────────────────────────────────────

const EmailTemplatePreviewModal = ({ isOpen, onClose }) => {
  const [activeTemplate, setActiveTemplate] = useState('booking_confirmed');
  const [testEmail, setTestEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [sendResult, setSendResult] = useState(null);

  if (!isOpen) return null;

  const active = TEMPLATES?.find(t => t?.id === activeTemplate);
  const ActiveComponent = active?.component;

  const handleSendTest = async () => {
    if (!testEmail?.trim()) {
      setSendResult({ success: false, message: 'Please enter a valid email address.' });
      return;
    }
    setSending(true);
    setSendResult(null);

    const sampleData = {
      booking_id: 'GSP-2024-TEST',
      customer_name: 'Test Customer',
      route: 'Makati → NAIA T3',
      pickup_time: '08:00 AM',
      vehicle_type: 'Toyota Hi-Ace Shuttle',
      template_preview: activeTemplate,
    };

    let edgeFailed = false;

    // Try edge function first
    try {
      const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-booking-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'test_email',
          to_email: testEmail?.trim(),
          test_data: sampleData,
        }),
      });
      const result = await response?.json();
      if (response?.ok && result?.success !== false && !result?.fallback_required) {
        setSendResult({ success: true, message: `Test email sent to ${testEmail}! Check your inbox.` });
        setSending(false);
        return;
      }
      edgeFailed = true;
    } catch {
      edgeFailed = true;
    }

    // Fallback: direct Resend API
    try {
      const subject = `🧪 GoShuttle – Email Template Preview Test (${active?.label || activeTemplate})`;
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #0ea5e9; text-align: center;">🚀 GoShuttle Email Test</h1>
            <p style="color: #374151; text-align: center;">Your email configuration is working correctly.</p>
            <div style="background-color: #eff6ff; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-top: 16px;">
              <p style="margin: 0; color: #1e40af;"><strong>Template:</strong> ${active?.label || activeTemplate}</p>
              <p style="margin: 8px 0 0 0; color: #1e40af;"><strong>Sent To:</strong> ${testEmail?.trim()}</p>
              <p style="margin: 8px 0 0 0; color: #1e40af;"><strong>Time:</strong> ${new Date()?.toLocaleString()}</p>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">GoShuttle Pro - Premium Transportation Service</p>
          </div>
        </div>
      `;
      const directResult = await sendEmailViaResend(testEmail?.trim(), subject, html);
      if (directResult?.success) {
        setSendResult({ success: true, message: `Test email sent to ${testEmail} via direct Resend. Check your inbox.` });
      } else {
        setSendResult({ success: false, message: directResult?.error || 'Failed to send test email. Check your Resend API key.' });
      }
    } catch (err) {
      setSendResult({ success: false, message: err?.message || 'Failed to send test email.' });
    } finally {
      setSending(false);
    }
  };

  // Group templates by audience
  const staffTemplates = TEMPLATES?.filter(t => ['booking_confirmed', 'booking_cancelled', 'payment_received', 'driver_signup_staff']?.includes(t?.id));
  const partnerTemplates = TEMPLATES?.filter(t => ['partner_welcome', 'partner_booking']?.includes(t?.id));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-sky-50 to-blue-50 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-sky-600 rounded-lg flex items-center justify-center">
              <Icon name="Mail" size={18} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">Email Template Preview</h2>
              <p className="text-xs text-gray-500">Live HTML rendering of all GoShuttle notification emails</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <Icon name="X" size={20} />
          </button>
        </div>

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r border-gray-200 flex flex-col bg-gray-50 flex-shrink-0 overflow-y-auto">
            <div className="p-3">
              {/* GoShuttle Staff Group */}
              <div className="mb-1">
                <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                  <Icon name="Shield" size={12} className="text-blue-500" />
                  <span className="text-xs font-semibold text-blue-700 uppercase tracking-wider">GoShuttle Staff</span>
                </div>
                {staffTemplates?.map(t => (
                  <button
                    key={t?.id}
                    onClick={() => setActiveTemplate(t?.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 border transition-all ${
                      activeTemplate === t?.id
                        ? `${t?.activeBg} text-white border-transparent shadow-sm`
                        : `bg-white ${t?.bg} hover:shadow-sm`
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon name={t?.icon} size={13} className={activeTemplate === t?.id ? 'text-white' : t?.color} />
                      <span className={`text-xs font-semibold ${activeTemplate === t?.id ? 'text-white' : 'text-gray-800'}`}>{t?.label}</span>
                    </div>
                    <p className={`text-xs leading-tight ${activeTemplate === t?.id ? 'text-white/80' : 'text-gray-500'}`}>{t?.description}</p>
                  </button>
                ))}
              </div>

              {/* Partner Group */}
              <div className="mt-3">
                <div className="flex items-center gap-1.5 px-2 py-1.5 mb-1">
                  <Icon name="Handshake" size={12} className="text-amber-500" />
                  <span className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Partner / Driver</span>
                </div>
                {partnerTemplates?.map(t => (
                  <button
                    key={t?.id}
                    onClick={() => setActiveTemplate(t?.id)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg mb-1 border transition-all ${
                      activeTemplate === t?.id
                        ? `${t?.activeBg} text-white border-transparent shadow-sm`
                        : `bg-white ${t?.bg} hover:shadow-sm`
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <Icon name={t?.icon} size={13} className={activeTemplate === t?.id ? 'text-white' : t?.color} />
                      <span className={`text-xs font-semibold ${activeTemplate === t?.id ? 'text-white' : 'text-gray-800'}`}>{t?.label}</span>
                    </div>
                    <p className={`text-xs leading-tight ${activeTemplate === t?.id ? 'text-white/80' : 'text-gray-500'}`}>{t?.description}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Preview Pane */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Template Meta Bar */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100 bg-white flex-shrink-0">
              <div className="flex items-center gap-2">
                <Icon name={active?.icon} size={16} className={active?.color} />
                <span className="text-sm font-semibold text-gray-800">{active?.label}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${active?.badgeColor}`}>{active?.badge}</span>
              </div>
              <p className="text-xs text-gray-500 hidden md:block">{active?.description}</p>
            </div>

            {/* HTML Preview */}
            <div className="flex-1 overflow-y-auto bg-gray-100 p-4">
              <div className="max-w-xl mx-auto">
                {ActiveComponent && <ActiveComponent />}
              </div>
            </div>

            {/* Test Send Bar */}
            <div className="border-t border-gray-200 bg-white px-5 py-3 flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <input
                    type="email"
                    value={testEmail}
                    onChange={(e) => setTestEmail(e?.target?.value)}
                    placeholder="Enter your email to send a test..."
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent"
                    onKeyDown={(e) => e?.key === 'Enter' && handleSendTest()}
                  />
                </div>
                <button
                  onClick={handleSendTest}
                  disabled={sending}
                  className="flex items-center gap-2 px-4 py-2 bg-sky-600 text-white text-sm font-medium rounded-lg hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {sending ? (
                    <Icon name="Loader2" size={14} className="animate-spin" />
                  ) : (
                    <Icon name="Send" size={14} />
                  )}
                  {sending ? 'Sending…' : 'Send Test'}
                </button>
              </div>
              {sendResult && (
                <p className={`mt-2 text-xs font-medium ${sendResult?.success ? 'text-green-600' : 'text-red-600'}`}>
                  {sendResult?.success ? '✅' : '❌'} {sendResult?.message}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailTemplatePreviewModal;
