import React, { useState, useEffect } from 'react';
import { driverService } from '../../../services/driverService';
import { MapPin, Phone, Star, Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

export default function DriverList({ onDriverSelect, selectedDriverId, filters }) {
  const [drivers, setDrivers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadDrivers();
  }, [filters]);

  const loadDrivers = async () => {
    try {
      setLoading(true);
      const data = await driverService?.getAll(filters);
      setDrivers(data);
    } catch (err) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'available':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'busy':
        return <Clock className="h-4 w-4 text-yellow-500" />;
      case 'offline':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'on_break':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <XCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'available':
        return 'Available';
      case 'busy':
        return 'Busy';
      case 'offline':
        return 'Offline';
      case 'on_break':
        return 'On Break';
      default:
        return 'Unknown';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'available':
        return 'bg-green-100 text-green-800';
      case 'busy':
        return 'bg-yellow-100 text-yellow-800';
      case 'offline':
        return 'bg-red-100 text-red-800';
      case 'on_break':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getFleetTypeBadge = (fleetType) => {
    return fleetType === 'goshuttle_main' ? (
      <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded-full">
        GoShuttle
      </span>
    ) : (
      <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded-full">
        Partner Fleet
      </span>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading drivers...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="flex items-center">
          <XCircle className="h-5 w-5 text-red-500 mr-2" />
          <span className="text-red-700">Error: {error}</span>
        </div>
      </div>
    );
  }

  if (drivers?.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-2">No drivers found</div>
        <div className="text-sm text-gray-400">Try adjusting your filters</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="text-sm text-gray-600 mb-4">
        Showing {drivers?.length} driver{drivers?.length !== 1 ? 's' : ''}
      </div>
      {drivers?.map((driver) => (
        <div
          key={driver?.id}
          onClick={() => onDriverSelect?.(driver)}
          className={`p-4 bg-white rounded-lg border-2 transition-all duration-200 cursor-pointer hover:shadow-md ${
            selectedDriverId === driver?.id
              ? 'border-blue-500 bg-blue-50' :'border-gray-200 hover:border-gray-300'
          }`}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="flex-shrink-0">
                  {driver?.userProfile?.avatarUrl ? (
                    <img
                      src={driver?.userProfile?.avatarUrl}
                      alt={driver?.userProfile?.fullName}
                      className="h-10 w-10 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                      <span className="text-gray-600 font-semibold">
                        {driver?.userProfile?.fullName?.charAt(0) || 'D'}
                      </span>
                    </div>
                  )}
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-lg font-semibold text-gray-900 truncate">
                      {driver?.userProfile?.fullName || 'Unknown Driver'}
                    </h3>
                    {driver?.isVerified && (
                      <CheckCircle className="h-5 w-5 text-green-500" title="Verified Driver" />
                    )}
                  </div>
                  
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    {driver?.userProfile?.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="h-4 w-4" />
                        <span>{driver?.userProfile?.phone}</span>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-500" />
                      <span>{driver?.rating?.toFixed(1) || '0.0'}</span>
                    </div>
                    
                    <span>•</span>
                    <span>{driver?.totalTrips || 0} trips</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Status:</span>
                  <div className="flex items-center gap-2 mt-1">
                    {getStatusIcon(driver?.currentStatus)}
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(driver?.currentStatus)}`}>
                      {getStatusText(driver?.currentStatus)}
                    </span>
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-500">Fleet:</span>
                  <div className="mt-1">
                    {getFleetTypeBadge(driver?.fleetType)}
                  </div>
                </div>
                
                {driver?.partner && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Partner:</span>
                    <span className="ml-2 font-medium">{driver?.partner?.name}</span>
                  </div>
                )}
                
                {driver?.vehicle && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Vehicle:</span>
                    <span className="ml-2">{driver?.vehicle?.name} ({driver?.vehicle?.licensePlate})</span>
                  </div>
                )}
                
                {driver?.currentLocation && (
                  <div className="col-span-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <MapPin className="h-4 w-4" />
                      <span>Last location updated {driver?.lastLocationUpdate ? new Date(driver.lastLocationUpdate)?.toLocaleString() : 'Never'}</span>
                    </div>
                  </div>
                )}
              </div>

              {driver?.qualifications && driver?.qualifications?.length > 0 && (
                <div className="mt-3">
                  <span className="text-gray-500 text-sm">Qualifications:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {driver?.qualifications?.map((qual, index) => (
                      <span
                        key={index}
                        className="px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded"
                      >
                        {qual}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}