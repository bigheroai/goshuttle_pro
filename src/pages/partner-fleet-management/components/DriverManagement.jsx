import React, { useState, useEffect } from 'react';
import { Users, CheckCircle, XCircle, Clock, Search, Filter } from 'lucide-react';
import { partnerFleetService } from '../../../services/partnerFleetService';

export default function DriverManagement({ partnerId }) {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedApplication, setSelectedApplication] = useState(null);

  useEffect(() => {
    if (partnerId) {
      loadApplications();
    }
  }, [partnerId]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      const data = await partnerFleetService?.getDriverApplications(partnerId);
      setApplications(data);
    } catch (err) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApproveApplication = async (applicationId) => {
    try {
      await partnerFleetService?.approveDriverApplication(applicationId);
      await loadApplications();
      setSelectedApplication(null);
    } catch (err) {
      setError(err?.message);
    }
  };

  const handleRejectApplication = async (applicationId, reason) => {
    try {
      await partnerFleetService?.rejectDriverApplication(applicationId, reason);
      await loadApplications();
      setSelectedApplication(null);
    } catch (err) {
      setError(err?.message);
    }
  };

  const filteredApplications = applications?.filter(app => {
    const matchesSearch = app?.fullName?.toLowerCase()?.includes(searchTerm?.toLowerCase()) ||
                         app?.phone?.includes(searchTerm) ||
                         app?.licenseNumber?.toLowerCase()?.includes(searchTerm?.toLowerCase());
    const matchesStatus = statusFilter === 'all' || app?.applicationStatus === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const badge = badges?.[status] || badges?.pending;
    const IconComponent = badge?.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${badge?.color}`}>
        <IconComponent className="h-3 w-3 mr-1" />
        {status?.charAt(0)?.toUpperCase() + status?.slice(1)}
      </span>
    );
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            {[1, 2, 3]?.map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">
            <strong>Error:</strong> {error}
          </div>
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-5 w-5 text-gray-400 mr-2" />
              <h2 className="text-lg font-semibold text-gray-900">Driver Applications</h2>
            </div>
            <span className="text-sm text-gray-500">
              {filteredApplications?.length} applications
            </span>
          </div>
        </div>

        {/* Search and Filter */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone, or license number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e?.target?.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-gray-400" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e?.target?.value)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>
        </div>

        {/* Applications List */}
        <div className="divide-y divide-gray-200">
          {filteredApplications?.length === 0 ? (
            <div className="px-6 py-12 text-center">
              <Users className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No applications found</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || statusFilter !== 'all' ?'Try adjusting your search or filter criteria.' :'No driver applications have been submitted yet.'}
              </p>
            </div>
          ) : (
            filteredApplications?.map((application) => (
              <div key={application?.id} className="px-6 py-4 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-medium text-gray-900 truncate">
                        {application?.fullName}
                      </h3>
                      {getStatusBadge(application?.applicationStatus)}
                    </div>
                    <div className="mt-1 flex items-center text-sm text-gray-500">
                      <span>Phone: {application?.phone}</span>
                      <span className="mx-2">•</span>
                      <span>License: {application?.licenseNumber}</span>
                      <span className="mx-2">•</span>
                      <span>Exp: {new Date(application.licenseExpiry)?.toLocaleDateString()}</span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Applied: {new Date(application.createdAt)?.toLocaleDateString()}
                      {application?.vehicleOwned && (
                        <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          Has Vehicle
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="ml-4 flex-shrink-0 flex gap-2">
                    {application?.applicationStatus === 'pending' && (
                      <>
                        <button
                          onClick={() => handleApproveApplication(application?.id)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <CheckCircle className="h-3 w-3 mr-1" />
                          Approve
                        </button>
                        <button
                          onClick={() => setSelectedApplication(application)}
                          className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                        >
                          <XCircle className="h-3 w-3 mr-1" />
                          Reject
                        </button>
                      </>
                    )}
                    <button
                      onClick={() => setSelectedApplication(application)}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      {/* Application Detail Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  Driver Application Details
                </h3>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Full Name</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication?.fullName}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Email</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication?.email}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Phone</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication?.phone}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Number</label>
                    <p className="mt-1 text-sm text-gray-900">{selectedApplication?.licenseNumber}</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">License Expiry</label>
                    <p className="mt-1 text-sm text-gray-900">
                      {new Date(selectedApplication.licenseExpiry)?.toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Status</label>
                    <div className="mt-1">
                      {getStatusBadge(selectedApplication?.applicationStatus)}
                    </div>
                  </div>
                </div>

                {selectedApplication?.vehicleOwned && selectedApplication?.vehicleDetails && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Vehicle Details</label>
                    <div className="bg-gray-50 p-3 rounded-md">
                      <pre className="text-sm text-gray-900 whitespace-pre-wrap">
                        {JSON.stringify(selectedApplication?.vehicleDetails, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedApplication?.applicationStatus === 'pending' && (
                  <div className="flex gap-3 pt-4 border-t">
                    <button
                      onClick={() => handleApproveApplication(selectedApplication?.id)}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve Application
                    </button>
                    <button
                      onClick={() => handleRejectApplication(selectedApplication?.id, 'Application rejected by fleet operator')}
                      className="flex-1 inline-flex justify-center items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                    >
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject Application
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}