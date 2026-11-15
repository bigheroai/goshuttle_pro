import React from 'react';
import Image from '../../../components/AppImage';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const VehicleComparison = ({ vehicles, onRemoveVehicle, onBookVehicle, onClearComparison }) => {
  if (vehicles?.length === 0) return null;

  const comparisonFeatures = [
    { key: 'capacity', label: 'Passenger Capacity', icon: 'Users' },
    { key: 'luggage', label: 'Luggage Space', icon: 'Luggage' },
    { key: 'fuelType', label: 'Fuel Type', icon: 'Fuel' },
    { key: 'pricePerHour', label: 'Price per Hour', icon: 'DollarSign' },
    { key: 'rating', label: 'Customer Rating', icon: 'Star' }
  ];

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
      <div className="bg-gray-50 px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">
            Compare Vehicles ({vehicles?.length})
          </h3>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClearComparison}
            className="text-gray-500 hover:text-gray-700"
          >
            <Icon name="X" size={16} className="mr-1" />
            Clear All
          </Button>
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-200">
              <th className="text-left p-4 font-medium text-gray-900 w-48">Features</th>
              {vehicles?.map((vehicle) => (
                <th key={vehicle?.id} className="text-center p-4 min-w-64">
                  <div className="space-y-3">
                    <div className="relative">
                      <Image
                        src={vehicle?.images?.[0]?.url}
                        alt={vehicle?.images?.[0]?.alt}
                        className="w-full h-32 object-cover rounded-lg"
                      />
                      <button
                        onClick={() => onRemoveVehicle(vehicle?.id)}
                        className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center hover:bg-red-600 smooth-transition"
                      >
                        <Icon name="X" size={12} />
                      </button>
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{vehicle?.name}</h4>
                      <p className="text-sm text-gray-600">{vehicle?.category}</p>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {comparisonFeatures?.map((feature) => (
              <tr key={feature?.key} className="border-b border-gray-100">
                <td className="p-4">
                  <div className="flex items-center space-x-2">
                    <Icon name={feature?.icon} size={16} className="text-gray-500" />
                    <span className="font-medium text-gray-700">{feature?.label}</span>
                  </div>
                </td>
                {vehicles?.map((vehicle) => (
                  <td key={vehicle?.id} className="p-4 text-center">
                    {feature?.key === 'pricePerHour' ? (
                      <span className="text-lg font-bold text-primary">₱{vehicle?.[feature?.key]}</span>
                    ) : feature?.key === 'rating' ? (
                      <div className="flex items-center justify-center space-x-1">
                        <Icon name="Star" size={16} className="text-yellow-400 fill-current" />
                        <span className="font-medium">{vehicle?.[feature?.key]}</span>
                      </div>
                    ) : (
                      <span className="font-medium text-gray-900">{vehicle?.[feature?.key]}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}

            {/* Amenities Row */}
            <tr className="border-b border-gray-100">
              <td className="p-4">
                <div className="flex items-center space-x-2">
                  <Icon name="Star" size={16} className="text-gray-500" />
                  <span className="font-medium text-gray-700">Key Amenities</span>
                </div>
              </td>
              {vehicles?.map((vehicle) => (
                <td key={vehicle?.id} className="p-4">
                  <div className="space-y-1">
                    {vehicle?.amenities?.slice(0, 3)?.map((amenity, index) => (
                      <div key={index} className="flex items-center justify-center space-x-1">
                        <Icon name={amenity?.icon} size={12} className="text-primary" />
                        <span className="text-xs text-gray-600">{amenity?.name}</span>
                      </div>
                    ))}
                    {vehicle?.amenities?.length > 3 && (
                      <div className="text-xs text-primary font-medium">
                        +{vehicle?.amenities?.length - 3} more
                      </div>
                    )}
                  </div>
                </td>
              ))}
            </tr>

            {/* Status Row */}
            <tr className="border-b border-gray-100">
              <td className="p-4">
                <div className="flex items-center space-x-2">
                  <Icon name="Clock" size={16} className="text-gray-500" />
                  <span className="font-medium text-gray-700">Availability</span>
                </div>
              </td>
              {vehicles?.map((vehicle) => (
                <td key={vehicle?.id} className="p-4 text-center">
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    vehicle?.status === 'available' ?'bg-success text-white' 
                      : vehicle?.status === 'maintenance' ?'bg-warning text-gray-800' :'bg-error text-white'
                  }`}>
                    {vehicle?.status === 'available' ? 'Available' : 
                     vehicle?.status === 'maintenance' ? 'Maintenance' : 'Booked'}
                  </span>
                </td>
              ))}
            </tr>

            {/* Action Row */}
            <tr>
              <td className="p-4">
                <span className="font-medium text-gray-700">Book Now</span>
              </td>
              {vehicles?.map((vehicle) => (
                <td key={vehicle?.id} className="p-4 text-center">
                  <Button
                    onClick={() => onBookVehicle(vehicle)}
                    disabled={vehicle?.status !== 'available'}
                    size="sm"
                    className="w-full bg-conversion-accent hover:bg-conversion-accent/90"
                  >
                    {vehicle?.status === 'available' ? 'Book Now' : 'Unavailable'}
                  </Button>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default VehicleComparison;