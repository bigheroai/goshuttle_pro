import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Truck, Users, Calendar, BarChart3, Settings, AlertCircle, Info } from 'lucide-react';
import FleetOverview from './components/FleetOverview';
import DriverManagement from './components/DriverManagement';
import VehicleAssignment from './components/VehicleAssignment';
import { partnerFleetService } from '../../services/partnerFleetService';

export default function PartnerFleetManagement() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');
  const [partnerInfo, setPartnerInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      loadPartnerInfo();
    }
  }, [user]);

  const loadPartnerInfo = async () => {
    try {
      setLoading(true);
      setError('');
      const partnerData = await partnerFleetService?.getCurrentUserPartner();
      setPartnerInfo(partnerData);
    } catch (err) {
      console.error('Error loading partner info:', err);
      setError(err?.message || 'Failed to load partner information');
    } finally {
      setLoading(false);
    }
  };

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const tabs = [
    {
      id: 'overview',
      name: 'Fleet Overview',
      icon: BarChart3,
      description: 'Dashboard and key metrics'
    },
    {
      id: 'vehicles',
      name: 'Vehicle Management',
      icon: Truck,
      description: 'Manage vehicle assignments'
    },
    {
      id: 'drivers',
      name: 'Driver Applications',
      icon: Users,
      description: 'Review and manage drivers'
    },
    {
      id: 'schedules',
      name: 'Schedules',
      icon: Calendar,
      description: 'Driver scheduling'
    },
    {
      id: 'settings',
      name: 'Fleet Settings',
      icon: Settings,
      description: 'Fleet configuration'
    }
  ];

  const renderTabContent = () => {
    // Show error state if there's an error
    if (error) {
      return (
        <div className="bg-red-50 border border-red-200 rounded-lg p-8">
          <div className="flex items-center mb-4">
            <AlertCircle className="h-6 w-6 text-red-600 mr-2" />
            <h3 className="text-lg font-semibold text-red-800">Unable to Load Fleet Data</h3>
          </div>
          <p className="text-red-700 mb-4">{error}</p>
          <button
            onClick={loadPartnerInfo}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
          >
            Try Again
          </button>
        </div>
      );
    }

    // Show demo/no partner message if applicable
    if (partnerInfo?.isDemo || partnerInfo?.message) {
      return (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-8">
          <div className="flex items-center mb-4">
            <Info className="h-6 w-6 text-blue-600 mr-2" />
            <h3 className="text-lg font-semibold text-blue-800">Demo Mode</h3>
          </div>
          <p className="text-blue-700 mb-4">
            {partnerInfo?.message || 'You are viewing in demo mode. Some features may be limited.'}
          </p>
          {partnerInfo?.userRole && (
            <p className="text-sm text-blue-600">
              Current role: <span className="font-semibold">{partnerInfo?.userRole}</span>
            </p>
          )}
        </div>
      );
    }

    // Normal tab content rendering
    if (!partnerInfo?.id) {
      return (
        <div className="bg-gray-50 rounded-lg p-8 text-center">
          <Truck className="mx-auto h-12 w-12 text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Partner Data</h3>
          <p className="text-gray-600 mb-4">
            Partner information is not available. Please contact support if this issue persists.
          </p>
          <button
            onClick={loadPartnerInfo}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Reload
          </button>
        </div>
      );
    }

    switch (activeTab) {
      case 'overview':
        return <FleetOverview partnerId={partnerInfo?.id} />;
      case 'vehicles':
        return <VehicleAssignment partnerId={partnerInfo?.id} />;
      case 'drivers':
        return <DriverManagement partnerId={partnerInfo?.id} />;
      case 'schedules':
        return (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Calendar className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Schedule Management</h3>
            <p className="mt-1 text-sm text-gray-500">
              Driver scheduling functionality will be implemented here.
            </p>
          </div>
        );
      case 'settings':
        return (
          <div className="bg-white rounded-lg shadow-sm p-8 text-center">
            <Settings className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Fleet Settings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Fleet configuration options will be implemented here.
            </p>
          </div>
        );
      default:
        return <FleetOverview partnerId={partnerInfo?.id} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading partner fleet information...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Truck className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Partner Fleet Management
                </h1>
                {partnerInfo?.name && (
                  <p className="text-sm text-gray-500">{partnerInfo?.name}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Welcome, {user?.email}
              </span>
              {partnerInfo?.isDemo && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  Demo Mode
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Navigation */}
          <div className="lg:w-64 flex-shrink-0">
            <nav className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
              <div className="space-y-2">
                {tabs?.map((tab) => {
                  const IconComponent = tab?.icon;
                  return (
                    <button
                      key={tab?.id}
                      onClick={() => setActiveTab(tab?.id)}
                      className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                        activeTab === tab?.id
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' :'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                      }`}
                    >
                      <div className="flex items-center">
                        <IconComponent className="h-4 w-4 mr-3" />
                        <div>
                          <div className="font-medium">{tab?.name}</div>
                          <div className="text-xs text-gray-500">{tab?.description}</div>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {renderTabContent()}
          </div>
        </div>
      </div>
    </div>
  );
}