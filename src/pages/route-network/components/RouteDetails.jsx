import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const RouteDetails = ({ route, onClose, onBookRoute }) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!route) return null;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: 'Info' },
    { id: 'schedule', label: 'Schedule', icon: 'Calendar' },
    { id: 'pricing', label: 'Pricing', icon: 'DollarSign' },
    { id: 'reviews', label: 'Reviews', icon: 'Star' }
  ];

  const getPopularityColor = (popularity) => {
    if (popularity >= 80) return 'text-red-600';
    if (popularity >= 60) return 'text-orange-600';
    if (popularity >= 40) return 'text-yellow-600';
    return 'text-green-600';
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h2 className="text-xl font-bold text-gray-900">{route?.from}</h2>
              <Icon name="ArrowRight" size={20} className="text-gray-400" />
              <h2 className="text-xl font-bold text-gray-900">{route?.to}</h2>
            </div>
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <span>{route?.distance}km</span>
              <span>•</span>
              <span>{formatDuration(route?.duration)}</span>
              <span>•</span>
              <span className={getPopularityColor(route?.popularity)}>
                {route?.popularity}% popularity
              </span>
            </div>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {tabs?.map((tab) => (
              <button
                key={tab?.id}
                onClick={() => setActiveTab(tab?.id)}
                className={`flex items-center space-x-2 py-4 border-b-2 font-medium text-sm smooth-transition ${
                  activeTab === tab?.id
                    ? 'border-primary text-primary' :'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                <Icon name={tab?.icon} size={16} />
                <span>{tab?.label}</span>
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-96">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Route Image */}
              {route?.destinationImage && (
                <div className="w-full h-48 rounded-lg overflow-hidden">
                  <Image
                    src={route?.destinationImage}
                    alt={route?.destinationImageAlt}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Route Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-3">Route Details</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Distance:</span>
                      <span className="font-medium">{route?.distance}km</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-medium">{formatDuration(route?.duration)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Route Type:</span>
                      <span className="font-medium capitalize">{route?.type || 'Standard'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Traffic Condition:</span>
                      <span className={`font-medium capitalize ${
                        route?.trafficCondition === 'heavy' ? 'text-red-600' :
                        route?.trafficCondition === 'moderate' ? 'text-yellow-600' : 'text-green-600'
                      }`}>
                        {route?.trafficCondition}
                      </span>
                    </div>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-3">Features & Amenities</h3>
                  <div className="space-y-2">
                    {route?.features && route?.features?.length > 0 ? (
                      route?.features?.map((feature, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <Icon name="Check" size={14} className="text-green-600" />
                          <span className="text-sm">{feature}</span>
                        </div>
                      ))
                    ) : (
                      <p className="text-gray-500 text-sm">No special features listed</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Description */}
              {route?.description && (
                <div>
                  <h3 className="font-semibold mb-3">Description</h3>
                  <p className="text-gray-600 leading-relaxed">{route?.description}</p>
                </div>
              )}
            </div>
          )}

          {activeTab === 'schedule' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Available Schedules</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {route?.schedules?.map((schedule, index) => (
                  <div key={index} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{schedule?.departure}</span>
                      <span className="text-sm text-gray-600">{schedule?.arrival}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600">Available Seats: {schedule?.availableSeats}</span>
                      <span className="font-medium text-primary">₱{schedule?.price}</span>
                    </div>
                  </div>
                )) || (
                  <p className="text-gray-500 col-span-2">Schedule information not available</p>
                )}
              </div>
            </div>
          )}

          {activeTab === 'pricing' && (
            <div className="space-y-4">
              <h3 className="font-semibold">Pricing Information</h3>
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-lg font-semibold">Base Price</span>
                  <span className="text-2xl font-bold text-primary">₱{route?.price?.toLocaleString()}</span>
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Per person</span>
                    <span>₱{route?.price?.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Group discount (5+ people)</span>
                    <span className="text-green-600">-10%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Corporate rate</span>
                    <span className="text-blue-600">Contact for pricing</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold">Customer Reviews</h3>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5]?.map((star) => (
                      <Icon
                        key={star}
                        name="Star"
                        size={16}
                        className={star <= 4 ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                      />
                    ))}
                  </div>
                  <span className="text-sm text-gray-600">4.2 (127 reviews)</span>
                </div>
              </div>
              
              <div className="space-y-4">
                {route?.reviews?.map((review, index) => (
                  <div key={index} className="border-b border-gray-200 pb-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{review?.author}</span>
                      <div className="flex items-center">
                        {[1, 2, 3, 4, 5]?.map((star) => (
                          <Icon
                            key={star}
                            name="Star"
                            size={14}
                            className={star <= review?.rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-gray-600 text-sm">{review?.comment}</p>
                    <span className="text-xs text-gray-500">{review?.date}</span>
                  </div>
                )) || (
                  <p className="text-gray-500">No reviews available for this route</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-2xl font-bold text-primary">₱{route?.price?.toLocaleString()}</div>
              <div className="text-sm text-gray-600">per person</div>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
              <Button
                onClick={() => onBookRoute(route)}
                className="bg-conversion-accent hover:bg-conversion-accent/90"
              >
                <Icon name="Calendar" size={16} className="mr-2" />
                Book This Route
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RouteDetails;