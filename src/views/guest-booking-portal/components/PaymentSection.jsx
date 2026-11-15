import React, { useState, useEffect } from 'react';
import { CreditCard, ArrowLeft, Shield, AlertCircle, Clock, CheckCircle, QrCode, Loader2, ExternalLink } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Button from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import paymongoService from '../../../services/paymongoService';

export default function PaymentSection({ 
  bookingData, 
  selectedVehicle, 
  computedTotalCost,
  onPaymentComplete, 
  onPrev, 
  loading, 
  error 
}) {
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cardDetails, setCardDetails] = useState({
    cardNumber: '',
    expiryDate: '',
    cvv: '',
    cardholderName: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [paymongoEnabled, setPaymongoEnabled] = useState(false);
  const [paymongoMode, setPaymongoMode] = useState('test');
  const [paymongoMethods, setPaymongoMethods] = useState([]);
  const [cashEnabled, setCashEnabled] = useState(false);
  const [paymongoInitiating, setPaymongoInitiating] = useState(false);
  const [paymongoError, setPaymongoError] = useState('');
  const [loadingPaymongo, setLoadingPaymongo] = useState(true);

  useEffect(() => {
    loadPaymongoSettings();
  }, []);

  const loadPaymongoSettings = async () => {
    try {
      setLoadingPaymongo(true);
      paymongoService?.clearCache();

      // Fetch PayMongo settings + cash setting in parallel
      const [enabled, mode, methods, settingsResult] = await Promise.all([
        paymongoService?.isEnabled(),
        paymongoService?.getMode(),
        paymongoService?.getSupportedMethods(),
        supabase?.from('app_settings')?.select('setting_key, setting_value')
          ?.in('setting_key', ['cash_payment_enabled']),
      ]);

      setPaymongoEnabled(enabled);
      setPaymongoMode(mode);
      setPaymongoMethods(methods || []);

      // Parse cash setting
      const settingsMap = {};
      settingsResult?.data?.forEach(s => { settingsMap[s.setting_key] = s?.setting_value; });
      const isCashEnabled = settingsMap?.cash_payment_enabled !== false;
      setCashEnabled(isCashEnabled);

      // Auto-select first available method
      if (enabled && methods?.length > 0) {
        setPaymentMethod(methods?.[0]?.id);
      } else if (isCashEnabled) {
        setPaymentMethod('cash');
      }
    } catch {
      // fallback: show cash
      setCashEnabled(true);
      setPaymentMethod('cash');
    } finally {
      setLoadingPaymongo(false);
    }
  };

  // Use pricing-service computed total when available, fall back to vehicle daily rate
  const totalCost = computedTotalCost > 0
    ? computedTotalCost
    : (() => {
        if (!selectedVehicle) return 0;
        const baseRate = selectedVehicle?.dailyRate || selectedVehicle?.hourlyRate * 8 || 1500;
        const passengerMultiplier = bookingData?.passengerCount > 4 ? 1.2 : 1;
        const returnTripMultiplier = bookingData?.returnDate ? 2 : 1;
        return Math.round(baseRate * passengerMultiplier * returnTripMultiplier);
      })();

  // Generate QR code payload — uses pricing-service total and booking reference
  const generateQRPayload = () => {
    const bookingCode = bookingData?.bookingCode || `GS-GUEST-${Date.now()}`;
    const payload = {
      merchant: 'GoShuttle',
      amount: totalCost,
      currency: 'PHP',
      pickup: bookingData?.pickupLocation || '',
      dropoff: bookingData?.dropoffLocation || '',
      date: bookingData?.pickupDate ? new Date(bookingData.pickupDate)?.toLocaleDateString() : '',
      passengers: bookingData?.passengerCount || 1,
      vehicle: selectedVehicle?.name || selectedVehicle?.make || '',
      ref: bookingCode,
      bookingCode
    };
    return JSON.stringify(payload);
  };

  const handleCardInputChange = (field, value) => {
    setCardDetails(prev => ({ ...prev, [field]: value }));
    if (validationErrors?.[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validatePayment = () => {
    const errors = {};
    if (paymentMethod === 'card') {
      if (!cardDetails?.cardNumber) {
        errors.cardNumber = 'Card number is required';
      } else if (!/^\d{16}$/?.test(cardDetails?.cardNumber?.replace(/\s/g, ''))) {
        errors.cardNumber = 'Please enter a valid 16-digit card number';
      }
      if (!cardDetails?.expiryDate) {
        errors.expiryDate = 'Expiry date is required';
      } else if (!/^(0[1-9]|1[0-2])\/\d{2}$/?.test(cardDetails?.expiryDate)) {
        errors.expiryDate = 'Please enter date in MM/YY format';
      }
      if (!cardDetails?.cvv) {
        errors.cvv = 'CVV is required';
      } else if (!/^\d{3,4}$/?.test(cardDetails?.cvv)) {
        errors.cvv = 'Please enter a valid 3 or 4 digit CVV';
      }
      if (!cardDetails?.cardholderName) {
        errors.cardholderName = 'Cardholder name is required';
      }
    }
    setValidationErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!validatePayment()) return;
    const paymentData = {
      paymentMethod,
      totalCost,
      ...(paymentMethod === 'card' ? { cardDetails } : {})
    };
    await onPaymentComplete(paymentData);
  };

  const initiatePaymongoPayment = async () => {
    setPaymongoInitiating(true);
    setPaymongoError('');
    try {
      const description = `GoShuttle Guest Booking — ${bookingData?.pickupLocation || ''} → ${bookingData?.dropoffLocation || ''}`;
      const bookingRef = `GS-GUEST-${Date.now()}`;

      const selectedPmMethod = paymongoMethods?.find(m => m?.id === paymentMethod);
      const isSource = selectedPmMethod?.type === 'source';

      if (isSource) {
        const { redirectUrl } = await paymongoService?.createSource({
          type: paymentMethod,
          amountInPHP: totalCost,
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
          amountInPHP: totalCost,
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
      setPaymongoError(err?.message || 'Failed to initiate PayMongo payment. Please try again.');
    } finally {
      setPaymongoInitiating(false);
    }
  };

  const formatCardNumber = (value) => {
    const v = value?.replace(/\s+/g, '')?.replace(/[^0-9]/gi, '');
    const matches = v?.match(/\d{4,16}/g);
    const match = matches && matches?.[0] || '';
    const parts = [];
    for (let i = 0, len = match?.length; i < len; i += 4) {
      parts?.push(match?.substring(i, i + 4));
    }
    if (parts?.length) return parts?.join(' ');
    return v;
  };

  const formatExpiryDate = (value) => {
    const v = value?.replace(/\s+/g, '')?.replace(/[^0-9]/gi, '');
    if (v?.length >= 2) return v?.substring(0, 2) + '/' + v?.substring(2, 4);
    return v;
  };

  const isPaymongoMethod = paymongoEnabled && paymongoMethods?.some(m => m?.id === paymentMethod);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}
      <div className="text-center mb-6">
        <div className="flex items-center justify-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-gray-900">Payment Details</h2>
          {!loadingPaymongo && paymongoEnabled && (
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              paymongoMode === 'live' ?'bg-green-100 text-green-700' :'bg-yellow-100 text-yellow-700'
            }`}>
              PayMongo {paymongoMode === 'live' ? '🟢 Live' : '🟡 Test'}
            </span>
          )}
        </div>
        <p className="text-gray-600">Complete your booking by choosing a payment method</p>
      </div>

      {/* Booking Summary */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="font-semibold text-gray-900 mb-4">Booking Summary</h3>
        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Vehicle:</span>
            <span className="font-medium">
              {selectedVehicle?.name || `${selectedVehicle?.make} ${selectedVehicle?.model}`}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Route:</span>
            <span className="font-medium text-right">
              {bookingData?.pickupLocation} → {bookingData?.dropoffLocation}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Date:</span>
            <span className="font-medium">
              {new Date(bookingData.pickupDate)?.toLocaleDateString()}
            </span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Passengers:</span>
            <span className="font-medium">{bookingData?.passengerCount}</span>
          </div>
          {bookingData?.returnDate && (
            <div className="flex justify-between">
              <span className="text-gray-600">Return Date:</span>
              <span className="font-medium">
                {new Date(bookingData.returnDate)?.toLocaleDateString()}
              </span>
            </div>
          )}
          <div className="border-t pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Total:</span>
              <span className="text-2xl font-bold text-blue-600">
                ₱{totalCost?.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Payment Method Selection */}
        <div>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Payment Method</h3>

          {loadingPaymongo ? (
            <div className="flex items-center gap-2 py-4 text-gray-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm">Loading payment options...</span>
            </div>
          ) : (
            <div className="space-y-3">
              {/* PayMongo Methods */}
              {paymongoEnabled && paymongoMethods?.map(method => (
                <label key={method?.id} className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value={method?.id}
                    checked={paymentMethod === method?.id}
                    onChange={(e) => setPaymentMethod(e?.target?.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center flex-1">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                      <CreditCard className="w-4 h-4 text-blue-600" />
                    </div>
                    <div>
                      <div className="font-medium">{method?.name}</div>
                      <div className="text-sm text-gray-600">Secure payment via PayMongo</div>
                    </div>
                    <span className="ml-auto text-xs text-blue-600 font-medium bg-blue-50 px-2 py-0.5 rounded">PayMongo</span>
                  </div>
                </label>
              ))}

              {/* Cash Payment — only shown when enabled in admin */}
              {cashEnabled && (
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="cash"
                    checked={paymentMethod === 'cash'}
                    onChange={(e) => setPaymentMethod(e?.target?.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mr-3">
                      <span className="text-green-600 font-bold">₱</span>
                    </div>
                    <div>
                      <div className="font-medium">Cash Payment</div>
                      <div className="text-sm text-gray-600">Pay the driver directly upon pickup</div>
                    </div>
                  </div>
                </label>
              )}

              {/* QR Code (only when PayMongo not enabled) */}
              {!paymongoEnabled && (
                <label className="flex items-center p-4 border rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="qr"
                    checked={paymentMethod === 'qr'}
                    onChange={(e) => setPaymentMethod(e?.target?.value)}
                    className="mr-3"
                  />
                  <div className="flex items-center">
                    <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center mr-3">
                      <QrCode className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <div className="font-medium">QR Code Payment</div>
                      <div className="text-sm text-gray-600">Scan QR code with GCash, Maya, or any e-wallet</div>
                    </div>
                  </div>
                </label>
              )}

              {/* No methods available */}
              {!paymongoEnabled && !cashEnabled && (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500 text-sm">No payment methods are currently available. Please contact support.</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* PayMongo Error */}
        {paymongoError && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
            <p className="text-sm text-red-700">{paymongoError}</p>
          </div>
        )}

        {/* PayMongo Pay Now Panel */}
        {isPaymongoMethod && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield className="w-4 h-4 text-blue-600" />
              <p className="text-sm font-medium text-blue-900">
                Secure payment powered by PayMongo
                {paymongoMode === 'test' && (
                  <span className="ml-2 text-xs text-yellow-700 bg-yellow-100 px-1.5 py-0.5 rounded">Test Mode</span>
                )}
              </p>
            </div>
            <p className="text-xs text-blue-700 mb-4">
              You will be redirected to PayMongo's secure checkout to complete your payment of{' '}
              <strong>₱{totalCost?.toLocaleString()}</strong>.
            </p>
            <button
              type="button"
              onClick={initiatePaymongoPayment}
              disabled={paymongoInitiating}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {paymongoInitiating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Redirecting to PayMongo...
                </>
              ) : (
                <>
                  <ExternalLink className="w-4 h-4" />
                  Pay ₱{totalCost?.toLocaleString()} via PayMongo
                </>
              )}
            </button>
          </div>
        )}

        {/* QR Code Display (legacy) */}
        {paymentMethod === 'qr' && !paymongoEnabled && (
          <div className="border border-purple-200 rounded-xl bg-purple-50 p-6">
            <div className="text-center">
              <div className="flex items-center justify-center gap-2 mb-4">
                <QrCode className="w-5 h-5 text-purple-700" />
                <h4 className="font-semibold text-purple-900">Scan to Pay</h4>
              </div>
              <div className="inline-block bg-white p-4 rounded-xl shadow-sm border border-purple-100 mb-4">
                <QRCodeSVG
                  value={generateQRPayload()}
                  size={180}
                  level="M"
                  includeMargin={false}
                  fgColor="#1e1b4b"
                />
              </div>
              <div className="text-center mb-3">
                <p className="text-2xl font-bold text-purple-900">₱{totalCost?.toLocaleString()}</p>
                <p className="text-sm text-purple-700 mt-1">Amount to pay</p>
              </div>
              <div className="bg-white rounded-lg p-3 text-sm text-gray-700 space-y-1 text-left">
                <p className="font-medium text-gray-900 mb-2">How to pay:</p>
                <p>1. Open your GCash, Maya, or any QR-enabled e-wallet</p>
                <p>2. Tap "Scan QR" and point your camera at the code above</p>
                <p>3. Confirm the amount of <strong>₱{totalCost?.toLocaleString()}</strong></p>
                <p>4. Complete payment and show confirmation to driver</p>
              </div>
              <p className="text-xs text-purple-600 mt-3">
                This QR code contains your booking details. Screenshot it for reference.
              </p>
            </div>
          </div>
        )}

        {/* Payment Notes */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start">
            <Shield className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
            <div>
              <h4 className="font-medium text-blue-900 mb-2">Payment Security</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Your booking is confirmed immediately upon submission</li>
                <li>• For cash payments, exact amount is appreciated but not required</li>
                <li>• All transactions are secured and protected</li>
                <li>• You'll receive email confirmation with your booking code</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Terms and Conditions */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <div className="flex items-start">
            <CheckCircle className="w-5 h-5 text-green-600 mr-2 mt-0.5" />
            <div className="text-sm text-gray-700">
              <p className="mb-2">
                By completing this booking, you agree to our Terms of Service and acknowledge 
                that you have read our Privacy Policy.
              </p>
              <ul className="space-y-1 text-xs">
                <li>• Cancellation allowed up to 2 hours before pickup time</li>
                <li>• Driver will wait up to 15 minutes at pickup location</li>
                <li>• Additional charges may apply for route changes or waiting time</li>
              </ul>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between pt-6 border-t">
          <Button
            type="button"
            onClick={onPrev}
            variant="outline"
            className="flex items-center px-6 py-3"
            disabled={loading || paymongoInitiating}
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Vehicle Selection
          </Button>

          {/* Only show Complete Booking for cash/qr (non-PayMongo) */}
          {!isPaymongoMethod && (
            <Button
              type="submit"
              disabled={loading}
              className="flex items-center px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? (
                <>
                  <Clock className="w-4 h-4 mr-2 animate-spin" />
                  Creating Booking...
                </>
              ) : (
                <>Complete Booking - ₱{totalCost?.toLocaleString()}</>
              )}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}