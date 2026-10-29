import React, { useState, useEffect } from 'react';
import { Car, Users, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { partnerFleetService } from '../../../services/partnerFleetService';

export default function FleetOverview({ partnerId }) {
  const [analytics, setAnalytics] = useState({
    totalVehicles: 0,
    activeDrivers: 0,
    pendingApplications: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (partnerId) {
      loadAnalytics();
    } else {
      // If no partner ID, show default state
      setLoading(false);
      setAnalytics({
        totalVehicles: 0,
        activeDrivers: 0,
        pendingApplications: 0
      });
    }
  }, [partnerId]);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await partnerFleetService?.getFleetAnalytics(partnerId);
      setAnalytics(data || {
        totalVehicles: 0,
        activeDrivers: 0,
        pendingApplications: 0
      });
    } catch (err) {
      console.error('Error loading analytics:', err);
      setError(err?.message || 'Failed to load fleet analytics');
      // Set default values on error
      setAnalytics({
        totalVehicles: 0,
        activeDrivers: 0,
        pendingApplications: 0
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Fleet Overview</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[1, 2, 3]?.map(i => (
            <div key={i} className="bg-white rounded-lg shadow-sm p-6 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
              <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const overviewCards = [
    {
      title: 'Total Vehicles',
      value: analytics?.totalVehicles || 0,
      icon: Car,
      color: 'bg-blue-500',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-600'
    },
    {
      title: 'Active Drivers',
      value: analytics?.activeDrivers || 0,
      icon: Users,
      color: 'bg-green-500',
      bgColor: 'bg-green-50',
      textColor: 'text-green-600'
    },
    {
      title: 'Pending Applications',
      value: analytics?.pendingApplications || 0,
      icon: FileText,
      color: 'bg-orange-500',
      bgColor: 'bg-orange-50',
      textColor: 'text-orange-600'
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Fleet Overview</h2>
        <button
          onClick={loadAnalytics}
          disabled={!partnerId}
          className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <TrendingUp className="h-4 w-4 mr-2" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {overviewCards?.map((card, index) => {
          const IconComponent = card?.icon;
          return (
            <div key={index} className={`${card?.bgColor} rounded-lg p-6 border border-gray-200`}>
              <div className="flex items-center">
                <div className={`${card?.color} p-3 rounded-lg`}>
                  <IconComponent className="h-6 w-6 text-white" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">{card?.title}</p>
                  <p className={`text-3xl font-bold ${card?.textColor}`}>
                    {card?.value}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <button 
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!partnerId}
          >
            <div className="flex items-center">
              <Car className="h-5 w-5 text-blue-500 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Manage Vehicles</p>
                <p className="text-sm text-gray-500">Add or assign vehicles</p>
              </div>
            </div>
          </button>
          
          <button 
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!partnerId}
          >
            <div className="flex items-center">
              <Users className="h-5 w-5 text-green-500 mr-3" />
              <div>
                <p className="font-medium text-gray-900">Review Applications</p>
                <p className="text-sm text-gray-500">Process driver applications</p>
              </div>
            </div>
          </button>
          
          <button 
            className="p-4 text-left border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!partnerId}
          >
            <div className="flex items-center">
              <FileText className="h-5 w-5 text-purple-500 mr-3" />
              <div>
                <p className="font-medium text-gray-900">View Reports</p>
                <p className="text-sm text-gray-500">Fleet performance metrics</p>
              </div>
            </div>
          </button>
        </div>
      </div>

      {!partnerId && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="text-yellow-800">
            <p><strong>Note:</strong> Partner information is not available. Some features may be limited.</p>
          </div>
        </div>
      )}
    </div>
  );
}