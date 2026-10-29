import React, { useState } from 'react';
import { CheckCircle, Mail, Calendar, MapPin, Users, Car, Copy, UserPlus, Search, AlertCircle } from 'lucide-react';
import Button from '../../../components/ui/Button';

export default function BookingConfirmation({ 
  bookingResult, 
  onCreateAccount, 
  success, 
  error 
}) {
  const [copied, setCopied] = useState(false);
  const [invitationSent, setInvitationSent] = useState(false);
  const [invitationError, setInvitationError] = useState('');

  if (!bookingResult) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8 text-gray-400" />
        </div>
        <p className="text-gray-600">No booking information available</p>
      </div>
    );
  }

  const copyBookingCode = async () => {
    try {
      await navigator.clipboard?.writeText(bookingResult?.bookingCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy booking code:', err);
    }
  };

  const handleCreateAccount = async () => {
    try {
      setInvitationError('');
      await onCreateAccount();
      setInvitationSent(true);
    } catch (err) {
      setInvitationError('Failed to send account invitation');
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
            <span className="text-green-700">{success}</span>
          </div>
        </div>
      )}
      {/* Success Header */}
      <div className="text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Booking Confirmed!</h2>
        <p className="text-gray-600 text-lg">
          Your shuttle has been booked successfully. 
        </p>
      </div>
      {/* Booking Code Section */}
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-6 text-center">
        <h3 className="text-lg font-semibold text-blue-900 mb-2">Your Booking Code</h3>
        <div className="flex items-center justify-center space-x-3">
          <div className="bg-white px-6 py-3 rounded-lg border">
            <span className="text-2xl font-mono font-bold text-gray-900">
              {bookingResult?.bookingCode}
            </span>
          </div>
          <Button
            onClick={copyBookingCode}
            variant="outline"
            className="flex items-center px-4 py-2"
          >
            <Copy className="w-4 h-4 mr-1" />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>
        <p className="text-blue-700 text-sm mt-2">
          Save this code! You'll need it to track or modify your booking.
        </p>
      </div>
      {/* Booking Details */}
      <div className="bg-white border rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Booking Details</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Route</div>
              <div className="text-gray-600">
                <div>{bookingResult?.pickupLocation}</div>
                <div className="text-gray-400 text-sm">↓</div>
                <div>{bookingResult?.dropoffLocation}</div>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Date & Time</div>
              <div className="text-gray-600">
                {new Date(bookingResult.pickupDate)?.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
                <br />
                {new Date(bookingResult.pickupDate)?.toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </div>
              {bookingResult?.returnDate && (
                <div className="text-gray-600 mt-2">
                  <strong>Return:</strong> {new Date(bookingResult.returnDate)?.toLocaleDateString()} at{' '}
                  {new Date(bookingResult.returnDate)?.toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Users className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Passengers</div>
              <div className="text-gray-600">{bookingResult?.passengerCount} people</div>
            </div>
          </div>

          {bookingResult?.vehicle && (
            <div className="flex items-start space-x-3">
              <Car className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Vehicle</div>
                <div className="text-gray-600">
                  {bookingResult?.vehicle?.make} {bookingResult?.vehicle?.model}
                  <br />
                  <span className="text-sm">License: {bookingResult?.vehicle?.licensePlate}</span>
                </div>
              </div>
            </div>
          )}

          <div className="flex items-start space-x-3">
            <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Contact Information</div>
              <div className="text-gray-600">
                {bookingResult?.guestName}
                <br />
                {bookingResult?.guestEmail}
                <br />
                {bookingResult?.guestPhone}
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total Cost</span>
              <span className="text-2xl font-bold text-blue-600">
                ₱{bookingResult?.totalCost?.toLocaleString()}
              </span>
            </div>
            <p className="text-gray-600 text-sm mt-1">Payment on pickup (Cash)</p>
          </div>
        </div>
      </div>
      {/* Next Steps */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
        <h3 className="font-semibold text-yellow-900 mb-3">What's Next?</h3>
        <div className="space-y-2 text-sm text-yellow-800">
          <div className="flex items-center">
            <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center mr-3 text-xs font-bold">1</div>
            <span>Check your email for the booking confirmation</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center mr-3 text-xs font-bold">2</div>
            <span>Driver details will be sent 1 hour before pickup</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center mr-3 text-xs font-bold">3</div>
            <span>Be ready at the pickup location 5 minutes early</span>
          </div>
          <div className="flex items-center">
            <div className="w-6 h-6 bg-yellow-200 rounded-full flex items-center justify-center mr-3 text-xs font-bold">4</div>
            <span>Use your booking code to track or modify the booking</span>
          </div>
        </div>
      </div>
      {/* Account Creation CTA */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg p-6">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-purple-100 rounded-full flex items-center justify-center">
            <UserPlus className="w-6 h-6 text-purple-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-gray-900 mb-2">
              Enhance Your Experience - Create an Account!
            </h3>
            <div className="text-sm text-gray-600 mb-4">
              <div className="grid md:grid-cols-2 gap-2">
                <div>✓ Manage all your bookings in one place</div>
                <div>✓ Faster checkout for future trips</div>
                <div>✓ Earn loyalty points and rewards</div>
                <div>✓ Save payment methods and preferences</div>
                <div>✓ Get real-time booking notifications</div>
                <div>✓ Access to exclusive member discounts</div>
              </div>
            </div>
            
            {invitationError && (
              <div className="bg-red-50 border border-red-200 rounded p-2 mb-3">
                <p className="text-red-700 text-sm">{invitationError}</p>
              </div>
            )}
            
            {invitationSent ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                <div className="flex items-center">
                  <CheckCircle className="w-4 h-4 text-green-500 mr-2" />
                  <span className="text-green-700 text-sm">
                    Account creation instructions sent to your email!
                  </span>
                </div>
              </div>
            ) : (
              <Button
                onClick={handleCreateAccount}
                className="bg-purple-600 text-white hover:bg-purple-700 px-6 py-2"
              >
                <UserPlus className="w-4 h-4 mr-2" />
                Send Account Creation Link
              </Button>
            )}
            
            <p className="text-xs text-gray-500 mt-2">
              We'll send you a secure link to create your account using the same email address.
            </p>
          </div>
        </div>
      </div>
      {/* Booking Lookup CTA */}
      <div className="bg-white border-2 border-dashed border-gray-200 rounded-lg p-6 text-center">
        <Search className="w-8 h-8 text-gray-400 mx-auto mb-3" />
        <h3 className="font-semibold text-gray-900 mb-2">Need to Track or Modify Your Booking?</h3>
        <p className="text-gray-600 text-sm mb-4">
          Visit our Booking Lookup Portal anytime using your booking code and email address.
        </p>
        <Button
          variant="outline"
          onClick={() => window.open('/booking-lookup-portal', '_blank')}
          className="px-6 py-2"
        >
          <Search className="w-4 h-4 mr-2" />
          Go to Booking Lookup
        </Button>
      </div>
      {/* Contact Support */}
      <div className="text-center pt-6 border-t">
        <p className="text-gray-600 text-sm">
          Need help? Contact our support team at{' '}
          <a href="mailto:support@goshuttle.com" className="text-blue-600 hover:underline">
            support@goshuttle.com
          </a>
          {' '}or call{' '}
          <a href="tel:+639171234567" className="text-blue-600 hover:underline">
            +63 917 123 4567
          </a>
        </p>
        <p className="text-gray-500 text-xs mt-2">
          Reference your booking code {bookingResult?.bookingCode} when contacting support.
        </p>
      </div>
    </div>
  );
}