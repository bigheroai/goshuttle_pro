import React, { useState, useEffect, useRef } from 'react';
import { Helmet } from 'react-helmet';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from '../../components/ui/Header';
import Icon from '../../components/AppIcon';
import Button from '../../components/ui/Button';
import bookingService from '../../services/bookingService';
import { guestBookingService } from '../../services/guestBookingService';
import { useAuth } from '../../contexts/AuthContext';
import favoriteBookingsService from '../../services/favoriteBookingsService';
import corporateEmailService from '../../services/corporateEmailService';
import { supabase } from '../../lib/supabase';
import rateSheetService from '../../services/rateSheetService';
import { calculateBookingPriceWithGlobalRate, getTripHours } from '../../utils/pricingService';

// Import all components
import BookingProgress from './components/BookingProgress';
import RouteSelector from './components/RouteSelector';
import DateTimeSelector from './components/DateTimeSelector';
import VehicleSelector from './components/VehicleSelector';
import PassengerDetails from './components/PassengerDetails';
import PaymentSection from './components/PaymentSection';
import BookingSummary from './components/BookingSummary';

const SmartBookingPortal = () => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  // Check for fresh search data from homepage first
  const getInitialBookingData = () => {
    const quickBookingData = sessionStorage.getItem('quickBookingData');
    if (quickBookingData) {
      const searchData = JSON.parse(quickBookingData);
      sessionStorage.removeItem('quickBookingData');
      localStorage.removeItem('bookingCurrentStep');
      localStorage.removeItem('bookingData');
      localStorage.removeItem('bookingConfirmed');
      
      return {
        route: searchData?.route || null,
        dateTime: searchData?.dateTime || null,
        passengerCount: searchData?.passengerCount || 1,
        vehicle: null,
        passengerDetails: null,
        paymentDetails: null,
        isGuestBooking: false,
        guestInfo: null,
        hasQuickBookingData: true
      };
    }
    
    const savedBookingData = localStorage.getItem('bookingData');
    if (savedBookingData) {
      try {
        return JSON.parse(savedBookingData);
      } catch {
        return getDefaultBookingData();
      }
    }

    return getDefaultBookingData();
  };

  const getDefaultBookingData = () => ({
    route: null,
    dateTime: null,
    passengerCount: 1,
    vehicle: null,
    passengerDetails: null,
    paymentDetails: null,
    isGuestBooking: false,
    guestInfo: null
  });

  const [currentStep, setCurrentStep] = useState(() => {
    const quickBookingData = sessionStorage.getItem('quickBookingData');
    if (quickBookingData) return 0;
    const savedStep = localStorage.getItem('bookingCurrentStep');
    return savedStep ? parseInt(savedStep, 10) : 0;
  });

  const [bookingData, setBookingData] = useState(getInitialBookingData);
  const [isBookingConfirmed, setIsBookingConfirmed] = useState(() => {
    return localStorage.getItem('bookingConfirmed') === 'true';
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [confirmedBooking, setConfirmedBooking] = useState(null);
  const [paymentMethodsAvailable, setPaymentMethodsAvailable] = useState(false);
  const [paymentMethodsLoaded, setPaymentMethodsLoaded] = useState(false);
  const [applicableRateSheet, setApplicableRateSheet] = useState(null);

  // Guest sign-up opt-in state
  const [guestSignUpOptIn, setGuestSignUpOptIn] = useState(false);
  const [guestSignUpPassword, setGuestSignUpPassword] = useState('');
  const [guestSignUpConfirmPassword, setGuestSignUpConfirmPassword] = useState('');
  const [guestSignUpError, setGuestSignUpError] = useState('');
  const [guestSignUpSuccess, setGuestSignUpSuccess] = useState(false);
  const [showGuestPassword, setShowGuestPassword] = useState(false);
  const [showGuestConfirmPassword, setShowGuestConfirmPassword] = useState(false);

  // Inline validation errors per step
  const [stepValidationErrors, setStepValidationErrors] = useState({});

  // Favorites state
  const [favorites, setFavorites] = useState([]);
  const [favoritesLoading, setFavoritesLoading] = useState(false);
  const [showSaveFavoriteModal, setShowSaveFavoriteModal] = useState(false);
  const [favoriteName, setFavoriteName] = useState('');
  const [savingFavorite, setSavingFavorite] = useState(false);
  const [favoritesSaved, setFavoritesSaved] = useState(false);
  const [saveFavoriteError, setSaveFavoriteError] = useState('');
  const [showFavoritesPanel, setShowFavoritesPanel] = useState(false);

  // Submission overlay state
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  // Load favorites for authenticated users
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadFavorites();
    }
  }, [isAuthenticated, user?.id]);

  const loadFavorites = async () => {
    setFavoritesLoading(true);
    try {
      const data = await favoriteBookingsService?.getFavorites(user?.id);
      setFavorites(data);
    } finally {
      setFavoritesLoading(false);
    }
  };

  const handleSaveFavorite = async () => {
    if (!isAuthenticated || !user?.id) {
      // Safety guard: should not be reachable for guests, but prevent any accidental calls
      return;
    }
    if (!favoriteName?.trim()) return;
    setSavingFavorite(true);
    setSaveFavoriteError('');
    try {
      const result = await favoriteBookingsService?.saveFavorite(user?.id, bookingData, favoriteName?.trim());
      if (result?.success) {
        setFavoritesSaved(true);
        setShowSaveFavoriteModal(false);
        setFavoriteName('');
        setSaveFavoriteError('');
        await loadFavorites();
        setTimeout(() => setFavoritesSaved(false), 3000);
      } else {
        setSaveFavoriteError(result?.error || 'Failed to save favorite. Please try again.');
      }
    } catch (err) {
      setSaveFavoriteError('An unexpected error occurred. Please try again.');
    } finally {
      setSavingFavorite(false);
    }
  };

  const handleDeleteFavorite = async (favoriteId) => {
    await favoriteBookingsService?.deleteFavorite(favoriteId);
    await loadFavorites();
  };

  const handleApplyFavorite = (favorite) => {
    setBookingData(prev => ({
      ...prev,
      route: favorite?.route,
      passengerCount: favorite?.passengerCount || 1,
      vehicle: favorite?.vehicleId ? {
        id: favorite?.vehicleId,
        name: favorite?.vehicleName,
        type: favorite?.vehicleType,
        price: favorite?.vehiclePrice
      } : prev?.vehicle,
      paymentDetails: favorite?.paymentMethod ? {
        method: favorite?.paymentMethod
      } : prev?.paymentDetails
    }));
    setShowFavoritesPanel(false);
    setCurrentStep(0);
  };

  // Auto-advance step if route is pre-filled from search
  useEffect(() => {
    if (bookingData?.hasQuickBookingData && bookingData?.route && currentStep === 0) {
      setTimeout(() => {
        if (bookingData?.dateTime) {
          setCurrentStep(1);
        }
      }, 500);
    }
  }, [bookingData?.hasQuickBookingData, bookingData?.route, currentStep]);

  // Save booking progress to localStorage
  useEffect(() => {
    if (!bookingData?.hasQuickBookingData) {
      localStorage.setItem('bookingCurrentStep', currentStep?.toString());
    }
  }, [currentStep, bookingData?.hasQuickBookingData]);

  useEffect(() => {
    const dataToSave = { ...bookingData };
    delete dataToSave?.hasQuickBookingData;
    localStorage.setItem('bookingData', JSON.stringify(dataToSave));
  }, [bookingData]);

  useEffect(() => {
    localStorage.setItem('bookingConfirmed', isBookingConfirmed?.toString());
  }, [isBookingConfirmed]);

  const steps = [
    { id: 'route', title: 'Route', component: 'RouteSelector' },
    { id: 'datetime', title: 'Date & Time', component: 'DateTimeSelector' },
    { id: 'vehicle', title: 'Vehicle', component: 'VehicleSelector' },
    { id: 'passengers', title: 'Passengers', component: 'PassengerDetails' },
    { id: 'payment', title: 'Payment', component: 'PaymentSection' }
  ];

  const handleRouteSelect = (route) => {
    setBookingData(prev => ({ ...prev, route }));
    setStepValidationErrors(prev => ({ ...prev, route: null }));
  };

  const handleSearchRouteComplete = (route) => {
    setBookingData(prev => ({ ...prev, route }));
    setStepValidationErrors({});
    if (currentStep === 0) {
      setCurrentStep(1);
    }
  };

  const handleDateTimeSelect = (dateTime) => {
    setBookingData(prev => ({ ...prev, dateTime }));
    setStepValidationErrors(prev => ({ ...prev, date: null, time: null }));
  };

  const handleDateTimeComplete = () => {
    // No-op: step advances only via Next button
  };

  const handlePassengerCountUpdate = (passengerCount) => {
    setBookingData(prev => ({ 
      ...prev, 
      passengerCount,
      vehicle: (prev?.passengerCount <= 5 && passengerCount > 5) || 
                (prev?.passengerCount > 5 && passengerCount <= 5) ? null : prev?.vehicle
    }));
  };

  const handleVehicleSelect = (vehicle) => {
    setBookingData(prev => ({ ...prev, vehicle }));
    setStepValidationErrors(prev => ({ ...prev, vehicle: null }));
    // Fetch applicable rate sheet for the selected vehicle
    if (vehicle?.type || vehicle?.vehicle_type) {
      const vehicleType = vehicle?.type || vehicle?.vehicle_type;
      const tripCategory = bookingData?.route?.tripCategory || 'standard';
      const destinationZone = bookingData?.route?.zone || bookingData?.route?.to || null;
      rateSheetService?.getApplicableRate(vehicleType, tripCategory, destinationZone)
        ?.then(rate => setApplicableRateSheet(rate || null))
        ?.catch(() => setApplicableRateSheet(null));
    }
  };

  const handlePassengerDetailsUpdate = (passengerDetails) => {
    setBookingData(prev => ({ ...prev, passengerDetails }));
    setStepValidationErrors(prev => ({ ...prev, passengerDetails: null }));
  };

  const handlePaymentUpdate = (paymentDetails) => {
    setBookingData(prev => ({ ...prev, paymentDetails }));
    setStepValidationErrors(prev => ({ ...prev, payment: null }));
  };

  const handleGuestInfoUpdate = (guestInfo) => {
    setBookingData(prev => ({ 
      ...prev, 
      isGuestBooking: true,
      guestInfo 
    }));
    setStepValidationErrors(prev => ({ ...prev, guestInfo: null }));
  };

  const handleStepEdit = (stepId) => {
    const stepIndex = steps?.findIndex(step => step?.id === stepId);
    if (stepIndex !== -1) {
      setCurrentStep(stepIndex);
    }
  };

  // Validate current step and return errors object
  const validateCurrentStep = () => {
    const errors = {};
    switch (currentStep) {
      case 0:
        if (!bookingData?.route?.from) errors.routeFrom = 'Please enter a pickup location';
        if (!bookingData?.route?.to) errors.routeTo = 'Please enter a destination';
        break;
      case 1:
        if (!bookingData?.dateTime?.date) errors.date = 'Please select a travel date';
        if (!bookingData?.dateTime?.time) errors.time = 'Please select a departure time';
        break;
      case 2:
        if (!bookingData?.vehicle?.id) errors.vehicle = 'Please select a vehicle to continue';
        break;
      case 3:
        if (isAuthenticated) {
          if (!bookingData?.passengerDetails?.primaryPassenger?.firstName?.trim())
            errors.firstName = 'First name is required';
          if (!bookingData?.passengerDetails?.primaryPassenger?.email?.trim())
            errors.email = 'Email address is required';
          else if (!/\S+@\S+\.\S+/?.test(bookingData?.passengerDetails?.primaryPassenger?.email))
            errors.email = 'Please enter a valid email address';
          if (!bookingData?.passengerDetails?.primaryPassenger?.phone?.trim())
            errors.phone = 'Phone number is required';
        } else {
          if (!bookingData?.guestInfo?.name?.trim()) errors.guestName = 'Full name is required';
          if (!bookingData?.guestInfo?.email?.trim()) errors.guestEmail = 'Email address is required';
          else if (!/\S+@\S+\.\S+/?.test(bookingData?.guestInfo?.email))
            errors.guestEmail = 'Please enter a valid email address';
          // Validate sign-up password if opted in
          if (guestSignUpOptIn) {
            if (!guestSignUpPassword || guestSignUpPassword?.length < 6) {
              setGuestSignUpError('Password must be at least 6 characters');
              errors.guestSignUp = 'Password must be at least 6 characters';
            } else if (guestSignUpPassword !== guestSignUpConfirmPassword) {
              setGuestSignUpError('Passwords do not match');
              errors.guestSignUp = 'Passwords do not match';
            }
          }
        }
        break;
      case 4:
        if (!bookingData?.paymentDetails?.method && paymentMethodsAvailable)
          errors.payment = 'Please select a payment method';
        break;
      default:
        break;
    }
    return errors;
  };

  // Determine if current booking has enough data to save as favorite
  const canSaveAsFavorite = isAuthenticated && bookingData?.route?.from && bookingData?.route?.to;

  // Ref to trigger field-level validation inside PassengerDetails
  const passengerDetailsRef = useRef(null);

  const handleNextStep = () => {
    // For step 3 (authenticated), trigger field-level validation inside PassengerDetails first
    if (currentStep === 3 && isAuthenticated && passengerDetailsRef?.current) {
      const isValid = passengerDetailsRef?.current?.validateForm();
      if (!isValid) return;
    }

    const errors = validateCurrentStep();
    if (Object.keys(errors)?.length > 0) {
      setStepValidationErrors(errors);
      return;
    }
    setStepValidationErrors({});
    if (currentStep < steps?.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePreviousStep = () => {
    setStepValidationErrors({});
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const sendBookingConfirmationEmail = async (booking, bookingData, isGuest = false) => {
    try {
      const customerEmail = isGuest
        ? (bookingData?.guestInfo?.email)
        : (bookingData?.passengerDetails?.primaryPassenger?.email || booking?.primary_passenger_email);

      if (!customerEmail) return;

      const customerName = isGuest
        ? (bookingData?.guestInfo?.name)
        : (bookingData?.passengerDetails?.primaryPassenger?.firstName
            ? `${bookingData?.passengerDetails?.primaryPassenger?.firstName} ${bookingData?.passengerDetails?.primaryPassenger?.lastName || ''}`?.trim()
            : 'Valued Customer');

      const pickupDate = bookingData?.dateTime?.date || booking?.pickup_date || '';
      const pickupTime = bookingData?.dateTime?.time || booking?.pickup_time || '';

      const emailData = {
        type: isGuest ? 'guest_booking_confirmation' : 'customer_confirmation',
        customer_email: customerEmail,
        to_email: customerEmail,
        booking_data: {
          booking_id: booking?.id || 'N/A',
          customer_name: customerName,
          guest_name: isGuest ? customerName : undefined,
          pickup_location: bookingData?.route?.from || booking?.pickup_location || 'N/A',
          dropoff_location: bookingData?.route?.to || booking?.dropoff_location || 'N/A',
          vehicle_name: bookingData?.vehicle?.name || booking?.vehicle_name || 'N/A',
          vehicle_type: bookingData?.vehicle?.type || 'N/A',
          passenger_count: bookingData?.passengerCount || 1,
          pickup_date: pickupDate,
          pickup_time: pickupTime,
          return_date: bookingData?.dateTime?.returnDate || null,
          return_time: bookingData?.dateTime?.returnTime || null,
          total_cost: booking?.totalCost || booking?.total_cost || bookingData?.vehicle?.price || 'N/A',
          special_requirements: bookingData?.passengerDetails?.notes || null,
          payment_method: bookingData?.paymentDetails?.method || 'pay_on_pickup',
        }
      };

      // For guests, invoke without auth header (no session); for authenticated users, include token
      const { data: { session } } = await supabase?.auth?.getSession();
      const accessToken = session?.access_token;

      const invokeOptions = accessToken
        ? { body: { ...emailData, resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '' }, headers: { Authorization: `Bearer ${accessToken}` } }
        : { body: { ...emailData, resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '' } };

      const { error: fnError } = await supabase?.functions?.invoke('send-booking-confirmation', invokeOptions);

      if (fnError) {
        console.warn('Booking confirmation email edge function error:', fnError?.message);
      } else {
        console.log('✅ Booking confirmation email sent to:', customerEmail);
      }
    } catch (err) {
      console.warn('Booking confirmation email failed (non-blocking):', err);
    }
  };

  const sendGuestWelcomeEmail = async (guestEmail, guestName) => {
    try {
      if (!guestEmail) return;
      await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          type: 'welcome_email',
          to_email: guestEmail,
          resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '',
          booking_data: {
            guest_name: guestName || 'Valued Customer',
            customer_name: guestName || 'Valued Customer'
          }
        }
      });
      console.log('✅ Welcome email sent to:', guestEmail);
    } catch (err) {
      console.warn('Welcome email failed (non-blocking):', err);
    }
  };

  const handleConfirmBooking = async () => {
    // For step 3 (authenticated), trigger field-level validation inside PassengerDetails first
    if (isAuthenticated && passengerDetailsRef?.current) {
      const isValid = passengerDetailsRef?.current?.validateForm();
      if (!isValid) return;
    }

    const errors = validateCurrentStep();
    if (Object.keys(errors)?.length > 0) {
      setStepValidationErrors(errors);
      return;
    }

    setIsSubmitting(true);
    setBookingError(null);

    try {
      // Calculate pricing using pricingService so total_cost is excess-adjusted
      const tripHours = getTripHours(
        bookingData?.dateTime?.date && bookingData?.dateTime?.time
          ? `${bookingData?.dateTime?.date}T${bookingData?.dateTime?.time}`
          : null,
        bookingData?.dateTime?.returnDate && bookingData?.dateTime?.returnTime
          ? `${bookingData?.dateTime?.returnDate}T${bookingData?.dateTime?.returnTime}`
          : null
      );
      const pricingResult = await calculateBookingPriceWithGlobalRate(
        bookingData?.vehicle,
        tripHours,
        applicableRateSheet
      );
      const computedTotalCost = pricingResult?.total || bookingData?.vehicle?.price || bookingData?.vehicle?.dailyRate || 0;

      let booking;
      let isGuestBooking = false;

      if (isAuthenticated) {
        booking = await bookingService?.createBooking({
          ...bookingData,
          totalCost: computedTotalCost,
          vehicle: { ...bookingData?.vehicle, price: computedTotalCost }
        });
      } else {
        if (!bookingData?.guestInfo?.email || !bookingData?.guestInfo?.name) {
          throw new Error('Guest name and email are required to complete your booking.');
        }

        const guestBookingPayload = {
          route: {
            from: bookingData?.route?.from,
            to: bookingData?.route?.to
          },
          dateTime: {
            date: bookingData?.dateTime?.date,
            time: bookingData?.dateTime?.time,
            returnDate: bookingData?.dateTime?.returnDate || null,
            returnTime: bookingData?.dateTime?.returnTime || null
          },
          passengerCount: bookingData?.passengerCount || 1,
          vehicle: {
            id: bookingData?.vehicle?.id,
            name: bookingData?.vehicle?.name,
            type: bookingData?.vehicle?.type,
            price: computedTotalCost
          },
          guestDetails: {
            fullName: bookingData?.guestInfo?.name,
            email: bookingData?.guestInfo?.email,
            phone: bookingData?.guestInfo?.phone || null,
            specialRequirements: bookingData?.passengerDetails?.notes || null
          },
          payment: {
            method: bookingData?.paymentDetails?.method || 'pay_on_pickup'
          }
        };

        booking = await guestBookingService?.createGuestBooking(guestBookingPayload);
        isGuestBooking = true;
      }

      // Show success animation before confirming
      setShowSuccessAnimation(true);
      await new Promise(resolve => setTimeout(resolve, 1800));
      setShowSuccessAnimation(false);

      setConfirmedBooking(booking);
      setIsBookingConfirmed(true);

      // Send booking confirmation email to passenger (non-blocking)
      sendBookingConfirmationEmail(booking, bookingData, isGuestBooking);

      // Send booking confirmation email for corporate users
      if (isAuthenticated && user?.email) {
        const userProf = user || {};
        const isCorporate = userProf?.role === 'corporate_manager' || userProf?.company_id;
        if (isCorporate) {
          const bookingForEmail = {
            id: booking?.id,
            bookingCode: booking?.bookingCode || booking?.booking_code,
            pickupLocation: bookingData?.route?.from || bookingData?.pickupLocation,
            dropoffLocation: bookingData?.route?.to || bookingData?.dropoffLocation,
            pickupDate: bookingData?.dateTime?.date
              ? `${bookingData?.dateTime?.date}T${bookingData?.dateTime?.time || '09:00'}`
              : booking?.pickupDate,
            vehicleName: bookingData?.vehicle?.name,
            passengerCount: bookingData?.passengerCount || 1,
            totalCost: booking?.totalCost || booking?.total_cost,
            notes: bookingData?.notes
          };
          corporateEmailService?.sendBookingConfirmation({
            booking: bookingForEmail,
            recipientEmail: user?.email,
            recipientName: userProf?.full_name || userProf?.fullName || '',
            companyName: userProf?.company_name || userProf?.companyName || ''
          })?.catch(err => console.warn('Booking confirmation email failed:', err));
        }
      }

      // Navigate to the dedicated booking confirmed page
      navigate('/booking-confirmed', {
        state: {
          bookingData,
          confirmedBooking: booking,
          guestSignUpSuccess: false
        }
      });

    } catch (error) {
      console.error('Booking creation failed:', error);
      // Sanitize raw database / RLS errors into user-friendly messages
      const rawMsg = error?.message || '';
      let friendlyMsg = 'Something went wrong while creating your booking. Please try again.';
      if (rawMsg?.toLowerCase()?.includes('rls') || rawMsg?.toLowerCase()?.includes('policy') || rawMsg?.toLowerCase()?.includes('permission')) {
        friendlyMsg = 'You don\'t have permission to complete this booking. Please sign in and try again, or contact support.';
      } else if (rawMsg?.toLowerCase()?.includes('not-null') || rawMsg?.toLowerCase()?.includes('null value') || rawMsg?.toLowerCase()?.includes('violates not-null')) {
        friendlyMsg = 'Some required booking information is missing. Please review your details and try again.';
      } else if (rawMsg?.toLowerCase()?.includes('duplicate') || rawMsg?.toLowerCase()?.includes('unique')) {
        friendlyMsg = 'A booking with these details already exists. Please check your existing bookings.';
      } else if (rawMsg?.toLowerCase()?.includes('network') || rawMsg?.toLowerCase()?.includes('fetch')) {
        friendlyMsg = 'A network error occurred. Please check your connection and try again.';
      } else if (rawMsg && !rawMsg?.toLowerCase()?.includes('supabase') && !rawMsg?.toLowerCase()?.includes('postgres') && rawMsg?.length < 200) {
        // Use the original message only if it's short and doesn't expose internals
        friendlyMsg = rawMsg;
      }
      setBookingError(friendlyMsg);
    } finally {
      setIsSubmitting(false);
      setShowSuccessAnimation(false);
    }
  };

  const handleNewBooking = () => {
    localStorage.removeItem('bookingCurrentStep');
    localStorage.removeItem('bookingData');
    localStorage.removeItem('bookingConfirmed');
    sessionStorage.removeItem('quickBookingData');
    
    setIsBookingConfirmed(false);
    setCurrentStep(0);
    setConfirmedBooking(null);
    setBookingError(null);
    setBookingData(getDefaultBookingData());
  };

  const handleViewBooking = () => {
    if (isAuthenticated) {
      window.location.href = '/customer-account';
    } else {
      window.location.href = '/booking-lookup-portal';
    }
  };

  const isStepComplete = (stepIndex) => {
    switch (stepIndex) {
      case 0:
        return !!bookingData?.route?.from && !!bookingData?.route?.to;
      case 1: {
        const hasValidDate = !!(bookingData?.dateTime?.date && 
                              typeof bookingData?.dateTime?.date === 'string' &&
                              bookingData?.dateTime?.date?.length > 0);
        const hasValidTime = !!(bookingData?.dateTime?.time && 
                              typeof bookingData?.dateTime?.time === 'string' &&
                              bookingData?.dateTime?.time?.length > 0);
        const hasPassengerCount = !!(bookingData?.passengerCount && bookingData?.passengerCount >= 1);
        return hasValidDate && hasValidTime && hasPassengerCount;
      }
      case 2:
        return !!bookingData?.vehicle?.id;
      case 3: {
        if (isAuthenticated) {
          return !!(bookingData?.passengerDetails?.primaryPassenger?.firstName &&
                    bookingData?.passengerDetails?.primaryPassenger?.email);
        }
        return !!(bookingData?.guestInfo?.email && bookingData?.guestInfo?.name);
      }
      case 4:
        return !!(bookingData?.paymentDetails?.method) || (!paymentMethodsAvailable && paymentMethodsLoaded);
      default:
        return false;
    }
  };

  const canProceedToNext = () => {
    return isStepComplete(currentStep);
  };

  useEffect(() => {
    return () => {
      if (isBookingConfirmed) {
        localStorage.removeItem('bookingCurrentStep');
        localStorage.removeItem('bookingData');
        localStorage.removeItem('bookingConfirmed');
      }
    };
  }, [isBookingConfirmed]);

  return (
    <>
      <Helmet>
        <title>Smart Booking Portal - GoShuttle Pro</title>
        <meta name="description" content="Book your shuttle with our intelligent booking system. Real-time availability, smart suggestions, and seamless payment processing." />
        <meta name="keywords" content="shuttle booking, transportation, Philippines, smart booking, real-time availability" />
      </Helmet>
      <div className="min-h-screen bg-background">
        <Header />

        {/* ── Spinner / Success Overlay ── */}
        {(isSubmitting || showSuccessAnimation) && (
          <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm">
            {showSuccessAnimation ? (
              <div className="flex flex-col items-center">
                <div className="w-20 h-20 rounded-full bg-green-500 flex items-center justify-center animate-bounce shadow-2xl">
                  <Icon name="CheckCircle" size={44} className="text-white" />
                </div>
                <p className="mt-5 text-white text-xl font-semibold">Booking Confirmed!</p>
                <p className="mt-1 text-green-200 text-sm">Processing your payment…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-full border-4 border-white/30 border-t-white animate-spin" />
                <p className="mt-5 text-white text-lg font-medium">Creating your booking…</p>
                <p className="mt-1 text-white/70 text-sm">Please don't close this page</p>
              </div>
            )}
          </div>
        )}

        {/* ── Save Favorite Modal ── */}
        {showSaveFavoriteModal && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/50">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-sm mx-4">
              <div className="flex items-center mb-4">
                <Icon name="Heart" size={20} className="text-red-500 mr-2" />
                <h3 className="text-lg font-semibold text-gray-900">Save as Favorite</h3>
              </div>
              <p className="text-sm text-gray-600 mb-4">
                Give this route/vehicle/payment combination a name for quick one-click repeat bookings.
              </p>
              <input
                type="text"
                value={favoriteName}
                onChange={e => { setFavoriteName(e?.target?.value); setSaveFavoriteError(''); }}
                placeholder="e.g. Home to Office"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-sm mb-4"
                onKeyDown={e => e?.key === 'Enter' && handleSaveFavorite()}
                autoFocus
              />
              {saveFavoriteError && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4">
                  <Icon name="AlertCircle" size={15} className="text-red-500 flex-shrink-0" />
                  <p className="text-xs text-red-600">{saveFavoriteError}</p>
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1" onClick={() => { setShowSaveFavoriteModal(false); setFavoriteName(''); setSaveFavoriteError(''); }}>
                  Cancel
                </Button>
                <Button className="flex-1" onClick={handleSaveFavorite} disabled={!favoriteName?.trim() || savingFavorite}>
                  {savingFavorite ? <Icon name="Loader" size={16} className="animate-spin mr-1" /> : <Icon name="Heart" size={16} className="mr-1" />}
                  Save
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── Favorites Panel ── */}
        {showFavoritesPanel && (
          <div className="fixed inset-0 z-40 flex items-start justify-end bg-black/40" onClick={() => setShowFavoritesPanel(false)}>
            <div className="bg-white h-full w-full max-w-sm shadow-2xl overflow-y-auto" onClick={e => e?.stopPropagation()}>
              <div className="p-5 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center">
                  <Icon name="Heart" size={20} className="text-red-500 mr-2" />
                  <h3 className="text-lg font-semibold text-gray-900">Favorite Routes</h3>
                </div>
                <button onClick={() => setShowFavoritesPanel(false)} className="p-1 hover:bg-gray-100 rounded-full">
                  <Icon name="X" size={20} className="text-gray-500" />
                </button>
              </div>
              <div className="p-4">
                {favoritesLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Icon name="Loader" size={20} className="animate-spin text-primary mr-2" />
                    <span className="text-sm text-gray-600">Loading favorites…</span>
                  </div>
                ) : favorites?.length === 0 ? (
                  <div className="text-center py-10">
                    <Icon name="Heart" size={40} className="text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">No saved favorites yet.</p>
                    <p className="text-gray-400 text-xs mt-1">Complete a route selection and save it for quick repeat bookings.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {favorites?.map(fav => (
                      <div key={fav?.id} className="border border-gray-200 rounded-lg p-4 hover:border-primary transition-colors">
                        <div className="flex items-start justify-between mb-2">
                          <span className="font-medium text-gray-900 text-sm">{fav?.name}</span>
                          <button onClick={() => handleDeleteFavorite(fav?.id)} className="p-1 hover:bg-red-50 rounded text-gray-400 hover:text-red-500">
                            <Icon name="Trash2" size={14} />
                          </button>
                        </div>
                        <div className="text-xs text-gray-600 space-y-1 mb-3">
                          <div className="flex items-center gap-1">
                            <Icon name="MapPin" size={12} className="text-primary flex-shrink-0" />
                            <span className="truncate">{fav?.route?.from}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Icon name="Navigation" size={12} className="text-secondary flex-shrink-0" />
                            <span className="truncate">{fav?.route?.to}</span>
                          </div>
                          {fav?.vehicleName && (
                            <div className="flex items-center gap-1">
                              <Icon name="Car" size={12} className="text-gray-400 flex-shrink-0" />
                              <span>{fav?.vehicleName}</span>
                            </div>
                          )}
                          {fav?.paymentMethod && (
                            <div className="flex items-center gap-1">
                              <Icon name="CreditCard" size={12} className="text-gray-400 flex-shrink-0" />
                              <span className="capitalize">{fav?.paymentMethod?.replace(/_/g, ' ')}</span>
                            </div>
                          )}
                        </div>
                        <Button size="sm" className="w-full" onClick={() => handleApplyFavorite(fav)}>
                          <Icon name="Zap" size={14} className="mr-1" />
                          Book Again
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        <main className="pt-20 pb-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* Page Header */}
            <div className="text-center mb-8">
              <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
                Smart Booking Portal
              </h1>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Book your shuttle in just a few steps with our intelligent booking system. 
                Real-time availability and smart suggestions for the perfect journey.
              </p>
            </div>

            {/* Authentication Status Banner */}
            {!isAuthenticated && (
              <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Icon name="Info" size={16} className="text-blue-600 mr-2" />
                    <div>
                      <p className="text-sm text-blue-800">
                        <strong>Guest Booking:</strong> You're booking as a guest. An email will be required for booking confirmation.
                      </p>
                      <p className="text-xs text-blue-700 mt-1">
                        Want to track your bookings and earn loyalty points?{' '}
                        <button 
                          onClick={() => window.location.href = '/auth/login'} 
                          className="underline hover:no-underline font-medium"
                        >
                          Sign in
                        </button>{' '}or{' '}
                        <button 
                          onClick={() => window.location.href = '/auth/signup'} 
                          className="underline hover:no-underline font-medium"
                        >
                          create an account
                        </button>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Favorites toolbar for authenticated users */}
            {isAuthenticated && (
              <div className="mb-4 flex items-center gap-3 flex-wrap">
                <button
                  onClick={() => setShowFavoritesPanel(true)}
                  className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-primary hover:text-primary transition-colors shadow-sm"
                >
                  <Icon name="Heart" size={16} className="text-red-400" />
                  My Favorites
                  {favorites?.length > 0 && (
                    <span className="bg-primary text-white text-xs rounded-full px-1.5 py-0.5 leading-none">{favorites?.length}</span>
                  )}
                </button>
                {canSaveAsFavorite && (
                  <button
                    onClick={() => setShowSaveFavoriteModal(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:border-red-400 hover:text-red-500 transition-colors shadow-sm"
                  >
                    <Icon name="HeartPlus" size={16} />
                    Save as Favorite
                  </button>
                )}
                {favoritesSaved && (
                  <span className="flex items-center gap-1 text-sm text-green-600 font-medium">
                    <Icon name="CheckCircle" size={16} />
                    Saved to favorites!
                  </span>
                )}
              </div>
            )}

            {/* Fresh Search Notice */}
            {bookingData?.hasQuickBookingData && (
              <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
                <div className="flex items-center">
                  <Icon name="Search" size={16} className="text-green-600 mr-2" />
                  <p className="text-sm text-green-800">
                    <strong>Search Results:</strong> We've pre-filled your search criteria. Review and continue with your booking.
                  </p>
                </div>
              </div>
            )}

            {/* Booking Progress */}
            <BookingProgress currentStep={currentStep} steps={steps} />

            {/* Booking Error Alert */}
            {bookingError && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                <div className="flex items-center">
                  <Icon name="AlertCircle" size={16} className="text-red-600 mr-2" />
                  <p className="text-sm text-red-800">
                    <strong>Booking Error:</strong> {bookingError}
                  </p>
                </div>
              </div>
            )}

            {/* Main Booking Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Booking Steps */}
              <div className="lg:col-span-2 space-y-6">
                {/* Route Selection */}
                {currentStep === 0 && (
                  <div>
                    <RouteSelector
                      onRouteSelect={handleRouteSelect}
                      onSearchComplete={handleSearchRouteComplete}
                      selectedRoute={bookingData?.route}
                    />
                    {/* Inline validation errors for step 0 */}
                    {(stepValidationErrors?.routeFrom || stepValidationErrors?.routeTo) && (
                      <div className="mt-3 space-y-1">
                        {stepValidationErrors?.routeFrom && (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <Icon name="AlertCircle" size={14} />
                            <span>{stepValidationErrors?.routeFrom}</span>
                          </div>
                        )}
                        {stepValidationErrors?.routeTo && (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <Icon name="AlertCircle" size={14} />
                            <span>{stepValidationErrors?.routeTo}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Date & Time Selection with Passenger Count */}
                {currentStep === 1 && (
                  <div>
                    <DateTimeSelector
                      onDateTimeSelect={handleDateTimeSelect}
                      selectedDateTime={bookingData?.dateTime}
                      onPassengerCountUpdate={handlePassengerCountUpdate}
                      passengerCount={bookingData?.passengerCount}
                      onComplete={handleDateTimeComplete}
                    />
                    {/* Inline validation errors for step 1 */}
                    {(stepValidationErrors?.date || stepValidationErrors?.time) && (
                      <div className="mt-3 space-y-1">
                        {stepValidationErrors?.date && (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <Icon name="AlertCircle" size={14} />
                            <span>{stepValidationErrors?.date}</span>
                          </div>
                        )}
                        {stepValidationErrors?.time && (
                          <div className="flex items-center gap-2 text-sm text-red-600">
                            <Icon name="AlertCircle" size={14} />
                            <span>{stepValidationErrors?.time}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Vehicle Selection */}
                {currentStep === 2 && (
                  <div>
                    <VehicleSelector
                      onVehicleSelect={handleVehicleSelect}
                      selectedVehicle={bookingData?.vehicle}
                      passengerCount={bookingData?.passengerCount}
                    />
                    {stepValidationErrors?.vehicle && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                        <Icon name="AlertCircle" size={14} />
                        <span>{stepValidationErrors?.vehicle}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Passenger Details or Guest Information */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    {/* Guest Information Form (for non-authenticated users) */}
                    {!isAuthenticated && (
                      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                        <div className="flex items-center mb-4">
                          <Icon name="User" size={20} className="text-primary mr-2" />
                          <h3 className="text-lg font-semibold text-gray-900">Guest Information</h3>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="guest-name" className="block text-sm font-medium text-gray-700 mb-1">
                              Full Name *
                            </label>
                            <input
                              type="text"
                              id="guest-name"
                              value={bookingData?.guestInfo?.name || ''}
                              onChange={(e) => handleGuestInfoUpdate({ 
                                ...bookingData?.guestInfo, 
                                name: e?.target?.value 
                              })}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent ${stepValidationErrors?.guestName ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                              placeholder="Enter your full name"
                              required
                            />
                            {stepValidationErrors?.guestName && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                                <Icon name="AlertCircle" size={12} />
                                {stepValidationErrors?.guestName}
                              </p>
                            )}
                          </div>
                          <div>
                            <label htmlFor="guest-email" className="block text-sm font-medium text-gray-700 mb-1">
                              Email Address *
                            </label>
                            <input
                              type="email"
                              id="guest-email"
                              value={bookingData?.guestInfo?.email || ''}
                              onChange={(e) => handleGuestInfoUpdate({ 
                                ...bookingData?.guestInfo, 
                                email: e?.target?.value 
                              })}
                              className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm ${stepValidationErrors?.guestEmail ? 'border-red-400 bg-red-50' : 'border-gray-300'}`}
                              placeholder="Enter your email address"
                              required
                            />
                            {stepValidationErrors?.guestEmail && (
                              <p className="mt-1 flex items-center gap-1 text-xs text-red-600">
                                <Icon name="AlertCircle" size={12} />
                                {stepValidationErrors?.guestEmail}
                              </p>
                            )}
                          </div>
                          <div className="md:col-span-2">
                            <label htmlFor="guest-phone" className="block text-sm font-medium text-gray-700 mb-1">
                              Phone Number (Optional)
                            </label>
                            <input
                              type="tel"
                              id="guest-phone"
                              value={bookingData?.guestInfo?.phone || ''}
                              onChange={(e) => handleGuestInfoUpdate({ 
                                ...bookingData?.guestInfo, 
                                phone: e?.target?.value 
                              })}
                              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                              placeholder="Enter your phone number"
                            />
                          </div>
                        </div>
                        <div className="mt-4 p-3 bg-yellow-50 rounded-md">
                          <div className="flex items-start">
                            <Icon name="AlertTriangle" size={16} className="text-yellow-600 mr-2 mt-0.5" />
                            <div>
                              <p className="text-sm text-yellow-800">
                                <strong>Important:</strong> Your booking confirmation and lookup code will be sent to this email address.
                              </p>
                              <p className="text-xs text-yellow-700 mt-1">
                                Make sure to check your email after booking completion.
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Sign-up opt-in */}
                        <div className="mt-5 pt-5 border-t border-gray-100">
                          <label className="flex items-start gap-3 cursor-pointer group">
                            <input
                              type="checkbox"
                              checked={guestSignUpOptIn}
                              onChange={(e) => {
                                setGuestSignUpOptIn(e?.target?.checked);
                                if (!e?.target?.checked) {
                                  setGuestSignUpPassword('');
                                  setGuestSignUpConfirmPassword('');
                                  setGuestSignUpError('');
                                }
                              }}
                              className="mt-0.5 h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                            />
                            <div>
                              <span className="text-sm font-medium text-gray-900 group-hover:text-primary transition-colors">
                                Create a free account to track your booking
                              </span>
                              <p className="text-xs text-gray-500 mt-0.5">
                                Save your trip history, manage bookings, and enjoy faster checkout next time.
                              </p>
                            </div>
                          </label>

                          {guestSignUpOptIn && (
                            <div className="mt-4 space-y-3 pl-7">
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Password *
                                </label>
                                <div className="relative">
                                  <input
                                    type={showGuestPassword ? 'text' : 'password'}
                                    value={guestSignUpPassword}
                                    onChange={(e) => {
                                      setGuestSignUpPassword(e?.target?.value);
                                      setGuestSignUpError('');
                                    }}
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                    placeholder="Create a password (min. 6 characters)"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowGuestPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                  >
                                    <Icon name={showGuestPassword ? 'EyeOff' : 'Eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                  Confirm Password *
                                </label>
                                <div className="relative">
                                  <input
                                    type={showGuestConfirmPassword ? 'text' : 'password'}
                                    value={guestSignUpConfirmPassword}
                                    onChange={(e) => {
                                      setGuestSignUpConfirmPassword(e?.target?.value);
                                      setGuestSignUpError('');
                                    }}
                                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm"
                                    placeholder="Re-enter your password"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => setShowGuestConfirmPassword(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                  >
                                    <Icon name={showGuestConfirmPassword ? 'EyeOff' : 'Eye'} size={16} />
                                  </button>
                                </div>
                              </div>
                              {guestSignUpError && (
                                <p className="flex items-center gap-1 text-xs text-red-600">
                                  <Icon name="AlertCircle" size={12} />
                                  {guestSignUpError}
                                </p>
                              )}
                              <p className="text-xs text-gray-500">
                                Your account will be created using <strong>{bookingData?.guestInfo?.email || 'your email'}</strong> after booking is confirmed.
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Regular Passenger Details (for authenticated users) */}
                    {isAuthenticated && (
                      <div>
                        <PassengerDetails
                          ref={passengerDetailsRef}
                          onDetailsUpdate={handlePassengerDetailsUpdate}
                          passengerDetails={bookingData?.passengerDetails}
                          validationErrors={stepValidationErrors}
                        />
                        {/* Inline errors summary for authenticated passengers */}
                        {(stepValidationErrors?.firstName || stepValidationErrors?.email || stepValidationErrors?.phone) && (
                          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg space-y-1">
                            {stepValidationErrors?.firstName && (
                              <div className="flex items-center gap-2 text-sm text-red-600">
                                <Icon name="AlertCircle" size={14} />
                                <span>{stepValidationErrors?.firstName}</span>
                              </div>
                            )}
                            {stepValidationErrors?.email && (
                              <div className="flex items-center gap-2 text-sm text-red-600">
                                <Icon name="AlertCircle" size={14} />
                                <span>{stepValidationErrors?.email}</span>
                              </div>
                            )}
                            {stepValidationErrors?.phone && (
                              <div className="flex items-center gap-2 text-sm text-red-600">
                                <Icon name="AlertCircle" size={14} />
                                <span>{stepValidationErrors?.phone}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* Payment Section */}
                {currentStep === 4 && (
                  <div>
                    <PaymentSection
                      onPaymentUpdate={handlePaymentUpdate}
                      onPaymentMethodsLoaded={(hasAvailable) => {
                        setPaymentMethodsAvailable(hasAvailable);
                        setPaymentMethodsLoaded(true);
                      }}
                      bookingSummary={{
                        totalPrice: bookingData?.vehicle?.price || bookingData?.vehicle?.dailyRate || 0,
                        vehicle: bookingData?.vehicle,
                        hours: getTripHours(
                          bookingData?.dateTime?.date && bookingData?.dateTime?.time
                            ? `${bookingData?.dateTime?.date}T${bookingData?.dateTime?.time}`
                            : null,
                          bookingData?.dateTime?.returnDate && bookingData?.dateTime?.returnTime
                            ? `${bookingData?.dateTime?.returnDate}T${bookingData?.dateTime?.returnTime}`
                            : null
                        ),
                        rateSheet: applicableRateSheet,
                        route: bookingData?.route,
                        pickupLocation: bookingData?.route?.from,
                        dropoffLocation: bookingData?.route?.to,
                        bookingCode: null
                      }}
                      paymentDetails={bookingData?.paymentDetails}
                    />
                    {stepValidationErrors?.payment && (
                      <div className="mt-3 flex items-center gap-2 text-sm text-red-600">
                        <Icon name="AlertCircle" size={14} />
                        <span>{stepValidationErrors?.payment}</span>
                      </div>
                    )}
                  </div>
                )}

                {/* Navigation Buttons */}
                <div className="flex justify-between pt-6">
                  <Button
                    variant="outline"
                    onClick={handlePreviousStep}
                    disabled={currentStep === 0 || isSubmitting}
                  >
                    <Icon name="ChevronLeft" size={18} className="mr-2" />
                    Previous
                  </Button>
                  
                  {currentStep < steps?.length - 1 ? (
                    <Button
                      onClick={handleNextStep}
                      disabled={isSubmitting}
                    >
                      Next
                      <Icon name="ChevronRight" size={18} className="ml-2" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleConfirmBooking}
                      disabled={isSubmitting}
                      className="bg-conversion-accent hover:bg-conversion-accent/90"
                    >
                      {isSubmitting ? (
                        <>
                          <Icon name="Loader" size={18} className="mr-2 animate-spin" />
                          Creating Booking...
                        </>
                      ) : (
                        <>
                          <Icon name="CheckCircle" size={18} className="mr-2" />
                          Confirm Booking
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Booking Summary Sidebar */}
              <div className="lg:col-span-1">
                <BookingSummary
                  route={bookingData?.route}
                  dateTime={bookingData?.dateTime}
                  vehicle={bookingData?.vehicle}
                  passengerDetails={isAuthenticated ? bookingData?.passengerDetails : bookingData?.guestInfo}
                  paymentDetails={bookingData?.paymentDetails}
                  isGuestBooking={!isAuthenticated}
                  onEdit={handleStepEdit}
                  onConfirm={handleConfirmBooking}
                />
              </div>
            </div>

            {/* Guest Account Creation CTA */}
            {!isAuthenticated && currentStep >= 2 && (
              <div className="mt-8 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                <div className="text-center">
                  <Icon name="UserPlus" size={24} className="text-primary mx-auto mb-3" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Create an Account for Better Experience</h3>
                  <p className="text-gray-600 mb-4">
                    Sign up to track your bookings, earn loyalty points, and get faster checkouts for future trips.
                  </p>
                  <div className="flex flex-col sm:flex-row justify-center gap-3">
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = '/auth/signup'}
                    >
                      <Icon name="UserPlus" size={18} className="mr-2" />
                      Create Account
                    </Button>
                    <Button 
                      variant="outline"
                      onClick={() => window.location.href = '/auth/login'}
                    >
                      <Icon name="LogIn" size={18} className="mr-2" />
                      Sign In
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Help Section */}
            <div className="mt-12 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="text-center">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Need Help?</h3>
                <p className="text-gray-600 mb-4">
                  Our booking specialists are available 24/7 to assist you
                </p>
                <div className="flex flex-col sm:flex-row justify-center gap-4">
                  <Button variant="outline" onClick={() => window.open('tel:+6328123456')}>
                    <Icon name="Phone" size={18} className="mr-2" />
                    Call +63 2 8123 4567
                  </Button>
                  <Button variant="outline" onClick={() => window.open('/support-center', '_self')}>
                    <Icon name="MessageCircle" size={18} className="mr-2" />
                    Live Chat Support
                  </Button>
                  <Button variant="outline" onClick={() => window.open('mailto:support@goshuttle.com')}>
                    <Icon name="Mail" size={18} className="mr-2" />
                    Email Support
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default SmartBookingPortal;