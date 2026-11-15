import React, { useState } from 'react';
import { Plus, Trash2, Upload, Car, Calendar, FileText } from 'lucide-react';

const FleetInventory = ({ formData, setFormData, errors }) => {
  const [vehicles, setVehicles] = useState(formData?.vehicles || []);

  const addVehicle = () => {
    const newVehicle = {
      id: Date.now(),
      make: '',
      model: '',
      year: '',
      plateNumber: '',
      seatingCapacity: '',
      condition: 'excellent',
      insuranceExpiry: '',
      registrationExpiry: '',
      documents: []
    };
    const updatedVehicles = [...vehicles, newVehicle];
    setVehicles(updatedVehicles);
    setFormData(prev => ({ ...prev, vehicles: updatedVehicles }));
  };

  const removeVehicle = (vehicleId) => {
    const updatedVehicles = vehicles?.filter(v => v?.id !== vehicleId);
    setVehicles(updatedVehicles);
    setFormData(prev => ({ ...prev, vehicles: updatedVehicles }));
  };

  const updateVehicle = (vehicleId, field, value) => {
    const updatedVehicles = vehicles?.map(vehicle => 
      vehicle?.id === vehicleId 
        ? { ...vehicle, [field]: value }
        : vehicle
    );
    setVehicles(updatedVehicles);
    setFormData(prev => ({ ...prev, vehicles: updatedVehicles }));
  };

  const vehicleConditions = [
    { value: 'excellent', label: 'Excellent' },
    { value: 'good', label: 'Good' },
    { value: 'fair', label: 'Fair' },
    { value: 'needs-maintenance', label: 'Needs Maintenance' }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Fleet Inventory</h3>
        <p className="text-sm text-gray-600 mb-6">
          Register your vehicle fleet that will be part of the GoShuttle partner network. Each vehicle will need proper documentation and meet our safety standards.
        </p>

        {/* Vehicle List */}
        <div className="space-y-6">
          {vehicles?.map((vehicle, index) => (
            <div key={vehicle?.id} className="border border-gray-200 rounded-lg p-6 relative">
              {/* Remove Button */}
              {vehicles?.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeVehicle(vehicle?.id)}
                  className="absolute top-4 right-4 text-red-600 hover:text-red-800"
                  title="Remove vehicle"
                >
                  <Trash2 className="h-5 w-5" />
                </button>
              )}

              <div className="flex items-center space-x-2 mb-4">
                <Car className="h-5 w-5 text-blue-600" />
                <h4 className="font-medium text-gray-900">Vehicle {index + 1}</h4>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {/* Basic Vehicle Info */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Make/Brand *
                  </label>
                  <input
                    type="text"
                    value={vehicle?.make}
                    onChange={(e) => updateVehicle(vehicle?.id, 'make', e?.target?.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., Toyota, Honda"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Model *
                  </label>
                  <input
                    type="text"
                    value={vehicle?.model}
                    onChange={(e) => updateVehicle(vehicle?.id, 'model', e?.target?.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="e.g., Innova, Urvan"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Year *
                  </label>
                  <select
                    value={vehicle?.year}
                    onChange={(e) => updateVehicle(vehicle?.id, 'year', e?.target?.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select year</option>
                    {Array.from({ length: 25 }, (_, i) => 2024 - i)?.map(year => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Plate Number *
                  </label>
                  <input
                    type="text"
                    value={vehicle?.plateNumber}
                    onChange={(e) => updateVehicle(vehicle?.id, 'plateNumber', e?.target?.value?.toUpperCase())}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    placeholder="ABC 1234"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Seating Capacity *
                  </label>
                  <select
                    value={vehicle?.seatingCapacity}
                    onChange={(e) => updateVehicle(vehicle?.id, 'seatingCapacity', e?.target?.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    <option value="">Select capacity</option>
                    <option value="4">4 passengers</option>
                    <option value="6">6 passengers</option>
                    <option value="8">8 passengers</option>
                    <option value="10">10 passengers</option>
                    <option value="12">12 passengers</option>
                    <option value="15">15 passengers</option>
                    <option value="20">20+ passengers</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Vehicle Condition *
                  </label>
                  <select
                    value={vehicle?.condition}
                    onChange={(e) => updateVehicle(vehicle?.id, 'condition', e?.target?.value)}
                    className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  >
                    {vehicleConditions?.map(condition => (
                      <option key={condition?.value} value={condition?.value}>
                        {condition?.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Insurance Expiry *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={vehicle?.insuranceExpiry}
                      onChange={(e) => updateVehicle(vehicle?.id, 'insuranceExpiry', e?.target?.value)}
                      min={new Date()?.toISOString()?.split('T')?.[0]}
                      className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Registration Expiry *
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="date"
                      value={vehicle?.registrationExpiry}
                      onChange={(e) => updateVehicle(vehicle?.id, 'registrationExpiry', e?.target?.value)}
                      min={new Date()?.toISOString()?.split('T')?.[0]}
                      className="w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Vehicle Notes */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Notes
                </label>
                <textarea
                  rows={2}
                  value={vehicle?.notes || ''}
                  onChange={(e) => updateVehicle(vehicle?.id, 'notes', e?.target?.value)}
                  className="w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Any special features, recent maintenance, or other relevant information..."
                />
              </div>

              {/* Document Upload Section */}
              <div className="mt-4 p-4 bg-gray-50 rounded-md">
                <div className="flex items-center space-x-2 mb-3">
                  <FileText className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">Required Documents</span>
                </div>
                <div className="grid grid-cols-2 gap-4 text-xs text-gray-600">
                  <div>
                    <label className="flex items-center space-x-2 p-2 border border-dashed border-gray-300 rounded cursor-pointer hover:border-gray-400">
                      <Upload className="h-3 w-3" />
                      <span>Vehicle Registration</span>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                    </label>
                  </div>
                  <div>
                    <label className="flex items-center space-x-2 p-2 border border-dashed border-gray-300 rounded cursor-pointer hover:border-gray-400">
                      <Upload className="h-3 w-3" />
                      <span>Insurance Policy</span>
                      <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png" />
                    </label>
                  </div>
                </div>
              </div>
            </div>
          ))}

          {/* Add Vehicle Button */}
          <button
            type="button"
            onClick={addVehicle}
            className="w-full flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg text-gray-600 hover:border-gray-400 hover:text-gray-700 transition-colors"
          >
            <Plus className="h-5 w-5 mr-2" />
            Add Another Vehicle
          </button>

          {/* Fleet Requirements */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Fleet Requirements</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Minimum 2 vehicles required for partnership</li>
              <li>• All vehicles must be 15 years old or newer</li>
              <li>• Valid registration and comprehensive insurance required</li>
              <li>• Regular maintenance records must be maintained</li>
              <li>• Vehicles will undergo safety inspection before approval</li>
              <li>• Air conditioning and good interior condition required</li>
            </ul>
          </div>

          {errors?.vehicles && (
            <p className="text-sm text-red-600">{errors?.vehicles}</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default FleetInventory;