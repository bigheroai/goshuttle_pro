import React from 'react';
import { Building2, Mail, Phone, MapPin } from 'lucide-react';

const BusinessInformation = ({ formData, setFormData, errors }) => {
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Business Information</h3>
        <p className="text-sm text-gray-600 mb-6">
          Provide your company details and registration information. All fields marked with * are required for partnership verification.
        </p>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
              Company/Business Name *
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Building2 className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                id="companyName"
                value={formData?.companyName || ''}
                onChange={(e) => handleChange('companyName', e?.target?.value)}
                className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors?.companyName ? 'border-red-300' : ''
                }`}
                placeholder="Enter your registered business name"
              />
            </div>
            {errors?.companyName && <p className="mt-1 text-sm text-red-600">{errors?.companyName}</p>}
          </div>

          <div>
            <label htmlFor="businessType" className="block text-sm font-medium text-gray-700">
              Business Type *
            </label>
            <select
              id="businessType"
              value={formData?.businessType || ''}
              onChange={(e) => handleChange('businessType', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.businessType ? 'border-red-300' : ''
              }`}
            >
              <option value="">Select business type</option>
              <option value="corporation">Corporation</option>
              <option value="partnership">Partnership</option>
              <option value="sole-proprietorship">Sole Proprietorship</option>
              <option value="cooperative">Cooperative</option>
              <option value="llc">Limited Liability Company</option>
            </select>
            {errors?.businessType && <p className="mt-1 text-sm text-red-600">{errors?.businessType}</p>}
          </div>

          <div>
            <label htmlFor="registrationNumber" className="block text-sm font-medium text-gray-700">
              Business Registration Number *
            </label>
            <input
              type="text"
              id="registrationNumber"
              value={formData?.registrationNumber || ''}
              onChange={(e) => handleChange('registrationNumber', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.registrationNumber ? 'border-red-300' : ''
              }`}
              placeholder="DTI/SEC/BIR Registration Number"
            />
            {errors?.registrationNumber && <p className="mt-1 text-sm text-red-600">{errors?.registrationNumber}</p>}
          </div>

          <div>
            <label htmlFor="contactEmail" className="block text-sm font-medium text-gray-700">
              Business Email Address *
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="email"
                id="contactEmail"
                value={formData?.contactEmail || ''}
                onChange={(e) => handleChange('contactEmail', e?.target?.value)}
                className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors?.contactEmail ? 'border-red-300' : ''
                }`}
                placeholder="business@company.com"
              />
            </div>
            {errors?.contactEmail && <p className="mt-1 text-sm text-red-600">{errors?.contactEmail}</p>}
          </div>

          <div>
            <label htmlFor="contactPhone" className="block text-sm font-medium text-gray-700">
              Business Phone Number *
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Phone className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="tel"
                id="contactPhone"
                value={formData?.contactPhone || ''}
                onChange={(e) => handleChange('contactPhone', e?.target?.value)}
                className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors?.contactPhone ? 'border-red-300' : ''
                }`}
                placeholder="+63 2 XXX XXXX"
              />
            </div>
            {errors?.contactPhone && <p className="mt-1 text-sm text-red-600">{errors?.contactPhone}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="address" className="block text-sm font-medium text-gray-700">
              Business Address *
            </label>
            <div className="relative mt-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <MapPin className="h-4 w-4 text-gray-400" />
              </div>
              <textarea
                id="address"
                rows={3}
                value={formData?.address || ''}
                onChange={(e) => handleChange('address', e?.target?.value)}
                className={`block w-full pl-10 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                  errors?.address ? 'border-red-300' : ''
                }`}
                placeholder="Complete business address including street, barangay, city, and province"
              />
            </div>
            {errors?.address && <p className="mt-1 text-sm text-red-600">{errors?.address}</p>}
          </div>

          <div>
            <label htmlFor="yearsInOperation" className="block text-sm font-medium text-gray-700">
              Years in Operation *
            </label>
            <select
              id="yearsInOperation"
              value={formData?.yearsInOperation || ''}
              onChange={(e) => handleChange('yearsInOperation', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.yearsInOperation ? 'border-red-300' : ''
              }`}
            >
              <option value="">Select years</option>
              <option value="less-than-1">Less than 1 year</option>
              <option value="1-3">1-3 years</option>
              <option value="3-5">3-5 years</option>
              <option value="5-10">5-10 years</option>
              <option value="more-than-10">More than 10 years</option>
            </select>
            {errors?.yearsInOperation && <p className="mt-1 text-sm text-red-600">{errors?.yearsInOperation}</p>}
          </div>

          <div>
            <label htmlFor="employeeCount" className="block text-sm font-medium text-gray-700">
              Number of Employees *
            </label>
            <select
              id="employeeCount"
              value={formData?.employeeCount || ''}
              onChange={(e) => handleChange('employeeCount', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.employeeCount ? 'border-red-300' : ''
              }`}
            >
              <option value="">Select range</option>
              <option value="1-5">1-5 employees</option>
              <option value="6-10">6-10 employees</option>
              <option value="11-25">11-25 employees</option>
              <option value="26-50">26-50 employees</option>
              <option value="51-100">51-100 employees</option>
              <option value="more-than-100">More than 100 employees</option>
            </select>
            {errors?.employeeCount && <p className="mt-1 text-sm text-red-600">{errors?.employeeCount}</p>}
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="specialization" className="block text-sm font-medium text-gray-700">
              Business Specialization *
            </label>
            <input
              type="text"
              id="specialization"
              value={formData?.specialization || ''}
              onChange={(e) => handleChange('specialization', e?.target?.value)}
              className={`mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm ${
                errors?.specialization ? 'border-red-300' : ''
              }`}
              placeholder="e.g., Corporate Transportation, Tourist Services, Logistics"
            />
            {errors?.specialization && <p className="mt-1 text-sm text-red-600">{errors?.specialization}</p>}
            <p className="mt-1 text-xs text-gray-500">
              Describe your main transportation services and areas of expertise
            </p>
          </div>

          <div className="sm:col-span-2">
            <label htmlFor="website" className="block text-sm font-medium text-gray-700">
              Company Website (Optional)
            </label>
            <input
              type="url"
              id="website"
              value={formData?.website || ''}
              onChange={(e) => handleChange('website', e?.target?.value)}
              className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
              placeholder="https://www.yourcompany.com"
            />
          </div>
        </div>

        {/* Business Verification Notice */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-medium text-blue-900 mb-2">Business Verification Requirements</h4>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Valid business registration with DTI, SEC, or appropriate regulatory body</li>
            <li>• Current business permits and licenses</li>
            <li>• Tax identification number (TIN) and BIR certificate</li>
            <li>• Insurance coverage for commercial vehicle operations</li>
            <li>• Compliance with local transport regulations</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default BusinessInformation;