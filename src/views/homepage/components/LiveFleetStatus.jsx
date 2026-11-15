import React, { useState, useEffect } from 'react';
import Icon from '../../../components/AppIcon';

const LiveFleetStatus = () => {
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fleetData = [
    {
      id: 1,
      type: "Premium Van",
      capacity: 12,
      available: 8,
      inService: 15,
      maintenance: 2,
      icon: "Car",
      color: "emerald"
    },
    {
      id: 2,
      type: "Executive Shuttle",
      capacity: 20,
      available: 5,
      inService: 12,
      maintenance: 1,
      icon: "Bus",
      color: "blue"
    },
    {
      id: 3,
      type: "Luxury Coach",
      capacity: 45,
      available: 3,
      inService: 8,
      maintenance: 0,
      icon: "Truck",
      color: "purple"
    },
    {
      id: 4,
      type: "Mini Van",
      capacity: 8,
      available: 12,
      inService: 18,
      maintenance: 1,
      icon: "Car",
      color: "orange"
    }
  ];

  const totalVehicles = fleetData?.reduce((sum, fleet) => sum + fleet?.available + fleet?.inService + fleet?.maintenance, 0);
  const availableVehicles = fleetData?.reduce((sum, fleet) => sum + fleet?.available, 0);
  const activeVehicles = fleetData?.reduce((sum, fleet) => sum + fleet?.inService, 0);

  const getStatusColor = (type) => {
    switch (type) {
      case 'available': return 'text-emerald-600 bg-emerald-50';
      case 'inService': return 'text-blue-600 bg-blue-50';
      case 'maintenance': return 'text-orange-600 bg-orange-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center space-y-4 mb-12">
          <div className="inline-flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full text-sm font-medium">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span>Live Fleet Status</span>
            <span className="text-xs opacity-75">
              Updated {currentTime?.toLocaleTimeString()}
            </span>
          </div>
          
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900">
            Real-Time Fleet Availability
          </h2>
          
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Monitor our entire fleet in real-time. See which vehicles are available, currently in service, or undergoing maintenance for complete transparency.
          </p>
        </div>

        {/* Fleet Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 border border-emerald-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-lg flex items-center justify-center">
                <Icon name="CheckCircle" size={24} className="text-white" />
              </div>
              <span className="text-2xl font-bold text-emerald-700">{availableVehicles}</span>
            </div>
            <h3 className="font-semibold text-emerald-900 mb-1">Available Now</h3>
            <p className="text-sm text-emerald-700">Ready for immediate booking</p>
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 border border-blue-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-blue-500 rounded-lg flex items-center justify-center">
                <Icon name="Navigation" size={24} className="text-white" />
              </div>
              <span className="text-2xl font-bold text-blue-700">{activeVehicles}</span>
            </div>
            <h3 className="font-semibold text-blue-900 mb-1">Currently Active</h3>
            <p className="text-sm text-blue-700">Vehicles in service</p>
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-gray-500 rounded-lg flex items-center justify-center">
                <Icon name="Shield" size={24} className="text-white" />
              </div>
              <span className="text-2xl font-bold text-gray-700">{totalVehicles}</span>
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">Total Fleet</h3>
            <p className="text-sm text-gray-700">Complete vehicle count</p>
          </div>
        </div>

        {/* Detailed Fleet Status */}
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Fleet Breakdown by Vehicle Type</h3>
          </div>
          
          <div className="divide-y divide-gray-200">
            {fleetData?.map((fleet) => (
              <div key={fleet?.id} className="p-6 hover:bg-gray-50 smooth-transition">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 bg-${fleet?.color}-100 rounded-lg flex items-center justify-center`}>
                      <Icon name={fleet?.icon} size={24} className={`text-${fleet?.color}-600`} />
                    </div>
                    <div>
                      <h4 className="font-semibold text-gray-900">{fleet?.type}</h4>
                      <p className="text-sm text-gray-600">Capacity: {fleet?.capacity} passengers</p>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <div className="text-2xl font-bold text-gray-900">{fleet?.available + fleet?.inService + fleet?.maintenance}</div>
                    <div className="text-sm text-gray-600">Total Units</div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className={`${getStatusColor('available')} rounded-lg p-3 text-center`}>
                    <div className="font-semibold text-lg">{fleet?.available}</div>
                    <div className="text-xs font-medium">Available</div>
                  </div>
                  
                  <div className={`${getStatusColor('inService')} rounded-lg p-3 text-center`}>
                    <div className="font-semibold text-lg">{fleet?.inService}</div>
                    <div className="text-xs font-medium">In Service</div>
                  </div>
                  
                  <div className={`${getStatusColor('maintenance')} rounded-lg p-3 text-center`}>
                    <div className="font-semibold text-lg">{fleet?.maintenance}</div>
                    <div className="text-xs font-medium">Maintenance</div>
                  </div>
                </div>

                {/* Availability Bar */}
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                    <span>Availability Rate</span>
                    <span>{Math.round((fleet?.available / (fleet?.available + fleet?.inService + fleet?.maintenance)) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-emerald-500 h-2 rounded-full smooth-transition"
                      style={{ width: `${(fleet?.available / (fleet?.available + fleet?.inService + fleet?.maintenance)) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Real-time Updates Notice */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <Icon name="Info" size={20} className="text-blue-600" />
            <div className="flex-1">
              <p className="text-sm font-medium text-blue-900">
                Real-time updates every 30 seconds
              </p>
              <p className="text-xs text-blue-700">
                Fleet status is automatically synchronized with our dispatch system for accurate availability information.
              </p>
            </div>
            <div className="w-3 h-3 bg-blue-500 rounded-full animate-pulse"></div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default LiveFleetStatus;