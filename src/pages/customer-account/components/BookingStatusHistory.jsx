import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import TripExtensionPanel from './TripExtensionPanel';
import { bookingCancellationService } from '../../../services/bookingCancellationService';
import { supabase } from '../../../lib/supabase';

const statusSteps = [
  {
    key: 'confirmation',
    label: 'Booking Confirmed',
    icon: 'CheckCircle',
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-200',
    description: 'Your booking has been received and confirmed'
  },
  {
    key: 'payment',
    label: 'Payment Processed',
    icon: 'CreditCard',
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    borderColor: 'border-green-200',
    description: 'Payment has been verified and processed'
  },
  {
    key: 'driver_assignment',
    label: 'Driver Assigned',
    icon: 'UserCheck',
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    borderColor: 'border-purple-200',
    description: 'A driver has been assigned to your trip'
  },
  {
    key: 'pickup',
    label: 'Pickup / In Progress',
    icon: 'Navigation',
    color: 'text-amber-600',
    bgColor: 'bg-amber-100',
    borderColor: 'border-amber-200',
    description: 'Your trip is underway'
  }
];

const getBookingTimeline = (booking) => {
  const createdAt = booking?.created_at || booking?.createdAt;
  const updatedAt = booking?.updated_at || booking?.updatedAt;
  const status = booking?.status;

  const completedStatuses = {
    pending: [],
    confirmed: ['confirmation'],
    in_progress: ['confirmation', 'payment', 'driver_assignment', 'pickup'],
    completed: ['confirmation', 'payment', 'driver_assignment', 'pickup'],
    cancelled: []
  };

  const completed = completedStatuses?.[status] || [];

  return statusSteps?.map((step, index) => {
    const isCompleted = completed?.includes(step?.key);
    let timestamp = null;

    if (isCompleted) {
      if (step?.key === 'confirmation') {
        timestamp = createdAt;
      } else if (step?.key === 'payment' && (status === 'confirmed' || status === 'in_progress' || status === 'completed')) {
        timestamp = updatedAt;
      } else if ((step?.key === 'driver_assignment' || step?.key === 'pickup') && (status === 'in_progress' || status === 'completed')) {
        timestamp = updatedAt;
      }
    }

    return {
      ...step,
      isCompleted,
      timestamp,
      isCurrent: !isCompleted && completed?.length === index
    };
  });
};

const formatTimestamp = (ts) => {
  if (!ts) return null;
  try {
    return new Date(ts)?.toLocaleString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return null;
  }
};

const getStatusBadgeClass = (status) => {
  switch (status) {
    case 'completed': return 'bg-green-100 text-green-800';
    case 'confirmed': return 'bg-blue-100 text-blue-800';
    case 'pending': return 'bg-yellow-100 text-yellow-800';
    case 'in_progress': return 'bg-amber-100 text-amber-800';
    case 'cancelled': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const BookingStatusHistory = ({ bookings = [], onRefresh }) => {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');

  // Resend email state
  const [resendingId, setResendingId] = useState(null);
  const [resendFeedback, setResendFeedback] = useState('');

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState({ open: false, booking: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  const filterOptions = [
    { value: 'all', label: 'All' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const filteredBookings = bookings?.filter(b =>
    filterStatus === 'all' ? true : b?.status === filterStatus
  );

  const openTimeline = (booking) => {
    setSelectedBooking(booking);
    setResendFeedback('');
  };
  const closeTimeline = () => {
    setSelectedBooking(null);
    setResendFeedback('');
  };

  const handleResendConfirmation = async (booking) => {
    try {
      setResendingId(booking?.id);
      setResendFeedback('');
      const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

      const { data: fullBooking } = await supabase
        ?.from('bookings')
        ?.select('*, vehicles(name, image_url), user_profiles(full_name, email)')
        ?.eq('id', booking?.id)
        ?.single();

      const customerEmail = fullBooking?.user_profiles?.email || fullBooking?.contact_email || booking?.contact_email;
      const customerName = fullBooking?.user_profiles?.full_name || fullBooking?.contact_name || booking?.contact_name || 'Valued Customer';

      if (!customerEmail) {
        setResendFeedback('error:No email address found for this booking.');
        return;
      }

      const response = await fetch(`${SUPABASE_URL}/functions/v1/send-booking-confirmation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          type: 'customer_confirmation',
          to_email: customerEmail,
          customer_email: customerEmail,
          booking_data: {
            booking_reference: fullBooking?.booking_reference || fullBooking?.booking_code || fullBooking?.id,
            booking_code: fullBooking?.booking_code || fullBooking?.booking_reference || fullBooking?.id,
            booking_id: fullBooking?.booking_code || fullBooking?.booking_reference || fullBooking?.id,
            customer_name: customerName,
            full_name: customerName,
            pickup_location: fullBooking?.pickup_location,
            dropoff_location: fullBooking?.dropoff_location,
            pickup_date: fullBooking?.pickup_date,
            vehicle_type: fullBooking?.vehicles?.name || fullBooking?.vehicle_type,
            vehicle_name: fullBooking?.vehicles?.name || fullBooking?.vehicle_type,
            total_cost: fullBooking?.total_cost,
            passenger_count: fullBooking?.passenger_count,
            status: fullBooking?.status,
          },
          // API keys are NOT passed from the browser — edge functions use server-side secrets
        }),
      });

      if (response?.ok) {
        setResendFeedback(`success:Confirmation & receipt sent to ${customerEmail}`);
      } else {
        let errorMsg = 'Failed to send confirmation email. Please try again.';
        try {
          const errData = await response?.json();
          if (errData?.error) errorMsg = errData?.error;
        } catch (_) {}
        setResendFeedback(`error:${errorMsg}`);
      }
    } catch (err) {
      setResendFeedback('error:Failed to send confirmation email.');
    } finally {
      setResendingId(null);
      setTimeout(() => setResendFeedback(''), 6000);
    }
  };

  const handleOpenCancelModal = (booking, e) => {
    e?.stopPropagation();
    setCancelModal({ open: true, booking });
    setCancelReason('');
    setCancelError('');
  };

  const handleCloseCancelModal = () => {
    setCancelModal({ open: false, booking: null });
    setCancelReason('');
    setCancelError('');
  };

  const handleConfirmCancel = async () => {
    if (!cancelReason?.trim()) {
      setCancelError('Please provide a reason for cancellation.');
      return;
    }
    try {
      setCancelLoading(true);
      setCancelError('');
      await bookingCancellationService?.cancelBooking(cancelModal?.booking?.id, cancelReason, false);
      handleCloseCancelModal();
      closeTimeline();
      onRefresh?.();
    } catch (err) {
      setCancelError(err?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const resendIsError = resendFeedback?.startsWith('error:');
  const resendMessage = resendFeedback?.replace(/^(success:|error:)/, '');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Booking Status History</h2>
          <p className="text-sm text-gray-500 mt-0.5">Track confirmation, payment, driver assignment & pickup</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          {filterOptions?.map(opt => (
            <button
              key={opt?.value}
              onClick={() => setFilterStatus(opt?.value)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                filterStatus === opt?.value
                  ? 'bg-primary text-white' :'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {opt?.label}
            </button>
          ))}
        </div>
      </div>
      {filteredBookings?.length === 0 ? (
        <div className="text-center py-12">
          <Icon name="ClipboardList" size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-base font-medium text-gray-900 mb-1">No bookings found</h3>
          <p className="text-sm text-gray-500">
            {filterStatus === 'all' ? "You haven't made any bookings yet." : `No ${filterStatus} bookings found.`}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBookings?.map((booking) => {
            const timeline = getBookingTimeline(booking);
            const completedCount = timeline?.filter(s => s?.isCompleted)?.length;
            const progressPct = Math.round((completedCount / statusSteps?.length) * 100);
            const bookingCode = booking?.booking_code || booking?.bookingCode || booking?.booking_reference || booking?.id?.substring(0, 8)?.toUpperCase();

            return (
              <div
                key={booking?.id}
                className="border border-gray-200 rounded-lg p-4 hover:border-primary/40 hover:bg-gray-50 transition-all cursor-pointer"
                onClick={() => openTimeline(booking)}
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Clickable booking code — sends confirmation email */}
                      <button
                        onClick={(e) => {
                          e?.stopPropagation();
                          handleResendConfirmation(booking);
                        }}
                        disabled={resendingId === booking?.id}
                        title="Click to resend booking confirmation to your email"
                        className="font-mono text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded hover:bg-blue-200 transition-colors flex items-center gap-1 disabled:opacity-60"
                      >
                        {resendingId === booking?.id ? (
                          <span className="flex items-center gap-1">
                            <div className="animate-spin rounded-full h-2.5 w-2.5 border-b-2 border-blue-600"></div>
                            Sending...
                          </span>
                        ) : (
                          <>
                            <Icon name="Hash" size={10} />
                            {bookingCode}
                          </>
                        )}
                      </button>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeClass(booking?.status)}`}>
                        {booking?.status?.replace('_', ' ')?.replace(/\b\w/g, c => c?.toUpperCase())}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {booking?.pickupLocation || booking?.pickup_location} → {booking?.dropoffLocation || booking?.dropoff_location}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {booking?.pickupDate || booking?.pickup_date
                        ? new Date(booking?.pickupDate || booking?.pickup_date)?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
                        : 'Date not set'}
                      {' · '}₱{(booking?.totalCost || booking?.total_cost || 0)?.toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Mini progress bar */}
                    <div className="hidden sm:block">
                      <div className="flex items-center gap-1 mb-1">
                        {statusSteps?.map((step, i) => (
                          <div
                            key={step?.key}
                            className={`w-6 h-6 rounded-full flex items-center justify-center ${
                              timeline?.[i]?.isCompleted
                                ? 'bg-primary text-white'
                                : timeline?.[i]?.isCurrent
                                ? 'bg-primary/20 text-primary border-2 border-primary' :'bg-gray-100 text-gray-400'
                            }`}
                          >
                            <Icon name={step?.icon} size={12} />
                          </div>
                        ))}
                      </div>
                      <p className="text-xs text-gray-400 text-center">{progressPct}% complete</p>
                    </div>
                    {/* Cancel button for pending/confirmed */}
                    {(booking?.status === 'pending' || booking?.status === 'confirmed') && (
                      <button
                        onClick={(e) => handleOpenCancelModal(booking, e)}
                        title="Cancel this booking"
                        className="flex items-center gap-1 text-xs font-medium text-red-500 hover:text-red-700 hover:underline whitespace-nowrap"
                      >
                        <Icon name="XCircle" size={13} />
                        Cancel
                      </button>
                    )}
                    <Link
                      to={`/booking-lookup?code=${encodeURIComponent(bookingCode)}`}
                      onClick={(e) => e?.stopPropagation()}
                      className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80 hover:underline whitespace-nowrap"
                    >
                      <Icon name="ExternalLink" size={13} />
                      View
                    </Link>
                    <Icon name="ChevronRight" size={16} className="text-gray-400" />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Timeline Detail Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Booking Timeline</h3>
                  {/* Clickable booking code in modal */}
                  <button
                    onClick={() => handleResendConfirmation(selectedBooking)}
                    disabled={resendingId === selectedBooking?.id}
                    title="Click to resend booking confirmation & receipt to your email"
                    className="mt-1 font-mono text-sm font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded hover:bg-blue-200 transition-colors flex items-center gap-1.5 disabled:opacity-60"
                  >
                    {resendingId === selectedBooking?.id ? (
                      <span className="flex items-center gap-1.5">
                        <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                        Sending confirmation...
                      </span>
                    ) : (
                      <>
                        <Icon name="Hash" size={12} />
                        {selectedBooking?.booking_code || selectedBooking?.bookingCode || selectedBooking?.booking_reference || selectedBooking?.id?.substring(0, 8)?.toUpperCase()}
                        <Icon name="Mail" size={12} className="ml-0.5 text-blue-500" />
                      </>
                    )}
                  </button>
                  <p className="text-xs text-blue-500 mt-0.5">Click code to resend confirmation & receipt</p>
                </div>
                <button
                  onClick={closeTimeline}
                  className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
                >
                  <Icon name="X" size={18} />
                </button>
              </div>

              {/* Resend feedback */}
              {resendFeedback && (
                <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${resendIsError ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
                  <Icon name={resendIsError ? 'AlertCircle' : 'CheckCircle'} size={15} className={resendIsError ? 'text-red-500' : 'text-green-500'} />
                  <p className={`text-sm ${resendIsError ? 'text-red-700' : 'text-green-700'}`}>{resendMessage}</p>
                </div>
              )}

              {/* Booking Summary */}
              <div className="bg-gray-50 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <Icon name="MapPin" size={14} className="text-green-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{selectedBooking?.pickupLocation || selectedBooking?.pickup_location}</span>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <Icon name="Navigation" size={14} className="text-red-500 flex-shrink-0" />
                  <span className="text-sm text-gray-700 truncate">{selectedBooking?.dropoffLocation || selectedBooking?.dropoff_location}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>
                    <Icon name="Calendar" size={12} className="inline mr-1" />
                    {selectedBooking?.pickupDate || selectedBooking?.pickup_date
                      ? new Date(selectedBooking?.pickupDate || selectedBooking?.pickup_date)?.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                      : 'Not set'}
                  </span>
                  <span className="font-semibold text-gray-900">
                    ₱{(selectedBooking?.totalCost || selectedBooking?.total_cost || 0)?.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Timeline Steps */}
              <div className="relative">
                {getBookingTimeline(selectedBooking)?.map((step, index, arr) => (
                  <div key={step?.key} className="flex gap-4 mb-0">
                    {/* Icon + connector */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        step?.isCompleted
                          ? `${step?.bgColor} ${step?.color}`
                          : step?.isCurrent
                          ? 'bg-primary/10 text-primary border-2 border-primary' :'bg-gray-100 text-gray-300'
                      }`}>
                        <Icon name={step?.isCompleted ? 'Check' : step?.icon} size={18} />
                      </div>
                      {index < arr?.length - 1 && (
                        <div className={`w-0.5 flex-1 my-1 ${step?.isCompleted ? 'bg-primary/30' : 'bg-gray-200'}`} style={{minHeight: '32px'}} />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-6 flex-1 ${index === arr?.length - 1 ? 'pb-0' : ''}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className={`text-sm font-semibold ${step?.isCompleted ? 'text-gray-900' : step?.isCurrent ? 'text-primary' : 'text-gray-400'}`}>
                            {step?.label}
                          </p>
                          <p className={`text-xs mt-0.5 ${step?.isCompleted ? 'text-gray-500' : 'text-gray-400'}`}>
                            {step?.description}
                          </p>
                        </div>
                        {step?.isCompleted && step?.timestamp && (
                          <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0 mt-0.5">
                            {formatTimestamp(step?.timestamp)}
                          </span>
                        )}
                        {!step?.isCompleted && !step?.isCurrent && (
                          <span className="text-xs text-gray-300 whitespace-nowrap flex-shrink-0 mt-0.5">Pending</span>
                        )}
                        {step?.isCurrent && (
                          <span className="text-xs text-primary font-medium whitespace-nowrap flex-shrink-0 mt-0.5">In Progress</span>
                        )}
                      </div>

                      {/* Extra info per step */}
                      {step?.key === 'payment' && step?.isCompleted && (
                        <div className="mt-2 bg-green-50 rounded-md px-3 py-2 text-xs text-green-700">
                          <span className="font-medium">Method: </span>
                          {selectedBooking?.paymentMethod || selectedBooking?.payment_method || 'N/A'}
                          {(selectedBooking?.paymentReference || selectedBooking?.payment_reference) && (
                            <span className="ml-2 font-mono">
                              Ref: {selectedBooking?.paymentReference || selectedBooking?.payment_reference}
                            </span>
                          )}
                        </div>
                      )}
                      {step?.key === 'confirmation' && step?.isCompleted && (
                        <div className="mt-2 bg-blue-50 rounded-md px-3 py-2 text-xs text-blue-700">
                          <span className="font-medium">Vehicle: </span>
                          {selectedBooking?.vehicles?.name || 'N/A'}
                          {selectedBooking?.passengerCount || selectedBooking?.passenger_count
                            ? ` · ${selectedBooking?.passengerCount || selectedBooking?.passenger_count} passenger(s)`
                            : ''}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Cancelled notice */}
              {selectedBooking?.status === 'cancelled' && (
                <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 text-red-700">
                    <Icon name="XCircle" size={16} />
                    <span className="text-sm font-medium">Booking Cancelled</span>
                  </div>
                  {(selectedBooking?.cancelReason || selectedBooking?.cancel_reason) && (
                    <p className="text-xs text-red-600 mt-1 ml-6">
                      Reason: {selectedBooking?.cancelReason || selectedBooking?.cancel_reason}
                    </p>
                  )}
                </div>
              )}

              {/* Trip Extension Panel - shown for confirmed/in_progress bookings */}
              {(selectedBooking?.status === 'confirmed' || selectedBooking?.status === 'in_progress') && (
                <div className="mt-4">
                  <TripExtensionPanel
                    booking={selectedBooking}
                    onExtensionAdded={() => {}}
                  />
                </div>
              )}

              <div className="mt-6 flex items-center justify-between gap-3 flex-wrap">
                <Link
                  to={`/booking-lookup?code=${encodeURIComponent(selectedBooking?.booking_code || selectedBooking?.bookingCode || selectedBooking?.booking_reference || selectedBooking?.id?.substring(0, 8)?.toUpperCase())}`}
                  className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:text-primary/80 hover:underline"
                >
                  <Icon name="ExternalLink" size={15} />
                  View Booking Confirmation
                </Link>
                <div className="flex items-center gap-2">
                  {/* Cancel button for pending/confirmed in modal */}
                  {(selectedBooking?.status === 'pending' || selectedBooking?.status === 'confirmed') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenCancelModal(selectedBooking, { stopPropagation: () => {} })}
                      className="text-red-600 border-red-200 hover:bg-red-50"
                    >
                      <Icon name="XCircle" size={14} className="mr-1" />
                      Cancel Trip
                    </Button>
                  )}
                  {/* Resend button for pending/confirmed/completed */}
                  {(selectedBooking?.status === 'pending' || selectedBooking?.status === 'confirmed' || selectedBooking?.status === 'completed') && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleResendConfirmation(selectedBooking)}
                      disabled={resendingId === selectedBooking?.id}
                      className="text-blue-600 border-blue-200 hover:bg-blue-50"
                    >
                      {resendingId === selectedBooking?.id ? (
                        <span className="flex items-center gap-1">
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                          Sending...
                        </span>
                      ) : (
                        <>
                          <Icon name="Mail" size={14} className="mr-1" />
                          Resend Receipt
                        </>
                      )}
                    </Button>
                  )}
                  <Button variant="outline" size="sm" onClick={closeTimeline}>Close</Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {cancelModal?.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Cancel Booking</h3>
                <button
                  onClick={handleCloseCancelModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <Icon name="X" size={20} />
                </button>
              </div>

              <div className="mb-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <Icon name="AlertTriangle" size={16} className="text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">
                      {cancelModal?.booking?.pickup_location || cancelModal?.booking?.pickupLocation} → {cancelModal?.booking?.dropoff_location || cancelModal?.booking?.dropoffLocation}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {(cancelModal?.booking?.pickup_date || cancelModal?.booking?.pickupDate)
                        ? new Date(cancelModal?.booking?.pickup_date || cancelModal?.booking?.pickupDate)?.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
                        : 'Date not set'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Reason for Cancellation <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={cancelReason}
                  onChange={(e) => setCancelReason(e?.target?.value)}
                  placeholder="Please tell us why you're cancelling this booking..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent resize-none"
                />
              </div>

              {cancelError && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg mb-4">
                  <Icon name="AlertCircle" size={14} className="text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700">{cancelError}</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={handleCloseCancelModal}
                  disabled={cancelLoading}
                >
                  Keep Booking
                </Button>
                <Button
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white border-red-600"
                  onClick={handleConfirmCancel}
                  disabled={cancelLoading}
                >
                  {cancelLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Cancelling...
                    </span>
                  ) : (
                    <>
                      <Icon name="XCircle" size={14} className="mr-1" />
                      Confirm Cancel
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingStatusHistory;
