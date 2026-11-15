import React from 'react';
import Icon from '../../../components/AppIcon';

const StatsOverview = ({ stats }) => {
  const statItems = [
    {
      label: 'Total Trips',
      value: stats?.totalTrips,
      icon: 'MapPin',
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      change: '+12%',
      changeType: 'positive'
    },
    {
      label: 'Distance Traveled',
      value: `${stats?.totalDistance} km`,
      icon: 'Route',
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      change: '+8%',
      changeType: 'positive'
    },
    {
      label: 'Money Saved',
      value: `₱${stats?.moneySaved}`,
      icon: 'PiggyBank',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      change: '+15%',
      changeType: 'positive'
    },
    {
      label: 'Carbon Offset',
      value: `${stats?.carbonOffset} kg`,
      icon: 'Leaf',
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-50',
      change: '+22%',
      changeType: 'positive'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {statItems?.map((item, index) => (
        <div key={index} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className={`w-12 h-12 ${item?.bgColor} rounded-lg flex items-center justify-center`}>
              <Icon name={item?.icon} size={24} className={item?.color} />
            </div>
            <div className={`text-sm font-medium ${
              item?.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
            }`}>
              {item?.change}
            </div>
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-900 mb-1">{item?.value}</p>
            <p className="text-sm text-gray-600">{item?.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default StatsOverview;