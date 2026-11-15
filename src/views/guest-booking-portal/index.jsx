import React, { useState, useEffect } from 'react';
import { ChevronRight, MapPin, Mail, User, Car, CreditCard, CheckCircle, Clock } from 'lucide-react';
import { guestBookingService } from '../../services/guestBookingService';
import rateSheetService from '../../services/rateSheetService';
import { calculateBookingPriceWithGlobalRate, getTripHours } from '../../utils/pricingService';
import Header from '../../components/ui/Header';
import GuestBookingForm from './components/GuestBookingForm';
import VehicleSelection from './components/VehicleSelection';
import BookingConfirmation from './components/BookingConfirmation';
import PaymentSection from './components/PaymentSection';
import Icon from '../../components/AppIcon';


export default function GuestBookingPortal() {
  const [currentStep, setCurrentStep] = useState(1);
  const [bookingData, setBookingData] = useState({
    pickupLocation: '',
    dropoffLocation: '',
    pickupDate: '',
    returnDate: '',
    passengerCount: 1,
    guestEmail: '',
    guestName: '',
    guestPhone: '',
    notes: '',
    vehicleId: '',
    totalCost: 0
  });
  const [availableVehicles, setAvailableVehicles] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [bookingResult, setBookingResult] = useState(null);
  const [applicableRateSheet, setApplicableRateSheet] = useState(null);
  const [computedTotalCost, setComputedTotalCost] = useState(0);

  const steps = [
    { id: 1, title: 'Trip Details', icon: MapPin },
    { id: 2, title: 'Guest Info', icon: User },
    { id: 3, title: 'Select Vehicle', icon: Car },
    { id: 4, title: 'Payment', icon: CreditCard },
    { id: 5, title: 'Confirmation', icon: CheckCircle }
  ];

  useEffect(() => {
    loadAvailableVehicles();
  }, []);

  const loadAvailableVehicles = async () => {
    try {
      const vehicles = await guestBookingService?.getAvailableVehicles();
      setAvailableVehicles(vehicles);
    } catch (err) {
      setError('Failed to load available vehicles');
      console.error('Error loading vehicles:', err);
    }
  };

  const handleStepSubmit = (stepData) => {
    setBookingData(prev => ({ ...prev, ...stepData }));
    setError('');
    
    if (currentStep < 5) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleVehicleSelect = async (vehicle) => {
    setSelectedVehicle(vehicle);

    // Fetch applicable rate sheet for this vehicle type
    let rateSheet = null;
    try {
      const vehicleType = vehicle?.type || vehicle?.vehicle_type;
      const destinationZone = bookingData?.dropoffLocation || null;
      rateSheet = await rateSheetService?.getApplicableRate(vehicleType, 'standard', destinationZone);
    } catch {
      rateSheet = null;
    }
    setApplicableRateSheet(rateSheet);

    // Compute trip hours from pickup/return dates
    const tripHours = getTripHours(
      bookingData?.pickupDate ? `${bookingData?.pickupDate}T09:00` : null,
      bookingData?.returnDate ? `${bookingData?.returnDate}T09:00` : null
    );

    // Calculate pricing using pricingService
    const pricingResult = await calculateBookingPriceWithGlobalRate(vehicle, tripHours, rateSheet);
    const cost = pricingResult?.total || vehicle?.dailyRate || 0;
    setComputedTotalCost(cost);

    setBookingData(prev => ({
      ...prev,
      vehicleId: vehicle?.id,
      totalCost: cost
    }));
  };

  const handlePaymentComplete = async (paymentData) => {
    setLoading(true);
    setError('');
    
    try {
      const completeBookingData = {
        ...bookingData,
        totalCost: computedTotalCost || bookingData?.totalCost,
        ...paymentData
      };
      
      const result = await guestBookingService?.createGuestBooking(completeBookingData);
      setBookingResult(result);
      setSuccess('Booking created successfully! Check your email for confirmation.');
      setCurrentStep(5);
    } catch (err) {
      setError(err?.message || 'Failed to create booking');
      console.error('Booking creation error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handlePrevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
      setError('');
    }
  };

  const handleAccountCreation = async () => {
    if (bookingResult) {
      try {
        await guestBookingService?.createAccountInvitation(
          bookingResult?.bookingCode,
          bookingResult?.guestEmail
        );
        setSuccess('Account creation invitation sent to your email!');
      } catch (err) {
        setError('Failed to send account invitation');
      }
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
      case 2:
        return (
          <GuestBookingForm
            initialData={bookingData}
            onSubmit={handleStepSubmit}
            currentStep={currentStep}
            error={error}
          />
        );
      case 3:
        return (
          <VehicleSelection
            vehicles={availableVehicles}
            selectedVehicle={selectedVehicle}
            onVehicleSelect={handleVehicleSelect}
            bookingData={bookingData}
            onNext={() => handleStepSubmit({})}
            onPrev={handlePrevStep}
            error={error}
          />
        );
      case 4:
        return (
          <PaymentSection
            bookingData={bookingData}
            selectedVehicle={selectedVehicle}
            computedTotalCost={computedTotalCost}
            onPaymentComplete={handlePaymentComplete}
            onPrev={handlePrevStep}
            loading={loading}
            error={error}
            onPaymentUpdate={() => {}}
            bookingSummary={{}}
            paymentDetails={{}}
            onPaymentMethodsLoaded={() => {}}
          />
        );
      case 5:
        return (
          <BookingConfirmation
            bookingResult={bookingResult}
            onCreateAccount={handleAccountCreation}
            success={success}
            error={error}
            bookingData={bookingData}
            onNewBooking={() => setCurrentStep(1)}
            onViewBooking={() => {}}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Guest Booking Portal
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Book your shuttle service without creating an account. Simply provide your email 
            for booking confirmation and easy tracking.
          </p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <div className="flex items-center justify-center space-x-4 mb-6">
            {steps?.map((step, index) => {
              const Icon = step?.icon;
              const isActive = currentStep === step?.id;
              const isCompleted = currentStep > step?.id;
              
              return (
                <div key={step?.id} className="flex items-center">
                  <div className={`
                    flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all
                    ${isActive 
                      ? 'bg-blue-600 border-blue-600 text-white' 
                      : isCompleted 
                        ? 'bg-green-600 border-green-600 text-white' :'bg-white border-gray-300 text-gray-400'
                    }
                  `}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className={`
                    ml-2 font-medium
                    ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}
                  `}>
                    {step?.title}
                  </span>
                  {index < steps?.length - 1 && (
                    <ChevronRight className="w-5 h-5 text-gray-300 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Benefits Section */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Mail className="w-8 h-8 text-blue-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Email Verification</h3>
            <p className="text-gray-600 text-sm">
              Secure booking with email confirmation and unique booking codes for easy tracking.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <Clock className="w-8 h-8 text-green-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Quick Process</h3>
            <p className="text-gray-600 text-sm">
              No account required. Complete your booking in minutes with our streamlined process.
            </p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <CheckCircle className="w-8 h-8 text-purple-600 mb-3" />
            <h3 className="font-semibold text-gray-900 mb-2">Account Option</h3>
            <p className="text-gray-600 text-sm">
              Create an account later to save preferences and earn loyalty points.
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6">
            {renderStepContent()}
          </div>
        </div>

        {/* Guest Booking Benefits */}
        {currentStep === 1 && (
          <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-6">
            <h3 className="font-semibold text-blue-900 mb-4">Why Choose Guest Booking?</h3>
            <div className="grid md:grid-cols-2 gap-4 text-sm text-blue-800">
              <div className="flex items-start">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <span>No registration required - book instantly</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <span>Email confirmation with booking code</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <span>Easy booking lookup and modifications</span>
              </div>
              <div className="flex items-start">
                <CheckCircle className="w-4 h-4 text-blue-600 mt-0.5 mr-2 flex-shrink-0" />
                <span>Option to create account later</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}