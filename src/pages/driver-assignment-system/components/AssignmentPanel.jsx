import React, { useState, useEffect } from 'react';

import { User, Clock, DollarSign, Phone, Star, Car, AlertTriangle, CheckCircle } from 'lucide-react';

export default function AssignmentPanel({ selectedDriver, bookingId, onAssignmentComplete }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assignmentData, setAssignmentData] = useState({
    specialInstructions: '',
    estimatedEarnings: ''
  });

  const handleAssignDriver = async () => {
    if (!selectedDriver || !bookingId) {
      setError('Please select a driver and booking');
      return;
    }

    try {
      setLoading(true);
      setError('');

      // Create assignment (this would typically be handled by a booking/assignment service)
      // For now, we'll simulate the assignment
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      onAssignmentComplete?.({
        driverId: selectedDriver?.id,
        bookingId: bookingId,
        earnings: parseFloat(assignmentData?.estimatedEarnings) || 0,
        instructions: assignmentData?.specialInstructions
      });

      // Reset form
      setAssignmentData({
        specialInstructions: '',
        estimatedEarnings: ''
      });
      
    } catch (err) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  };

  const getAvailabilityStatus = (driver) => {
    if (!driver) return null;

    switch (driver?.currentStatus) {
      case 'available':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          text: 'Available for assignment',
          color: 'text-green-700'
        };
      case 'busy':
        return {
          icon: <Clock className="h-5 w-5 text-yellow-500" />,
          text: 'Currently busy',
          color: 'text-yellow-700'
        };
      case 'offline':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-red-500" />,
          text: 'Currently offline',
          color: 'text-red-700'
        };
      case 'on_break':
        return {
          icon: <Clock className="h-5 w-5 text-orange-500" />,
          text: 'On break',
          color: 'text-orange-700'
        };
      default:
        return {
          icon: <AlertTriangle className="h-5 w-5 text-gray-500" />,
          text: 'Status unknown',
          color: 'text-gray-700'
        };
    }
  };

  const canAssignDriver = selectedDriver?.currentStatus === 'available' && selectedDriver?.isVerified;

  if (!selectedDriver) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <User className="h-12 w-12 text-gray-400 mx-auto mb-3" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Driver Selected</h3>
        <p className="text-gray-600">Select a driver from the list to assign them to this booking.</p>
      </div>
    );
  }

  const availabilityStatus = getAvailabilityStatus(selectedDriver);

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Assignment Details</h3>
        
        {/* Driver Info */}
        <div className="flex items-start gap-4 mb-6">
          {selectedDriver?.userProfile?.avatarUrl ? (
            <img
              src={selectedDriver?.userProfile?.avatarUrl}
              alt={selectedDriver?.userProfile?.fullName}
              className="h-16 w-16 rounded-full object-cover"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center">
              <span className="text-gray-600 font-semibold text-xl">
                {selectedDriver?.userProfile?.fullName?.charAt(0) || 'D'}
              </span>
            </div>
          )}
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <h4 className="text-xl font-semibold text-gray-900">
                {selectedDriver?.userProfile?.fullName || 'Unknown Driver'}
              </h4>
              {selectedDriver?.isVerified && (
                <CheckCircle className="h-5 w-5 text-green-500" title="Verified Driver" />
              )}
            </div>
            
            <div className="space-y-1 text-sm text-gray-600">
              {selectedDriver?.userProfile?.email && (
                <div>{selectedDriver?.userProfile?.email}</div>
              )}
              {selectedDriver?.userProfile?.phone && (
                <div className="flex items-center gap-1">
                  <Phone className="h-4 w-4" />
                  <span>{selectedDriver?.userProfile?.phone}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Status and Metrics */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              {availabilityStatus?.icon}
              <span className={`font-medium ${availabilityStatus?.color}`}>
                {availabilityStatus?.text}
              </span>
            </div>
          </div>
          
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2">
              <Star className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">
                {selectedDriver?.rating?.toFixed(1) || '0.0'} rating
              </span>
              <span className="text-gray-500">• {selectedDriver?.totalTrips || 0} trips</span>
            </div>
          </div>
        </div>

        {/* Fleet and Vehicle Info */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <span className="text-gray-600">Fleet Type:</span>
            <span className={`px-3 py-1 rounded-full text-sm font-medium ${
              selectedDriver?.fleetType === 'goshuttle_main' ?'bg-blue-100 text-blue-800' :'bg-purple-100 text-purple-800'
            }`}>
              {selectedDriver?.fleetType === 'goshuttle_main' ? 'GoShuttle Main' : 'Partner Fleet'}
            </span>
          </div>
          
          {selectedDriver?.partner && (
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Partner:</span>
              <span className="font-medium">{selectedDriver?.partner?.name}</span>
            </div>
          )}
          
          {selectedDriver?.vehicle && (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-gray-600">
                <Car className="h-4 w-4" />
                <span>Vehicle:</span>
              </div>
              <span className="font-medium">
                {selectedDriver?.vehicle?.name} ({selectedDriver?.vehicle?.licensePlate})
              </span>
            </div>
          )}
        </div>

        {/* Assignment Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Estimated Earnings (PHP)
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="number"
                value={assignmentData?.estimatedEarnings}
                onChange={(e) => setAssignmentData(prev => ({
                  ...prev,
                  estimatedEarnings: e?.target?.value
                }))}
                placeholder="0.00"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Special Instructions (Optional)
            </label>
            <textarea
              value={assignmentData?.specialInstructions}
              onChange={(e) => setAssignmentData(prev => ({
                ...prev,
                specialInstructions: e?.target?.value
              }))}
              placeholder="Any special instructions for the driver..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
      {/* Assignment Action */}
      <div className="p-6">
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-4 w-4" />
              <span>{error}</span>
            </div>
          </div>
        )}

        {!canAssignDriver && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-center gap-2 text-yellow-700">
              <AlertTriangle className="h-4 w-4" />
              <span>
                Driver is not available for assignment. 
                {!selectedDriver?.isVerified && ' Driver needs to be verified first.'}
                {selectedDriver?.currentStatus !== 'available' && ` Driver is currently ${selectedDriver?.currentStatus}.`}
              </span>
            </div>
          </div>
        )}

        <button
          onClick={handleAssignDriver}
          disabled={loading || !canAssignDriver}
          className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
            canAssignDriver
              ? 'bg-blue-600 hover:bg-blue-700 text-white' :'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          {loading ? (
            <div className="flex items-center justify-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
              <span>Assigning Driver...</span>
            </div>
          ) : (
            'Assign Driver to Booking'
          )}
        </button>
      </div>
    </div>
  );
}