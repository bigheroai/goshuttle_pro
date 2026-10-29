import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../components/AppIcon';


import BookingEmailTemplate from './components/BookingEmailTemplate';

const defaultTemplateConfig = {
  // Branding
  companyName: 'GoShuttle Pro',
  companyTagline: 'Your Trusted Transportation Partner',
  primaryColor: '#0ea5e9',
  accentColor: '#0369a1',
  logoUrl: '',

  // Header
  showLogo: true,
  headerTitle: 'Booking Confirmed!',
  headerSubtitle: 'Your shuttle has been reserved',

  // Sections visibility
  showBookingCode: true,
  showTripDetails: true,
  showDriverContact: true,
  showPickupInstructions: true,
  showPaymentInfo: true,
  showSupportContact: true,

  // Pickup Instructions
  pickupInstructions: [
    'Arrive 15 minutes before your scheduled pickup time',
    'Bring a valid government-issued ID for verification',
    'Wait at the designated pickup point shown on your booking',
    'Look for the GoShuttle vehicle with your booking code displayed',
    'All vehicles are non-smoking — thank you for your cooperation',
  ],

  // Support Contact
  supportPhone: '+63 2 8888 4567',
  supportEmail: 'support@goshuttle.ph',
  supportWebsite: 'www.goshuttle.ph',

  // Footer
  footerNote: 'This is an automated confirmation. Please do not reply to this email.',
};

const sampleBookingData = {
  bookingCode: 'GSP-2024-001',
  bookingId: 'a1b2c3d4',
  customerName: 'Maria Santos',
  customerEmail: 'maria.santos@email.com',
  pickupLocation: 'Makati City Hall, Makati',
  dropoffLocation: 'NAIA Terminal 3, Pasay',
  pickupDate: '2024-12-25',
  pickupTime: '08:00 AM',
  passengerCount: 2,
  vehicleName: 'Toyota Hi-Ace',
  vehicleType: 'Shuttle Van',
  vehicleCapacity: 10,
  driverName: 'Juan dela Cruz',
  driverPhone: '+63 917 123 4567',
  driverLicensePlate: 'ABC 1234',
  driverRating: 4.8,
  totalAmount: 850,
  paymentMethod: 'Pay on Pickup',
  paymentStatus: 'Pending',
  specialRequests: 'Window seat preferred',
};

const TABS = [
  { id: 'preview', label: 'Preview', icon: 'Eye' },
  { id: 'customize', label: 'Customize', icon: 'Settings' },
  { id: 'sample-data', label: 'Sample Data', icon: 'Database' },
];

export default function EmailTemplatePreview() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('preview');
  const [config, setConfig] = useState(defaultTemplateConfig);
  const [booking, setBooking] = useState(sampleBookingData);
  const [copySuccess, setCopySuccess] = useState(false);

  const updateConfig = (key, value) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  const updateBooking = (key, value) => {
    setBooking(prev => ({ ...prev, [key]: value }));
  };

  const updatePickupInstruction = (index, value) => {
    const updated = [...config?.pickupInstructions];
    updated[index] = value;
    updateConfig('pickupInstructions', updated);
  };

  const addPickupInstruction = () => {
    updateConfig('pickupInstructions', [...config?.pickupInstructions, '']);
  };

  const removePickupInstruction = (index) => {
    const updated = config?.pickupInstructions?.filter((_, i) => i !== index);
    updateConfig('pickupInstructions', updated);
  };

  const handleCopyHTML = () => {
    const htmlContent = document.getElementById('email-template-render')?.innerHTML;
    if (htmlContent) {
      navigator.clipboard?.writeText(htmlContent)?.then(() => {
        setCopySuccess(true);
        setTimeout(() => setCopySuccess(false), 2000);
      });
    }
  };

  const handleResetConfig = () => {
    setConfig(defaultTemplateConfig);
    setBooking(sampleBookingData);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Bar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-screen-xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(-1)}
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
            >
              <Icon name="ArrowLeft" size={18} />
            </button>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Email Template Editor</h1>
              <p className="text-xs text-gray-500">Booking Confirmation Email</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResetConfig}
              className="px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors flex items-center gap-1.5"
            >
              <Icon name="RotateCcw" size={14} />
              Reset
            </button>
            <button
              onClick={handleCopyHTML}
              className="px-3 py-1.5 text-sm bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors flex items-center gap-1.5"
            >
              <Icon name={copySuccess ? 'Check' : 'Copy'} size={14} />
              {copySuccess ? 'Copied!' : 'Copy HTML'}
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="max-w-screen-xl mx-auto px-4 flex gap-1 pb-0">
          {TABS?.map(tab => (
            <button
              key={tab?.id}
              onClick={() => setActiveTab(tab?.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab?.id
                  ? 'border-sky-600 text-sky-600' :'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon name={tab?.icon} size={14} />
              {tab?.label}
            </button>
          ))}
        </div>
      </div>
      <div className="max-w-screen-xl mx-auto px-4 py-6">
        {activeTab === 'preview' && (
          <div className="flex gap-6">
            {/* Email Preview */}
            <div className="flex-1 min-w-0">
              <div className="bg-gray-200 rounded-xl p-4">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                  <span className="ml-2 text-xs text-gray-500 font-mono">Email Preview — 600px width</span>
                </div>
                <div className="bg-gray-100 rounded-lg overflow-auto max-h-[calc(100vh-200px)]">
                  <div id="email-template-render" className="mx-auto" style={{ maxWidth: 600 }}>
                    <BookingEmailTemplate config={config} booking={booking} />
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="w-64 shrink-0 space-y-4">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Sections Enabled</h3>
                <div className="space-y-2">
                  {[
                    { key: 'showBookingCode', label: 'Booking Code' },
                    { key: 'showTripDetails', label: 'Trip Details' },
                    { key: 'showDriverContact', label: 'Driver Contact' },
                    { key: 'showPickupInstructions', label: 'Pickup Instructions' },
                    { key: 'showPaymentInfo', label: 'Payment Info' },
                    { key: 'showSupportContact', label: 'Support Contact' },
                  ]?.map(item => (
                    <div key={item?.key} className="flex items-center justify-between">
                      <span className="text-xs text-gray-600">{item?.label}</span>
                      <button
                        onClick={() => updateConfig(item?.key, !config?.[item?.key])}
                        className={`w-8 h-4 rounded-full transition-colors relative ${
                          config?.[item?.key] ? 'bg-sky-500' : 'bg-gray-300'
                        }`}
                      >
                        <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-transform ${
                          config?.[item?.key] ? 'translate-x-4' : 'translate-x-0.5'
                        }`} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-3">Brand Colors</h3>
                <div className="space-y-3">
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config?.primaryColor}
                        onChange={e => updateConfig('primaryColor', e?.target?.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                      />
                      <span className="text-xs font-mono text-gray-600">{config?.primaryColor}</span>
                    </div>
                  </div>
                  <div>
                    <label className="text-xs text-gray-500 block mb-1">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config?.accentColor}
                        onChange={e => updateConfig('accentColor', e?.target?.value)}
                        className="w-8 h-8 rounded cursor-pointer border border-gray-200"
                      />
                      <span className="text-xs font-mono text-gray-600">{config?.accentColor}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'customize' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Branding */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Icon name="Palette" size={16} className="text-sky-600" />
                Branding
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Company Name</label>
                  <input
                    type="text"
                    value={config?.companyName}
                    onChange={e => updateConfig('companyName', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Tagline</label>
                  <input
                    type="text"
                    value={config?.companyTagline}
                    onChange={e => updateConfig('companyTagline', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Primary Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config?.primaryColor}
                        onChange={e => updateConfig('primaryColor', e?.target?.value)}
                        className="w-9 h-9 rounded cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={config?.primaryColor}
                        onChange={e => updateConfig('primaryColor', e?.target?.value)}
                        className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 block mb-1">Accent Color</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={config?.accentColor}
                        onChange={e => updateConfig('accentColor', e?.target?.value)}
                        className="w-9 h-9 rounded cursor-pointer border border-gray-200"
                      />
                      <input
                        type="text"
                        value={config?.accentColor}
                        onChange={e => updateConfig('accentColor', e?.target?.value)}
                        className="flex-1 px-2 py-1.5 text-xs font-mono border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Icon name="Type" size={16} className="text-sky-600" />
                Header Text
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Header Title</label>
                  <input
                    type="text"
                    value={config?.headerTitle}
                    onChange={e => updateConfig('headerTitle', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Header Subtitle</label>
                  <input
                    type="text"
                    value={config?.headerSubtitle}
                    onChange={e => updateConfig('headerSubtitle', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Support Contact */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Icon name="Phone" size={16} className="text-sky-600" />
                Support Contact
              </h3>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Phone</label>
                  <input
                    type="text"
                    value={config?.supportPhone}
                    onChange={e => updateConfig('supportPhone', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Email</label>
                  <input
                    type="email"
                    value={config?.supportEmail}
                    onChange={e => updateConfig('supportEmail', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Website</label>
                  <input
                    type="text"
                    value={config?.supportWebsite}
                    onChange={e => updateConfig('supportWebsite', e?.target?.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>

            {/* Pickup Instructions */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Icon name="MapPin" size={16} className="text-sky-600" />
                Pickup Instructions
              </h3>
              <div className="space-y-2">
                {config?.pickupInstructions?.map((instruction, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <span className="mt-2 text-xs font-bold text-sky-600 w-5 shrink-0">{index + 1}.</span>
                    <input
                      type="text"
                      value={instruction}
                      onChange={e => updatePickupInstruction(index, e?.target?.value)}
                      className="flex-1 px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                    <button
                      onClick={() => removePickupInstruction(index)}
                      className="mt-1.5 p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Icon name="Trash2" size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addPickupInstruction}
                  className="w-full mt-2 py-2 text-xs text-sky-600 border border-dashed border-sky-300 rounded-lg hover:bg-sky-50 transition-colors flex items-center justify-center gap-1"
                >
                  <Icon name="Plus" size={13} />
                  Add Instruction
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-white rounded-xl border border-gray-200 p-5 lg:col-span-2">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Icon name="AlignBottom" size={16} className="text-sky-600" />
                Footer Note
              </h3>
              <textarea
                value={config?.footerNote}
                onChange={e => updateConfig('footerNote', e?.target?.value)}
                rows={2}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 resize-none"
              />
            </div>
          </div>
        )}

        {activeTab === 'sample-data' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Booking Info */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Icon name="FileText" size={16} className="text-sky-600" />
                Booking Info
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'bookingCode', label: 'Booking Code' },
                  { key: 'customerName', label: 'Customer Name' },
                  { key: 'customerEmail', label: 'Customer Email' },
                  { key: 'pickupLocation', label: 'Pickup Location' },
                  { key: 'dropoffLocation', label: 'Drop-off Location' },
                  { key: 'pickupDate', label: 'Pickup Date' },
                  { key: 'pickupTime', label: 'Pickup Time' },
                ]?.map(field => (
                  <div key={field?.key}>
                    <label className="text-xs font-medium text-gray-600 block mb-1">{field?.label}</label>
                    <input
                      type="text"
                      value={booking?.[field?.key] || ''}
                      onChange={e => updateBooking(field?.key, e?.target?.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Vehicle & Driver */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-semibold text-gray-800 mb-4 flex items-center gap-2">
                <Icon name="Car" size={16} className="text-sky-600" />
                Vehicle & Driver
              </h3>
              <div className="space-y-3">
                {[
                  { key: 'vehicleName', label: 'Vehicle Name' },
                  { key: 'vehicleType', label: 'Vehicle Type' },
                  { key: 'driverName', label: 'Driver Name' },
                  { key: 'driverPhone', label: 'Driver Phone' },
                  { key: 'driverLicensePlate', label: 'License Plate' },
                  { key: 'paymentMethod', label: 'Payment Method' },
                  { key: 'specialRequests', label: 'Special Requests' },
                ]?.map(field => (
                  <div key={field?.key}>
                    <label className="text-xs font-medium text-gray-600 block mb-1">{field?.label}</label>
                    <input
                      type="text"
                      value={booking?.[field?.key] || ''}
                      onChange={e => updateBooking(field?.key, e?.target?.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                ))}
                <div>
                  <label className="text-xs font-medium text-gray-600 block mb-1">Total Amount (₱)</label>
                  <input
                    type="number"
                    value={booking?.totalAmount || ''}
                    onChange={e => updateBooking('totalAmount', Number(e?.target?.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
