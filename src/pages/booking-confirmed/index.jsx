import React, { useEffect } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import BookingConfirmation from '../smart-booking-portal/components/BookingConfirmation';

const BookingConfirmedPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { bookingData, confirmedBooking, guestSignUpSuccess } = location?.state || {};

  // If no booking data, redirect to smart booking portal
  useEffect(() => {
    if (!bookingData && !confirmedBooking) {
      navigate('/smart-booking-portal', { replace: true });
    }
  }, [bookingData, confirmedBooking, navigate]);

  const handleNewBooking = () => {
    navigate('/smart-booking-portal');
  };

  const handleViewBooking = () => {
    navigate('/customer-account');
  };

  if (!bookingData && !confirmedBooking) {
    return null;
  }

  return (
    <>
      <Helmet>
        <title>Booking Confirmed - GoShuttle Pro</title>
        <meta name="description" content="Your shuttle booking has been confirmed successfully" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {guestSignUpSuccess && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-start gap-3">
                <Icon name="CheckCircle" size={20} className="text-green-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-green-800">Account created successfully!</p>
                  <p className="text-xs text-green-700 mt-0.5">
                    We've sent a confirmation email to <strong>{bookingData?.guestInfo?.email}</strong>. Please verify your email to activate your account.
                  </p>
                </div>
              </div>
            )}
            <BookingConfirmation
              bookingData={{ ...bookingData, confirmedBooking }}
              onNewBooking={handleNewBooking}
              onViewBooking={handleViewBooking}
            />
          </div>
        </main>
      </div>
    </>
  );
};

export default BookingConfirmedPage;
