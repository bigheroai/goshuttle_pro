import React, { useState, useEffect, useCallback } from 'react';
import { Search, Mail, Hash, AlertCircle, Edit3, X, CheckCircle, Clock, User, LogIn } from 'lucide-react';
import { guestBookingService } from '../../services/guestBookingService';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BookingDetails from './components/BookingDetails';
import BookingModification from './components/BookingModification';
import CancellationModal from './components/CancellationModal';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';

export default function BookingLookupPortal() {
  const { user, userProfile, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [searchData, setSearchData] = useState({
    bookingCode: '',
    email: ''
  });
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showModification, setShowModification] = useState(false);
  const [showCancellationModal, setShowCancellationModal] = useState(false);
  const [cancellationLoading, setCancellationLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Logged-in user bookings
  const [userBookings, setUserBookings] = useState([]);
  const [userBookingsLoading, setUserBookingsLoading] = useState(false);
  const [selectedUserBooking, setSelectedUserBooking] = useState(null);

  // Normalize a raw DB booking row (snake_case) to the camelCase shape BookingModification expects
  const normalizeBookingForModification = (b) => {
    if (!b) return null;
    return {
      id: b?.id,
      bookingCode: b?.booking_code || b?.booking_reference || b?.id?.substring(0, 8)?.toUpperCase(),
      guestName: b?.guest_name || b?.contact_name || userProfile?.full_name || '',
      guestPhone: b?.guest_phone || b?.contact_phone || '',
      passengerCount: b?.passenger_count || 1,
      notes: b?.notes || b?.special_requests || '',
      status: b?.status,
      pickupDate: b?.pickup_date,
      guestEmail: b?.guest_email || b?.contact_email || user?.email || '',
      vehicle: b?.vehicles ? { capacity: b?.vehicles?.capacity || 15 } : null,
      _isAuthenticatedBooking: true,
      _rawId: b?.id
    };
  };

  // Load all bookings for logged-in user
  const loadUserBookings = useCallback(async () => {
    if (!isAuthenticated || !user?.id) return;
    try {
      setUserBookingsLoading(true);
      const { data, error: fetchError } = await supabase
        ?.from('bookings')
        ?.select('*, vehicles(name, image_url)')
        ?.eq('user_id', user?.id)
        ?.order('created_at', { ascending: false });

      if (!fetchError && data) {
        setUserBookings(data);
      }
    } catch (err) {
      console.error('Error loading user bookings:', err);
    } finally {
      setUserBookingsLoading(false);
    }
  }, [isAuthenticated, user?.id]);

  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadUserBookings();
    }
  }, [isAuthenticated, user?.id, loadUserBookings]);

  // Auto-populate email from user profile
  useEffect(() => {
    if (isAuthenticated && userProfile?.email) {
      setSearchData(prev => ({ ...prev, email: userProfile?.email }));
    }
  }, [isAuthenticated, userProfile?.email]);

  const validateSearch = () => {
    const errors = {};

    if (!searchData?.bookingCode) {
      errors.bookingCode = 'Booking code is required';
    } else if (searchData?.bookingCode?.length < 6) {
      errors.bookingCode = 'Please enter a valid booking code';
    }

    if (!searchData?.email) {
      errors.email = 'Email address is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(searchData?.email)) {
      errors.email = 'Please enter a valid email address';
    }

    setValidationErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const handleInputChange = (field, value) => {
    setSearchData(prev => ({ ...prev, [field]: value }));
    if (validationErrors?.[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    setError('');
  };

  const handleSearch = async (e) => {
    e?.preventDefault();
    
    if (!validateSearch()) {
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    setBooking(null);
    setSelectedUserBooking(null);

    try {
      const bookingData = await guestBookingService?.lookupBooking(
        searchData?.bookingCode,
        searchData?.email
      );
      
      setBooking(bookingData);
      setSuccess('Booking found successfully!');
    } catch (err) {
      setError(err?.message || 'Failed to find booking. Please check your booking code and email address.');
    } finally {
      setLoading(false);
    }
  };

  // Quick-view a booking from the user's booking list
  const handleQuickView = (b) => {
    setSelectedUserBooking(b);
    setBooking(null);
    setError('');
    setSuccess('');
    setShowModification(false);
  };

  const handleCancelBooking = async ({ reason, policy }) => {
    setCancellationLoading(true);
    setError('');

    try {
      await guestBookingService?.cancelGuestBooking(
        booking?.bookingCode,
        booking?.guestEmail || booking?.primaryPassengerEmail || searchData?.email,
        reason,
        policy
      );

      setShowCancellationModal(false);

      const updatedBooking = await guestBookingService?.lookupBooking(
        booking?.bookingCode,
        booking?.guestEmail || booking?.primaryPassengerEmail || searchData?.email
      );

      setBooking(updatedBooking);

      const refundMsg = policy?.refundEligible
        ? ` A refund of ₱${policy?.refundAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} will be processed within 5–7 business days.`
        : '';
      setSuccess(`Booking cancelled successfully. A confirmation email has been sent to ${updatedBooking?.guestEmail || searchData?.email}.${refundMsg}`);
    } catch (err) {
      setError(err?.message || 'Failed to cancel booking. Please try again.');
      setShowCancellationModal(false);
    } finally {
      setCancellationLoading(false);
    }
  };

  const handleModificationComplete = async () => {
    setShowModification(false);
    setSuccess('Booking updated successfully!');
    
    try {
      if (booking) {
        const updatedBooking = await guestBookingService?.lookupBooking(
          booking?.bookingCode,
          booking?.guestEmail
        );
        setBooking(updatedBooking);
      } else if (selectedUserBooking) {
        // Reload the specific user booking
        const { data } = await supabase
          ?.from('bookings')
          ?.select('*, vehicles(name, image_url, capacity)')
          ?.eq('id', selectedUserBooking?.id)
          ?.single();
        if (data) {
          setSelectedUserBooking(data);
          // Also refresh the full list
          loadUserBookings();
        }
      }
    } catch (err) {
      console.error('Failed to refresh booking:', err);
    }
  };

  const handleNewSearch = () => {
    setBooking(null);
    setSelectedUserBooking(null);
    setSearchData({ bookingCode: '', email: userProfile?.email || '' });
    setError('');
    setSuccess('');
    setShowModification(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      confirmed: 'bg-green-100 text-green-800',
      in_progress: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800'
    };
    return colors?.[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pending: 'Pending',
      confirmed: 'Confirmed',
      in_progress: 'In Progress',
      completed: 'Completed',
      cancelled: 'Cancelled'
    };
    return labels?.[status] || status;
  };

  const canModifyBooking = (b) => {
    if (!b) return false;
    const now = new Date();
    const pickupDate = new Date(b.pickupDate);
    const hoursUntilPickup = (pickupDate - now) / (1000 * 60 * 60);
    return b?.status === 'pending' || (b?.status === 'confirmed' && hoursUntilPickup > 2);
  };

  const canCancelBooking = (b) => {
    if (!b) return false;
    return b?.status !== 'cancelled' && b?.status !== 'completed';
  };

  // Determine what to show in the detail panel
  const activeBooking = booking || selectedUserBooking;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Booking Lookup Portal
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Track your reservation, view booking details, and make modifications using 
            your booking code and email address.
          </p>
        </div>

        {/* Logged-in: My Bookings Section */}
        {isAuthenticated && (
          <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">My Bookings</h2>
                <p className="text-sm text-gray-500">Logged in as {userProfile?.email || user?.email}</p>
              </div>
            </div>

            {userBookingsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Clock className="w-5 h-5 text-gray-400 animate-spin mr-2" />
                <span className="text-gray-500 text-sm">Loading your bookings...</span>
              </div>
            ) : userBookings?.length === 0 ? (
              <div className="text-center py-8">
                <Hash className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No bookings found for your account.</p>
                <Button
                  variant="outline"
                  className="mt-3"
                  onClick={() => navigate('/smart-booking-portal')}
                >
                  Book a Trip
                </Button>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {userBookings?.map((b) => (
                  <div
                    key={b?.id}
                    onClick={() => handleQuickView(b)}
                    className={`flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all hover:border-blue-300 hover:bg-blue-50 ${
                      selectedUserBooking?.id === b?.id ? 'border-blue-400 bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-1 rounded whitespace-nowrap">
                        {b?.booking_code || b?.booking_reference || b?.id?.substring(0, 8)?.toUpperCase()}
                      </span>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {b?.pickup_location} → {b?.dropoff_location}
                        </p>
                        <p className="text-xs text-gray-500">
                          {b?.pickup_date ? new Date(b?.pickup_date)?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : ''}
                          {b?.total_cost ? ` · ₱${Number(b?.total_cost)?.toLocaleString()}` : ''}
                        </p>
                      </div>
                    </div>
                    <span className={`ml-3 px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(b?.status)}`}>
                      {getStatusLabel(b?.status)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Not logged in: info banner */}
        {!isAuthenticated && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 flex items-center gap-3">
            <LogIn className="w-5 h-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-sm text-blue-800 font-medium">Sign in to see all your bookings instantly</p>
              <p className="text-xs text-blue-600 mt-0.5">Your booking code and email will be auto-filled</p>
            </div>
            <Button
              variant="outline"
              className="border-blue-300 text-blue-700 hover:bg-blue-100 text-sm"
              onClick={() => navigate('/auth/login')}
            >
              Sign In
            </Button>
          </div>
        )}

        {/* Search Methods */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Hash className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Booking Code</h3>
            <p className="text-gray-600 text-sm">
              Use the unique booking code sent to your email after booking confirmation.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Mail className="w-8 h-8 text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Email Verification</h3>
            <p className="text-gray-600 text-sm">
              Enter the email address used during booking for security verification.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Search className="w-8 h-8 text-purple-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Instant Access</h3>
            <p className="text-gray-600 text-sm">
              Get immediate access to your booking details, status, and modification options.
            </p>
          </div>
        </div>

        {!activeBooking ? (
          /* Search Form */
          <div className="bg-white rounded-lg shadow-sm border p-8">
            <div className="text-center mb-6">
              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Find Your Booking</h2>
              <p className="text-gray-600">
                {isAuthenticated
                  ? 'Select a booking above or enter a booking code below' :'Enter your booking code and email address to access your reservation'}
              </p>
            </div>
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}
            <form onSubmit={handleSearch} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Hash className="w-4 h-4 inline mr-1" />
                    Booking Code *
                  </label>
                  <Input
                    type="text"
                    value={searchData?.bookingCode}
                    onChange={(e) => handleInputChange('bookingCode', e?.target?.value?.toUpperCase())}
                    placeholder="Enter your booking code"
                    className={validationErrors?.bookingCode ? 'border-red-500' : ''}
                  />
                  {validationErrors?.bookingCode && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationErrors?.bookingCode}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    Found in your booking confirmation email
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    <Mail className="w-4 h-4 inline mr-1" />
                    Email Address *
                  </label>
                  <Input
                    type="email"
                    value={searchData?.email}
                    onChange={(e) => handleInputChange('email', e?.target?.value?.toLowerCase())}
                    placeholder="your@email.com"
                    className={validationErrors?.email ? 'border-red-500' : ''}
                  />
                  {validationErrors?.email && (
                    <p className="text-red-500 text-sm mt-1 flex items-center">
                      <AlertCircle className="w-4 h-4 mr-1" />
                      {validationErrors?.email}
                    </p>
                  )}
                  <p className="text-gray-500 text-xs mt-1">
                    {isAuthenticated ? 'Auto-filled from your account' : 'Email used when making the booking'}
                  </p>
                </div>
              </div>

              <div className="text-center">
                <Button
                  type="submit"
                  disabled={loading}
                  className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                >
                  {loading ? (
                    <>
                      <Clock className="w-4 h-4 mr-2 animate-spin" />
                      Searching...
                    </>
                  ) : (
                    <>
                      <Search className="w-4 h-4 mr-2" />
                      Find My Booking
                    </>
                  )}
                </Button>
              </div>
            </form>
            {/* Help Section */}
            <div className="mt-8 pt-6 border-t">
              <h3 className="font-semibold text-gray-900 mb-3">Need Help Finding Your Booking?</h3>
              <div className="grid md:grid-cols-2 gap-4 text-sm text-gray-600">
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Check Your Email</h4>
                  <p>Look for the booking confirmation email with your unique booking code.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Verify Email Address</h4>
                  <p>Make sure you're using the same email address used for booking.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Case Sensitive</h4>
                  <p>Booking codes are automatically converted to uppercase for convenience.</p>
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Contact Support</h4>
                  <p>
                    Still can't find it?{' '}
                    <a href="mailto:support@goshuttle.com" className="text-blue-600 hover:underline">
                      Contact our support team
                    </a>
                  </p>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Booking Results */
          <div className="space-y-6">
            {success && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                  <span className="text-green-700">{success}</span>
                </div>
              </div>
            )}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                  <span className="text-red-700">{error}</span>
                </div>
              </div>
            )}

            {/* Booking Header */}
            <div className="bg-white rounded-lg shadow-sm border p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Booking #{activeBooking?.bookingCode || activeBooking?.booking_code || activeBooking?.booking_reference || activeBooking?.id?.substring(0, 8)?.toUpperCase()}
                  </h2>
                  <p className="text-gray-600">
                    {activeBooking?.guestName || activeBooking?.contact_name || userProfile?.full_name || ''}
                  </p>
                </div>
                <div className="text-right">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(activeBooking?.status)}`}>
                    {getStatusLabel(activeBooking?.status)}
                  </span>
                  <div className="text-sm text-gray-600 mt-1">
                    {activeBooking?.createdAt || activeBooking?.created_at
                      ? new Date(activeBooking?.createdAt || activeBooking?.created_at)?.toLocaleDateString()
                      : ''}
                  </div>
                </div>
              </div>

              {/* Booking details for user bookings (not from guestBookingService) */}
              {selectedUserBooking && !booking && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 p-4 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Booking Code</p>
                    <p className="text-sm font-mono font-semibold text-blue-700">
                      {selectedUserBooking?.booking_code || selectedUserBooking?.booking_reference || selectedUserBooking?.id?.substring(0, 8)?.toUpperCase()}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Route</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedUserBooking?.pickup_location} → {selectedUserBooking?.dropoff_location}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Pickup Date</p>
                    <p className="text-sm text-gray-900">
                      {selectedUserBooking?.pickup_date
                        ? new Date(selectedUserBooking?.pickup_date)?.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                        : '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Total Cost</p>
                    <p className="text-sm font-semibold text-gray-900">
                      ₱{Number(selectedUserBooking?.total_cost || 0)?.toLocaleString()}
                    </p>
                  </div>
                  {selectedUserBooking?.vehicles?.name && (
                    <div>
                      <p className="text-xs text-gray-500 mb-0.5">Vehicle</p>
                      <p className="text-sm text-gray-900">{selectedUserBooking?.vehicles?.name}</p>
                    </div>
                  )}
                  <div>
                    <p className="text-xs text-gray-500 mb-0.5">Passengers</p>
                    <p className="text-sm text-gray-900">{selectedUserBooking?.passenger_count || 1}</p>
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={handleNewSearch}
                  variant="outline"
                  className="px-4 py-2"
                >
                  <Search className="w-4 h-4 mr-2" />
                  {isAuthenticated ? 'Back to My Bookings' : 'New Search'}
                </Button>
                
                {booking && canModifyBooking(booking) && (
                  <Button
                    onClick={() => setShowModification(true)}
                    variant="outline"
                    className="px-4 py-2"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Modify Booking
                  </Button>
                )}

                {selectedUserBooking && !booking && canModifyBooking({ status: selectedUserBooking?.status, pickupDate: selectedUserBooking?.pickup_date }) && (
                  <Button
                    onClick={() => setShowModification(true)}
                    variant="outline"
                    className="px-4 py-2"
                  >
                    <Edit3 className="w-4 h-4 mr-2" />
                    Modify Booking
                  </Button>
                )}
                
                {booking && canCancelBooking(booking) && (
                  <Button
                    onClick={() => setShowCancellationModal(true)}
                    variant="outline"
                    className="px-4 py-2 text-red-600 border-red-300 hover:bg-red-50"
                    disabled={loading}
                  >
                    <X className="w-4 h-4 mr-2" />
                    Cancel Booking
                  </Button>
                )}
              </div>
            </div>

            {/* Booking Content */}
            {booking && (
              showModification ? (
                <BookingModification
                  booking={booking}
                  onComplete={handleModificationComplete}
                  onCancel={() => setShowModification(false)}
                />
              ) : (
                <BookingDetails booking={booking} />
              )
            )}

            {selectedUserBooking && !booking && showModification && (
              <BookingModification
                booking={normalizeBookingForModification(selectedUserBooking)}
                onComplete={handleModificationComplete}
                onCancel={() => setShowModification(false)}
              />
            )}
          </div>
        )}
      </div>

      {/* Cancellation Modal */}
      {showCancellationModal && booking && (
        <CancellationModal
          booking={booking}
          onConfirm={handleCancelBooking}
          onClose={() => setShowCancellationModal(false)}
          loading={cancellationLoading}
        />
      )}
    </div>
  );
}