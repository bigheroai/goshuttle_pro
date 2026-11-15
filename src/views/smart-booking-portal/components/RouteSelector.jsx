import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import PlacesAutocomplete from '../../../components/ui/PlacesAutocomplete';
import destinationSettingsService from '../../../services/destinationSettingsService';

const ALL_POPULAR_ROUTES = [
  { 
    id: 1, 
    from: 'Quezon City', 
    to: 'Makati CBD', 
    duration: '45 mins',
    distance: '18 km',
    price: '₱350'
  },
  { 
    id: 2, 
    from: 'Alabang', 
    to: 'Tagaytay', 
    duration: '1h 30m',
    distance: '35 km',
    price: '₱600'
  },
  { 
    id: 3, 
    from: 'Calamba', 
    to: 'Makati', 
    duration: '1h 45m',
    distance: '55 km',
    price: '₱750'
  },
  { 
    id: 4, 
    from: 'Cavite', 
    to: 'Alabang', 
    duration: '40 mins',
    distance: '22 km',
    price: '₱400'
  }
];

const RouteSelector = ({ onRouteSelect, selectedRoute, onSearchComplete }) => {
  const [fromLocation, setFromLocation] = useState(selectedRoute?.from || '');
  const [toLocation, setToLocation] = useState(selectedRoute?.to || '');
  const [fromPlaceData, setFromPlaceData] = useState(null);
  const [toPlaceData, setToPlaceData] = useState(null);
  const [popularRoutes, setPopularRoutes] = useState(ALL_POPULAR_ROUTES);
  const [restrictions, setRestrictions] = useState(null);

  useEffect(() => {
    loadRestrictions();
  }, []);

  const loadRestrictions = async () => {
    try {
      const data = await destinationSettingsService?.getDestinationRestrictions();
      setRestrictions(data);
      if (data?.enabled && data?.allowed_destinations?.length > 0) {
        const filtered = ALL_POPULAR_ROUTES?.filter(route => {
          const toBase = route?.to?.replace(' CBD', '')?.replace(' City', ' City');
          return data?.allowed_destinations?.some(d =>
            route?.from?.toLowerCase()?.includes(d?.toLowerCase()) ||
            d?.toLowerCase()?.includes(route?.from?.toLowerCase()) ||
            route?.to?.toLowerCase()?.includes(d?.toLowerCase()) ||
            d?.toLowerCase()?.includes(route?.to?.toLowerCase())
          );
        });
        setPopularRoutes(filtered?.length > 0 ? filtered : ALL_POPULAR_ROUTES);
      }
    } catch {
      // silently fail, show all routes
    }
  };

  const isDestinationAllowed = (destination) => {
    if (!restrictions?.enabled) return true;
    if (!restrictions?.allowed_destinations?.length) return true;
    return restrictions?.allowed_destinations?.some(d =>
      destination?.toLowerCase()?.includes(d?.toLowerCase()) ||
      d?.toLowerCase()?.includes(destination?.toLowerCase())
    );
  };

  const handleFromLocationChange = (value) => {
    setFromLocation(value);
  };

  const handleToLocationChange = (value) => {
    setToLocation(value);
  };

  const handleFromPlaceSelect = (placeData) => {
    setFromLocation(placeData?.address || placeData?.name);
    setFromPlaceData(placeData);
  };

  const handleToPlaceSelect = (placeData) => {
    setToLocation(placeData?.address || placeData?.name);
    setToPlaceData(placeData);
  };

  const handleSwapLocations = () => {
    const tempLocation = fromLocation;
    const tempPlaceData = fromPlaceData;
    
    setFromLocation(toLocation);
    setFromPlaceData(toPlaceData);
    setToLocation(tempLocation);
    setToPlaceData(tempPlaceData);
  };

  const handleRouteSelect = (route) => {
    setFromLocation(route?.from);
    setToLocation(route?.to);
    setFromPlaceData(null);
    setToPlaceData(null);
    onRouteSelect(route);
  };

  const calculateDistance = () => {
    if (fromPlaceData?.geometry && toPlaceData?.geometry) {
      const fromLat = fromPlaceData?.geometry?.location?.lat();
      const fromLng = fromPlaceData?.geometry?.location?.lng();
      const toLat = toPlaceData?.geometry?.location?.lat();
      const toLng = toPlaceData?.geometry?.location?.lng();
      
      const R = 6371;
      const dLat = (toLat - fromLat) * Math.PI / 180;
      const dLng = (toLng - fromLng) * Math.PI / 180;
      const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                Math.cos(fromLat * Math.PI / 180) * Math.cos(toLat * Math.PI / 180) *
                Math.sin(dLng/2) * Math.sin(dLng/2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
      const distance = R * c;
      
      return `${distance?.toFixed(1)} km`;
    }
    return 'Calculating...';
  };

  const handleSearchRoute = () => {
    if (fromLocation && toLocation) {
      const customRoute = {
        id: 'custom',
        from: fromLocation,
        to: toLocation,
        duration: '30-60 mins',
        distance: calculateDistance(),
        price: 'Quote on request',
        fromPlaceData,
        toPlaceData
      };
      onRouteSelect(customRoute);
      if (onSearchComplete) {
        onSearchComplete(customRoute);
      }
    }
  };

  const isToRestricted = toLocation && !isDestinationAllowed(toLocation);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Your Route</h3>
      
      {/* Route Input Section */}
      <div className="space-y-4 mb-6">
        <PlacesAutocomplete
          label="From"
          placeholder="Enter pickup location"
          value={fromLocation}
          onChange={handleFromLocationChange}
          onPlaceSelect={handleFromPlaceSelect}
          icon="MapPin"
          className="pr-12"
        />

        <div className="flex justify-center">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSwapLocations}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <Icon name="ArrowUpDown" size={20} className="text-gray-500" />
          </Button>
        </div>

        <PlacesAutocomplete
          label="To"
          placeholder="Enter destination"
          value={toLocation}
          onChange={handleToLocationChange}
          onPlaceSelect={handleToPlaceSelect}
          icon="Navigation"
          className="pr-12"
        />

        {isToRestricted && (
          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
            <span className="font-semibold">Note:</span> This destination is currently not serviced. Please choose from our available destinations.
          </div>
        )}

        <Button
          onClick={handleSearchRoute}
          disabled={!fromLocation || !toLocation || isToRestricted}
          className="w-full"
        >
          <Icon name="Search" size={18} className="mr-2" />
          Search Routes
        </Button>
      </div>

      {/* Popular Routes */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3">Popular Routes</h4>
        {popularRoutes?.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-4">No routes available at this time.</p>
        ) : (
          <div className="space-y-3">
            {popularRoutes?.map((route) => (
              <div
                key={route?.id}
                onClick={() => handleRouteSelect(route)}
                className="p-4 border border-gray-200 rounded-lg hover:border-primary hover:bg-blue-50 cursor-pointer transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <Icon name="MapPin" size={16} className="text-primary" />
                      <span className="text-sm font-medium text-gray-900">{route?.from}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Icon name="Navigation" size={16} className="text-secondary" />
                      <span className="text-sm font-medium text-gray-900">{route?.to}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold text-primary">{route?.price}</div>
                    <div className="text-xs text-gray-500">{route?.duration} • {route?.distance}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteSelector;