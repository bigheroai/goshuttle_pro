import React from 'react';
import Icon from '../../../components/AppIcon';

const TrackingMap = ({ currentTrip }) => {
  if (!currentTrip) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-8 text-center">
        <Icon name="MapPin" size={48} className="mx-auto text-gray-400 mb-4" />
        <h3 className="text-lg font-semibold text-gray-900 mb-2">No Active Trip</h3>
        <p className="text-gray-600">Start a journey to see live tracking</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      <div className="h-96 relative">
        <iframe
          width="100%"
          height="100%"
          loading="lazy"
          title="Live Vehicle Tracking"
          referrerPolicy="no-referrer-when-downgrade"
          src={`https://www.google.com/maps?q=${currentTrip?.currentLocation?.lat},${currentTrip?.currentLocation?.lng}&z=15&output=embed`}
          className="w-full h-full"
        />
        
        {/* Live Status Overlay */}
        <div className="absolute top-4 left-4 bg-white/95 backdrop-blur-sm rounded-lg px-3 py-2 shadow-lg">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium text-gray-900">Live Tracking</span>
          </div>
        </div>

        {/* ETA Overlay */}
        <div className="absolute top-4 right-4 bg-primary text-white rounded-lg px-4 py-2 shadow-lg">
          <div className="text-center">
            <div className="text-xs font-medium opacity-90">ETA</div>
            <div className="text-lg font-bold">{currentTrip?.eta}</div>
          </div>
        </div>

        {/* Route Progress */}
        <div className="absolute bottom-4 left-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg p-3 shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-900">Route Progress</span>
            <span className="text-sm text-primary font-semibold">{currentTrip?.progress}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${currentTrip?.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrackingMap;