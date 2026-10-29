import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Search, Mail, Hash, AlertCircle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { guestBookingService } from '../../services/guestBookingService';
import Header from '../../components/ui/Header';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import BookingDetails from '../booking-lookup-portal/components/BookingDetails';

export default function BookingLookup() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const codeFromUrl = searchParams?.get('code') || '';
  const actionFromUrl = searchParams?.get('action') || '';

  const [bookingCode, setBookingCode] = useState(codeFromUrl?.toUpperCase());
  const [email, setEmail] = useState('');
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [emailError, setEmailError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const isConfirmAction = actionFromUrl === 'confirm';

  const handleSearch = async (e) => {
    e?.preventDefault();

    if (!bookingCode || bookingCode?.length < 6) {
      setError('Please enter a valid booking code.');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(email)) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    setError('');
    setEmailError('');
    setActionMessage('');

    try {
      const bookingData = await guestBookingService?.lookupBooking(bookingCode, email);
      setBooking(bookingData);

      if (isConfirmAction) {
        if (bookingData?.status === 'confirmed') {
          setActionMessage('Your booking has been confirmed! See your booking details below.');
        } else if (bookingData?.status === 'pending') {
          setActionMessage('Your booking is pending confirmation. Our team will confirm it shortly.');
        } else {
          setActionMessage(`Booking status: ${bookingData?.status}. See details below.`);
        }
      }
    } catch (err) {
      setError(err?.message || 'Booking not found. Please check your booking code and email address.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-3xl mx-auto px-4 py-10">
        {/* Page Header */}
        <div className="text-center mb-8">
          {isConfirmAction ? (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmation</h1>
              <p className="text-gray-600 max-w-xl mx-auto">
                Enter your email address to verify your identity and view your confirmed booking details.
              </p>
            </>
          ) : (
            <>
              <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
                <Search className="w-8 h-8 text-blue-600" />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">Find Your Booking</h1>
              <p className="text-gray-600 max-w-xl mx-auto">
                Enter your booking code and email address to access your reservation.
              </p>
            </>
          )}
        </div>

        {/* Lookup Form */}
        {!booking && (
          <div className="bg-white rounded-xl shadow-sm border p-8">
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" />
                <span className="text-red-700 text-sm">{error}</span>
              </div>
            )}

            <form onSubmit={handleSearch} className="space-y-5">
              {/* Booking Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Hash className="w-4 h-4 inline mr-1" />
                  Booking Code
                </label>
                <Input
                  type="text"
                  value={bookingCode}
                  onChange={(e) => {
                    setBookingCode(e?.target?.value?.toUpperCase());
                    setError('');
                  }}
                  placeholder="e.g. BC84ECCE"
                  className={error ? 'border-red-400' : ''}
                />
                <p className="text-xs text-gray-500 mt-1">Found in your booking confirmation email</p>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  <Mail className="w-4 h-4 inline mr-1" />
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => {
                    setEmail(e?.target?.value?.toLowerCase());
                    setEmailError('');
                  }}
                  placeholder="your@email.com"
                  className={emailError ? 'border-red-400' : ''}
                />
                {emailError && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" />
                    {emailError}
                  </p>
                )}
                <p className="text-xs text-gray-500 mt-1">Email address used when making the booking</p>
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    Looking up booking...
                  </>
                ) : (
                  <>
                    {isConfirmAction ? <CheckCircle className="w-4 h-4" /> : <Search className="w-4 h-4" />}
                    {isConfirmAction ? 'View My Confirmation' : 'Find My Booking'}
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </Button>
            </form>
          </div>
        )}

        {/* Booking Result */}
        {booking && (
          <div className="space-y-5">
            {/* Action Message Banner */}
            {actionMessage && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-start gap-2">
                <CheckCircle className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-green-800 font-medium text-sm">{actionMessage}</p>
                </div>
              </div>
            )}

            {/* Booking Header Card */}
            <div className="bg-white rounded-xl shadow-sm border p-6">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div>
                  <h2 className="text-xl font-bold text-gray-900">Booking #{booking?.bookingCode}</h2>
                  <p className="text-gray-500 text-sm mt-0.5">Booked by {booking?.guestName}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                    booking?.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                    booking?.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                    booking?.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                    booking?.status === 'completed'? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    {booking?.status?.charAt(0)?.toUpperCase() + booking?.status?.slice(1)}
                  </span>
                  <Button
                    onClick={() => {
                      setBooking(null);
                      setActionMessage('');
                      setError('');
                    }}
                    variant="outline"
                    className="text-sm px-3 py-1.5"
                  >
                    New Search
                  </Button>
                </div>
              </div>
            </div>

            {/* Booking Details */}
            <BookingDetails booking={booking} />

            {/* Link to full portal */}
            <div className="text-center pt-2">
              <button
                onClick={() => navigate('/booking-lookup-portal')}
                className="text-blue-600 hover:underline text-sm"
              >
                Need to modify or cancel your booking? Go to the full Booking Portal →
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
