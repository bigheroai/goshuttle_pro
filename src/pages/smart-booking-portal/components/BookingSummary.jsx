import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const BookingSummary = ({ 
  route, 
  dateTime, 
  vehicle, 
  passengerDetails, 
  paymentDetails,
  isGuestBooking = false,
  onEdit,
  onConfirm 
}) => {
  const formatDate = (date) => {
    return new Date(date)?.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (time) => {
    return new Date(`2000-01-01T${time}`)?.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const calculateTotal = () => {
    return vehicle?.price || vehicle?.dailyRate || 0;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 sticky top-24">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
        <Icon name="FileText" size={20} className="mr-2 text-primary" />
        Booking Summary
      </h3>

      <div className="space-y-4">
        {/* Route Summary */}
        {route && (
          <div className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Route</h4>
              <button
                onClick={() => onEdit?.('route')}
                className="text-xs text-primary hover:text-primary-dark"
              >
                Edit
              </button>
            </div>
            <div className="flex items-center text-sm text-gray-900">
              <Icon name="MapPin" size={14} className="mr-2 text-gray-400" />
              <span className="flex-1">{route?.from}</span>
            </div>
            <div className="flex items-center mt-1">
              <Icon name="ArrowDown" size={14} className="mr-2 text-gray-400" />
              <span className="text-sm text-gray-900">{route?.to}</span>
            </div>
            {route?.distance && (
              <p className="text-xs text-gray-500 mt-1">
                Distance: {route?.distance} • Duration: {route?.duration}
              </p>
            )}
          </div>
        )}

        {/* Date & Time Summary */}
        {dateTime && (
          <div className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Schedule</h4>
              <button
                onClick={() => onEdit?.('datetime')}
                className="text-xs text-primary hover:text-primary-dark"
              >
                Edit
              </button>
            </div>
            <div className="flex items-center text-sm text-gray-900 mb-1">
              <Icon name="Calendar" size={14} className="mr-2 text-gray-400" />
              <span>{formatDate(dateTime?.date)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-900 mb-1">
              <Icon name="Clock" size={14} className="mr-2 text-gray-400" />
              <span>Pickup: {formatTime(dateTime?.time)}</span>
            </div>
            {dateTime?.returnDate && (
              <>
                <div className="flex items-center text-sm text-gray-900 mb-1">
                  <Icon name="Calendar" size={14} className="mr-2 text-gray-400" />
                  <span>Return: {formatDate(dateTime?.returnDate)}</span>
                </div>
                <div className="flex items-center text-sm text-gray-900">
                  <Icon name="Clock" size={14} className="mr-2 text-gray-400" />
                  <span>Return Time: {formatTime(dateTime?.returnTime)}</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Vehicle Summary */}
        {vehicle && (
          <div className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Vehicle</h4>
              <button
                onClick={() => onEdit?.('vehicle')}
                className="text-xs text-primary hover:text-primary-dark"
              >
                Edit
              </button>
            </div>
            <div className="flex items-center mb-2">
              <Icon name="Car" size={14} className="mr-2 text-gray-400" />
              <span className="text-sm font-medium text-gray-900">{vehicle?.name}</span>
            </div>
            <div className="flex items-center text-sm text-gray-600 mb-1">
              <Icon name="Users" size={14} className="mr-2 text-gray-400" />
              <span>Capacity: {vehicle?.capacity} passengers</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Daily Rate:</span>
              <span className="text-sm font-medium text-gray-900">
                ₱{(vehicle?.price || vehicle?.dailyRate || 0)?.toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Passenger Details Summary */}
        {passengerDetails && (
          <div className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">
                {isGuestBooking ? 'Guest Information' : 'Passengers'}
              </h4>
              <button
                onClick={() => onEdit?.('passengers')}
                className="text-xs text-primary hover:text-primary-dark"
              >
                Edit
              </button>
            </div>
            
            {isGuestBooking ? (
              // Guest booking summary
              <div className="space-y-1">
                {passengerDetails?.name && (
                  <div className="flex items-center text-sm text-gray-900">
                    <Icon name="User" size={14} className="mr-2 text-gray-400" />
                    <span>{passengerDetails?.name}</span>
                  </div>
                )}
                {passengerDetails?.email && (
                  <div className="flex items-center text-sm text-gray-900">
                    <Icon name="Mail" size={14} className="mr-2 text-gray-400" />
                    <span>{passengerDetails?.email}</span>
                  </div>
                )}
                {passengerDetails?.phone && (
                  <div className="flex items-center text-sm text-gray-900">
                    <Icon name="Phone" size={14} className="mr-2 text-gray-400" />
                    <span>{passengerDetails?.phone}</span>
                  </div>
                )}
              </div>
            ) : (
              // Authenticated user booking summary
              <div className="space-y-1">
                {passengerDetails?.primaryPassenger && (
                  <div className="flex items-center text-sm text-gray-900">
                    <Icon name="User" size={14} className="mr-2 text-gray-400" />
                    <span>
                      {passengerDetails?.primaryPassenger?.firstName} {passengerDetails?.primaryPassenger?.lastName}
                    </span>
                  </div>
                )}
                {passengerDetails?.primaryPassenger?.email && (
                  <div className="flex items-center text-sm text-gray-900">
                    <Icon name="Mail" size={14} className="mr-2 text-gray-400" />
                    <span>{passengerDetails?.primaryPassenger?.email}</span>
                  </div>
                )}
                {passengerDetails?.primaryPassenger?.phone && (
                  <div className="flex items-center text-sm text-gray-900">
                    <Icon name="Phone" size={14} className="mr-2 text-gray-400" />
                    <span>{passengerDetails?.primaryPassenger?.phone}</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Payment Method Summary */}
        {paymentDetails && (
          <div className="pb-4 border-b border-gray-100">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-700">Payment</h4>
              <button
                onClick={() => onEdit?.('payment')}
                className="text-xs text-primary hover:text-primary-dark"
              >
                Edit
              </button>
            </div>
            <div className="flex items-center text-sm text-gray-900">
              <Icon name="CreditCard" size={14} className="mr-2 text-gray-400" />
              <span>{paymentDetails?.method || 'Pay on Pickup'}</span>
            </div>
          </div>
        )}

        {/* Total Cost */}
        <div className="pt-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-base font-semibold text-gray-900">Total Amount</span>
            <span className="text-xl font-bold text-primary">
              ₱{calculateTotal()?.toLocaleString()}
            </span>
          </div>
          <p className="text-xs text-gray-500">
            Includes all fees and taxes
          </p>
        </div>

        {/* Booking Type Badge */}
        <div className="pt-2">
          <div className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Icon name={isGuestBooking ? "UserCheck" : "User"} size={12} className="mr-1" />
            {isGuestBooking ? 'Guest Booking' : 'Account Booking'}
          </div>
        </div>

        {/* Confirm Button */}
        {route && dateTime && vehicle && passengerDetails && (
          <div className="pt-4">
            <Button
              onClick={onConfirm}
              className="w-full bg-conversion-accent hover:bg-conversion-accent/90"
              size="lg"
            >
              <Icon name="CheckCircle" size={18} className="mr-2" />
              Confirm Booking
            </Button>
          </div>
        )}
      </div>

      {/* Booking Notes */}
      <div className="mt-6 p-3 bg-gray-50 rounded-md">
        <div className="flex items-start">
          <Icon name="Info" size={14} className="text-gray-500 mr-2 mt-0.5" />
          <div>
            <p className="text-xs text-gray-600">
              {isGuestBooking 
                ? 'Your booking confirmation and tracking code will be sent to your email address.' :'You can track and manage this booking from your account dashboard.'
              }
            </p>
            <p className="text-xs text-gray-500 mt-1">
              Cancellation is free up to 24 hours before pickup time.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingSummary;