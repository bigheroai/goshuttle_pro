import React from 'react';
import { MapPin, Calendar, Users, Car, Phone, Mail, User, CreditCard, Clock, Navigation, AlertCircle, CheckCircle, Info } from 'lucide-react';
import Icon from '../../../components/AppIcon';


export default function BookingDetails({ booking }) {
  if (!booking) return null;

  const getStatusColor = (status) => {
    const colors = {
      pending: 'text-yellow-600',
      confirmed: 'text-green-600',
      in_progress: 'text-blue-600',
      completed: 'text-purple-600',
      cancelled: 'text-red-600'
    };
    return colors?.[status] || 'text-gray-600';
  };

  const getStatusIcon = (status) => {
    const icons = {
      pending: Clock,
      confirmed: CheckCircle,
      in_progress: Navigation,
      completed: CheckCircle,
      cancelled: AlertCircle
    };
    const Icon = icons?.[status] || Info;
    return <Icon className="w-4 h-4" />;
  };

  const isUpcoming = () => {
    const now = new Date();
    const pickupDate = new Date(booking.pickupDate);
    return pickupDate > now;
  };

  const getTimeUntilPickup = () => {
    const now = new Date();
    const pickupDate = new Date(booking.pickupDate);
    const diffMs = pickupDate - now;
    
    if (diffMs <= 0) return null;
    
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffDays > 0) {
      return `${diffDays} day${diffDays > 1 ? 's' : ''} from now`;
    } else if (diffHours > 0) {
      return `${diffHours} hour${diffHours > 1 ? 's' : ''} from now`;
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60));
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} from now`;
    }
  };

  return (
    <div className="space-y-6">
      {/* Trip Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Trip Information</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Route</div>
              <div className="space-y-2">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">{booking?.pickupLocation}</span>
                </div>
                <div className="ml-3 border-l-2 border-gray-200 h-4"></div>
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="text-gray-700">{booking?.dropoffLocation}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Date & Time</div>
              <div className="text-gray-700">
                <div className="flex items-center space-x-2">
                  <span>
                    {new Date(booking.pickupDate)?.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </span>
                  <span className="text-gray-500">at</span>
                  <span className="font-medium">
                    {new Date(booking.pickupDate)?.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>
                {isUpcoming() && getTimeUntilPickup() && (
                  <div className="text-blue-600 text-sm mt-1">
                    <Clock className="w-4 h-4 inline mr-1" />
                    {getTimeUntilPickup()}
                  </div>
                )}
              </div>
              
              {booking?.returnDate && (
                <div className="mt-2">
                  <div className="text-sm text-gray-600">Return:</div>
                  <div className="text-gray-700">
                    {new Date(booking.returnDate)?.toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })} at {new Date(booking.returnDate)?.toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Users className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Passengers</div>
              <div className="text-gray-700">{booking?.passengerCount} people</div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <div className={`w-5 h-5 mt-0.5 ${getStatusColor(booking?.status)}`}>
              {getStatusIcon(booking?.status)}
            </div>
            <div>
              <div className="font-medium text-gray-900">Status</div>
              <div className={`capitalize ${getStatusColor(booking?.status)}`}>
                {booking?.status?.replace('_', ' ')}
              </div>
            </div>
          </div>

          {booking?.notes && (
            <div className="flex items-start space-x-3">
              <AlertCircle className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Special Requests</div>
                <div className="text-gray-700">{booking?.notes}</div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Vehicle & Driver Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Vehicle & Driver Information</h3>
        <div className="space-y-4">
          {booking?.vehicle && (
            <div className="flex items-start space-x-3">
              <Car className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Assigned Vehicle</div>
                <div className="text-gray-700">
                  {booking?.vehicle?.make} {booking?.vehicle?.model}
                  <br />
                  <span className="text-sm text-gray-600">
                    License Plate: {booking?.vehicle?.licensePlate}
                  </span>
                  <br />
                  <span className="text-sm text-gray-600">
                    Capacity: Up to {booking?.vehicle?.capacity} passengers
                  </span>
                </div>
              </div>
            </div>
          )}

          {booking?.driverAssignment && booking?.driverAssignment?.driver_profiles ? (
            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Assigned Driver</div>
                <div className="text-gray-700">
                  {booking?.driverAssignment?.driver_profiles?.user_profiles?.full_name || 'Driver information pending'}
                  {booking?.driverAssignment?.driver_profiles?.user_profiles?.phone && (
                    <>
                      <br />
                      <span className="text-sm text-gray-600 flex items-center mt-1">
                        <Phone className="w-4 h-4 mr-1" />
                        {booking?.driverAssignment?.driver_profiles?.user_profiles?.phone}
                      </span>
                    </>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex items-start space-x-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="font-medium text-gray-900">Driver Assignment</div>
                <div className="text-gray-600">
                  Driver will be assigned closer to your pickup time
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
      {/* Contact Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <User className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Guest Name</div>
              <div className="text-gray-700">{booking?.guestName}</div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Mail className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Email Address</div>
              <div className="text-gray-700">{booking?.guestEmail}</div>
            </div>
          </div>

          <div className="flex items-start space-x-3">
            <Phone className="w-5 h-5 text-gray-400 mt-0.5" />
            <div>
              <div className="font-medium text-gray-900">Phone Number</div>
              <div className="text-gray-700">{booking?.guestPhone}</div>
            </div>
          </div>
        </div>
      </div>
      {/* Payment Information */}
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Information</h3>
        <div className="space-y-4">
          <div className="flex items-start space-x-3">
            <CreditCard className="w-5 h-5 text-gray-400 mt-0.5" />
            <div className="flex-1">
              <div className="font-medium text-gray-900">Payment Method</div>
              <div className="text-gray-700">Cash payment upon pickup</div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Trip Cost:</span>
              <span className="font-medium">₱{booking?.totalCost?.toLocaleString()}</span>
            </div>
            {booking?.returnDate && (
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600 text-sm">Round trip pricing</span>
                <span className="text-gray-600 text-sm">Includes return journey</span>
              </div>
            )}
            <div className="border-t pt-2 mt-2">
              <div className="flex justify-between items-center">
                <span className="text-lg font-semibold text-gray-900">Total Amount:</span>
                <span className="text-2xl font-bold text-blue-600">
                  ₱{booking?.totalCost?.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* Important Information */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="font-semibold text-blue-900 mb-3">Important Information</h3>
        <div className="space-y-2 text-sm text-blue-800">
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
            <span>Driver details will be sent 1 hour before pickup</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
            <span>Please be ready 5 minutes before scheduled pickup time</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
            <span>Driver will wait up to 15 minutes at pickup location</span>
          </div>
          <div className="flex items-center">
            <CheckCircle className="w-4 h-4 mr-2 text-blue-600" />
            <span>Contact support if you need to make changes or have issues</span>
          </div>
        </div>
      </div>
      {/* Support Information */}
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 text-center">
        <h3 className="font-semibold text-gray-900 mb-2">Need Help?</h3>
        <p className="text-gray-600 text-sm mb-4">
          Our support team is available 24/7 to assist you with your booking.
        </p>
        <div className="space-y-2">
          <div>
            <a 
              href="mailto:support@goshuttle.com" 
              className="text-blue-600 hover:underline"
            >
              support@goshuttle.com
            </a>
          </div>
          <div>
            <a 
              href="tel:+639171234567" 
              className="text-blue-600 hover:underline"
            >
              +63 917 123 4567
            </a>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            Reference booking code: {booking?.bookingCode}
          </div>
        </div>
      </div>
    </div>
  );
}