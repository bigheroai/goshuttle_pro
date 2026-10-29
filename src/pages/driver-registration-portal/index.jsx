import React, { useState, useEffect } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Navigate } from 'react-router-dom';
import { Car, CheckCircle, FileText, Users } from 'lucide-react';
import FleetSelection from './components/FleetSelection';
import ApplicationForm from './components/ApplicationForm';
import ApplicationStatus from './components/ApplicationStatus';
import DriverKYCVerification from './components/DriverKYCVerification';
import { driverRegistrationService } from '../../services/driverRegistrationService';

export default function DriverRegistrationPortal() {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedFleet, setSelectedFleet] = useState(null);
  const [formData, setFormData] = useState({});
  const [formErrors, setFormErrors] = useState({});
  const [existingApplication, setExistingApplication] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      checkExistingApplication();
    }
  }, [user]);

  const checkExistingApplication = async () => {
    try {
      setLoading(true);
      const application = await driverRegistrationService?.getMyApplication();
      if (application) {
        setExistingApplication(application);
        setCurrentStep(3); // Show status if application exists
      }
    } catch (err) {
      setError(err?.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFleetSelect = (fleet) => {
    setSelectedFleet(fleet);
    setCurrentStep(2);
  };

  const handleApplicationSubmit = async (applicationData) => {
    try {
      setSubmitting(true);
      setError('');
      await driverRegistrationService?.submitDriverApplication(applicationData);
      await checkExistingApplication();
      setCurrentStep(3); // Go to KYC step after application
    } catch (err) {
      setError(err?.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Redirect if not authenticated
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const steps = [
    {
      id: 1,
      name: 'Fleet Selection',
      description: 'Choose your preferred fleet',
      icon: Users,
      completed: currentStep > 1
    },
    {
      id: 2,
      name: 'Application',
      description: 'Complete your driver application',
      icon: FileText,
      completed: currentStep > 2
    },
    {
      id: 3,
      name: 'KYC Verification',
      description: 'Verify your identity',
      icon: CheckCircle,
      completed: currentStep > 3
    },
    {
      id: 4,
      name: 'Status',
      description: 'Track your application status',
      icon: CheckCircle,
      completed: false
    }
  ];

  const renderStepContent = () => {
    if (existingApplication && currentStep === 4) {
      return (
        <div className="space-y-6">
          <ApplicationStatus application={existingApplication} />
          <DriverKYCVerification driverApplicationId={existingApplication?.id} />
        </div>
      );
    }

    switch (currentStep) {
      case 1:
        return (
          <FleetSelection
            onFleetSelect={handleFleetSelect}
            formData={formData}
            setFormData={setFormData}
            errors={formErrors}
          />
        );
      case 2:
        return (
          <ApplicationForm
            selectedFleet={selectedFleet}
            onSubmit={handleApplicationSubmit}
            loading={submitting}
          />
        );
      case 3:
        return <DriverKYCVerification driverApplicationId={existingApplication?.id} />;
      case 4:
        return (
          <div className="space-y-6">
            <ApplicationStatus application={existingApplication} />
            <DriverKYCVerification driverApplicationId={existingApplication?.id} />
          </div>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Car className="h-8 w-8 text-blue-600 mr-3" />
              <div>
                <h1 className="text-xl font-semibold text-gray-900">
                  Driver Registration Portal
                </h1>
                <p className="text-sm text-gray-500">Join the GoShuttle driver network</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-gray-500">
                Welcome, {user?.email}
              </span>
            </div>
          </div>
        </div>
      </div>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Progress Steps */}
        <div className="mb-8">
          <nav aria-label="Progress">
            <ol className="flex items-center justify-center">
              {steps?.map((step, stepIdx) => {
                const IconComponent = step?.icon;
                return (
                  <li key={step?.name} className={`relative ${stepIdx !== steps?.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                    <div className="flex items-center">
                      <div className={`relative flex h-8 w-8 items-center justify-center rounded-full ${
                        step?.completed
                          ? 'bg-green-600'
                          : currentStep === step?.id
                          ? 'border-2 border-blue-600 bg-white' :'border-2 border-gray-300 bg-white'
                      }`}>
                        {step?.completed ? (
                          <CheckCircle className="h-5 w-5 text-white fill-current" />
                        ) : (
                          <IconComponent className={`h-4 w-4 ${
                            currentStep === step?.id ? 'text-blue-600' : 'text-gray-500'
                          }`} />
                        )}
                      </div>
                      <div className="ml-4 min-w-0">
                        <p className={`text-sm font-medium ${
                          step?.completed || currentStep === step?.id ? 'text-gray-900' : 'text-gray-500'
                        }`}>
                          {step?.name}
                        </p>
                        <p className="text-xs text-gray-500">{step?.description}</p>
                      </div>
                    </div>
                    {stepIdx !== steps?.length - 1 && (
                      <div className="absolute top-4 left-4 -ml-px mt-0.5 h-0.5 w-8 sm:w-20 bg-gray-300" />
                    )}
                  </li>
                );
              })}
            </ol>
          </nav>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="text-red-800">
              <strong>Error:</strong> {error}
            </div>
          </div>
        )}

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          {renderStepContent()}
        </div>

        {/* Navigation */}
        {!existingApplication && currentStep > 1 && currentStep < 4 && (
          <div className="mt-6 flex justify-between">
            <button
              onClick={() => setCurrentStep(currentStep - 1)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Previous
            </button>
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-500">
                Step {currentStep} of {steps?.length}
              </div>
              {currentStep === 3 && (
                <button
                  onClick={() => setCurrentStep(4)}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Continue to Status
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}