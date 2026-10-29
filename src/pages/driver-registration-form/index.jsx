import React, { useState } from 'react';
import { CheckCircle, AlertCircle, Upload, User } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { driverRegistrationService } from '../../services/driverRegistrationService';
import { sendDriverEmail } from '../../services/driverEmailService';
import Header from '../../components/ui/Header';

const DriverRegistrationForm = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    preferredFleetType: 'goshuttle',
    partnerId: null,
    documentsUploaded: []
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [applicationId, setApplicationId] = useState(null);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const validate = () => {
    const stepErrors = {};
    if (!formData?.fullName?.trim()) stepErrors.fullName = 'Full name is required';
    if (!formData?.email?.trim()) stepErrors.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/?.test(formData?.email)) stepErrors.email = 'Invalid email format';
    if (!formData?.phone?.trim()) stepErrors.phone = 'Phone number is required';
    setErrors(stepErrors);
    return Object.keys(stepErrors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      const result = await driverRegistrationService?.submitApplication(formData);
      setApplicationId(result?.id);

      // Send signup confirmation email (non-blocking)
      if (formData?.email) {
        sendDriverEmail('driver_signup_confirmation', formData?.email, {
          full_name: formData?.fullName,
          email: formData?.email,
          phone: formData?.phone,
        })?.catch(() => {});

        // Send pending approval email after a short delay
        setTimeout(() => {
          sendDriverEmail('driver_pending_approval', formData?.email, {
            full_name: formData?.fullName,
          })?.catch(() => {});
        }, 2000);
      }

      setSubmitSuccess(true);
    } catch (error) {
      setErrors({ submit: error?.message || 'Application submission failed. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <>
        <Header />
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 pt-24 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-lg">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
              <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Application Submitted!</h2>
              <p className="text-gray-600 mb-6">
                Your basic information has been saved. Now upload your required documents to complete your application.
              </p>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6 text-left">
                <div className="flex items-start space-x-3">
                  <Upload className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">Next Step: Upload Your Documents</p>
                    <p className="text-sm text-blue-700 mt-1">
                      Please upload your Driver's License, Police/NBI Clearance, Medical Certificate, and optionally Vehicle Insurance & Registration.
                    </p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => navigate('/driver-document-upload', { state: { applicationId } })}
                className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-3"
              >
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents Now
              </button>
              <button
                onClick={() => navigate('/driver-profile')}
                className="w-full flex justify-center py-2 px-4 border border-blue-300 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 mb-3"
              >
                Complete My Profile (License, Address & More)
              </button>
              <button
                onClick={() => navigate('/driver-registration-portal')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Upload Later — View Application Status
              </button>
              <button
                onClick={() => navigate('/driver-application-status', { state: { applicationId } })}
                className="w-full flex justify-center py-2 px-4 border border-blue-200 rounded-md shadow-sm text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Track My Application Status
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header />
      <div className="min-h-screen bg-gray-50 py-16 pt-24">
        <div className="max-w-lg mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="flex items-center justify-center w-14 h-14 rounded-full bg-blue-100">
                <User className="w-7 h-7 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900">Driver Sign Up</h1>
            <p className="mt-2 text-gray-600">Create your GoShuttle driver account</p>
          </div>

          {/* Info Banner */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <span className="font-medium">Quick sign up:</span> Just fill in your basic details to get started. You can add your license information, address, emergency contact, and driving experience in your profile after signing up.
            </p>
          </div>

          {/* Form */}
          <div className="bg-white shadow-lg rounded-lg px-6 py-8">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="fullName"
                  value={formData?.fullName || ''}
                  onChange={(e) => handleChange('fullName', e?.target?.value)}
                  className={`block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 ${
                    errors?.fullName ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Enter your full legal name"
                />
                {errors?.fullName && <p className="mt-1 text-sm text-red-600">{errors?.fullName}</p>}
              </div>

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                  Email Address <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  value={formData?.email || ''}
                  onChange={(e) => handleChange('email', e?.target?.value)}
                  className={`block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 ${
                    errors?.email ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="your.email@example.com"
                />
                {errors?.email && <p className="mt-1 text-sm text-red-600">{errors?.email}</p>}
              </div>

              {/* Phone */}
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  id="phone"
                  value={formData?.phone || ''}
                  onChange={(e) => handleChange('phone', e?.target?.value)}
                  className={`block w-full rounded-md border shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm px-3 py-2 ${
                    errors?.phone ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="+63 9XX XXX XXXX"
                />
                {errors?.phone && <p className="mt-1 text-sm text-red-600">{errors?.phone}</p>}
              </div>

              {errors?.submit && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <div className="flex">
                    <AlertCircle className="h-5 w-5 text-red-400 flex-shrink-0" />
                    <p className="ml-3 text-sm text-red-800">{errors?.submit}</p>
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isSubmitting ? 'Submitting...' : 'Create Driver Account'}
              </button>
            </form>

            <p className="mt-4 text-center text-xs text-gray-500">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/driver-login')}
                className="text-blue-600 hover:underline font-medium"
              >
                Sign in here
              </button>
            </p>
          </div>

          {/* What's next info */}
          <div className="mt-6 bg-gray-50 border border-gray-200 rounded-lg p-4">
            <p className="text-xs font-medium text-gray-700 mb-2">After signing up, you can add in your profile:</p>
            <ul className="text-xs text-gray-600 space-y-1">
              <li>• Driver's license & license information</li>
              <li>• Home address</li>
              <li>• Emergency contact details</li>
              <li>• Driving experience</li>
            </ul>
          </div>
        </div>
      </div>
    </>
  );
};

export default DriverRegistrationForm;