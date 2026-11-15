import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';

const RouteMap = ({ selectedRoute, onRouteSelect, routes, filters }) => {
  const [mapCenter, setMapCenter] = useState({ lat: 14.5995, lng: 120.9842 }); // Manila center
  const [zoomLevel, setZoomLevel] = useState(11);
  const [activeMarker, setActiveMarker] = useState(null);

  const filteredRoutes = routes?.filter(route => {
    if (filters?.maxDistance && route?.distance > filters?.maxDistance) return false;
    if (filters?.maxDuration && route?.duration > filters?.maxDuration) return false;
    if (filters?.maxPrice && route?.price > filters?.maxPrice) return false;
    if (filters?.routeType && route?.type !== filters?.routeType) return false;
    return true;
  });

  const handleMarkerClick = (route) => {
    setActiveMarker(route?.id);
    onRouteSelect(route);
    setMapCenter({ lat: route?.startLocation?.lat, lng: route?.startLocation?.lng });
  };

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 1, 18));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 1, 8));
  };

  const getRouteColor = (popularity) => {
    if (popularity >= 80) return 'bg-red-500';
    if (popularity >= 60) return 'bg-orange-500';
    if (popularity >= 40) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getTrafficColor = (condition) => {
    switch (condition) {
      case 'heavy': return 'border-red-500';
      case 'moderate': return 'border-yellow-500';
      case 'light': return 'border-green-500';
      default: return 'border-gray-300';
    }
  };

  return (
    <div className="relative w-full h-full bg-gray-100 rounded-lg overflow-hidden">
      {/* Map Container */}
      <div className="relative w-full h-full">
        <iframe
          width="100%"
          height="100%"
          loading="lazy"
          title="GoShuttle Route Network Map"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps?q=${mapCenter?.lat},${mapCenter?.lng}&z=${zoomLevel}&output=embed`}
          className="w-full h-full"
        />

        {/* Map Overlay Controls */}
        <div className="absolute top-4 right-4 flex flex-col space-y-2">
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomIn}
            className="bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <Icon name="Plus" size={18} />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={handleZoomOut}
            className="bg-white/90 backdrop-blur-sm hover:bg-white"
          >
            <Icon name="Minus" size={18} />
          </Button>
        </div>

        {/* Legend */}
        <div className="absolute bottom-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-4 shadow-lg">
          <h4 className="font-semibold text-sm mb-3">Route Popularity</h4>
          <div className="space-y-2">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-xs">Very High (80%+)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
              <span className="text-xs">High (60-79%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <span className="text-xs">Medium (40-59%)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-xs">Low (&lt;40%)</span>
            </div>
          </div>
        </div>

        {/* Route Markers Overlay */}
        <div className="absolute inset-0 pointer-events-none">
          {filteredRoutes?.map((route, index) => (
            <div
              key={route?.id}
              className="absolute pointer-events-auto"
              style={{
                left: `${20 + (index % 5) * 15}%`,
                top: `${20 + Math.floor(index / 5) * 15}%`
              }}
            >
              <div
                onClick={() => handleMarkerClick(route)}
                className={`w-6 h-6 rounded-full cursor-pointer border-2 ${getRouteColor(route?.popularity)} ${
                  activeMarker === route?.id ? 'ring-4 ring-blue-300' : ''
                } ${getTrafficColor(route?.trafficCondition)} hover:scale-110 smooth-transition`}
                title={`${route?.from} → ${route?.to}`}
              >
                <div className="w-full h-full rounded-full flex items-center justify-center">
                  <Icon name="MapPin" size={12} color="white" />
                </div>
              </div>
              
              {activeMarker === route?.id && (
                <div className="absolute top-8 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg p-3 min-w-48 z-10">
                  <div className="text-sm font-semibold">{route?.from} → {route?.to}</div>
                  <div className="text-xs text-gray-600 mt-1">
                    {route?.distance}km • {route?.duration}min • ₱{route?.price}
                  </div>
                  <div className="flex items-center mt-2 space-x-2">
                    <div className={`w-2 h-2 rounded-full ${getRouteColor(route?.popularity)}`}></div>
                    <span className="text-xs">{route?.popularity}% popularity</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
      {/* Weather Impact Indicator */}
      <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="flex items-center space-x-2">
          <Icon name="Cloud" size={16} className="text-gray-600" />
          <span className="text-sm font-medium">Weather Impact</span>
        </div>
        <div className="text-xs text-gray-600 mt-1">
          Light rain expected • +5-10min delays
        </div>
      </div>
      {/* Traffic Conditions */}
      <div className="absolute top-20 left-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
        <div className="flex items-center space-x-2">
          <Icon name="Navigation" size={16} className="text-gray-600" />
          <span className="text-sm font-medium">Live Traffic</span>
        </div>
        <div className="space-y-1 mt-2">
          <div className="flex items-center justify-between text-xs">
            <span>EDSA</span>
            <span className="text-red-500">Heavy</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>C5</span>
            <span className="text-yellow-500">Moderate</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span>SLEX</span>
            <span className="text-green-500">Light</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteMap;