import React from 'react';

const PersonalInformation = ({ formData, setFormData, errors }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <label htmlFor="fullName" className="block text-sm font-medium text-gray-700">
              Full Name *
            </label>
            <input
              type="text"
              id="fullName"
              value={formData?.fullName || ''}
              onChange={(e) => handleChange('fullName', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.fullName ? 'border-red-300' : ''
              }`}
              placeholder="Enter your full legal name"
            />
            {errors?.fullName && <p className="mt-1 text-sm text-red-600">{errors?.fullName}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number *
            </label>
            <input
              type="tel"
              id="phone"
              value={formData?.phone || ''}
              onChange={(e) => handleChange('phone', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.phone ? 'border-red-300' : ''
              }`}
              placeholder="+63 9XX XXX XXXX"
            />
            {errors?.phone && <p className="mt-1 text-sm text-red-600">{errors?.phone}</p>}
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address *
            </label>
            <input
              type="email"
              id="email"
              value={formData?.email || ''}
              onChange={(e) => handleChange('email', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.email ? 'border-red-300' : ''
              }`}
              placeholder="your.email@example.com"
            />
            {errors?.email && <p className="mt-1 text-sm text-red-600">{errors?.email}</p>}
          </div>

          <div>
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Complete Address *
            </label>
            <input
              type="text"
              id="address"
              value={formData?.address || ''}
              onChange={(e) => handleChange('address', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.address ? 'border-red-300' : ''
              }`}
              placeholder="Street, Barangay, City, Province"
            />
            {errors?.address && <p className="mt-1 text-sm text-red-600">{errors?.address}</p>}
          </div>

          <div>
            <label htmlFor="emergencyContact" className="block text-sm font-medium text-gray-700">
              Emergency Contact Name *
            </label>
            <input
              type="text"
              id="emergencyContact"
              value={formData?.emergencyContact || ''}
              onChange={(e) => handleChange('emergencyContact', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.emergencyContact ? 'border-red-300' : ''
              }`}
              placeholder="Contact person name"
            />
            {errors?.emergencyContact && <p className="mt-1 text-sm text-red-600">{errors?.emergencyContact}</p>}
          </div>

          <div>
            <label htmlFor="emergencyPhone" className="block text-sm font-medium text-gray-700">
              Emergency Contact Phone *
            </label>
            <input
              type="tel"
              id="emergencyPhone"
              value={formData?.emergencyPhone || ''}
              onChange={(e) => handleChange('emergencyPhone', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.emergencyPhone ? 'border-red-300' : ''
              }`}
              placeholder="+63 9XX XXX XXXX"
            />
            {errors?.emergencyPhone && <p className="mt-1 text-sm text-red-600">{errors?.emergencyPhone}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="drivingExperience" className="block text-sm font-medium text-gray-700">
              Driving Experience (years) *
            </label>
            <select
              id="drivingExperience"
              value={formData?.drivingExperience || ''}
              onChange={(e) => handleChange('drivingExperience', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.drivingExperience ? 'border-red-300' : ''
              }`}
            >
              <option value="">Select experience level</option>
              <option value="1-2">1-2 years</option>
              <option value="3-5">3-5 years</option>
              <option value="6-10">6-10 years</option>
              <option value="10+">More than 10 years</option>
            </select>
            {errors?.drivingExperience && <p className="mt-1 text-sm text-red-600">{errors?.drivingExperience}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PersonalInformation;