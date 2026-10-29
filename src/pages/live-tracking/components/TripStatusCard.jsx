import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const TripStatusCard = ({ currentTrip, onContactDriver, onEmergencyCall, onShareTrip }) => {
  if (!currentTrip) return null;

  const getStatusColor = (status) => {
    switch (status) {
      case 'en_route': return 'text-blue-600 bg-blue-100';
      case 'arrived': return 'text-green-600 bg-green-100';
      case 'delayed': return 'text-amber-600 bg-amber-100';
      case 'completed': return 'text-gray-600 bg-gray-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'en_route': return 'En Route';
      case 'arrived': return 'Arrived';
      case 'delayed': return 'Delayed';
      case 'completed': return 'Completed';
      default: return 'Unknown';
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-gray-900">Trip Status</h2>
        <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(currentTrip?.status)}`}>
          {getStatusText(currentTrip?.status)}
        </div>
      </div>
      {/* Trip Details */}
      <div className="space-y-4 mb-6">
        <div className="flex items-start space-x-3">
          <Icon name="MapPin" size={20} className="text-green-600 mt-1" />
          <div>
            <div className="text-sm text-gray-500">Pickup Location</div>
            <div className="font-medium text-gray-900">{currentTrip?.pickup}</div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Icon name="Navigation" size={20} className="text-red-600 mt-1" />
          <div>
            <div className="text-sm text-gray-500">Destination</div>
            <div className="font-medium text-gray-900">{currentTrip?.destination}</div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Icon name="Clock" size={20} className="text-blue-600 mt-1" />
          <div>
            <div className="text-sm text-gray-500">Estimated Arrival</div>
            <div className="font-medium text-gray-900">{currentTrip?.eta}</div>
          </div>
        </div>

        <div className="flex items-start space-x-3">
          <Icon name="Route" size={20} className="text-purple-600 mt-1" />
          <div>
            <div className="text-sm text-gray-500">Distance Remaining</div>
            <div className="font-medium text-gray-900">{currentTrip?.remainingDistance}</div>
          </div>
        </div>
      </div>
      {/* Action Buttons */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onContactDriver}
          iconName="Phone"
          iconPosition="left"
          className="justify-center"
        >
          Call Driver
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onShareTrip}
          iconName="Share2"
          iconPosition="left"
          className="justify-center"
        >
          Share Trip
        </Button>

        <Button
          variant="destructive"
          size="sm"
          onClick={onEmergencyCall}
          iconName="AlertTriangle"
          iconPosition="left"
          className="justify-center"
        >
          Emergency
        </Button>
      </div>
    </div>
  );
};

export default TripStatusCard;