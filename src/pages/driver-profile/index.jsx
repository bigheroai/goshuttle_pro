import React, { useState, useEffect } from 'react';
import { CheckCircle, AlertCircle, User, Phone, Shield, CreditCard, Clock, Save } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import Header from '../../components/ui/Header';

const DriverProfile = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [application, setApplication] = useState(null);
  const [errors, setErrors] = useState({});

  const [profileData, setProfileData] = useState({
    phone: '',
    address: '',
    emergencyContact: '',
    emergencyPhone: '',
    drivingExperience: '',
    licenseNumber: '',
    licenseExpiry: '',
    licenseType: '',
    licenseRestrictions: '',
    previousViolations: ''
  });

  useEffect(() => {
    loadDriverApplication();
  }, []);

  const loadDriverApplication = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) {
        navigate('/driver-login');
        return;
      }

      const { data, error } = await supabase?.from('driver_applications')?.select('*')?.eq('user_id', user?.id)?.order('created_at', { ascending: false })?.limit(1)?.single();

      if (error && error?.code !== 'PGRST116') throw error;

      if (data) {
        setApplication(data);
        setProfileData({
          phone: data?.phone || '',
          address: data?.address || '',
          emergencyContact: data?.emergency_contact || '',
          emergencyPhone: data?.emergency_phone || '',
          drivingExperience: data?.driving_experience || '',
          licenseNumber: data?.license_number || '',
          licenseExpiry: data?.license_expiry || '',
          licenseType: data?.license_type || '',
          licenseRestrictions: data?.license_restrictions || '',
          previousViolations: data?.previous_violations || ''
        });
      }
    } catch (err) {
      setErrors({ load: err?.message });
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field, value) => {
    setProfileData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) setErrors(prev => ({ ...prev, [field]: undefined }));
    setSaveSuccess(false);
  };

  const validate = () => {
    const errs = {};
    if (profileData?.licenseNumber && !profileData?.licenseExpiry) {
      errs.licenseExpiry = 'Expiry date is required when license number is provided';
    }
    if (profileData?.licenseNumber && !profileData?.licenseType) {
      errs.licenseType = 'License type is required when license number is provided';
    }
    setErrors(errs);
    return Object.keys(errs)?.length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    if (!application) return;

    setSaving(true);
    try {
      const { error } = await supabase?.from('driver_applications')?.update({
          phone: profileData?.phone || null,
          address: profileData?.address || null,
          emergency_contact: profileData?.emergencyContact || null,
          emergency_phone: profileData?.emergencyPhone || null,
          driving_experience: profileData?.drivingExperience || null,
          license_number: profileData?.licenseNumber || null,
          license_expiry: profileData?.licenseExpiry || null,
          license_type: profileData?.licenseType || null,
          license_restrictions: profileData?.licenseRestrictions || null,
          previous_violations: profileData?.previousViolations || null
        })?.eq('id', application?.id);

      if (error) throw error;
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setErrors({ save: err?.message || 'Failed to save profile. Please try again.' });
    } finally {
      setSaving(false);
    }
  };

  const getMinDate = () => new Date()?.toISOString()?.split('T')?.[0];

  if (loading) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex items-center justify-center pt-16">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </>
    );
  }

  if (!application) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center pt-16 px-4">
          <AlertCircle className="h-12 w-12 text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">No Application Found</h2>
          <p className="text-gray-600 mb-6 text-center">You need to sign up as a driver first before accessing your profile.</p>
          <button
            onClick={() => navigate('/driver-registration-form')}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
          >
            Sign Up as Driver
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-16 pt-24">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center space-x-3 mb-2">
              <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100">
                <User className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Driver Profile</h1>
                <p className="text-sm text-gray-500">{application?.full_name}</p>
              </div>
            </div>
            <p className="text-gray-600 text-sm mt-2">
              Complete your profile with your license details, address, and emergency contact information.
            </p>
          </div>

          {errors?.load && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{errors?.load}</p>
            </div>
          )}

          <div className="space-y-6">
            {/* Contact Information */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-5">
                <Phone className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">Contact Information</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                  <input
                    type="tel"
                    value={profileData?.phone}
                    onChange={(e) => handleChange('phone', e?.target?.value)}
                    className="block w-full rounded-md border-gray-300 border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Home Address</label>
                  <input
                    type="text"
                    value={profileData?.address}
                    onChange={(e) => handleChange('address', e?.target?.value)}
                    className="block w-full rounded-md border-gray-300 border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                    placeholder="Street, Barangay, City, Province"
                  />
                </div>
              </div>
            </div>

            {/* Emergency Contact */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-5">
                <Shield className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">Emergency Contact</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input
                    type="text"
                    value={profileData?.emergencyContact}
                    onChange={(e) => handleChange('emergencyContact', e?.target?.value)}
                    className="block w-full rounded-md border-gray-300 border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                    placeholder="Contact person name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Phone</label>
                  <input
                    type="tel"
                    value={profileData?.emergencyPhone}
                    onChange={(e) => handleChange('emergencyPhone', e?.target?.value)}
                    className="block w-full rounded-md border-gray-300 border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>
              </div>
            </div>

            {/* Driving Experience */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-5">
                <Clock className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">Driving Experience</h2>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Years of Experience</label>
                <select
                  value={profileData?.drivingExperience}
                  onChange={(e) => handleChange('drivingExperience', e?.target?.value)}
                  className="block w-full rounded-md border-gray-300 border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                >
                  <option value="">Select experience level</option>
                  <option value="1-2">1-2 years</option>
                  <option value="3-5">3-5 years</option>
                  <option value="6-10">6-10 years</option>
                  <option value="10+">More than 10 years</option>
                </select>
              </div>
            </div>

            {/* License Information */}
            <div className="bg-white shadow-sm rounded-lg p-6">
              <div className="flex items-center space-x-2 mb-5">
                <CreditCard className="w-5 h-5 text-blue-600" />
                <h2 className="text-base font-semibold text-gray-900">License Information</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                  <input
                    type="text"
                    value={profileData?.licenseNumber}
                    onChange={(e) => handleChange('licenseNumber', e?.target?.value?.toUpperCase())}
                    className="block w-full rounded-md border-gray-300 border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                    placeholder="e.g., D01-12-345678"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Expiry Date</label>
                  <input
                    type="date"
                    value={profileData?.licenseExpiry}
                    onChange={(e) => handleChange('licenseExpiry', e?.target?.value)}
                    min={getMinDate()}
                    className={`block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 ${
                      errors?.licenseExpiry ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                  {errors?.licenseExpiry && <p className="mt-1 text-sm text-red-600">{errors?.licenseExpiry}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Type</label>
                  <select
                    value={profileData?.licenseType}
                    onChange={(e) => handleChange('licenseType', e?.target?.value)}
                    className={`block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 ${
                      errors?.licenseType ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Select license type</option>
                    <option value="non-professional">Non-Professional (Private Vehicle)</option>
                    <option value="professional">Professional (Public Transport)</option>
                    <option value="restricted-professional">Restricted Professional</option>
                    <option value="motorcycle">Motorcycle License</option>
                  </select>
                  {errors?.licenseType && <p className="mt-1 text-sm text-red-600">{errors?.licenseType}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">License Restrictions/Codes</label>
                  <input
                    type="text"
                    value={profileData?.licenseRestrictions}
                    onChange={(e) => handleChange('licenseRestrictions', e?.target?.value)}
                    className="block w-full rounded-md border-gray-300 border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                    placeholder="e.g., 1 (Eyeglasses), None"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Traffic Violations History</label>
                  <textarea
                    rows={3}
                    value={profileData?.previousViolations}
                    onChange={(e) => handleChange('previousViolations', e?.target?.value)}
                    className="block w-full rounded-md border-gray-300 border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2"
                    placeholder="List any traffic violations in the past 5 years, or enter 'None'"
                  />
                  <p className="mt-1 text-xs text-gray-500">This information may be verified during background check.</p>
                </div>
              </div>
            </div>

            {/* Save Button */}
            {errors?.save && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                  <p className="ml-3 text-sm text-red-800">{errors?.save}</p>
                </div>
              </div>
            )}

            {saveSuccess && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                  <p className="ml-3 text-sm text-green-800 font-medium">Profile saved successfully!</p>
                </div>
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Profile'}
            </button>

            <div className="text-center">
              <button
                onClick={() => navigate('/driver-registration-portal')}
                className="text-sm text-blue-600 hover:underline"
              >
                ← Back to Application Status
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default DriverProfile;
