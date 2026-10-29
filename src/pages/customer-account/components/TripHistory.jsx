import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';
import { useNavigate } from 'react-router-dom';
import { bookingCancellationService } from '../../../services/bookingCancellationService';
import { supabase } from '../../../lib/supabase';
import { sendBookingConfirmationEmail } from '../../../utils/resendEmailService';

const TripHistory = ({ trips = [], onRefresh, userEmail }) => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState('all');
  const [showAll, setShowAll] = useState(false);

  // Cancel modal state
  const [cancelModal, setCancelModal] = useState({ open: false, trip: null });
  const [cancelReason, setCancelReason] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  const [cancelError, setCancelError] = useState('');

  // Resend email state
  const [resendingId, setResendingId] = useState(null);
  const [resendSuccess, setResendSuccess] = useState('');

  const filterOptions = [
    { value: 'all', label: 'All Trips' },
    { value: 'completed', label: 'Completed' },
    { value: 'confirmed', label: 'Upcoming' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const filteredTrips = trips?.filter(trip => {
    if (filter === 'all') return true;
    return trip?.status === filter;
  });

  const displayedTrips = showAll ? filteredTrips : filteredTrips?.slice(0, 5);

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'confirmed': case 'upcoming': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'in_progress': case 'in-progress': return 'bg-amber-100 text-amber-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return 'CheckCircle';
      case 'confirmed': case 'upcoming': return 'Clock';
      case 'cancelled': return 'XCircle';
      case 'in_progress': case 'in-progress': return 'Navigation';
      default: return 'Circle';
    }
  };

  const handleOpenCancelModal = (trip) => {
    setCancelModal({ open: true, trip });
    setCancelReason('');
    setCancelError('');
  };

  const handleCloseCancelModal = () => {
    setCancelModal({ open: false, trip: null });
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
      await bookingCancellationService?.cancelBooking(cancelModal?.trip?.id, cancelReason, false);
      handleCloseCancelModal();
      onRefresh?.();
    } catch (err) {
      setCancelError(err?.message || 'Failed to cancel booking. Please try again.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handleResendConfirmation = async (trip) => {
    try {
      setResendingId(trip?.id);
      setResendSuccess('');

      // Fetch full booking details including user profile
      const { data: booking } = await supabase
        ?.from('bookings')
        ?.select('*, vehicles(name, image_url, vehicle_type), user_profiles(full_name, email)')
        ?.eq('id', trip?.id)
        ?.single();

      const customerEmail = booking?.user_profiles?.email || booking?.contact_email || booking?.guest_email || booking?.primary_passenger_email || userEmail;
      const customerName = booking?.user_profiles?.full_name || booking?.contact_name || booking?.guest_name || 'Valued Customer';

      if (!customerEmail) {
        setResendSuccess('error:No email address found for this booking.');
        return;
      }

      const bookingData = {
        id: booking?.id,
        booking_code: booking?.booking_reference || booking?.booking_code,
        booking_reference: booking?.booking_reference || booking?.booking_code,
        customer_name: customerName,
        pickup_location: booking?.pickup_location,
        dropoff_location: booking?.dropoff_location,
        pickup_date: booking?.pickup_date,
        vehicle_name: booking?.vehicles?.name,
        vehicle_type: booking?.vehicles?.vehicle_type,
        passenger_count: booking?.passenger_count,
        total_cost: booking?.total_cost,
        status: booking?.status,
      };

      const result = await sendBookingConfirmationEmail(customerEmail, bookingData, supabase);

      if (result?.success) {
        setResendSuccess(`success:Confirmation email resent to ${customerEmail}`);
      } else {
        setResendSuccess(`error:Failed to resend confirmation email: ${result?.error || 'Please try again.'}`);
      }
    } catch (err) {
      setResendSuccess('error:Failed to resend confirmation email. Please try again.');
    } finally {
      setResendingId(null);
      setTimeout(() => setResendSuccess(''), 5000);
    }
  };

  const handleTripAction = (action, trip) => {
    switch (action) {
      case 'receipt':
        navigate(`/booking-lookup-portal?id=${trip?.id}`);
        break;
      case 'rate': navigate('/support-center');
        break;
      case 'rebook':
        const rebookData = {
          route: { from: trip?.pickup || trip?.from, to: trip?.destination || trip?.to },
          dateTime: { date: new Date()?.toISOString()?.split('T')?.[0], time: '09:00' },
          passengerCount: trip?.passenger_count || trip?.passengerCount || 1
        };
        localStorage.setItem('rebookingData', JSON.stringify(rebookData));
        navigate('/smart-booking-portal');
        break;
      case 'modify':
        navigate('/booking-lookup-portal', { state: { bookingId: trip?.id, mode: 'modify' } });
        break;
      case 'track': navigate('/live-tracking');
        break;
      default:
        break;
    }
  };

  const resendIsError = resendSuccess?.startsWith('error:');
  const resendMessage = resendSuccess?.replace(/^(success:|error:)/, '');

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-lg font-semibold text-gray-900">Trip History</h2>
        <div className="flex gap-2 overflow-x-auto">
          {filterOptions?.map((option) => (
            <Button
              key={option?.value}
              variant={filter === option?.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(option?.value)}
              className="whitespace-nowrap"
            >
              {option?.label}
            </Button>
          ))}
        </div>
      </div>

      {/* Resend feedback banner */}
      {resendSuccess && (
        <div className={`flex items-center gap-2 p-3 rounded-lg mb-4 ${resendIsError ? 'bg-red-50 border border-red-200' : 'bg-green-50 border border-green-200'}`}>
          <Icon name={resendIsError ? 'AlertCircle' : 'CheckCircle'} size={16} className={resendIsError ? 'text-red-500' : 'text-green-500'} />
          <p className={`text-sm ${resendIsError ? 'text-red-700' : 'text-green-700'}`}>{resendMessage}</p>
        </div>
      )}

      <div className="space-y-4">
        {displayedTrips?.map((trip) => (
          <div key={trip?.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
            <div className="flex flex-col lg:flex-row lg:items-center gap-4">
              <div className="flex-shrink-0">
                <Image
                  src={trip?.vehicleImage || trip?.vehicles?.image_url || "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d"}
                  alt={trip?.vehicleImageAlt || `${trip?.vehicleType || 'Vehicle'} for passenger transport`}
                  className="w-16 h-12 rounded-lg object-cover"
                />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      {(trip?.booking_code || trip?.bookingCode || trip?.booking_reference) && (
                        <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                          {trip?.booking_code || trip?.bookingCode || trip?.booking_reference}
                        </span>
                      )}
                    </div>
                    <h3 className="font-medium text-gray-900 truncate">
                      {trip?.pickup_location || trip?.from || trip?.pickupLocation} → {trip?.dropoff_location || trip?.to || trip?.dropoffLocation}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {trip?.pickup_date ? new Date(trip?.pickup_date)?.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : trip?.date} • {trip?.pickup_date ? new Date(trip?.pickup_date)?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : trip?.time}
                    </p>
                    <p className="text-sm text-gray-500">
                      {trip?.vehicles?.name || trip?.vehicleType} • {trip?.duration || ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip?.status)}`}>
                      <Icon name={getStatusIcon(trip?.status)} size={12} />
                      {trip?.status === 'confirmed' ? 'Upcoming' :
                       trip?.status?.charAt(0)?.toUpperCase() + trip?.status?.slice(1)}
                    </span>
                    <span className="font-semibold text-gray-900">
                      ₱{(trip?.total_cost || trip?.amount || trip?.totalCost || 0)?.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* Trip Actions */}
                <div className="flex items-center gap-2 mt-3 flex-wrap">
                  {trip?.status === 'completed' && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleTripAction('receipt', trip)}>
                        <Icon name="Download" size={14} className="mr-1" />
                        Receipt
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleTripAction('rate', trip)}>
                        <Icon name="Star" size={14} className="mr-1" />
                        Rate
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleTripAction('rebook', trip)}>
                        <Icon name="RotateCcw" size={14} className="mr-1" />
                        Rebook
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendConfirmation(trip)}
                        disabled={resendingId === trip?.id}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        {resendingId === trip?.id ? (
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
                    </>
                  )}
                  {(trip?.status === 'confirmed' || trip?.status === 'pending') && (
                    <>
                      <Button variant="outline" size="sm" onClick={() => handleTripAction('modify', trip)}>
                        <Icon name="Edit" size={14} className="mr-1" />
                        Modify
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenCancelModal(trip)}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Icon name="X" size={14} className="mr-1" />
                        Cancel Trip
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleResendConfirmation(trip)}
                        disabled={resendingId === trip?.id}
                        className="text-blue-600 border-blue-200 hover:bg-blue-50"
                      >
                        {resendingId === trip?.id ? (
                          <span className="flex items-center gap-1">
                            <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-blue-600"></div>
                            Sending...
                          </span>
                        ) : (
                          <>
                            <Icon name="Mail" size={14} className="mr-1" />
                            Resend Confirmation
                          </>
                        )}
                      </Button>
                    </>
                  )}
                  {(trip?.status === 'in_progress' || trip?.status === 'in-progress') && (
                    <Button variant="default" size="sm" onClick={() => handleTripAction('track', trip)}>
                      <Icon name="Navigation" size={14} className="mr-1" />
                      Track Live
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredTrips?.length > 5 && (
        <div className="text-center mt-6">
          <Button variant="outline" onClick={() => setShowAll(!showAll)}>
            {showAll ? 'Show Less' : `View All ${filteredTrips?.length} Trips`}
          </Button>
        </div>
      )}

      {filteredTrips?.length === 0 && (
        <div className="text-center py-8">
          <Icon name="Calendar" size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No trips found</h3>
          <p className="text-gray-600 mb-4">
            {filter === 'all' ? "You haven't made any trips yet."
              : `No trips match the selected filter: ${filterOptions?.find(opt => opt?.value === filter)?.label}.`}
          </p>
          <Button variant="default" onClick={() => navigate('/smart-booking-portal')}>
            <Icon name="Plus" size={16} className="mr-2" />
            Book Your First Trip
          </Button>
        </div>
      )}

      {/* Cancel Booking Modal */}
      {cancelModal?.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
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
                      {cancelModal?.trip?.pickup_location} → {cancelModal?.trip?.dropoff_location}
                    </p>
                    <p className="text-xs text-amber-700 mt-0.5">
                      {cancelModal?.trip?.pickup_date
                        ? new Date(cancelModal?.trip?.pickup_date)?.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : cancelModal?.trip?.date}
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

export default TripHistory;