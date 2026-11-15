import React from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';

const DriverInfoCard = ({ driver, vehicle, onCallDriver, onMessageDriver }) => {
  if (!driver) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Your Driver</h3>
      <div className="flex items-center space-x-4 mb-6">
        <div className="relative">
          <Image
            src={driver?.photo}
            alt={driver?.photoAlt}
            className="w-16 h-16 rounded-full object-cover"
          />
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 border-2 border-white rounded-full" />
        </div>
        
        <div className="flex-1">
          <h4 className="font-semibold text-gray-900">{driver?.name}</h4>
          <div className="flex items-center space-x-1 mt-1">
            <Icon name="Star" size={16} className="text-yellow-500 fill-current" />
            <span className="text-sm font-medium text-gray-700">{driver?.rating}</span>
            <span className="text-sm text-gray-500">({driver?.totalTrips} trips)</span>
          </div>
          <div className="flex items-center space-x-1 mt-1">
            <Icon name="Shield" size={16} className="text-green-600" />
            <span className="text-sm text-gray-600">Verified Driver</span>
          </div>
        </div>
      </div>
      {/* Vehicle Info */}
      <div className="bg-gray-50 rounded-lg p-4 mb-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Vehicle Details</span>
          <Icon name="Car" size={16} className="text-gray-600" />
        </div>
        <div className="space-y-1">
          <div className="text-sm text-gray-900 font-medium">{vehicle?.make} {vehicle?.model}</div>
          <div className="text-sm text-gray-600">{vehicle?.color} • {vehicle?.plateNumber}</div>
          <div className="text-sm text-gray-600">Capacity: {vehicle?.capacity} passengers</div>
        </div>
      </div>
      {/* Contact Actions */}
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onCallDriver}
          iconName="Phone"
          iconPosition="left"
          className="justify-center"
        >
          Call
        </Button>
        
        <Button
          variant="outline"
          size="sm"
          onClick={onMessageDriver}
          iconName="MessageCircle"
          iconPosition="left"
          className="justify-center"
        >
          Message
        </Button>
      </div>
      {/* Driver Stats */}
      <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-200">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{driver?.experience}</div>
          <div className="text-xs text-gray-500">Years Exp.</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{driver?.onTimeRate}%</div>
          <div className="text-xs text-gray-500">On Time</div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-900">{driver?.languages}</div>
          <div className="text-xs text-gray-500">Languages</div>
        </div>
      </div>
    </div>
  );
};

export default DriverInfoCard;