import React from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const PopularDestinations = ({ destinations, onDestinationSelect }) => {
  const getPopularityIcon = (popularity) => {
    if (popularity >= 90) return { icon: 'TrendingUp', color: 'text-red-600' };
    if (popularity >= 70) return { icon: 'ArrowUp', color: 'text-orange-600' };
    if (popularity >= 50) return { icon: 'Minus', color: 'text-yellow-600' };
    return { icon: 'ArrowDown', color: 'text-green-600' };
  };

  const formatBookings = (count) => {
    if (count >= 1000) {
      return `${(count / 1000)?.toFixed(1)}k`;
    }
    return count?.toString();
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Icon name="MapPin" size={20} className="text-primary" />
          <h3 className="text-lg font-semibold">Popular Destinations</h3>
        </div>
        <Button variant="ghost" size="sm">
          <span className="text-primary">View All</span>
          <Icon name="ChevronRight" size={16} className="ml-1" />
        </Button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {destinations?.map((destination) => {
          const popularityIcon = getPopularityIcon(destination?.popularity);
          
          return (
            <div
              key={destination?.id}
              className="group cursor-pointer border border-gray-200 rounded-lg overflow-hidden hover:shadow-md smooth-transition"
              onClick={() => onDestinationSelect(destination)}
            >
              {/* Destination Image */}
              <div className="relative h-32 overflow-hidden">
                <Image
                  src={destination?.image}
                  alt={destination?.imageAlt}
                  className="w-full h-full object-cover group-hover:scale-105 smooth-transition"
                />
                <div className="absolute top-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-1">
                  <Icon 
                    name={popularityIcon?.icon} 
                    size={14} 
                    className={popularityIcon?.color} 
                  />
                </div>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                  {destination?.popularity}% popular
                </div>
              </div>
              {/* Destination Info */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-primary smooth-transition">
                      {destination?.name}
                    </h4>
                    <p className="text-sm text-gray-600">{destination?.location}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-primary">
                      ₱{destination?.startingPrice?.toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">from</div>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-2 mb-3 text-center">
                  <div>
                    <div className="text-sm font-medium">{destination?.routeCount}</div>
                    <div className="text-xs text-gray-500">Routes</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{formatBookings(destination?.monthlyBookings)}</div>
                    <div className="text-xs text-gray-500">Bookings</div>
                  </div>
                  <div>
                    <div className="text-sm font-medium">{destination?.avgDuration}m</div>
                    <div className="text-xs text-gray-500">Avg Time</div>
                  </div>
                </div>

                {/* Features */}
                {destination?.features && destination?.features?.length > 0 && (
                  <div className="mb-3">
                    <div className="flex flex-wrap gap-1">
                      {destination?.features?.slice(0, 2)?.map((feature, index) => (
                        <span
                          key={index}
                          className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                        >
                          {feature}
                        </span>
                      ))}
                      {destination?.features?.length > 2 && (
                        <span className="text-xs text-gray-500">
                          +{destination?.features?.length - 2} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <Button
                  variant="outline"
                  size="sm"
                  fullWidth
                  className="group-hover:bg-primary group-hover:text-white group-hover:border-primary"
                  onClick={(e) => {
                    e?.stopPropagation();
                    onDestinationSelect(destination);
                  }}
                >
                  <Icon name="MapPin" size={14} className="mr-1" />
                  View Routes
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      {/* Trending Indicator */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center space-x-2 text-gray-600">
            <Icon name="TrendingUp" size={16} />
            <span>Trending destinations this week</span>
          </div>
          <div className="flex items-center space-x-4">
            {destinations?.slice(0, 3)?.map((dest, index) => (
              <div key={dest?.id} className="flex items-center space-x-1">
                <span className="text-xs font-medium">#{index + 1}</span>
                <span className="text-xs">{dest?.name}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PopularDestinations;