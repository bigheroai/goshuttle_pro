import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import Image from '../../../components/AppImage';

const TripHistoryList = ({ trips = [], onViewTrip, onRebookTrip }) => {
  const [filter, setFilter] = useState('all');

  const filterOptions = [
    { value: 'all', label: 'All Trips' },
    { value: 'completed', label: 'Completed' },
    { value: 'confirmed', label: 'Upcoming' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const filteredTrips = trips?.filter(trip => {
    if (filter === 'all') return true;
    return trip?.status === filter;
  });

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800';
      case 'confirmed': case'upcoming':
        return 'bg-blue-100 text-blue-800';
      case 'cancelled':
        return 'bg-red-100 text-red-800';
      case 'in_progress': case'in-progress':
        return 'bg-amber-100 text-amber-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'CheckCircle';
      case 'confirmed': case'upcoming':
        return 'Clock';
      case 'cancelled':
        return 'XCircle';
      case 'in_progress': case'in-progress':
        return 'Navigation';
      default:
        return 'Circle';
    }
  };

  const handleViewDetails = (trip) => {
    if (onViewTrip) {
      onViewTrip(trip?.id);
    }
  };

  const handleRebook = (trip) => {
    if (onRebookTrip) {
      onRebookTrip(trip);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Trip History</h2>
        <div className="flex gap-2 overflow-x-auto">
          {filterOptions?.map((option) => (
            <Button
              key={option?.value}
              variant={filter === option?.value ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilter(option?.value)}
              className="whitespace-nowrap"
            >
              {option?.label}
            </Button>
          ))}
        </div>
      </div>
      {filteredTrips?.length > 0 ? (
        <div className="space-y-4">
          {filteredTrips?.map((trip) => (
            <div key={trip?.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
              <div className="flex flex-col md:flex-row md:items-center gap-4">
                {/* Vehicle Image */}
                <div className="flex-shrink-0">
                  <Image
                    src={trip?.vehicleImage || "https://images.unsplash.com/photo-1449965408869-eaa3f722e40d"}
                    alt={trip?.vehicleImageAlt || `${trip?.vehicleType || 'Vehicle'} for passenger transport`}
                    className="w-16 h-12 rounded-lg object-cover"
                  />
                </div>

                {/* Trip Details */}
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        {(trip?.booking_code || trip?.bookingCode || trip?.booking_reference) && (
                          <span className="font-mono text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded">
                            {trip?.booking_code || trip?.bookingCode || trip?.booking_reference}
                          </span>
                        )}
                      </div>
                      <h3 className="font-medium text-gray-900 truncate">
                        {trip?.from || trip?.pickupLocation || trip?.pickup_location} → {trip?.to || trip?.dropoffLocation || trip?.dropoff_location}
                      </h3>
                      <p className="text-sm text-gray-600">
                        {trip?.date || (trip?.pickup_date ? new Date(trip?.pickup_date)?.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }) : '')} • {trip?.time || (trip?.pickup_date ? new Date(trip?.pickup_date)?.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '')}
                      </p>
                      <p className="text-sm text-gray-500">
                        {trip?.vehicleType || trip?.vehicles?.name} • {trip?.duration}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(trip?.status)}`}>
                        <Icon name={getStatusIcon(trip?.status)} size={12} />
                        {trip?.status === 'confirmed' ? 'Upcoming' : 
                         trip?.status?.charAt(0)?.toUpperCase() + trip?.status?.slice(1)}
                      </span>
                      <span className="font-semibold text-gray-900">
                        ₱{trip?.amount || trip?.totalCost || '0.00'}
                      </span>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(trip)}
                    >
                      <Icon name="Eye" size={14} className="mr-1" />
                      View Details
                    </Button>
                    
                    {trip?.status === 'completed' && (
                      <>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleRebook(trip)}
                        >
                          <Icon name="RotateCcw" size={14} className="mr-1" />
                          Rebook
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                        >
                          <Icon name="Download" size={14} className="mr-1" />
                          Receipt
                        </Button>
                      </>
                    )}
                    
                    {trip?.status === 'confirmed' && (
                      <Button
                        variant="outline"
                        size="sm"
                      >
                        <Icon name="Edit" size={14} className="mr-1" />
                        Modify
                      </Button>
                    )}
                    
                    {(trip?.status === 'in_progress' || trip?.status === 'in-progress') && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => window.location.href = '/live-tracking'}
                      >
                        <Icon name="Navigation" size={14} className="mr-1" />
                        Track Live
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <Icon name="Calendar" size={64} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-900 mb-2">No trips found</h3>
          <p className="text-gray-600 mb-6">
            {filter === 'all' ? "You haven't made any trips yet." 
              : `No trips match the selected filter: ${filterOptions?.find(opt => opt?.value === filter)?.label}.`}
          </p>
          <Button 
            variant="default"
            onClick={() => window.location.href = '/smart-booking-portal'}
          >
            <Icon name="Plus" size={16} className="mr-2" />
            Book Your First Trip
          </Button>
        </div>
      )}
    </div>
  );
};

export default TripHistoryList;