import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { generateCorporateInvoicePDF } from '../../../utils/invoiceGenerator';
import corporateEmailService from '../../../services/corporateEmailService';

/**
 * InvoiceReceiptModal
 * Shown after a corporate booking is confirmed.
 * Allows the user to download the PDF invoice and/or send it by email.
 */
const InvoiceReceiptModal = ({ isOpen, onClose, booking, userProfile }) => {
  const [downloading, setDownloading] = useState(false);
  const [sending, setSending] = useState(false);
  const [emailSent, setEmailSent] = useState(false);
  const [emailError, setEmailError] = useState('');

  if (!isOpen || !booking) return null;

  const companyName = userProfile?.company_name || userProfile?.companyName || 'Your Company';
  const passengerName = userProfile?.full_name || userProfile?.fullName || '';
  const passengerEmail = userProfile?.email || '';

  const invoiceData = {
    invoiceNumber: `INV-${booking?.bookingCode || booking?.id || Date.now()}`,
    bookingId: booking?.id,
    bookingCode: booking?.bookingCode || booking?.id,
    companyName,
    companyAddress: userProfile?.company_address || '',
    passengerName,
    passengerEmail,
    pickupLocation: booking?.pickupLocation || booking?.pickup_location,
    dropoffLocation: booking?.dropoffLocation || booking?.dropoff_location,
    pickupDate: booking?.pickupDate || booking?.pickup_date,
    vehicleName: booking?.vehicleName || booking?.vehicles?.name,
    vehicleType: booking?.vehicleType,
    passengerCount: booking?.passengerCount || booking?.passenger_count || 1,
    notes: booking?.notes,
    baseFare: booking?.baseFare || booking?.base_fare,
    serviceFee: booking?.serviceFee || booking?.service_fee,
    totalCost: booking?.totalCost || booking?.total_cost || 0,
    status: booking?.status || 'confirmed',
    createdAt: booking?.createdAt || booking?.created_at || new Date()?.toISOString(),
  };

  const formatCurrency = (amount) => {
    const num = parseFloat(amount || 0);
    return `₱${num?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'N/A';
    try {
      return new Date(dateStr)?.toLocaleString('en-PH', {
        weekday: 'short', year: 'numeric', month: 'short',
        day: 'numeric', hour: '2-digit', minute: '2-digit',
      });
    } catch (_) { return String(dateStr); }
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      generateCorporateInvoicePDF(invoiceData);
    } catch (err) {
      console.error('PDF generation error:', err);
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
  };

  const handleSendEmail = async () => {
    if (!passengerEmail) {
      setEmailError('No email address found for your account.');
      return;
    }
    setSending(true);
    setEmailError('');
    try {
      const result = await corporateEmailService?.sendBookingConfirmation({
        booking: {
          ...booking,
          bookingCode: invoiceData?.invoiceNumber,
          pickupLocation: invoiceData?.pickupLocation,
          dropoffLocation: invoiceData?.dropoffLocation,
          pickupDate: invoiceData?.pickupDate,
          vehicleName: invoiceData?.vehicleName,
          passengerCount: invoiceData?.passengerCount,
          totalCost: invoiceData?.totalCost,
          notes: invoiceData?.notes,
        },
        recipientEmail: passengerEmail,
        recipientName: passengerName,
        companyName,
      });
      if (result?.success) {
        setEmailSent(true);
      } else {
        setEmailError(result?.error || 'Failed to send email. Please try again.');
      }
    } catch (err) {
      setEmailError('Failed to send email. Please try again.');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Icon name="FileText" size={20} className="text-white" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Invoice Receipt</h2>
                <p className="text-blue-200 text-xs">Corporate Booking Confirmation</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center transition-colors"
            >
              <Icon name="X" size={16} className="text-white" />
            </button>
          </div>
        </div>

        {/* Booking Confirmed Banner */}
        <div className="mx-6 mt-5 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center space-x-3">
          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
            <Icon name="CheckCircle" size={18} className="text-green-600" />
          </div>
          <div>
            <p className="text-sm font-semibold text-green-800">Booking Confirmed!</p>
            <p className="text-xs text-green-600">
              Ref: <span className="font-mono font-bold">{invoiceData?.invoiceNumber}</span>
            </p>
          </div>
        </div>

        {/* Invoice Summary */}
        <div className="px-6 py-5 space-y-4">
          {/* Route */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center shrink-0">
                <Icon name="MapPin" size={11} className="text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">PICKUP</p>
                <p className="text-sm text-gray-900 font-medium truncate">{invoiceData?.pickupLocation || 'N/A'}</p>
              </div>
            </div>
            <div className="flex items-start space-x-3">
              <div className="mt-0.5 w-5 h-5 bg-red-100 rounded-full flex items-center justify-center shrink-0">
                <Icon name="MapPin" size={11} className="text-red-500" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-gray-500 font-medium">DROP-OFF</p>
                <p className="text-sm text-gray-900 font-medium truncate">{invoiceData?.dropoffLocation || 'N/A'}</p>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Date & Time</p>
              <p className="text-xs font-semibold text-gray-800">{formatDate(invoiceData?.pickupDate)}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Vehicle</p>
              <p className="text-xs font-semibold text-gray-800">{invoiceData?.vehicleName || 'N/A'}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Passengers</p>
              <p className="text-xs font-semibold text-gray-800">{invoiceData?.passengerCount}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">Company</p>
              <p className="text-xs font-semibold text-gray-800 truncate">{companyName}</p>
            </div>
          </div>

          {/* Passenger Info */}
          {passengerName && (
            <div className="flex items-center space-x-3 bg-blue-50 rounded-xl px-4 py-3">
              <Icon name="User" size={16} className="text-blue-600 shrink-0" />
              <div className="min-w-0">
                <p className="text-xs text-blue-600 font-medium">Passenger</p>
                <p className="text-sm font-semibold text-blue-900 truncate">{passengerName}</p>
                {passengerEmail && <p className="text-xs text-blue-600 truncate">{passengerEmail}</p>}
              </div>
            </div>
          )}

          {/* Total Cost */}
          <div className="flex items-center justify-between bg-blue-600 rounded-xl px-5 py-4">
            <div>
              <p className="text-blue-200 text-xs font-medium">TOTAL AMOUNT</p>
              <p className="text-white text-2xl font-bold">{formatCurrency(invoiceData?.totalCost)}</p>
            </div>
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Icon name="Receipt" size={22} className="text-white" />
            </div>
          </div>

          {/* Email status */}
          {emailSent && (
            <div className="flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
              <Icon name="CheckCircle" size={16} className="text-green-600 shrink-0" />
              <p className="text-sm text-green-700">Invoice sent to <strong>{passengerEmail}</strong></p>
            </div>
          )}
          {emailError && (
            <div className="flex items-center space-x-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <Icon name="AlertCircle" size={16} className="text-red-500 shrink-0" />
              <p className="text-sm text-red-600">{emailError}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 space-y-3">
          <Button
            onClick={handleDownload}
            disabled={downloading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-xl flex items-center justify-center space-x-2"
          >
            {downloading ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Generating PDF…</span>
              </>
            ) : (
              <>
                <Icon name="Download" size={18} />
                <span>Download Invoice PDF</span>
              </>
            )}
          </Button>

          {!emailSent && (
            <Button
              onClick={handleSendEmail}
              disabled={sending || !passengerEmail}
              variant="outline"
              className="w-full border-blue-200 text-blue-700 hover:bg-blue-50 font-semibold py-3 rounded-xl flex items-center justify-center space-x-2"
            >
              {sending ? (
                <>
                  <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                  <span>Sending…</span>
                </>
              ) : (
                <>
                  <Icon name="Mail" size={18} />
                  <span>Send Invoice by Email</span>
                </>
              )}
            </Button>
          )}

          <button
            onClick={onClose}
            className="w-full text-sm text-gray-500 hover:text-gray-700 py-2 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default InvoiceReceiptModal;
