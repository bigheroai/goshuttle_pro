import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const RouteList = ({ routes, selectedRoute, onRouteSelect, onBookRoute }) => {
  const [sortBy, setSortBy] = useState('popularity');
  const [viewMode, setViewMode] = useState('list');

  const sortOptions = [
    { value: 'popularity', label: 'Most Popular', icon: 'TrendingUp' },
    { value: 'price', label: 'Lowest Price', icon: 'DollarSign' },
    { value: 'duration', label: 'Shortest Time', icon: 'Clock' },
    { value: 'distance', label: 'Shortest Distance', icon: 'MapPin' }
  ];

  const sortedRoutes = [...routes]?.sort((a, b) => {
    switch (sortBy) {
      case 'popularity':
        return b?.popularity - a?.popularity;
      case 'price':
        return a?.price - b?.price;
      case 'duration':
        return a?.duration - b?.duration;
      case 'distance':
        return a?.distance - b?.distance;
      default:
        return 0;
    }
  });

  const getPopularityBadge = (popularity) => {
    if (popularity >= 80) return { text: 'Very Popular', color: 'bg-red-100 text-red-800' };
    if (popularity >= 60) return { text: 'Popular', color: 'bg-orange-100 text-orange-800' };
    if (popularity >= 40) return { text: 'Moderate', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Available', color: 'bg-green-100 text-green-800' };
  };

  const getTrafficBadge = (condition) => {
    switch (condition) {
      case 'heavy':
        return { text: 'Heavy Traffic', color: 'bg-red-100 text-red-800', icon: 'AlertTriangle' };
      case 'moderate':
        return { text: 'Moderate Traffic', color: 'bg-yellow-100 text-yellow-800', icon: 'AlertCircle' };
      case 'light':
        return { text: 'Light Traffic', color: 'bg-green-100 text-green-800', icon: 'CheckCircle' };
      default:
        return { text: 'Unknown', color: 'bg-gray-100 text-gray-800', icon: 'HelpCircle' };
    }
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0) {
      return `${hours}h ${mins}m`;
    }
    return `${mins}m`;
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Available Routes ({routes?.length})</h3>
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <Icon name="List" size={16} />
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Icon name="Grid3X3" size={16} />
            </Button>
          </div>
        </div>

        {/* Sort Options */}
        <div className="flex flex-wrap gap-2">
          {sortOptions?.map((option) => (
            <Button
              key={option?.value}
              variant={sortBy === option?.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSortBy(option?.value)}
            >
              <Icon name={option?.icon} size={14} className="mr-1" />
              {option?.label}
            </Button>
          ))}
        </div>
      </div>
      {/* Routes List */}
      <div className="p-6">
        {sortedRoutes?.length === 0 ? (
          <div className="text-center py-12">
            <Icon name="MapPin" size={48} className="mx-auto text-gray-400 mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">No Routes Found</h4>
            <p className="text-gray-600">Try adjusting your filters to see more routes.</p>
          </div>
        ) : (
          <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'space-y-4'}>
            {sortedRoutes?.map((route) => {
              const popularityBadge = getPopularityBadge(route?.popularity);
              const trafficBadge = getTrafficBadge(route?.trafficCondition);
              const isSelected = selectedRoute?.id === route?.id;

              return (
                <div
                  key={route?.id}
                  className={`border rounded-lg p-4 cursor-pointer smooth-transition ${
                    isSelected 
                      ? 'border-primary bg-blue-50 shadow-md' 
                      : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
                  }`}
                  onClick={() => onRouteSelect(route)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-2">
                        <h4 className="font-semibold text-gray-900">{route?.from}</h4>
                        <Icon name="ArrowRight" size={16} className="text-gray-400" />
                        <h4 className="font-semibold text-gray-900">{route?.to}</h4>
                      </div>
                      <div className="flex flex-wrap gap-2 mb-2">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${popularityBadge?.color}`}>
                          {popularityBadge?.text}
                        </span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${trafficBadge?.color}`}>
                          <Icon name={trafficBadge?.icon} size={12} className="inline mr-1" />
                          {trafficBadge?.text}
                        </span>
                        {route?.type && (
                          <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 capitalize">
                            {route?.type}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-primary">₱{route?.price?.toLocaleString()}</div>
                      <div className="text-xs text-gray-500">per person</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="text-center">
                      <Icon name="MapPin" size={16} className="mx-auto text-gray-400 mb-1" />
                      <div className="text-sm font-medium">{route?.distance}km</div>
                      <div className="text-xs text-gray-500">Distance</div>
                    </div>
                    <div className="text-center">
                      <Icon name="Clock" size={16} className="mx-auto text-gray-400 mb-1" />
                      <div className="text-sm font-medium">{formatDuration(route?.duration)}</div>
                      <div className="text-xs text-gray-500">Duration</div>
                    </div>
                    <div className="text-center">
                      <Icon name="TrendingUp" size={16} className="mx-auto text-gray-400 mb-1" />
                      <div className="text-sm font-medium">{route?.popularity}%</div>
                      <div className="text-xs text-gray-500">Popularity</div>
                    </div>
                  </div>
                  {/* Route Features */}
                  {route?.features && route?.features?.length > 0 && (
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {route?.features?.map((feature, index) => (
                          <span key={index} className="text-xs text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  {/* Destination Image */}
                  {route?.destinationImage && (
                    <div className="mb-4">
                      <div className="w-full h-32 rounded-lg overflow-hidden">
                        <Image
                          src={route?.destinationImage}
                          alt={route?.destinationImageAlt}
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  )}
                  {/* Action Buttons */}
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      fullWidth
                      onClick={(e) => {
                        e?.stopPropagation();
                        onRouteSelect(route);
                      }}
                    >
                      <Icon name="Eye" size={14} className="mr-1" />
                      View Details
                    </Button>
                    <Button
                      size="sm"
                      fullWidth
                      onClick={(e) => {
                        e?.stopPropagation();
                        onBookRoute(route);
                      }}
                      className="bg-conversion-accent hover:bg-conversion-accent/90"
                    >
                      <Icon name="Calendar" size={14} className="mr-1" />
                      Book Now
                    </Button>
                  </div>
                  {/* Alternative Routes Indicator */}
                  {route?.alternativeRoutes && route?.alternativeRoutes > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>+{route?.alternativeRoutes} alternative routes available</span>
                        <Icon name="ChevronRight" size={14} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default RouteList;