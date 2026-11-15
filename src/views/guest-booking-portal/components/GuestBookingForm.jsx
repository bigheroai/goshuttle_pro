import React, { useState } from 'react';
import { MapPin, Calendar, Users, Mail, Phone, User, MessageSquare, AlertCircle } from 'lucide-react';
import PlacesAutocomplete from '../../../components/ui/PlacesAutocomplete';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function GuestBookingForm({ initialData, onSubmit, currentStep, error }) {
  const [formData, setFormData] = useState({
    pickupLocation: initialData?.pickupLocation || '',
    dropoffLocation: initialData?.dropoffLocation || '',
    pickupDate: initialData?.pickupDate || '',
    returnDate: initialData?.returnDate || '',
    passengerCount: initialData?.passengerCount || 1,
    guestEmail: initialData?.guestEmail || '',
    guestName: initialData?.guestName || '',
    guestPhone: initialData?.guestPhone || '',
    notes: initialData?.notes || ''
  });
  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors?.[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validateStep = () => {
    const errors = {};

    if (currentStep === 1) {
      if (!formData?.pickupLocation) errors.pickupLocation = 'Pickup location is required';
      if (!formData?.dropoffLocation) errors.dropoffLocation = 'Dropoff location is required';
      if (!formData?.pickupDate) errors.pickupDate = 'Pickup date is required';
      
      const pickupDate = new Date(formData.pickupDate);
      const now = new Date();
      if (pickupDate <= now) {
        errors.pickupDate = 'Pickup date must be in the future';
      }

      if (formData?.returnDate) {
        const returnDate = new Date(formData.returnDate);
        if (returnDate <= pickupDate) {
          errors.returnDate = 'Return date must be after pickup date';
        }
      }

      if (formData?.passengerCount < 1 || formData?.passengerCount > 15) {
        errors.passengerCount = 'Passenger count must be between 1 and 15';
      }
    }

    if (currentStep === 2) {
      if (!formData?.guestEmail) {
        errors.guestEmail = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/?.test(formData?.guestEmail)) {
        errors.guestEmail = 'Please enter a valid email address';
      }

      if (!formData?.guestName) {
        errors.guestName = 'Full name is required';
      } else if (formData?.guestName?.length < 2) {
        errors.guestName = 'Full name must be at least 2 characters';
      }

      if (!formData?.guestPhone) {
        errors.guestPhone = 'Phone number is required';
      } else if (!/^\+?[\d\s\-\(\)]{10,}$/?.test(formData?.guestPhone)) {
        errors.guestPhone = 'Please enter a valid phone number';
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const handleSubmit = (e) => {
    e?.preventDefault();
    
    if (!validateStep()) {
      return;
    }

    onSubmit(formData);
  };

  const getMinDateTime = () => {
    const now = new Date();
    now?.setHours(now?.getHours() + 2); // Minimum 2 hours from now
    return now?.toISOString()?.slice(0, 16);
  };

  const getMinReturnDateTime = () => {
    if (!formData?.pickupDate) return getMinDateTime();
    const pickup = new Date(formData.pickupDate);
    pickup?.setHours(pickup?.getHours() + 1); // Minimum 1 hour after pickup
    return pickup?.toISOString()?.slice(0, 16);
  };

  const renderStepContent = () => {
    if (currentStep === 1) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Trip Details</h2>
            <p className="text-gray-600">Where would you like to go?</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Pickup Location *
              </label>
              <PlacesAutocomplete
                value={formData?.pickupLocation}
                onChange={(value) => handleInputChange('pickupLocation', value)}
                onPlaceSelect={(value) => handleInputChange('pickupLocation', value)}
                placeholder="Enter pickup address"
              />
              {validationErrors?.pickupLocation && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {validationErrors?.pickupLocation}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MapPin className="w-4 h-4 inline mr-1" />
                Dropoff Location *
              </label>
              <PlacesAutocomplete
                value={formData?.dropoffLocation}
                onChange={(value) => handleInputChange('dropoffLocation', value)}
                onPlaceSelect={(value) => handleInputChange('dropoffLocation', value)}
                placeholder="Enter destination address"
              />
              {validationErrors?.dropoffLocation && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {validationErrors?.dropoffLocation}
                </p>
              )}
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Pickup Date & Time *
              </label>
              <Input
                type="datetime-local"
                value={formData?.pickupDate}
                onChange={(e) => handleInputChange('pickupDate', e?.target?.value)}
                min={getMinDateTime()}
                className={validationErrors?.pickupDate ? 'border-red-500' : ''}
              />
              {validationErrors?.pickupDate && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {validationErrors?.pickupDate}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-1" />
                Return Date & Time
              </label>
              <Input
                type="datetime-local"
                value={formData?.returnDate}
                onChange={(e) => handleInputChange('returnDate', e?.target?.value)}
                min={getMinReturnDateTime()}
                className={validationErrors?.returnDate ? 'border-red-500' : ''}
              />
              {validationErrors?.returnDate && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {validationErrors?.returnDate}
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">Optional - leave blank for one-way trip</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Users className="w-4 h-4 inline mr-1" />
                Passengers *
              </label>
              <Input
                type="number"
                min="1"
                max="15"
                value={formData?.passengerCount}
                onChange={(e) => handleInputChange('passengerCount', parseInt(e?.target?.value) || 1)}
                className={validationErrors?.passengerCount ? 'border-red-500' : ''}
              />
              {validationErrors?.passengerCount && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {validationErrors?.passengerCount}
                </p>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (currentStep === 2) {
      return (
        <div className="space-y-6">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Guest Information</h2>
            <p className="text-gray-600">Please provide your contact details for booking confirmation</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-1" />
                Email Address *
              </label>
              <Input
                type="email"
                value={formData?.guestEmail}
                onChange={(e) => handleInputChange('guestEmail', e?.target?.value)}
                placeholder="your@email.com"
                className={validationErrors?.guestEmail ? 'border-red-500' : ''}
              />
              {validationErrors?.guestEmail && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {validationErrors?.guestEmail}
                </p>
              )}
              <p className="text-gray-500 text-xs mt-1">
                We'll send your booking confirmation and code to this email
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-1" />
                Full Name *
              </label>
              <Input
                type="text"
                value={formData?.guestName}
                onChange={(e) => handleInputChange('guestName', e?.target?.value)}
                placeholder="John Doe"
                className={validationErrors?.guestName ? 'border-red-500' : ''}
              />
              {validationErrors?.guestName && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {validationErrors?.guestName}
                </p>
              )}
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Phone className="w-4 h-4 inline mr-1" />
                Phone Number *
              </label>
              <Input
                type="tel"
                value={formData?.guestPhone}
                onChange={(e) => handleInputChange('guestPhone', e?.target?.value)}
                placeholder="+639171234567"
                className={validationErrors?.guestPhone ? 'border-red-500' : ''}
              />
              {validationErrors?.guestPhone && (
                <p className="text-red-500 text-sm mt-1 flex items-center">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  {validationErrors?.guestPhone}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <MessageSquare className="w-4 h-4 inline mr-1" />
                Special Requests
              </label>
              <Input
                type="text"
                value={formData?.notes}
                onChange={(e) => handleInputChange('notes', e?.target?.value)}
                placeholder="Any special requirements or notes"
              />
              <p className="text-gray-500 text-xs mt-1">Optional</p>
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">Privacy & Communication</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Your information is used only for booking and communication purposes</li>
              <li>• We'll send you a booking confirmation with a unique tracking code</li>
              <li>• You can use your email and booking code to track or modify your reservation</li>
              <li>• Optional: Create an account later to save preferences and earn rewards</li>
            </ul>
          </div>
        </div>
      );
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {renderStepContent()}

      <div className="flex justify-end pt-6 border-t">
        <Button 
          type="submit" 
          className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          {currentStep === 1 ? 'Continue to Guest Info' : 'Continue to Vehicle Selection'}
        </Button>
      </div>
    </form>
  );
}