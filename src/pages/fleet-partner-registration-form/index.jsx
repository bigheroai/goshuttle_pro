import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, CheckCircle, Building2, Handshake, Car, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import BusinessInformation from './components/BusinessInformation';
import FleetInventory from './components/FleetInventory';
import PartnershipAgreement from './components/PartnershipAgreement';
import { fleetPartnerService } from '../../services/fleetPartnerService';

const FleetPartnerRegistrationForm = () => {
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    companyName: '',
    businessType: '',
    registrationNumber: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
    yearsInOperation: '',
    employeeCount: '',
    specialization: '',
    website: '',
    vehicles: [],
    agreementAccepted: false,
    termsAccepted: false
  });
  
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const steps = [
    {
      id: 0,
      title: 'Business Information',
      icon: Building2,
      component: BusinessInformation,
      description: 'Company details and registration information'
    },
    {
      id: 1,
      title: 'Fleet Inventory',
      icon: Car,
      component: FleetInventory,
      description: 'Vehicle registration and documentation'
    },
    {
      id: 2,
      title: 'Partnership Agreement',
      icon: Handshake,
      component: PartnershipAgreement,
      description: 'Terms, commission structure, and agreement'
    }
  ];

  const validateStep = async (stepIndex) => {
    const stepErrors = {};
    
    switch (stepIndex) {
      case 0: // Business Information
        if (!formData?.companyName?.trim()) stepErrors.companyName = 'Company name is required';
        if (!formData?.businessType) stepErrors.businessType = 'Business type is required';
        if (!formData?.registrationNumber?.trim()) stepErrors.registrationNumber = 'Registration number is required';
        if (!formData?.contactEmail?.trim()) stepErrors.contactEmail = 'Email is required';
        else if (!/\S+@\S+\.\S+/?.test(formData?.contactEmail)) stepErrors.contactEmail = 'Invalid email format';
        if (!formData?.contactPhone?.trim()) stepErrors.contactPhone = 'Phone number is required';
        if (!formData?.address?.trim()) stepErrors.address = 'Address is required';
        if (!formData?.yearsInOperation) stepErrors.yearsInOperation = 'Years in operation is required';
        if (!formData?.employeeCount) stepErrors.employeeCount = 'Employee count is required';
        if (!formData?.specialization?.trim()) stepErrors.specialization = 'Specialization is required';
        
        // Check if partner already exists
        try {
          const exists = await fleetPartnerService?.checkPartnerExists(formData?.contactEmail);
          if (exists) {
            stepErrors.contactEmail = 'A partner with this email already exists';
          }
        } catch (error) {
          // Handle error silently for now
        }
        break;
        
      case 1: // Fleet Inventory
        if (!formData?.vehicles || formData?.vehicles?.length === 0) {
          stepErrors.vehicles = 'At least one vehicle is required';
        } else if (formData?.vehicles?.length < 2) {
          stepErrors.vehicles = 'Minimum 2 vehicles required for partnership';
        } else {
          // Validate each vehicle
          formData?.vehicles?.forEach((vehicle, index) => {
            if (!vehicle?.make?.trim()) stepErrors[`vehicle_${index}_make`] = 'Vehicle make is required';
            if (!vehicle?.model?.trim()) stepErrors[`vehicle_${index}_model`] = 'Vehicle model is required';
            if (!vehicle?.year) stepErrors[`vehicle_${index}_year`] = 'Vehicle year is required';
            if (!vehicle?.plateNumber?.trim()) stepErrors[`vehicle_${index}_plateNumber`] = 'Plate number is required';
            if (!vehicle?.seatingCapacity) stepErrors[`vehicle_${index}_seatingCapacity`] = 'Seating capacity is required';
            if (!vehicle?.insuranceExpiry) stepErrors[`vehicle_${index}_insuranceExpiry`] = 'Insurance expiry is required';
            if (!vehicle?.registrationExpiry) stepErrors[`vehicle_${index}_registrationExpiry`] = 'Registration expiry is required';
          });
        }
        break;
        
      case 2: // Partnership Agreement
        if (!formData?.agreementAccepted) stepErrors.agreementAccepted = 'Partnership agreement must be accepted';
        if (!formData?.termsAccepted) stepErrors.termsAccepted = 'Terms of service must be accepted';
        break;
    }
    
    setErrors(stepErrors);
    return Object.keys(stepErrors)?.length === 0;
  };

  const handleNext = async () => {
    const isValid = await validateStep(currentStep);
    if (isValid) {
      setCurrentStep(prev => Math.min(prev + 1, steps?.length - 1));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const handleSubmit = async () => {
    const isValid = await validateStep(currentStep);
    if (!isValid) return;
    
    setIsSubmitting(true);
    try {
      await fleetPartnerService?.submitPartnerApplication(formData);
      setSubmitSuccess(true);
    } catch (error) {
      setErrors({ submit: error?.message || 'Application submission failed' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Partnership Application Submitted!</h2>
            <p className="text-gray-600 mb-6">
              Thank you for your interest in becoming a GoShuttle fleet partner. Your application has been received and is now under review.
            </p>
            <div className="space-y-3 text-sm text-gray-600 mb-6">
              <p>• Application review typically takes 5-7 business days</p>
              <p>• Our team will verify your business registration and documents</p>
              <p>• Vehicle inspections will be scheduled upon initial approval</p>
              <p>• You'll receive email updates throughout the process</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => navigate('/partner-fleet-management')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                View Partner Dashboard
              </button>
              <button
                onClick={() => navigate('/')}
                className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Home
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const StepComponent = steps?.[currentStep]?.component;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">GoShuttle Fleet Partner Registration</h1>
          <p className="mt-2 text-lg text-gray-600">Join our partner network and grow your business</p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-between max-w-2xl mx-auto">
            {steps?.map((step, index) => (
              <div key={step?.id} className="flex items-center">
                <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 ${
                  index <= currentStep
                    ? 'border-blue-600 bg-blue-600 text-white' :'border-gray-300 bg-white text-gray-500'
                }`}>
                  {index < currentStep ? (
                    <CheckCircle className="w-6 h-6" />
                  ) : (
                    <step.icon className="w-6 h-6" />
                  )}
                </div>
                <div className="ml-3 hidden sm:block">
                  <p className={`text-sm font-medium ${
                    index <= currentStep ? 'text-blue-600' : 'text-gray-500'
                  }`}>
                    {step?.title}
                  </p>
                </div>
                {index < steps?.length - 1 && (
                  <div className={`hidden sm:block w-20 h-0.5 ml-4 ${
                    index < currentStep ? 'bg-blue-600' : 'bg-gray-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Form Content */}
        <div className="bg-white shadow-lg rounded-lg">
          <div className="px-6 py-8">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">
                Step {currentStep + 1}: {steps?.[currentStep]?.title}
              </h2>
              <p className="text-gray-600">{steps?.[currentStep]?.description}</p>
            </div>

            <StepComponent
              formData={formData}
              setFormData={setFormData}
              errors={errors}
            />

            {errors?.submit && (
              <div className="mt-6 bg-red-50 border border-red-200 rounded-md p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-red-400" />
                  <div className="ml-3">
                    <p className="text-sm text-red-800">{errors?.submit}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Navigation */}
          <div className="bg-gray-50 px-6 py-4 flex items-center justify-between border-t border-gray-200">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 0}
              className={`flex items-center px-4 py-2 text-sm font-medium rounded-md ${
                currentStep === 0
                  ? 'text-gray-400 cursor-not-allowed' :'text-gray-700 bg-white border border-gray-300 hover:bg-gray-50'
              }`}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />
              Previous
            </button>

            {currentStep === steps?.length - 1 ? (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="flex items-center px-6 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  'Submit Partnership Application'
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FleetPartnerRegistrationForm;