import React, { useState, forwardRef, useImperativeHandle, useEffect } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import Button from '../../../components/ui/Button';
import { Checkbox } from '../../../components/ui/Checkbox';
import { useAuth } from '../../../contexts/AuthContext';

const PassengerDetails = forwardRef(({ onDetailsUpdate, passengerDetails }, ref) => {
  const { user, userProfile } = useAuth();

  // Derive pre-fill values from logged-in user
  const getAutoFillValues = () => {
    if (!user) return {};
    const fullName = userProfile?.full_name || user?.user_metadata?.full_name || '';
    const nameParts = fullName?.trim()?.split(' ');
    const firstName = nameParts?.[0] || '';
    const lastName = nameParts?.slice(1)?.join(' ') || '';
    return {
      firstName,
      lastName,
      email: userProfile?.email || user?.email || '',
      phone: userProfile?.phone || user?.user_metadata?.phone || ''
    };
  };

  const autoFill = getAutoFillValues();

  const [formData, setFormData] = useState({
    primaryPassenger: {
      firstName: passengerDetails?.primaryPassenger?.firstName || autoFill?.firstName || '',
      lastName: passengerDetails?.primaryPassenger?.lastName || autoFill?.lastName || '',
      email: passengerDetails?.primaryPassenger?.email || autoFill?.email || '',
      phone: passengerDetails?.primaryPassenger?.phone || autoFill?.phone || '',
      specialRequests: passengerDetails?.primaryPassenger?.specialRequests || ''
    },
    passengerCount: passengerDetails?.passengerCount || 1,
    corporateBooking: passengerDetails?.corporateBooking || false,
    corporateDetails: {
      companyName: passengerDetails?.corporateDetails?.companyName || '',
      department: passengerDetails?.corporateDetails?.department || '',
      costCenter: passengerDetails?.corporateDetails?.costCenter || '',
      approverEmail: passengerDetails?.corporateDetails?.approverEmail || ''
    }
  });

  const [errors, setErrors] = useState({});

  // When userProfile loads (async), back-fill empty fields
  useEffect(() => {
    if (!user) return;
    const fullName = userProfile?.full_name || user?.user_metadata?.full_name || '';
    const nameParts = fullName?.trim()?.split(' ');
    const firstName = nameParts?.[0] || '';
    const lastName = nameParts?.slice(1)?.join(' ') || '';
    const email = userProfile?.email || user?.email || '';
    const phone = userProfile?.phone || user?.user_metadata?.phone || '';

    setFormData(prev => {
      const updated = {
        ...prev,
        primaryPassenger: {
          ...prev?.primaryPassenger,
          firstName: prev?.primaryPassenger?.firstName || firstName,
          lastName: prev?.primaryPassenger?.lastName || lastName,
          email: prev?.primaryPassenger?.email || email,
          phone: prev?.primaryPassenger?.phone || phone
        }
      };
      onDetailsUpdate(updated);
      return updated;
    });
  }, [userProfile, user]);

  const handleInputChange = (field, value, section = 'primaryPassenger') => {
    setFormData(prev => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [field]: value
      }
    }));

    // Clear error when user starts typing
    if (errors?.[`${section}.${field}`]) {
      setErrors(prev => ({
        ...prev,
        [`${section}.${field}`]: ''
      }));
    }

    // Update parent component
    const updatedData = {
      ...formData,
      [section]: {
        ...formData?.[section],
        [field]: value
      }
    };
    onDetailsUpdate(updatedData);
  };

  const handlePassengerCountChange = (count) => {
    const newCount = Math.max(1, Math.min(12, count));
    const updatedData = { ...formData, passengerCount: newCount };
    setFormData(updatedData);
    onDetailsUpdate(updatedData);
  };

  const handleCorporateToggle = (checked) => {
    const updatedData = { ...formData, corporateBooking: checked };
    setFormData(updatedData);
    onDetailsUpdate(updatedData);
  };

  const validateForm = () => {
    const newErrors = {};

    // Validate primary passenger
    if (!formData?.primaryPassenger?.firstName?.trim()) {
      newErrors['primaryPassenger.firstName'] = 'First name is required';
    }
    if (!formData?.primaryPassenger?.lastName?.trim()) {
      newErrors['primaryPassenger.lastName'] = 'Last name is required';
    }
    if (!formData?.primaryPassenger?.email?.trim()) {
      newErrors['primaryPassenger.email'] = 'Email address is required';
    } else if (!/\S+@\S+\.\S+/?.test(formData?.primaryPassenger?.email)) {
      newErrors['primaryPassenger.email'] = 'Please enter a valid email address';
    }
    if (!formData?.primaryPassenger?.phone?.trim()) {
      newErrors['primaryPassenger.phone'] = 'Phone number is required';
    } else if (!/^[+\d\s\-()]{7,}$/?.test(formData?.primaryPassenger?.phone?.trim())) {
      newErrors['primaryPassenger.phone'] = 'Please enter a valid phone number';
    }

    // Validate corporate details if corporate booking
    if (formData?.corporateBooking) {
      if (!formData?.corporateDetails?.companyName?.trim()) {
        newErrors['corporateDetails.companyName'] = 'Company name is required';
      }
      if (!formData?.corporateDetails?.approverEmail?.trim()) {
        newErrors['corporateDetails.approverEmail'] = 'Approver email is required';
      } else if (!/\S+@\S+\.\S+/?.test(formData?.corporateDetails?.approverEmail)) {
        newErrors['corporateDetails.approverEmail'] = 'Please enter a valid approver email';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  // Expose validateForm to parent via ref
  useImperativeHandle(ref, () => ({
    validateForm
  }));

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Passenger Details</h3>
      
      {/* Passenger Count */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-3">Number of Passengers</label>
        <div className="flex items-center space-x-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePassengerCountChange(formData?.passengerCount - 1)}
            disabled={formData?.passengerCount <= 1}
          >
            <Icon name="Minus" size={16} />
          </Button>
          <span className="text-lg font-semibold text-gray-900 min-w-[2rem] text-center">
            {formData?.passengerCount}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePassengerCountChange(formData?.passengerCount + 1)}
            disabled={formData?.passengerCount >= 12}
          >
            <Icon name="Plus" size={16} />
          </Button>
          <span className="text-sm text-gray-500">
            (Maximum 12 passengers)
          </span>
        </div>
        {formData?.passengerCount > 1 && (
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start space-x-2">
              <Icon name="Info" size={16} className="text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Additional Passengers</p>
                <p>You're booking for {formData?.passengerCount} passengers total. Additional passenger details can be provided during check-in or by contacting our support team.</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Primary Passenger Details */}
      <div className="mb-6">
        <h4 className="text-md font-medium text-gray-900 mb-4">Primary Passenger Contact</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="First Name"
            type="text"
            placeholder="Enter first name"
            value={formData?.primaryPassenger?.firstName}
            onChange={(e) => handleInputChange('firstName', e?.target?.value)}
            error={errors?.['primaryPassenger.firstName']}
            required
          />
          <Input
            label="Last Name"
            type="text"
            placeholder="Enter last name"
            value={formData?.primaryPassenger?.lastName}
            onChange={(e) => handleInputChange('lastName', e?.target?.value)}
            error={errors?.['primaryPassenger.lastName']}
            required
          />
          <Input
            label="Email Address"
            type="email"
            placeholder="Enter email address"
            value={formData?.primaryPassenger?.email}
            onChange={(e) => handleInputChange('email', e?.target?.value)}
            error={errors?.['primaryPassenger.email']}
            required
          />
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+63 9XX XXX XXXX"
            value={formData?.primaryPassenger?.phone}
            onChange={(e) => handleInputChange('phone', e?.target?.value)}
            error={errors?.['primaryPassenger.phone']}
            required
          />
        </div>
        <div className="mt-4">
          <Input
            label="Special Requests (Optional)"
            type="text"
            placeholder="Child seats, wheelchair access, etc."
            value={formData?.primaryPassenger?.specialRequests}
            onChange={(e) => handleInputChange('specialRequests', e?.target?.value)}
            description="Any special requirements or requests for your journey"
          />
        </div>
      </div>

      {/* Corporate Booking Toggle */}
      <div className="mb-6">
        <Checkbox
          label="This is a corporate booking"
          description="Enable corporate billing and approval workflow"
          checked={formData?.corporateBooking}
          onChange={(e) => handleCorporateToggle(e?.target?.checked)}
        />
      </div>

      {/* Corporate Details */}
      {formData?.corporateBooking && (
        <div className="mb-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">Corporate Details</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Company Name"
              type="text"
              placeholder="Enter company name"
              value={formData?.corporateDetails?.companyName}
              onChange={(e) => handleInputChange('companyName', e?.target?.value, 'corporateDetails')}
              error={errors?.['corporateDetails.companyName']}
              required
            />
            <Input
              label="Department"
              type="text"
              placeholder="Enter department"
              value={formData?.corporateDetails?.department}
              onChange={(e) => handleInputChange('department', e?.target?.value, 'corporateDetails')}
            />
            <Input
              label="Cost Center"
              type="text"
              placeholder="Enter cost center code"
              value={formData?.corporateDetails?.costCenter}
              onChange={(e) => handleInputChange('costCenter', e?.target?.value, 'corporateDetails')}
            />
            <Input
              label="Approver Email"
              type="email"
              placeholder="Enter approver's email"
              value={formData?.corporateDetails?.approverEmail}
              onChange={(e) => handleInputChange('approverEmail', e?.target?.value, 'corporateDetails')}
              error={errors?.['corporateDetails.approverEmail']}
              required
            />
          </div>
        </div>
      )}

      {/* Form Summary */}
      <div className="p-4 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Booking Summary</h4>
        <div className="text-sm text-gray-600 space-y-1">
          <p>Primary Contact: {formData?.primaryPassenger?.firstName} {formData?.primaryPassenger?.lastName}</p>
          <p>Total Passengers: {formData?.passengerCount}</p>
          <p>Booking Type: {formData?.corporateBooking ? 'Corporate' : 'Individual'}</p>
          {formData?.primaryPassenger?.specialRequests && (
            <p>Special Requests: {formData?.primaryPassenger?.specialRequests}</p>
          )}
        </div>
      </div>
    </div>
  );
});

PassengerDetails.displayName = 'PassengerDetails';

export default PassengerDetails;