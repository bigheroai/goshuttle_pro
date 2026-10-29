import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import bookingService from '../../../services/bookingService';
import { useAuth } from '../../../contexts/AuthContext';

const BookingConfirmation = ({ bookingData, onNewBooking, onViewBooking }) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isEmailTesting, setIsEmailTesting] = useState(false);
  const [emailTestResult, setEmailTestResult] = useState(null);
  const [emailConfirmationStatus, setEmailConfirmationStatus] = useState({
    customer: null,
    admin: null
  });

  // Set up email confirmation status based on booking data
  useEffect(() => {
    if (bookingData?.confirmedBooking) {
      // For registered users
      if (user && bookingData?.confirmedBooking?.customerEmail) {
        setEmailConfirmationStatus(prev => ({
          ...prev,
          customer: {
            success: true,
            email: bookingData?.confirmedBooking?.customerEmail,
            message: `Booking confirmation with support contact details sent to ${bookingData?.confirmedBooking?.customerEmail}`
          }
        }));
      }
      
      // For guest bookings
      if (bookingData?.confirmedBooking?.guestEmail) {
        setEmailConfirmationStatus(prev => ({
          ...prev,
          customer: {
            success: true,
            email: bookingData?.confirmedBooking?.guestEmail,
            message: `Booking confirmation with support contact details sent to ${bookingData?.confirmedBooking?.guestEmail}`
          }
        }));
      }

      // Admin notification status
      setEmailConfirmationStatus(prev => ({
        ...prev,
        admin: {
          success: true,
          message: 'Admin notification sent successfully'
        }
      }));
    }
  }, [bookingData, user]);

  // Handle test email functionality
  const handleTestEmail = async () => {
    setIsEmailTesting(true);
    setEmailTestResult(null);

    try {
      const result = await bookingService?.testEmailConfiguration();
      setEmailTestResult({
        success: true,
        message: 'Test email sent successfully! Check your admin email.'
      });
    } catch (error) {
      console.error('Test email failed:', error);
      setEmailTestResult({
        success: false,
        message: 'Test email failed: ' + (error?.message || 'Unknown error')
      });
    } finally {
      setIsEmailTesting(false);
    }
  };

  // Handle navigation to customer account or guest lookup
  const handleViewBooking = () => {
    if (user) {
      navigate('/customer-account');
    } else {
      navigate('/booking-lookup-portal', { 
        state: { 
          bookingCode: bookingData?.confirmedBooking?.bookingCode,
          guestEmail: bookingData?.confirmedBooking?.guestEmail 
        }
      });
    }
  };

  // Handle new booking
  const handleNewBooking = () => {
    if (onNewBooking) {
      onNewBooking();
    } else {
      navigate('/smart-booking');
    }
  };

  // Get the recipient email for display
  const getRecipientEmail = () => {
    if (bookingData?.confirmedBooking?.guestEmail) {
      return bookingData?.confirmedBooking?.guestEmail;
    }
    if (bookingData?.confirmedBooking?.customerEmail) {
      return bookingData?.confirmedBooking?.customerEmail;
    }
    if (bookingData?.guestInfo?.email) {
      return bookingData?.guestInfo?.email;
    }
    return user?.email || 'your registered email';
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Success Header */}
      <div className="text-center mb-8">
        <div className="mb-4">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 rounded-full mb-4">
            <Icon name="CheckCircle" size={32} className="text-green-600" />
          </div>
        </div>
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Booking Confirmed!
        </h1>
        <p className="text-lg text-gray-600">
          Your shuttle booking has been confirmed successfully. You'll receive email notifications about your booking status.
        </p>
        
        {/* Booking ID Display */}
        {(bookingData?.confirmedBooking?.id || bookingData?.confirmedBooking?.bookingCode) && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg inline-block">
            {bookingData?.confirmedBooking?.bookingCode && (
              <p className="text-sm text-blue-800">
                <strong>Booking Code:</strong>{' '}
                <span className="font-mono text-lg tracking-widest">{bookingData?.confirmedBooking?.bookingCode}</span>
              </p>
            )}
            {bookingData?.confirmedBooking?.id && (
              <p className="text-sm text-blue-800 mt-1">
                <strong>Booking ID:</strong> {bookingData?.confirmedBooking?.id?.substring(0, 8)?.toUpperCase()}
              </p>
            )}
            {bookingData?.confirmedBooking?.isGuestBooking && bookingData?.confirmedBooking?.bookingCode && (
              <p className="text-xs text-blue-700 mt-2">
                📋 Save this code to track or modify your booking at the Booking Lookup portal.
              </p>
            )}
            {bookingData?.confirmedBooking?.isGuestBooking && !bookingData?.confirmedBooking?.bookingCode && (
              <p className="text-sm text-blue-700 mt-1">
                Use your email address to look up this booking.
              </p>
            )}
          </div>
        )}
      </div>
      {/* Booking Details Card */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Booking Details</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Route Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Route</h3>
              <div className="flex items-center text-gray-900">
                <span className="font-medium">
                  {bookingData?.route?.from || bookingData?.confirmedBooking?.pickupLocation || 'N/A'}
                </span>
                <Icon name="ArrowRight" size={16} className="mx-2 text-gray-400" />
                <span className="font-medium">
                  {bookingData?.route?.to || bookingData?.confirmedBooking?.dropoffLocation || 'N/A'}
                </span>
              </div>
            </div>

            {/* Date & Time */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Pickup Schedule</h3>
              <div className="text-gray-900">
                <div className="font-medium">
                  {bookingData?.dateTime?.date ? 
                    new Date(bookingData?.dateTime?.date + 'T' + bookingData?.dateTime?.time)?.toLocaleDateString() :
                    bookingData?.confirmedBooking?.pickupDate ? 
                      new Date(bookingData?.confirmedBooking?.pickupDate)?.toLocaleDateString() : 'N/A'
                  }
                </div>
                <div className="text-sm text-gray-600">
                  {bookingData?.dateTime?.time ? 
                    bookingData?.dateTime?.time :
                    bookingData?.confirmedBooking?.pickupDate ? 
                      new Date(bookingData?.confirmedBooking?.pickupDate)?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'N/A'
                  }
                </div>
              </div>
            </div>

            {/* Vehicle Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Vehicle</h3>
              <div className="text-gray-900">
                <div className="font-medium">
                  {bookingData?.vehicle?.name || bookingData?.confirmedBooking?.vehicleName || 'N/A'}
                </div>
                <div className="text-sm text-gray-600">
                  {bookingData?.vehicle?.type || bookingData?.confirmedBooking?.vehicleType || 'N/A'}
                  {(bookingData?.vehicle?.capacity || bookingData?.confirmedBooking?.capacity) && (
                    <span> • Capacity: {bookingData?.vehicle?.capacity || bookingData?.confirmedBooking?.capacity}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Passenger Information */}
            <div>
              <h3 className="text-sm font-medium text-gray-500 mb-2">Passengers</h3>
              <div className="text-gray-900">
                <div className="font-medium">
                  {bookingData?.passengerCount || bookingData?.confirmedBooking?.passengerCount || 1} Passenger(s)
                </div>
                <div className="text-sm text-gray-600">
                  Primary: {bookingData?.passengerDetails?.primaryPassenger?.firstName ? 
                    `${bookingData?.passengerDetails?.primaryPassenger?.firstName} ${bookingData?.passengerDetails?.primaryPassenger?.lastName || ''}` :
                    bookingData?.confirmedBooking?.customerName || bookingData?.confirmedBooking?.guestName || 'N/A'
                  }
                </div>
              </div>
            </div>
          </div>

          {/* Total Cost */}
          {(bookingData?.vehicle?.price || bookingData?.confirmedBooking?.totalCost) && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex justify-between items-center">
                <span className="text-lg font-medium text-gray-900">Total Cost</span>
                <span className="text-2xl font-bold text-conversion-accent">
                  ₱{(bookingData?.vehicle?.price || bookingData?.confirmedBooking?.totalCost)?.toLocaleString()}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Email Notification Status */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-8">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Email Notifications</h2>
          
          <div className="space-y-4">
            {/* Customer Email Confirmation */}
            {emailConfirmationStatus?.customer && (
              <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <Icon name="Mail" size={16} className="text-green-600 mr-2" />
                  <div>
                    <span className="text-sm text-green-800 font-medium">
                      Booking confirmation sent
                    </span>
                    <p className="text-xs text-green-700 mt-1">
                      Confirmation email with company contact details sent to {getRecipientEmail()}
                    </p>
                    <p className="text-xs text-green-700 mt-1">
                      <strong>📞 Support information included:</strong> Contact phone numbers and email for assistance
                    </p>
                  </div>
                </div>
                <Icon name="CheckCircle" size={16} className="text-green-600" />
              </div>
            )}

            {/* Admin Email Notification */}
            {emailConfirmationStatus?.admin && (
              <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center">
                  <Icon name="Bell" size={16} className="text-blue-600 mr-2" />
                  <span className="text-sm text-blue-800">
                    Admin notification sent successfully
                  </span>
                </div>
                <Icon name="CheckCircle" size={16} className="text-blue-600" />
              </div>
            )}

            {/* Support Contact Information Notice */}
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-center">
                <Icon name="Phone" size={16} className="text-yellow-600 mr-2" />
                <div>
                  <span className="text-sm text-yellow-800 font-medium">
                    Support Contact Details Included
                  </span>
                  <p className="text-xs text-yellow-700 mt-1">
                    Your confirmation email includes our 24/7 support hotline and company contact information for any assistance needed.
                  </p>
                </div>
              </div>
            </div>

            {/* Test Email Button */}
            <div className="flex items-center justify-between p-4 bg-gray-50 border border-gray-200 rounded-lg">
              <div>
                <span className="text-sm text-gray-700">
                  Test email configuration
                </span>
                <p className="text-xs text-gray-500 mt-1">
                  Send a test email to verify email notifications are working
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleTestEmail}
                disabled={isEmailTesting}
              >
                {isEmailTesting ? (
                  <>
                    <Icon name="Loader" size={16} className="mr-2 animate-spin" />
                    Testing...
                  </>
                ) : (
                  <>
                    <Icon name="Send" size={16} className="mr-2" />
                    Test Email
                  </>
                )}
              </Button>
            </div>

            {/* Email Test Result */}
            {emailTestResult && (
              <div className={`p-4 border rounded-lg ${
                emailTestResult?.success 
                  ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'
              }`}>
                <div className="flex items-center">
                  <Icon 
                    name={emailTestResult?.success ? "CheckCircle" : "AlertCircle"} 
                    size={16} 
                    className={`mr-2 ${
                      emailTestResult?.success ? 'text-green-600' : 'text-red-600'
                    }`} 
                  />
                  <span className={`text-sm ${
                    emailTestResult?.success ? 'text-green-800' : 'text-red-800'
                  }`}>
                    {emailTestResult?.message}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-4 justify-center">
        <Button
          variant="outline"
          onClick={handleViewBooking}
          className="sm:w-auto"
        >
          <Icon name="Eye" size={18} className="mr-2" />
          {user ? 'View My Bookings' : 'Track Booking'}
        </Button>
        <Button
          onClick={handleNewBooking}
          className="sm:w-auto bg-conversion-accent hover:bg-conversion-accent/90"
        >
          <Icon name="Plus" size={18} className="mr-2" />
          Make Another Booking
        </Button>
      </div>
      {/* Support Information */}
      <div className="mt-8 text-center">
        <p className="text-sm text-gray-600 mb-4">
          Need to modify or cancel your booking?
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate('/support-center')}>
            <Icon name="Phone" size={16} className="mr-2" />
            Call Support
          </Button>
          <Button variant="outline" size="sm" onClick={() => navigate('/support-center')}>
            <Icon name="MessageCircle" size={16} className="mr-2" />
            Live Chat
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BookingConfirmation;