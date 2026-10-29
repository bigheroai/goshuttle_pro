import React from 'react';
import Icon from '../../../components/AppIcon';

const statusConfig = {
  in_progress: { label: 'On Trip', color: 'bg-blue-500', text: 'text-blue-700', bg: 'bg-blue-50', border: 'border-blue-200' },
  confirmed: { label: 'Confirmed', color: 'bg-amber-500', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  available: { label: 'Available', color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  offline: { label: 'Offline', color: 'bg-gray-400', text: 'text-gray-600', bg: 'bg-gray-50', border: 'border-gray-200' },
  pending: { label: 'Pending', color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
};

const DriverMarkerPanel = ({ driver, onClose, onViewTrip }) => {
  if (!driver) return null;

  const status = statusConfig?.[driver?.status] || statusConfig?.offline;

  return (
    <div className="absolute top-4 right-4 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-20 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${status?.color} animate-pulse`} />
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${status?.bg} ${status?.text} border ${status?.border}`}>
            {status?.label}
          </span>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-200 transition-colors"
        >
          <Icon name="X" size={14} className="text-gray-500" />
        </button>
      </div>

      {/* Driver Info */}
      <div className="p-4">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/40 flex items-center justify-center flex-shrink-0">
            <Icon name="User" size={20} className="text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-gray-900 text-sm truncate">{driver?.driverName || 'Unknown Driver'}</p>
            <p className="text-xs text-gray-500 truncate">{driver?.vehicleName}</p>
            <p className="text-xs font-mono text-gray-600 mt-0.5">{driver?.plateNumber}</p>
          </div>
        </div>

        {/* Vehicle Details */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-xs text-gray-500 mb-0.5">Vehicle Type</p>
            <p className="text-xs font-semibold text-gray-800">{driver?.vehicleType || 'Van'}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-2.5">
            <p className="text-xs text-gray-500 mb-0.5">Capacity</p>
            <p className="text-xs font-semibold text-gray-800">{driver?.capacity || '—'} pax</p>
          </div>
        </div>

        {/* Trip Info (if on trip) */}
        {driver?.status === 'in_progress' && driver?.currentTrip && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 mb-4">
            <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
              <Icon name="Navigation" size={12} />
              Active Trip
            </p>
            <div className="space-y-1.5">
              <div className="flex items-start gap-1.5">
                <div className="w-2 h-2 rounded-full bg-green-500 mt-1 flex-shrink-0" />
                <p className="text-xs text-gray-700 leading-tight">{driver?.currentTrip?.pickup || 'Pickup location'}</p>
              </div>
              <div className="flex items-start gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500 mt-1 flex-shrink-0" />
                <p className="text-xs text-gray-700 leading-tight">{driver?.currentTrip?.destination || 'Destination'}</p>
              </div>
            </div>
            {driver?.currentTrip?.eta && (
              <div className="mt-2 pt-2 border-t border-blue-200 flex items-center justify-between">
                <span className="text-xs text-blue-600">ETA</span>
                <span className="text-xs font-bold text-blue-800">{driver?.currentTrip?.eta}</span>
              </div>
            )}
            {driver?.currentTrip?.progress !== undefined && (
              <div className="mt-2">
                <div className="flex justify-between text-xs text-blue-600 mb-1">
                  <span>Progress</span>
                  <span>{driver?.currentTrip?.progress}%</span>
                </div>
                <div className="w-full bg-blue-200 rounded-full h-1.5">
                  <div
                    className="bg-blue-600 h-1.5 rounded-full transition-all duration-500"
                    style={{ width: `${driver?.currentTrip?.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Location */}
        <div className="flex items-start gap-2 mb-4">
          <Icon name="MapPin" size={14} className="text-gray-400 mt-0.5 flex-shrink-0" />
          <p className="text-xs text-gray-600 leading-tight">{driver?.currentLocation?.address || 'Location updating...'}</p>
        </div>

        {/* Last Updated */}
        <p className="text-xs text-gray-400 mb-3">
          Updated {driver?.lastUpdated || 'just now'}
        </p>

        {/* Actions */}
        {driver?.currentTrip?.id && (
          <button
            onClick={() => onViewTrip?.(driver?.currentTrip?.id)}
            className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-primary text-white text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors"
          >
            <Icon name="ExternalLink" size={13} />
            View Trip Details
          </button>
        )}
      </div>
    </div>
  );
};

export default DriverMarkerPanel;
