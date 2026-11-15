import React from 'react';
import { Car, FileText } from 'lucide-react';

const VehicleInformation = ({ formData, setFormData, errors }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleVehicleDetailsChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      vehicleDetails: {
        ...prev?.vehicleDetails,
        [field]: value
      }
    }));
  };

  const handleVehicleOwnershipChange = (owned) => {
    setFormData(prev => ({
      ...prev,
      vehicleOwned: owned,
      vehicleDetails: owned ? prev?.vehicleDetails : {}
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Vehicle Information</h3>
        
        {/* Vehicle Ownership */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-3">
            Do you own a vehicle for GoShuttle operations? *
          </label>
          <div className="space-y-3">
            <div className="flex items-center">
              <input
                id="vehicle-owned-yes"
                type="radio"
                name="vehicleOwned"
                checked={formData?.vehicleOwned === true}
                onChange={() => handleVehicleOwnershipChange(true)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="vehicle-owned-yes" className="ml-2 text-sm text-gray-700">
                Yes, I own a suitable vehicle
              </label>
            </div>
            <div className="flex items-center">
              <input
                id="vehicle-owned-no"
                type="radio"
                name="vehicleOwned"
                checked={formData?.vehicleOwned === false}
                onChange={() => handleVehicleOwnershipChange(false)}
                className="h-4 w-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <label htmlFor="vehicle-owned-no" className="ml-2 text-sm text-gray-700">
                No, I need a fleet-provided vehicle
              </label>
            </div>
          </div>
          {errors?.vehicleOwned && <p className="mt-2 text-sm text-red-600">{errors?.vehicleOwned}</p>}
        </div>

        {/* Vehicle Details (if owned) */}
        {formData?.vehicleOwned && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-4">
              <Car className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-gray-900">Vehicle Details</h4>
            </div>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <div>
                <label htmlFor="vehicleMake" className="block text-sm font-medium text-gray-700">
                  Make/Brand *
                </label>
                <input
                  type="text"
                  id="vehicleMake"
                  value={formData?.vehicleDetails?.make || ''}
                  onChange={(e) => handleVehicleDetailsChange('make', e?.target?.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors?.vehicleMake ? 'border-red-300' : ''
                  }`}
                  placeholder="e.g., Toyota, Honda, Nissan"
                />
                {errors?.vehicleMake && <p className="mt-1 text-sm text-red-600">{errors?.vehicleMake}</p>}
              </div>

              <div>
                <label htmlFor="vehicleModel" className="block text-sm font-medium text-gray-700">
                  Model *
                </label>
                <input
                  type="text"
                  id="vehicleModel"
                  value={formData?.vehicleDetails?.model || ''}
                  onChange={(e) => handleVehicleDetailsChange('model', e?.target?.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors?.vehicleModel ? 'border-red-300' : ''
                  }`}
                  placeholder="e.g., Vios, City, Almera"
                />
                {errors?.vehicleModel && <p className="mt-1 text-sm text-red-600">{errors?.vehicleModel}</p>}
              </div>

              <div>
                <label htmlFor="vehicleYear" className="block text-sm font-medium text-gray-700">
                  Year *
                </label>
                <select
                  id="vehicleYear"
                  value={formData?.vehicleDetails?.year || ''}
                  onChange={(e) => handleVehicleDetailsChange('year', e?.target?.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors?.vehicleYear ? 'border-red-300' : ''
                  }`}
                >
                  <option value="">Select year</option>
                  {Array.from({ length: 25 }, (_, i) => 2024 - i)?.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {errors?.vehicleYear && <p className="mt-1 text-sm text-red-600">{errors?.vehicleYear}</p>}
              </div>

              <div>
                <label htmlFor="vehicleColor" className="block text-sm font-medium text-gray-700">
                  Color *
                </label>
                <input
                  type="text"
                  id="vehicleColor"
                  value={formData?.vehicleDetails?.color || ''}
                  onChange={(e) => handleVehicleDetailsChange('color', e?.target?.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors?.vehicleColor ? 'border-red-300' : ''
                  }`}
                  placeholder="e.g., White, Silver, Black"
                />
                {errors?.vehicleColor && <p className="mt-1 text-sm text-red-600">{errors?.vehicleColor}</p>}
              </div>

              <div>
                <label htmlFor="plateNumber" className="block text-sm font-medium text-gray-700">
                  Plate Number *
                </label>
                <input
                  type="text"
                  id="plateNumber"
                  value={formData?.vehicleDetails?.plateNumber || ''}
                  onChange={(e) => handleVehicleDetailsChange('plateNumber', e?.target?.value?.toUpperCase())}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors?.plateNumber ? 'border-red-300' : ''
                  }`}
                  placeholder="e.g., ABC 1234"
                />
                {errors?.plateNumber && <p className="mt-1 text-sm text-red-600">{errors?.plateNumber}</p>}
              </div>

              <div>
                <label htmlFor="seatingCapacity" className="block text-sm font-medium text-gray-700">
                  Seating Capacity *
                </label>
                <select
                  id="seatingCapacity"
                  value={formData?.vehicleDetails?.seatingCapacity || ''}
                  onChange={(e) => handleVehicleDetailsChange('seatingCapacity', e?.target?.value)}
                  className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                    errors?.seatingCapacity ? 'border-red-300' : ''
                  }`}
                >
                  <option value="">Select capacity</option>
                  <option value="4">4 passengers</option>
                  <option value="6">6 passengers</option>
                  <option value="8">8 passengers</option>
                  <option value="10">10+ passengers</option>
                </select>
                {errors?.seatingCapacity && <p className="mt-1 text-sm text-red-600">{errors?.seatingCapacity}</p>}
              </div>

              <div className="sm:col-span-2">
                <label htmlFor="vehicleCondition" className="block text-sm font-medium text-gray-700">
                  Vehicle Condition Assessment
                </label>
                <textarea
                  id="vehicleCondition"
                  rows={3}
                  value={formData?.vehicleDetails?.condition || ''}
                  onChange={(e) => handleVehicleDetailsChange('condition', e?.target?.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Describe the current condition of your vehicle, any maintenance issues, or recent repairs..."
                />
              </div>
            </div>
          </div>
        )}

        {/* Fleet-provided vehicle info */}
        {formData?.vehicleOwned === false && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <div className="flex items-center space-x-2 mb-3">
              <FileText className="h-5 w-5 text-blue-600" />
              <h4 className="font-medium text-blue-900">Fleet-Provided Vehicle Information</h4>
            </div>
            <div className="space-y-3 text-sm text-blue-800">
              <p>Since you don't own a vehicle, you'll be assigned one from our fleet upon approval:</p>
              <ul className="list-disc list-inside space-y-1 ml-4">
                <li>Vehicle assignment based on availability and route requirements</li>
                <li>All vehicles are regularly maintained and insured</li>
                <li>Daily vehicle inspection required before each shift</li>
                <li>Fuel and maintenance costs covered by fleet operator</li>
                <li>Proper vehicle care and cleanliness expected</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default VehicleInformation;