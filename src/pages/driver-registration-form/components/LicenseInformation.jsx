import React from 'react';
import { CreditCard, Calendar, AlertTriangle } from 'lucide-react';

const LicenseInformation = ({ formData, setFormData, errors }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Calculate if license is expiring soon (within 6 months)
  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const sixMonthsFromNow = new Date();
    sixMonthsFromNow?.setMonth(sixMonthsFromNow?.getMonth() + 6);
    return expiry <= sixMonthsFromNow;
  };

  const getMinDate = () => {
    const today = new Date();
    return today?.toISOString()?.split('T')?.[0];
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Driver's License Information</h3>
        <p className="text-sm text-gray-600 mb-6">
          Please provide your current, valid driver's license information. Your license must be valid for at least 6 months from the application date.
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700">
              Driver's License Number *
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <CreditCard className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="licenseNumber"
                value={formData?.licenseNumber || ''}
                onChange={(e) => handleChange('licenseNumber', e?.target?.value?.toUpperCase())}
                className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors?.licenseNumber ? 'border-red-300' : ''
                }`}
                placeholder="e.g., D01-12-345678"
              />
            </div>
            {errors?.licenseNumber && <p className="mt-1 text-sm text-red-600">{errors?.licenseNumber}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Enter your complete license number as shown on your physical license
            </p>
          </div>

          <div>
            <label htmlFor="licenseExpiry" className="block text-sm font-medium text-gray-700">
              License Expiry Date *
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Calendar className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="date"
                id="licenseExpiry"
                value={formData?.licenseExpiry || ''}
                onChange={(e) => handleChange('licenseExpiry', e?.target?.value)}
                min={getMinDate()}
                className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors?.licenseExpiry ? 'border-red-300' : ''
                }`}
              />
            </div>
            {errors?.licenseExpiry && <p className="mt-1 text-sm text-red-600">{errors?.licenseExpiry}</p>}
            
            {/* Warning for expiring license */}
            {formData?.licenseExpiry && isExpiringSoon(formData?.licenseExpiry) && (
              <div className="mt-2 flex items-start space-x-2 p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <AlertTriangle className="h-4 w-4 text-yellow-600 mt-0.5" />
                <div className="text-sm text-yellow-800">
                  <p className="font-medium">License Expiring Soon</p>
                  <p>Your license expires within 6 months. Please consider renewing before starting operations.</p>
                </div>
              </div>
            )}
          </div>

          <div>
            <label htmlFor="licenseType" className="block text-sm font-medium text-gray-700">
              License Type/Restriction *
            </label>
            <select
              id="licenseType"
              value={formData?.licenseType || ''}
              onChange={(e) => handleChange('licenseType', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.licenseType ? 'border-red-300' : ''
              }`}
            >
              <option value="">Select license type</option>
              <option value="non-professional">Non-Professional (Private Vehicle)</option>
              <option value="professional">Professional (Public Transport)</option>
              <option value="restricted-professional">Restricted Professional</option>
              <option value="motorcycle">Motorcycle License</option>
            </select>
            {errors?.licenseType && <p className="mt-1 text-sm text-red-600">{errors?.licenseType}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Professional license preferred for commercial operations
            </p>
          </div>

          <div>
            <label htmlFor="licenseRestrictions" className="block text-sm font-medium text-gray-700">
              License Restrictions/Codes
            </label>
            <input
              type="text"
              id="licenseRestrictions"
              value={formData?.licenseRestrictions || ''}
              onChange={(e) => handleChange('licenseRestrictions', e?.target?.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="e.g., 1 (Eyeglasses), 2 (Automatic), None"
            />
            <p className="mt-1 text-xs text-gray-500">
              Enter any restrictions shown on your license (if none, enter "None")
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="previousViolations" className="block text-sm font-medium text-gray-700">
              Traffic Violations History
            </label>
            <textarea
              id="previousViolations"
              rows={3}
              value={formData?.previousViolations || ''}
              onChange={(e) => handleChange('previousViolations', e?.target?.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="Please list any traffic violations in the past 5 years, or enter 'None' if no violations..."
            />
            <p className="mt-1 text-xs text-gray-500">
              Honesty is important. This information may be verified during background check.
            </p>
          </div>
        </div>

        {/* License Requirements Info */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">License Requirements for GoShuttle Drivers</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Valid driver's license for at least 3 years</li>
            <li>• Professional license preferred for public transport</li>
            <li>• No major violations in the past 3 years</li>
            <li>• License must be valid for minimum 6 months from application</li>
            <li>• Must pass driving skills assessment</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default LicenseInformation;