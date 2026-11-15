import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import Input from '../../../components/ui/Input';
import { Checkbox } from '../../../components/ui/Checkbox';
import { supabase } from '../../../lib/supabase';
import { QRCodeSVG } from 'qrcode.react';
import { calculateBookingPrice } from '../../../utils/pricingService';
import paymongoService from '../../../services/paymongoService';

const PAYMENT_STORAGE_KEY = 'sbp_payment_draft';

// Sub-steps within the payment step
const PAYMENT_SUB_STEPS = [
  { id: 'method', label: 'Choose Method', icon: 'CreditCard' },
  { id: 'details', label: 'Enter Details', icon: 'FileText' },
  { id: 'review', label: 'Review & Pay', icon: 'CheckCircle' },
];

const PaymentSection = ({ onPaymentUpdate, onPaymentMethodsLoaded, bookingSummary, paymentDetails }) => {
  // Restore draft from localStorage if available
  const getDraft = () => {
    try {
      const raw = localStorage.getItem(PAYMENT_STORAGE_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch { return null; }
  };
  const draft = getDraft();

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    paymentDetails?.method || draft?.method || ''
  );
  const [cardDetails, setCardDetails] = useState({
    cardNumber: paymentDetails?.cardDetails?.cardNumber || draft?.cardDetails?.cardNumber || '',
    expiryDate: paymentDetails?.cardDetails?.expiryDate || draft?.cardDetails?.expiryDate || '',
    cvv: paymentDetails?.cardDetails?.cvv || draft?.cardDetails?.cvv || '',
    cardholderName: paymentDetails?.cardDetails?.cardholderName || draft?.cardDetails?.cardholderName || ''
  });
  const [eWalletDetails, setEWalletDetails] = useState({
    phoneNumber: paymentDetails?.eWalletDetails?.phoneNumber || draft?.eWalletDetails?.phoneNumber || ''
  });
  const [savePaymentMethod, setSavePaymentMethod] = useState(false);
  const [errors, setErrors] = useState({});
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [paymongoEnabled, setPaymongoEnabled] = useState(false);
  const [paymongoMode, setPaymongoMode] = useState('test');
  const [paymongoInitiating, setPaymongoInitiating] = useState(false);
  const [paymongoError, setPaymongoError] = useState('');
  const [loadError, setLoadError] = useState('');
  const [retryCount, setRetryCount] = useState(0);
  const [autoSaveIndicator, setAutoSaveIndicator] = useState(false);

  // Determine current sub-step
  const getSubStep = () => {
    if (!selectedPaymentMethod) return 0;
    const needsDetails = selectedPaymentMethod === 'credit_card' ||
      (['gcash', 'paymaya']?.includes(selectedPaymentMethod) && !paymongoEnabled);
    if (needsDetails) {
      const hasDetails = selectedPaymentMethod === 'credit_card'
        ? cardDetails?.cardNumber && cardDetails?.cardholderName
        : eWalletDetails?.phoneNumber;
      return hasDetails ? 2 : 1;
    }
    return 2;
  };
  const currentSubStep = getSubStep();

  // Auto-save form state to localStorage
  const persistDraft = useCallback((method, card, ewallet) => {
    try {
      const draft = { method, cardDetails: card, eWalletDetails: ewallet, savedAt: Date.now() };
      localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(draft));
      setAutoSaveIndicator(true);
      setTimeout(() => setAutoSaveIndicator(false), 1500);
    } catch {}
  }, []);

  // Clear draft on successful booking (call from parent or on unmount if confirmed)
  useEffect(() => {
    return () => {
      // Keep draft on unmount so user can recover; cleared externally on confirm
    };
  }, []);

  // Pricing breakdown using 10-hour base + excess charges
  const getPricingBreakdown = () => {
    const vehicle = bookingSummary?.vehicle || bookingSummary?.selectedVehicle;
    const hours = bookingSummary?.hours || bookingSummary?.totalHours || 10;
    const rateSheet = bookingSummary?.rateSheet || null;
    return calculateBookingPrice(vehicle, hours, rateSheet);
  };

  const pricingBreakdown = getPricingBreakdown();

  // Generate QR code payload for QR payment
  const generateQRPayload = () => {
    const total = pricingBreakdown?.total || bookingSummary?.totalPrice || 0;
    const bookingCode = bookingSummary?.bookingCode || `GS-${Date.now()}`;
    const payload = {
      merchant: 'GoShuttle',
      amount: total,
      currency: 'PHP',
      pickup: bookingSummary?.pickupLocation || bookingSummary?.route?.from || '',
      dropoff: bookingSummary?.dropoffLocation || bookingSummary?.route?.to || '',
      ref: bookingCode,
      bookingCode
    };
    return JSON.stringify(payload);
  };

  useEffect(() => {
    loadPaymentSettings();
  }, [retryCount]);

  // Auto-select pay on pickup when no payment methods are configured
  const autoSelectPayOnPickup = () => {
    setSelectedPaymentMethod('pay_on_pickup');
    onPaymentUpdate?.({
      method: 'pay_on_pickup',
      cardDetails: null,
      eWalletDetails: null,
      savePaymentMethod: false,
      totalAmount: bookingSummary?.totalPrice || 0
    });
  };

  const loadPaymentSettings = async () => {
    try {
      setLoading(true);
      setLoadError('');
      paymongoService?.clearCache();

      const [pmEnabled, pmMode, pmMethods, settingsResult] = await Promise.all([
        paymongoService?.isEnabled(),
        paymongoService?.getMode(),
        paymongoService?.getSupportedMethods(),
        supabase?.from('app_settings')?.select('setting_key, setting_value')
          ?.in('setting_key', ['cash_payment_enabled']),
      ]);

      setPaymongoEnabled(pmEnabled);
      setPaymongoMode(pmMode);

      const settingsMap = {};
      settingsResult?.data?.forEach(s => { settingsMap[s.setting_key] = s?.setting_value; });
      const isCashEnabled = settingsMap?.cash_payment_enabled !== false;

      const methods = [];

      if (pmEnabled && pmMethods?.length > 0) {
        pmMethods?.forEach(m => {
          methods?.push({
            id: m?.id,
            name: m?.name,
            icon: m?.icon,
            description: `Pay with ${m?.name} via PayMongo`,
            processingFee: 0,
            available: true,
            paymongoType: m?.type,
          });
        });
      }

      if (isCashEnabled) {
        methods?.push({
          id: 'cash',
          name: 'Cash Payment',
          icon: 'Banknote',
          description: 'Pay the driver directly upon pickup',
          processingFee: 0,
          available: true,
          paymongoType: null,
        });
      }

      if (methods?.length > 0) {
        setPaymentMethods(methods);
        onPaymentMethodsLoaded?.(true);
        const restoredMethod = draft?.method && methods?.find(m => m?.id === draft?.method) ? draft?.method : null;
        const methodToSelect = restoredMethod || selectedPaymentMethod || methods?.[0]?.id;
        if (methodToSelect) {
          setSelectedPaymentMethod(methodToSelect);
          onPaymentUpdate?.({
            method: methodToSelect,
            cardDetails: null,
            eWalletDetails: null,
            savePaymentMethod: false,
            totalAmount: bookingSummary?.totalPrice || 0
          });
        }
        return;
      }

      // Fallback: load from legacy payment_processors_settings
      const { data: settingsData } = await supabase
        ?.from('app_settings')
        ?.select('setting_value')
        ?.eq('setting_key', 'payment_processors_settings')
        ?.single();

      const paymentConfig = settingsData?.setting_value;

      if (paymentConfig?.processors && Array.isArray(paymentConfig?.processors)) {
        const enabledProcessors = paymentConfig?.processors?.filter(p => p?.is_enabled === true);
        const configuredMethods = enabledProcessors?.map(processor => {
          let icon = 'CreditCard', processingFee = 0;
          switch (processor?.type?.toLowerCase()) {
            case 'gcash': icon = 'Smartphone'; processingFee = 15; break;
            case 'paymaya': icon = 'CreditCard'; processingFee = 15; break;
            case 'cash': icon = 'Banknote'; processingFee = 0; break;
            case 'bank_transfer': icon = 'Building2'; processingFee = 0; break;
            default: icon = 'CreditCard'; processingFee = 0;
          }
          return {
            id: processor?.type?.toLowerCase() || processor?.id,
            name: processor?.name || processor?.type,
            icon,
            description: `Pay with ${processor?.name || processor?.type}`,
            processingFee,
            available: true
          };
        });
        setPaymentMethods(configuredMethods);
        const hasAvailable = configuredMethods?.some(m => m?.available);
        onPaymentMethodsLoaded?.(hasAvailable);
        if (!hasAvailable) autoSelectPayOnPickup();
      } else {
        setPaymentMethods([]);
        onPaymentMethodsLoaded?.(false);
        autoSelectPayOnPickup();
      }
    } catch (error) {
      setLoadError('Unable to load payment options. Please check your connection and try again.');
      setPaymentMethods([]);
      onPaymentMethodsLoaded?.(false);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotal = () => {
    const basePrice = bookingSummary?.totalPrice || pricingBreakdown?.total || 0;
    const selectedMethod = paymentMethods?.find(method => method?.id === selectedPaymentMethod);
    let processingFee = selectedMethod?.processingFee || 0;
    return basePrice + processingFee;
  };

  const handlePaymentMethodSelect = (methodId) => {
    setSelectedPaymentMethod(methodId);
    setErrors({});
    setPaymongoError('');
    persistDraft(methodId, cardDetails, eWalletDetails);

    const paymentData = {
      method: methodId,
      cardDetails: methodId === 'credit_card' ? cardDetails : null,
      eWalletDetails: ['gcash', 'paymaya']?.includes(methodId) ? eWalletDetails : null,
      savePaymentMethod,
      totalAmount: calculateTotal()
    };

    onPaymentUpdate(paymentData);
  };

  const initiatePaymongoPayment = async () => {
    setPaymongoInitiating(true);
    setPaymongoError('');
    try {
      const total = calculateTotal();
      const bookingRef = `GS-${Date.now()}`;
      const description = `GoShuttle Booking — ${bookingSummary?.route?.from || ''} → ${bookingSummary?.route?.to || ''}`;

      const selectedMethod = paymentMethods?.find(m => m?.id === selectedPaymentMethod);
      const isSource = selectedMethod?.paymongoType === 'source';

      if (isSource) {
        const { redirectUrl } = await paymongoService?.createSource({
          type: selectedPaymentMethod,
          amountInPHP: total,
          description,
          bookingRef,
        });
        if (redirectUrl) {
          window.location.href = redirectUrl;
        } else {
          throw new Error('No redirect URL returned from PayMongo');
        }
      } else {
        const { checkoutUrl } = await paymongoService?.createPaymentLink({
          amountInPHP: total,
          description,
          bookingRef,
        });
        if (checkoutUrl) {
          window.location.href = checkoutUrl;
        } else {
          throw new Error('No checkout URL returned from PayMongo');
        }
      }
    } catch (err) {
      setPaymongoError(err?.message || 'Failed to initiate payment. Please try again.');
    } finally {
      setPaymongoInitiating(false);
    }
  };

  const handleCardDetailsChange = (field, value) => {
    let formattedValue = value;
    if (field === 'cardNumber') {
      formattedValue = value?.replace(/\s/g, '')?.replace(/(.{4})/g, '$1 ')?.trim();
      if (formattedValue?.length > 19) formattedValue = formattedValue?.slice(0, 19);
    }
    if (field === 'expiryDate') {
      formattedValue = value?.replace(/\D/g, '')?.replace(/(\d{2})(\d)/, '$1/$2');
      if (formattedValue?.length > 5) formattedValue = formattedValue?.slice(0, 5);
    }
    if (field === 'cvv') {
      formattedValue = value?.replace(/\D/g, '')?.slice(0, 4);
    }
    const updatedCardDetails = { ...cardDetails, [field]: formattedValue };
    setCardDetails(updatedCardDetails);
    if (errors?.[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    persistDraft(selectedPaymentMethod, updatedCardDetails, eWalletDetails);
    onPaymentUpdate({
      method: selectedPaymentMethod,
      cardDetails: updatedCardDetails,
      eWalletDetails,
      savePaymentMethod,
      totalAmount: calculateTotal()
    });
  };

  const handleEWalletChange = (field, value) => {
    const updatedEWalletDetails = { ...eWalletDetails, [field]: value };
    setEWalletDetails(updatedEWalletDetails);
    persistDraft(selectedPaymentMethod, cardDetails, updatedEWalletDetails);
    onPaymentUpdate({
      method: selectedPaymentMethod,
      cardDetails,
      eWalletDetails: updatedEWalletDetails,
      savePaymentMethod,
      totalAmount: calculateTotal()
    });
  };

  const validatePaymentDetails = () => {
    const newErrors = {};
    if (selectedPaymentMethod === 'credit_card') {
      if (!cardDetails?.cardNumber?.replace(/\s/g, '')) newErrors.cardNumber = 'Card number is required';
      else if (cardDetails?.cardNumber?.replace(/\s/g, '')?.length < 16) newErrors.cardNumber = 'Please enter a valid card number';
      if (!cardDetails?.expiryDate) newErrors.expiryDate = 'Expiry date is required';
      if (!cardDetails?.cvv) newErrors.cvv = 'CVV is required';
      if (!cardDetails?.cardholderName?.trim()) newErrors.cardholderName = 'Cardholder name is required';
    }
    if (['gcash', 'paymaya']?.includes(selectedPaymentMethod)) {
      if (!eWalletDetails?.phoneNumber) newErrors.phoneNumber = 'Phone number is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors)?.length === 0;
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex flex-col items-center justify-center py-10 gap-3">
          <div className="w-10 h-10 rounded-full border-4 border-primary/20 border-t-primary animate-spin" />
          <span className="text-gray-600 text-sm font-medium">Loading secure payment options…</span>
          <span className="text-xs text-gray-400">Your progress is saved</span>
        </div>
      </div>
    );
  }

  // ── Load error with retry ──────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-red-200 p-6">
        <div className="flex flex-col items-center text-center py-6 gap-4">
          <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center">
            <Icon name="WifiOff" size={28} className="text-red-400" />
          </div>
          <div>
            <h4 className="font-semibold text-gray-900 mb-1">Couldn't load payment options</h4>
            <p className="text-sm text-gray-500 max-w-xs">{loadError}</p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
            <button
              onClick={() => setRetryCount(c => c + 1)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors"
            >
              <Icon name="RefreshCw" size={15} />
              Try Again
            </button>
            <button
              onClick={autoSelectPayOnPickup}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              <Icon name="Banknote" size={15} />
              Pay on Pickup
            </button>
          </div>
          <p className="text-xs text-gray-400">
            Your booking details are saved — you won't lose your progress.
          </p>
        </div>
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────────
  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      {/* Header with auto-save indicator */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Payment Method</h3>
        <div className="flex items-center gap-2">
          {autoSaveIndicator && (
            <span className="flex items-center gap-1 text-xs text-green-600 animate-pulse">
              <Icon name="Save" size={12} />
              Saved
            </span>
          )}
          {!autoSaveIndicator && draft?.savedAt && (
            <span className="flex items-center gap-1 text-xs text-gray-400">
              <Icon name="Clock" size={11} />
              Draft restored
            </span>
          )}
          {paymongoEnabled && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              paymongoMode === 'live' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
            }`}>
              PayMongo {paymongoMode === 'live' ? '🟢 Live' : '🟡 Test'}
            </span>
          )}
        </div>
      </div>
      {/* Payment sub-step progress */}
      <div className="flex items-center gap-1 mb-5">
        {PAYMENT_SUB_STEPS?.map((sub, idx) => {
          const isDone = idx < currentSubStep;
          const isActive = idx === currentSubStep;
          return (
            <React.Fragment key={sub?.id}>
              <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
                isDone ? 'bg-green-100 text-green-700' : isActive ?'bg-primary/10 text-primary': 'bg-gray-100 text-gray-400'
              }`}>
                <Icon name={isDone ? 'CheckCircle2' : sub?.icon} size={12} />
                <span className="hidden sm:inline">{sub?.label}</span>
              </div>
              {idx < PAYMENT_SUB_STEPS?.length - 1 && (
                <div className={`flex-1 h-px ${idx < currentSubStep ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {/* 10-Hour Base Pricing Breakdown */}
      {bookingSummary && (
        <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
            <Icon name="Clock" size={16} className="text-blue-600" />
            Pricing Breakdown
          </h4>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-blue-800">
              <span>Base rate ({pricingBreakdown?.baseHours || 10}-hour package):</span>
              <span className="font-medium">₱{(pricingBreakdown?.baseRate || bookingSummary?.totalPrice || 0)?.toLocaleString()}</span>
            </div>
            {(pricingBreakdown?.excessHours || 0) > 0 && (
              <div className="flex justify-between text-orange-700">
                <span>Excess hours ({pricingBreakdown?.excessHours}h × ₱{pricingBreakdown?.excessHourlyRate?.toLocaleString()}/hr):</span>
                <span className="font-medium">+₱{pricingBreakdown?.excessCharge?.toLocaleString()}</span>
              </div>
            )}
            {(pricingBreakdown?.fuelSurcharge || 0) > 0 && (
              <div className="flex justify-between text-blue-800">
                <span>Fuel surcharge:</span>
                <span className="font-medium">+₱{pricingBreakdown?.fuelSurcharge?.toLocaleString()}</span>
              </div>
            )}
            {paymentMethods?.find(m => m?.id === selectedPaymentMethod)?.processingFee > 0 && (
              <div className="flex justify-between text-blue-800">
                <span>Processing fee:</span>
                <span className="font-medium">+₱{paymentMethods?.find(m => m?.id === selectedPaymentMethod)?.processingFee?.toLocaleString()}</span>
              </div>
            )}
            <div className="border-t border-blue-200 pt-2 mt-2 flex justify-between font-bold text-blue-900">
              <span>Total Amount:</span>
              <span className="text-primary text-base">₱{calculateTotal()?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      )}
      {/* PayMongo Error with recovery options */}
      {paymongoError && (
        <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Icon name="AlertCircle" size={18} className="text-red-500 mt-0.5 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-red-800 mb-1">Payment failed</p>
              <p className="text-sm text-red-700 mb-3">{paymongoError}</p>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => { setPaymongoError(''); initiatePaymongoPayment(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-md text-xs font-semibold hover:bg-red-700 transition-colors"
                >
                  <Icon name="RefreshCw" size={12} />
                  Retry Payment
                </button>
                <button
                  onClick={() => { setPaymongoError(''); setSelectedPaymentMethod(''); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 border border-red-300 text-red-700 rounded-md text-xs font-medium hover:bg-red-50 transition-colors"
                >
                  <Icon name="ArrowLeft" size={12} />
                  Choose Different Method
                </button>
              </div>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-red-100 flex items-center gap-1.5 text-xs text-red-600">
            <Icon name="Save" size={11} />
            Your booking details are saved — no need to start over.
          </div>
        </div>
      )}
      {/* Payment Methods */}
      <div className="space-y-3 mb-6">
        {paymentMethods?.filter(method => method?.available)?.map((method) => (
          <div
            key={method?.id}
            onClick={() => handlePaymentMethodSelect(method?.id)}
            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
              selectedPaymentMethod === method?.id
                ? 'border-primary bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-primary hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Icon name={method?.icon} size={24} className={
                  selectedPaymentMethod === method?.id ? 'text-primary' : 'text-gray-400'
                } />
                <div>
                  <h4 className="font-medium text-gray-900">{method?.name}</h4>
                  <p className="text-sm text-gray-600">{method?.description}</p>
                </div>
              </div>
              <div className="text-right">
                {method?.processingFee > 0 && (
                  <p className="text-sm text-gray-600">+₱{method?.processingFee} fee</p>
                )}
                <div className={`w-4 h-4 rounded-full border-2 ${
                  selectedPaymentMethod === method?.id
                    ? 'border-primary bg-primary' : 'border-gray-300'
                }`}>
                  {selectedPaymentMethod === method?.id && (
                    <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* QR Code Payment Option (only when PayMongo is NOT enabled) */}
        {!paymongoEnabled && (
          <div
            onClick={() => handlePaymentMethodSelect('qr_code')}
            className={`p-4 border rounded-lg cursor-pointer transition-all duration-200 ${
              selectedPaymentMethod === 'qr_code' ? 'border-primary bg-blue-50 shadow-sm' : 'border-gray-200 hover:border-primary hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Icon name="QrCode" size={24} className={selectedPaymentMethod === 'qr_code' ? 'text-primary' : 'text-gray-400'} />
                <div>
                  <h4 className="font-medium text-gray-900">QR Code Payment</h4>
                  <p className="text-sm text-gray-600">Scan with GCash, Maya, or any e-wallet</p>
                </div>
              </div>
              <div className={`w-4 h-4 rounded-full border-2 ${
                selectedPaymentMethod === 'qr_code' ? 'border-primary bg-primary' : 'border-gray-300'
              }`}>
                {selectedPaymentMethod === 'qr_code' && (
                  <div className="w-2 h-2 bg-white rounded-full mx-auto mt-0.5" />
                )}
              </div>
            </div>
          </div>
        )}

        {/* Disabled methods */}
        {paymentMethods?.filter(method => !method?.available)?.map((method) => (
          <div
            key={method?.id}
            className="p-4 border border-gray-200 bg-gray-50 rounded-lg opacity-60 cursor-not-allowed"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Icon name={method?.icon} size={24} className="text-gray-400" />
                <div>
                  <h4 className="font-medium text-gray-600">{method?.name}</h4>
                  <p className="text-sm text-gray-500">Currently unavailable — Contact support</p>
                </div>
              </div>
              <div className="w-4 h-4 rounded-full border-2 border-gray-300" />
            </div>
          </div>
        ))}
      </div>
      {/* No Payment Methods Notice */}
      {paymentMethods?.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg mb-6">
          <Icon name="Banknote" className="mx-auto text-gray-400 mb-4" size={48} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Pay on Pickup</h3>
          <p className="text-gray-500 mb-4">
            Online payment is not configured. Your booking will be confirmed and payment collected at pickup.
          </p>
          <div className="text-sm text-gray-600 bg-blue-50 p-3 rounded-lg inline-block">
            <p className="font-medium text-blue-800">✅ Your booking will be reserved immediately</p>
            <p className="text-blue-700 mt-1">Payment due at time of pickup</p>
          </div>
        </div>
      )}
      {/* PayMongo Pay Now Button */}
      {paymongoEnabled && selectedPaymentMethod && selectedPaymentMethod !== 'pay_on_pickup' && selectedPaymentMethod !== 'qr_code' && (
        <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Icon name="Shield" size={16} className="text-blue-600" />
            <p className="text-sm font-medium text-blue-900">
              Secure payment powered by PayMongo
              {paymongoMode === 'test' && (
                <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">Test Mode</span>
              )}
            </p>
          </div>
          <p className="text-xs text-blue-700 mb-4">
            You will be redirected to PayMongo's secure checkout to complete your payment of{' '}
            <strong>₱{calculateTotal()?.toLocaleString()}</strong>.
          </p>
          <button
            onClick={initiatePaymongoPayment}
            disabled={paymongoInitiating}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {paymongoInitiating ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Redirecting to PayMongo…
              </>
            ) : (
              <>
                <Icon name="ExternalLink" size={18} />
                Pay ₱{calculateTotal()?.toLocaleString()} via PayMongo
              </>
            )}
          </button>
        </div>
      )}
      {/* QR Code Display (legacy / non-PayMongo) */}
      {selectedPaymentMethod === 'qr_code' && !paymongoEnabled && (
        <div className="mb-6 border border-purple-200 rounded-xl bg-purple-50 p-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <Icon name="QrCode" size={20} className="text-purple-700" />
              <h4 className="font-semibold text-purple-900">Scan to Pay</h4>
            </div>
            <div className="inline-block bg-white p-4 rounded-xl shadow-sm border border-purple-100 mb-4">
              <QRCodeSVG
                value={generateQRPayload()}
                size={160}
                level="M"
                includeMargin={false}
                fgColor="#1e1b4b"
              />
            </div>
            <div className="text-center mb-3">
              <p className="text-2xl font-bold text-purple-900">₱{calculateTotal()?.toLocaleString()}</p>
              <p className="text-sm text-purple-700 mt-1">Amount to pay</p>
            </div>
            <div className="bg-white rounded-lg p-3 text-sm text-gray-700 space-y-1 text-left">
              <p className="font-medium text-gray-900 mb-2">How to pay:</p>
              <p>1. Open GCash, Maya, or any QR-enabled e-wallet</p>
              <p>2. Tap "Scan QR" and point your camera at the code</p>
              <p>3. Confirm the amount of <strong>₱{calculateTotal()?.toLocaleString()}</strong></p>
              <p>4. Show payment confirmation to driver</p>
            </div>
          </div>
        </div>
      )}
      {/* Credit Card Details */}
      {selectedPaymentMethod === 'credit_card' && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4 flex items-center gap-2">
            <Icon name="CreditCard" size={16} className="text-primary" />
            Card Details
          </h4>
          <div className="space-y-4">
            <Input
              label="Card Number"
              type="text"
              placeholder="1234 5678 9012 3456"
              value={cardDetails?.cardNumber}
              onChange={(e) => handleCardDetailsChange('cardNumber', e?.target?.value)}
              error={errors?.cardNumber}
              required
            />
            <Input
              label="Cardholder Name"
              type="text"
              placeholder="Name as shown on card"
              value={cardDetails?.cardholderName}
              onChange={(e) => handleCardDetailsChange('cardholderName', e?.target?.value)}
              error={errors?.cardholderName}
              required
            />
            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Expiry Date"
                type="text"
                placeholder="MM/YY"
                value={cardDetails?.expiryDate}
                onChange={(e) => handleCardDetailsChange('expiryDate', e?.target?.value)}
                error={errors?.expiryDate}
                required
              />
              <Input
                label="CVV"
                type="text"
                placeholder="123"
                value={cardDetails?.cvv}
                onChange={(e) => handleCardDetailsChange('cvv', e?.target?.value)}
                error={errors?.cvv}
                required
              />
            </div>
          </div>
          {/* Inline field error summary */}
          {Object.keys(errors)?.length > 0 && (
            <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-xs font-semibold text-red-700 mb-1 flex items-center gap-1">
                <Icon name="AlertTriangle" size={12} />
                Please fix the following:
              </p>
              <ul className="text-xs text-red-600 space-y-0.5 list-disc list-inside">
                {Object.values(errors)?.map((err, i) => <li key={i}>{err}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}
      {/* E-Wallet Details (legacy non-PayMongo) */}
      {['gcash', 'paymaya']?.includes(selectedPaymentMethod) && !paymongoEnabled && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <h4 className="text-md font-medium text-gray-900 mb-4">
            {selectedPaymentMethod === 'gcash' ? 'GCash' : 'Maya'} Details
          </h4>
          <Input
            label="Phone Number"
            type="tel"
            placeholder="+63 9XX XXX XXXX"
            value={eWalletDetails?.phoneNumber}
            onChange={(e) => handleEWalletChange('phoneNumber', e?.target?.value)}
            error={errors?.phoneNumber}
            description={`Enter your ${selectedPaymentMethod === 'gcash' ? 'GCash' : 'Maya'} registered phone number`}
            required
          />
          {errors?.phoneNumber && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-md flex items-center gap-2">
              <Icon name="AlertCircle" size={13} className="text-red-500 flex-shrink-0" />
              <p className="text-xs text-red-700">{errors?.phoneNumber}</p>
            </div>
          )}
        </div>
      )}
      {/* Save Payment Method */}
      {['credit_card', 'gcash', 'paymaya']?.includes(selectedPaymentMethod) && !paymongoEnabled && (
        <div className="mb-6">
          <Checkbox
            label="Save this payment method for future bookings"
            description="Securely save for faster checkout next time"
            checked={savePaymentMethod}
            onChange={(e) => setSavePaymentMethod(e?.target?.checked)}
          />
        </div>
      )}
      {/* Bottom reassurance strip */}
      <div className="pt-4 border-t border-gray-100 flex flex-wrap items-center justify-center gap-4 text-xs text-gray-400">
        <span className="flex items-center gap-1">
          <Icon name="ShieldCheck" size={13} className="text-green-500" />
          256-bit SSL
        </span>
        <span className="flex items-center gap-1">
          <Icon name="Lock" size={13} className="text-blue-400" />
          PCI Compliant
        </span>
        <span className="flex items-center gap-1">
          <Icon name="Save" size={13} className="text-orange-400" />
          Progress auto-saved
        </span>
      </div>
    </div>
  );
};

export default PaymentSection;