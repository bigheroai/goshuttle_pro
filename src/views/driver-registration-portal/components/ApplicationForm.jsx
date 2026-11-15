import React, { useState } from 'react';
import { User, Phone, CreditCard, Car, Upload, AlertCircle } from 'lucide-react';

export default function ApplicationForm({ selectedFleet, onSubmit, loading }) {
  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    licenseNumber: '',
    licenseExpiry: '',
    vehicleOwned: false,
    vehicleDetails: {
      make: '',
      model: '',
      year: '',
      licensePlate: '',
      color: ''
    },
    documentsUploaded: []
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e?.target;
    
    if (name?.startsWith('vehicle.')) {
      const vehicleField = name?.split('.')?.[1];
      setFormData(prev => ({
        ...prev,
        vehicleDetails: {
          ...prev?.vehicleDetails,
          [vehicleField]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      }));
    }

    // Clear error when user starts typing
    if (errors?.[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    if (!formData?.fullName?.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!formData?.phone?.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    if (!formData?.licenseNumber?.trim()) {
      newErrors.licenseNumber = 'License number is required';
    }

    if (!formData?.licenseExpiry) {
      newErrors.licenseExpiry = 'License expiry date is required';
    } else {
      const expiryDate = new Date(formData.licenseExpiry);
      const today = new Date();
      if (expiryDate <= today) {
        newErrors.licenseExpiry = 'License must be valid (not expired)';
      }
    }

    // Vehicle details validation if vehicle is owned
    if (formData?.vehicleOwned) {
      if (!formData?.vehicleDetails?.make?.trim()) {
        newErrors['vehicle.make'] = 'Vehicle make is required';
      }
      if (!formData?.vehicleDetails?.model?.trim()) {
        newErrors['vehicle.model'] = 'Vehicle model is required';
      }
      if (!formData?.vehicleDetails?.year) {
        newErrors['vehicle.year'] = 'Vehicle year is required';
      }
      if (!formData?.vehicleDetails?.licensePlate?.trim()) {
        newErrors['vehicle.licensePlate'] = 'Vehicle license plate is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    const applicationData = {
      ...formData,
      partnerId: selectedFleet?.isMainFleet ? null : selectedFleet?.id,
      preferredFleetType: selectedFleet?.isMainFleet ? 'goshuttle' : 'partner_fleet'
    };

    onSubmit(applicationData);
  };

  const handleDocumentUpload = (e) => {
    const files = Array.from(e?.target?.files);
    // In a real app, you would upload these files and get URLs
    const newDocuments = files?.map(file => ({
      name: file?.name,
      type: file?.type,
      size: file?.size,
      url: URL.createObjectURL(file) // Temporary URL for preview
    }));

    setFormData(prev => ({
      ...prev,
      documentsUploaded: [...prev?.documentsUploaded, ...newDocuments]
    }));
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-2">Driver Application</h2>
        <p className="text-gray-600">
          Complete your application to join {selectedFleet?.name || 'the selected fleet'}.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Personal Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <User className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                Full Name *
              </label>
              <input
                type="text"
                id="fullName"
                name="fullName"
                value={formData?.fullName}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors?.fullName ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Enter your full name"
              />
              {errors?.fullName && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors?.fullName}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                Phone Number *
              </label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formData?.phone}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors?.phone ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="+63 917 123 4567"
              />
              {errors?.phone && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors?.phone}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* License Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <CreditCard className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Driver's License</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="licenseNumber" className="block text-sm font-medium text-gray-700 mb-1">
                License Number *
              </label>
              <input
                type="text"
                id="licenseNumber"
                name="licenseNumber"
                value={formData?.licenseNumber}
                onChange={handleInputChange}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors?.licenseNumber ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="DL123456789"
              />
              {errors?.licenseNumber && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors?.licenseNumber}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="licenseExpiry" className="block text-sm font-medium text-gray-700 mb-1">
                License Expiry Date *
              </label>
              <input
                type="date"
                id="licenseExpiry"
                name="licenseExpiry"
                value={formData?.licenseExpiry}
                onChange={handleInputChange}
                min={new Date()?.toISOString()?.split('T')?.[0]}
                className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                  errors?.licenseExpiry ? 'border-red-300' : 'border-gray-300'
                }`}
              />
              {errors?.licenseExpiry && (
                <p className="mt-1 text-sm text-red-600 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  {errors?.licenseExpiry}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Vehicle Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Car className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Vehicle Information</h3>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                name="vehicleOwned"
                checked={formData?.vehicleOwned}
                onChange={handleInputChange}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <span className="ml-2 text-sm text-gray-700">
                I own a vehicle that I can use for driving
              </span>
            </label>
          </div>

          {formData?.vehicleOwned && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label htmlFor="vehicle.make" className="block text-sm font-medium text-gray-700 mb-1">
                  Make *
                </label>
                <input
                  type="text"
                  name="vehicle.make"
                  value={formData?.vehicleDetails?.make}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors?.['vehicle.make'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Toyota"
                />
                {errors?.['vehicle.make'] && (
                  <p className="mt-1 text-sm text-red-600">{errors?.['vehicle.make']}</p>
                )}
              </div>

              <div>
                <label htmlFor="vehicle.model" className="block text-sm font-medium text-gray-700 mb-1">
                  Model *
                </label>
                <input
                  type="text"
                  name="vehicle.model"
                  value={formData?.vehicleDetails?.model}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors?.['vehicle.model'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Vios"
                />
                {errors?.['vehicle.model'] && (
                  <p className="mt-1 text-sm text-red-600">{errors?.['vehicle.model']}</p>
                )}
              </div>

              <div>
                <label htmlFor="vehicle.year" className="block text-sm font-medium text-gray-700 mb-1">
                  Year *
                </label>
                <input
                  type="number"
                  name="vehicle.year"
                  value={formData?.vehicleDetails?.year}
                  onChange={handleInputChange}
                  min="2000"
                  max={new Date()?.getFullYear() + 1}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors?.['vehicle.year'] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="2022"
                />
                {errors?.['vehicle.year'] && (
                  <p className="mt-1 text-sm text-red-600">{errors?.['vehicle.year']}</p>
                )}
              </div>

              <div>
                <label htmlFor="vehicle.licensePlate" className="block text-sm font-medium text-gray-700 mb-1">
                  License Plate *
                </label>
                <input
                  type="text"
                  name="vehicle.licensePlate"
                  value={formData?.vehicleDetails?.licensePlate}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 ${
                    errors?.['vehicle.licensePlate'] ? 'border-red-300' : 'border-gray-300'  
                  }`}
                  placeholder="ABC 1234"
                />
                {errors?.['vehicle.licensePlate'] && (
                  <p className="mt-1 text-sm text-red-600">{errors?.['vehicle.licensePlate']}</p>
                )}
              </div>

              <div>
                <label htmlFor="vehicle.color" className="block text-sm font-medium text-gray-700 mb-1">
                  Color
                </label>
                <input
                  type="text"
                  name="vehicle.color"
                  value={formData?.vehicleDetails?.color}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="White"
                />
              </div>
            </div>
          )}
        </div>

        {/* Document Upload */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <Upload className="h-5 w-5 text-gray-400 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Documents</h3>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Required Documents
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <Upload className="mx-auto h-12 w-12 text-gray-400" />
                <div className="mt-4">
                  <label htmlFor="documents" className="cursor-pointer">
                    <span className="mt-2 block text-sm font-medium text-gray-900">
                      Click to upload documents
                    </span>
                    <span className="mt-1 block text-xs text-gray-500">
                      Driver's license, vehicle registration, insurance (if applicable)
                    </span>
                  </label>
                  <input
                    id="documents"
                    name="documents"
                    type="file"
                    multiple
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={handleDocumentUpload}
                    className="sr-only"
                  />
                </div>
              </div>
            </div>

            {formData?.documentsUploaded?.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-gray-700 mb-2">Uploaded Documents:</h4>
                <div className="space-y-2">
                  {formData?.documentsUploaded?.map((doc, index) => (
                    <div key={index} className="flex items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm text-gray-600">{doc?.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Submit Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Submitting Application...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}