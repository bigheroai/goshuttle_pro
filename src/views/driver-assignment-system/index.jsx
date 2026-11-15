import React, { useState, useEffect } from 'react';
import { driverSignupService } from '../../services/driverService';
import DriverList from './components/DriverList';
import AssignmentPanel from './components/AssignmentPanel';
import DriverSignupModal from './components/DriverSignupModal';
import PerformanceMetrics from './components/PerformanceMetrics';
import { Users, Filter, RefreshCw, BarChart3, UserPlus, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export default function DriverAssignmentSystem() {
  const [activeTab, setActiveTab] = useState('assignment');
  const [selectedDriver, setSelectedDriver] = useState(null);
  const [selectedDriverForMetrics, setSelectedDriverForMetrics] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    fleetType: '',
    partnerId: '',
    isVerified: undefined
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupRequests, setSignupRequests] = useState([]);
  const [partners, setPartners] = useState([]);
  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    loadPartners();
    if (activeTab === 'signup') {
      loadSignupRequests();
    }
  }, [activeTab]);

  const loadPartners = async () => {
    try {
      const { data, error } = await supabase?.from('partners')?.select('id, name, company_name')?.eq('is_active', true)?.order('name');

      if (error) throw error;
      setPartners(data || []);
    } catch (err) {
      console.error('Error loading partners:', err);
    }
  };

  const loadSignupRequests = async () => {
    try {
      setLoading(true);
      const data = await driverSignupService?.getAll();
      setSignupRequests(data);
    } catch (err) {
      console.error('Error loading signup requests:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDriverSelect = (driver) => {
    setSelectedDriver(driver);
  };

  const handleAssignmentComplete = (assignmentData) => {
    setSuccessMessage(`Driver successfully assigned to booking!`);
    setSelectedDriver(null);
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSignupSuccess = (signupData) => {
    setSuccessMessage('Driver signup request submitted successfully!');
    if (activeTab === 'signup') {
      loadSignupRequests();
    }
    setTimeout(() => setSuccessMessage(''), 3000);
  };

  const handleSignupStatusUpdate = async (requestId, status, notes = '') => {
    try {
      await driverSignupService?.updateStatus(requestId, status, notes);
      setSuccessMessage(`Signup request ${status} successfully!`);
      loadSignupRequests();
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error updating signup status:', err);
    }
  };

  const clearFilters = () => {
    setFilters({
      status: '',
      fleetType: '',
      partnerId: '',
      isVerified: undefined
    });
    setSearchTerm('');
  };

  const getStatusBadge = (status) => {
    const colors = {
      pending: 'bg-yellow-100 text-yellow-800',
      under_review: 'bg-blue-100 text-blue-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800'
    };
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors?.[status] || 'bg-gray-100 text-gray-800'}`}>
        {status?.replace('_', ' ')?.toUpperCase()}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Driver Assignment System</h1>
              <p className="mt-2 text-gray-600">
                Manage driver assignments, fleet operations, and performance metrics
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowSignupModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                <UserPlus className="h-4 w-4" />
                Driver Signup
              </button>
            </div>
          </div>

          {successMessage && (
            <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="text-green-700">{successMessage}</span>
            </div>
          )}
        </div>

        {/* Navigation Tabs */}
        <div className="mb-6">
          <nav className="flex space-x-8 border-b border-gray-200">
            <button
              onClick={() => setActiveTab('assignment')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'assignment' ?'border-blue-500 text-blue-600' :'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Driver Assignment
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('performance')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'performance'
                  ? 'border-blue-500 text-blue-600' :'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Performance Metrics
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('signup')}
              className={`py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'signup' ?'border-blue-500 text-blue-600' :'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                Signup Requests
                {signupRequests?.filter(req => req?.status === 'pending')?.length > 0 && (
                  <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                    {signupRequests?.filter(req => req?.status === 'pending')?.length}
                  </span>
                )}
              </div>
            </button>
          </nav>
        </div>

        {/* Content Area */}
        {activeTab === 'assignment' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Filters and Driver List */}
            <div className="lg:col-span-2 space-y-6">
              {/* Filters */}
              <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Filter className="h-5 w-5 text-blue-600" />
                    Driver Filters
                  </h3>
                  <button
                    onClick={clearFilters}
                    className="flex items-center gap-1 px-3 py-1 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                  >
                    <RefreshCw className="h-3 w-3" />
                    Clear
                  </button>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                    <select
                      value={filters?.status}
                      onChange={(e) => setFilters(prev => ({ ...prev, status: e?.target?.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Status</option>
                      <option value="available">Available</option>
                      <option value="busy">Busy</option>
                      <option value="offline">Offline</option>
                      <option value="on_break">On Break</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Fleet Type</label>
                    <select
                      value={filters?.fleetType}
                      onChange={(e) => setFilters(prev => ({ ...prev, fleetType: e?.target?.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Fleets</option>
                      <option value="goshuttle_main">GoShuttle Main</option>
                      <option value="partner_fleet">Partner Fleet</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Partner</label>
                    <select
                      value={filters?.partnerId}
                      onChange={(e) => setFilters(prev => ({ ...prev, partnerId: e?.target?.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Partners</option>
                      {partners?.map(partner => (
                        <option key={partner?.id} value={partner?.id}>{partner?.name}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Verification</label>
                    <select
                      value={filters?.isVerified === undefined ? '' : filters?.isVerified?.toString()}
                      onChange={(e) => setFilters(prev => ({ 
                        ...prev, 
                        isVerified: e?.target?.value === '' ? undefined : e?.target?.value === 'true' 
                      }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Drivers</option>
                      <option value="true">Verified Only</option>
                      <option value="false">Unverified Only</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Driver List */}
              <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
                <div className="p-6 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900">Available Drivers</h3>
                </div>
                <div className="p-6">
                  <DriverList
                    onDriverSelect={handleDriverSelect}
                    selectedDriverId={selectedDriver?.id}
                    filters={filters}
                  />
                </div>
              </div>
            </div>

            {/* Assignment Panel */}
            <div className="lg:col-span-1">
              <AssignmentPanel
                selectedDriver={selectedDriver}
                bookingId="sample-booking-id" // This would come from a booking selection
                onAssignmentComplete={handleAssignmentComplete}
              />
            </div>
          </div>
        )}

        {activeTab === 'performance' && (
          <div className="space-y-6">
            {/* Driver Selection for Metrics */}
            <div className="bg-white p-6 rounded-lg border border-gray-200 shadow-sm">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Driver for Performance Review</h3>
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <DriverList
                    onDriverSelect={(driver) => setSelectedDriverForMetrics(driver)}
                    selectedDriverId={selectedDriverForMetrics?.id}
                    filters={{ isVerified: true }}
                  />
                </div>
              </div>
            </div>

            {/* Performance Metrics */}
            {selectedDriverForMetrics && (
              <PerformanceMetrics 
                driverId={selectedDriverForMetrics?.id} 
                timeRange="month" 
              />
            )}
          </div>
        )}

        {activeTab === 'signup' && (
          <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Driver Signup Requests</h3>
                <button
                  onClick={loadSignupRequests}
                  disabled={loading}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fleet Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      License
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {signupRequests?.map((request) => (
                    <tr key={request?.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">{request?.fullName}</div>
                          <div className="text-sm text-gray-500">{request?.email}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {request?.phone}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {request?.fleetType === 'goshuttle_main' ? 'GoShuttle Main' : 'Partner Fleet'}
                        </div>
                        {request?.partner && (
                          <div className="text-sm text-gray-500">{request?.partner?.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">{request?.licenseNumber}</div>
                        <div className="text-sm text-gray-500">
                          Expires: {new Date(request.licenseExpiry)?.toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(request?.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request?.status === 'pending' && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleSignupStatusUpdate(request?.id, 'approved')}
                              className="text-green-600 hover:text-green-800 font-medium"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleSignupStatusUpdate(request?.id, 'rejected')}
                              className="text-red-600 hover:text-red-800 font-medium"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {signupRequests?.length === 0 && !loading && (
                <div className="text-center py-12">
                  <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <div className="text-gray-500">No signup requests found</div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {/* Driver Signup Modal */}
      <DriverSignupModal
        isOpen={showSignupModal}
        onClose={() => setShowSignupModal(false)}
        onSignupSuccess={handleSignupSuccess}
      />
    </div>
  );
}