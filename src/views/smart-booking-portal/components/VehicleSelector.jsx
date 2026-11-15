import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Image from '../../../components/AppImage';
import Button from '../../../components/ui/Button';
import bookingService from '../../../services/bookingService';

const VehicleSelector = ({ onVehicleSelect, selectedVehicle, passengerCount }) => {
  const [viewMode, setViewMode] = useState('grid');
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch vehicles from database on component mount - FIXED: Enhanced to get partner/admin vehicles only
  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // FIXED: Call enhanced method that only gets partner/admin saved vehicles
        const vehiclesData = await bookingService?.getAvailableVehiclesForBooking();
        
        if (!vehiclesData || vehiclesData?.length === 0) {
          setVehicles([]);
          setError('No partner or admin vehicles available for booking. Please contact administrator.');
          return;
        }

        // Map database vehicles to component format - FIXED: Enhanced mapping
        const mappedVehicles = vehiclesData?.map(vehicle => ({
          id: vehicle?.id, // Use real UUID from database
          name: vehicle?.name,
          type: vehicle?.vehicleType,
          capacity: vehicle?.capacity,
          luggage: Math.floor(vehicle?.capacity / 2), // Estimate luggage capacity
          price: vehicle?.dailyRate || 350,
          image: vehicle?.imageUrl || "https://images.unsplash.com/photo-1726003514379-033ea2ef59f5",
          imageAlt: `${vehicle?.vehicleType} for passenger transport`,
          features: vehicle?.features || ['Air Conditioning', 'WiFi', 'Phone Charger'],
          description: vehicle?.description || `${vehicle?.vehicleType} for comfortable transportation`,
          available: true, // All vehicles from service are available
          rating: 4.8, // Default rating
          estimatedTime: '5-15 mins', // Default ETA
          category: vehicle?.vehicleType === 'van' ? 'van' : 'regular',
          // FIXED: Include partner information
          partner: vehicle?.partner,
          isPartnerVehicle: !!vehicle?.partner
        }));

        setVehicles(mappedVehicles);
      } catch (err) {
        console.error('Error fetching vehicles:', err);
        setError('Failed to load vehicles. Please contact support if this persists.');
        setVehicles([]);
      } finally {
        setLoading(false);
      }
    };

    fetchVehicles();
  }, []);

  const handleVehicleSelect = (vehicle) => {
    if (vehicle?.available && vehicle?.id) {
      // FIXED: Only allow selection of vehicles with valid UUIDs
      onVehicleSelect(vehicle);
    }
  };

  const getFilteredVehicles = () => {
    const currentPassengerCount = passengerCount || 1;

    // If more than 5 passengers, show only vans
    if (currentPassengerCount > 5) {
      return vehicles?.filter((vehicle) =>
        vehicle?.category === 'van' &&
        vehicle?.capacity >= currentPassengerCount &&
        vehicle?.available &&
        vehicle?.id // FIXED: Ensure vehicle has valid ID
      );
    }

    // For 5 or fewer passengers, show all vehicles that can accommodate them
    return vehicles?.filter((vehicle) =>
      vehicle?.capacity >= currentPassengerCount &&
      vehicle?.available &&
      vehicle?.id // FIXED: Ensure vehicle has valid ID
    );
  };

  const filteredVehicles = getFilteredVehicles();
  const currentPassengerCount = passengerCount || 1;

  // Loading state
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Choose Your Vehicle</h3>
          <div className="flex items-center space-x-2">
            <Icon name="Loader" size={16} className="animate-spin text-primary" />
            <span className="text-sm text-gray-600">Loading partner & admin vehicles...</span>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4]?.map((index) => (
            <div key={index} className="border rounded-lg p-4 animate-pulse">
              <div className="w-full h-48 bg-gray-200 rounded-lg mb-3"></div>
              <div className="h-4 bg-gray-200 rounded mb-2"></div>
              <div className="h-3 bg-gray-200 rounded mb-3 w-3/4"></div>
              <div className="flex space-x-2">
                <div className="h-3 bg-gray-200 rounded w-16"></div>
                <div className="h-3 bg-gray-200 rounded w-16"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // FIXED: Enhanced error state with specific messaging for partner vehicles
  if (error || vehicles?.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center py-8">
          <Icon name="AlertCircle" size={48} className="text-red-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Partner/Admin Vehicles Available</h3>
          <p className="text-gray-600 mb-4">
            {error || 'Only vehicles saved by fleet partners and administrators can be booked. No such vehicles are currently available.'}
          </p>
          <div className="space-y-3">
            <Button variant="outline" onClick={() => window.location?.reload()}>
              <Icon name="RefreshCw" size={16} className="mr-2" />
              Retry Loading Vehicles
            </Button>
            <div className="text-sm text-gray-500">
              <p>If this problem persists, please contact our support team:</p>
              <p className="font-medium">📞 +63 2 8123 4567 • ✉️ support@goshuttle.com</p>
              <p className="text-xs mt-2 text-gray-400">
                Note: Only vehicles managed by fleet partners or administrators are available for booking.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Choose Your Vehicle</h3>
        <div className="flex items-center space-x-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('grid')}>
            <Icon name="Grid3X3" size={16} />
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setViewMode('list')}>
            <Icon name="List" size={16} />
          </Button>
        </div>
      </div>

      {/* Passenger Count and Filtering Info */}
      <div className="mb-6">
        <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Icon name="Users" size={16} className="text-primary" />
              <span className="text-sm font-medium text-gray-900">
                {currentPassengerCount} passenger{currentPassengerCount > 1 ? 's' : ''}
              </span>
            </div>
            <div className="flex items-center space-x-2">
              <Icon name="Filter" size={16} className="text-primary" />
              <span className="text-sm text-gray-600">
                {currentPassengerCount > 5 ?
                  'Showing partner/admin vans only' : 'Showing all suitable partner/admin vehicles'
                }
              </span>
            </div>
          </div>
          
          {currentPassengerCount > 5 &&
            <div className="mt-2 text-sm text-blue-700">
              <Icon name="Info" size={14} className="inline mr-1" />
              Large groups require van vehicles for safety and comfort.
            </div>
          }
        </div>
      </div>

      {/* No Suitable Vehicles Message */}
      {filteredVehicles?.length === 0 &&
        <div className="text-center py-8">
          <Icon name="Car" size={48} className="text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Suitable Partner/Admin Vehicles Available</h3>
          <p className="text-gray-600 mb-4">
            No partner or admin vehicles can accommodate {currentPassengerCount} passengers at this time.
          </p>
          <div className="space-y-3">
            <Button variant="outline" onClick={() => window.location?.reload()}>
              <Icon name="RefreshCw" size={16} className="mr-2" />
              Refresh Vehicle Availability
            </Button>
            <div className="text-sm text-gray-500">
              <p>Need assistance? Contact our booking specialists:</p>
              <p className="font-medium">📞 +63 2 8123 4567 • ✉️ support@goshuttle.com</p>
            </div>
          </div>
        </div>
      }

      {/* Vehicle Grid/List */}
      {filteredVehicles?.length > 0 &&
        <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
          {filteredVehicles?.map((vehicle) =>
            <div
              key={vehicle?.id}
              onClick={() => handleVehicleSelect(vehicle)}
              className={`border rounded-lg p-4 transition-all duration-200 cursor-pointer ${
                selectedVehicle?.id === vehicle?.id ?
                  'border-primary bg-blue-50' :
                  vehicle?.available ?
                    'border-gray-200 hover:border-primary hover:shadow-md' :
                    'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60'}`
              }>
              <div className={viewMode === 'list' ? 'flex space-x-4' : ''}>
                {/* Vehicle Image */}
                <div className={`${viewMode === 'list' ? 'w-32 h-24' : 'w-full h-48'} overflow-hidden rounded-lg mb-3`}>
                  <Image
                    src={vehicle?.image}
                    alt={vehicle?.imageAlt}
                    className="w-full h-full object-cover" />
                </div>

                {/* Vehicle Details */}
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900">{vehicle?.name}</h4>
                      <p className="text-sm text-gray-600">{vehicle?.type}</p>
                      
                      {/* FIXED: Show partner information when available */}
                      {vehicle?.isPartnerVehicle && vehicle?.partner && (
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                            <Icon name="Building2" size={12} className="mr-1" />
                            Partner: {vehicle?.partner?.name}
                          </span>
                        </div>
                      )}
                      
                      {currentPassengerCount > 5 && vehicle?.category === 'van' &&
                        <div className="mt-1">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Icon name="CheckCircle" size={12} className="mr-1" />
                            Recommended for {currentPassengerCount} passengers
                          </span>
                        </div>
                      }
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-bold text-primary">₱{vehicle?.price}</div>
                      <div className="text-xs text-gray-500">per trip</div>
                    </div>
                  </div>

                  {/* Capacity Info */}
                  <div className="flex items-center space-x-4 mb-3">
                    <div className="flex items-center space-x-1">
                      <Icon name="Users" size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{vehicle?.capacity} seats</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Icon name="Luggage" size={16} className="text-gray-400" />
                      <span className="text-sm text-gray-600">{vehicle?.luggage} bags</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Icon name="Star" size={16} className="text-yellow-400 fill-current" />
                      <span className="text-sm text-gray-600">{vehicle?.rating}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-gray-600 mb-3">{vehicle?.description}</p>

                  {/* Features */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {vehicle?.features?.slice(0, 3)?.map((feature, index) =>
                      <span
                        key={index}
                        className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-full">
                        {feature}
                      </span>
                    )}
                    {vehicle?.features?.length > 3 &&
                      <span className="px-2 py-1 bg-gray-100 text-xs text-gray-600 rounded-full">
                        +{vehicle?.features?.length - 3} more
                      </span>
                    }
                  </div>

                  {/* Availability Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className={`w-2 h-2 rounded-full ${
                        vehicle?.available ? 'bg-green-500' : 'bg-red-500'}`
                      } />
                      <span className={`text-sm font-medium ${
                        vehicle?.available ? 'text-green-600' : 'text-red-600'}`
                      }>
                        {vehicle?.available ? 'Available' : 'Not Available'}
                      </span>
                    </div>
                    {vehicle?.available &&
                      <span className="text-sm text-gray-500">
                        ETA: {vehicle?.estimatedTime}
                      </span>
                    }
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      }

      {/* Selected Vehicle Summary */}
      {selectedVehicle &&
        <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Icon name="CheckCircle" size={20} className="text-green-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {selectedVehicle?.name} Selected
                </p>
                <p className="text-xs text-gray-600">
                  {selectedVehicle?.capacity} passengers • {selectedVehicle?.luggage} luggage
                  {selectedVehicle?.isPartnerVehicle && selectedVehicle?.partner && (
                    <span> • Partner: {selectedVehicle?.partner?.name}</span>
                  )}
                </p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary">₱{selectedVehicle?.price}</p>
              <p className="text-xs text-gray-500">ETA: {selectedVehicle?.estimatedTime}</p>
            </div>
          </div>
        </div>
      }
    </div>
  );
};

export default VehicleSelector;