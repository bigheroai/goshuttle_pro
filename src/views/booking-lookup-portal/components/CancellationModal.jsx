import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Clock, CheckCircle, XCircle, ChevronDown, Loader } from 'lucide-react';
import Button from '../../../components/ui/Button';

const CANCELLATION_REASONS = [
  { id: 'schedule_change', label: 'Schedule changed', description: 'My plans have changed' },
  { id: 'found_alternative', label: 'Found alternative transport', description: 'Found another transportation option' },
  { id: 'emergency', label: 'Emergency', description: 'Emergency situation arose' },
  { id: 'driver_issue', label: 'Driver issue', description: 'Issue with assigned driver' },
  { id: 'weather', label: 'Weather conditions', description: 'Weather or road conditions' },
  { id: 'price_concern', label: 'Price concern', description: 'Pricing issue or concern' },
  { id: 'duplicate_booking', label: 'Duplicate booking', description: 'Accidentally booked multiple trips' },
  { id: 'other', label: 'Other', description: 'Other reason (please specify)' }
];

function calculateCancellationPolicy(pickupDate, totalCost) {
  const now = new Date();
  const pickup = new Date(pickupDate);
  const hoursUntilPickup = (pickup - now) / (1000 * 60 * 60);
  const total = parseFloat(totalCost) || 0;

  if (hoursUntilPickup < 0) {
    return {
      hoursUntilPickup: 0,
      cancellationFee: total,
      refundAmount: 0,
      refundEligible: false,
      refundPercentage: 0,
      policy: 'No refund — past pickup time',
      tier: 'none'
    };
  } else if (hoursUntilPickup >= 24) {
    return {
      hoursUntilPickup,
      cancellationFee: 0,
      refundAmount: total,
      refundEligible: true,
      refundPercentage: 100,
      policy: 'Full refund — 24+ hours notice',
      tier: 'full'
    };
  } else if (hoursUntilPickup >= 6) {
    const fee = total * 0.2;
    return {
      hoursUntilPickup,
      cancellationFee: fee,
      refundAmount: total - fee,
      refundEligible: true,
      refundPercentage: 80,
      policy: '20% cancellation fee — 6–24 hours notice',
      tier: 'partial_20'
    };
  } else if (hoursUntilPickup >= 2) {
    const fee = total * 0.5;
    return {
      hoursUntilPickup,
      cancellationFee: fee,
      refundAmount: total - fee,
      refundEligible: true,
      refundPercentage: 50,
      policy: '50% cancellation fee — 2–6 hours notice',
      tier: 'partial_50'
    };
  } else {
    return {
      hoursUntilPickup,
      cancellationFee: total,
      refundAmount: 0,
      refundEligible: false,
      refundPercentage: 0,
      policy: 'No refund — less than 2 hours notice',
      tier: 'none'
    };
  }
}

export default function CancellationModal({ booking, onConfirm, onClose, loading }) {
  const [selectedReason, setSelectedReason] = useState('');
  const [otherReason, setOtherReason] = useState('');
  const [step, setStep] = useState('policy'); // 'policy' | 'reason' | 'confirm'
  const [policy, setPolicy] = useState(null);

  useEffect(() => {
    if (booking?.pickupDate) {
      const computed = calculateCancellationPolicy(booking?.pickupDate, booking?.totalCost);
      setPolicy(computed);
    }
  }, [booking]);

  const finalReason = selectedReason === 'other' ? otherReason : CANCELLATION_REASONS?.find(r => r?.id === selectedReason)?.label || '';

  const handleProceed = () => {
    if (step === 'policy') setStep('reason');
    else if (step === 'reason') setStep('confirm');
    else if (step === 'confirm') {
      onConfirm({ reason: finalReason, policy });
    }
  };

  const canProceedFromReason = selectedReason && (selectedReason !== 'other' || otherReason?.trim()?.length >= 5);

  const tierColor = {
    full: 'text-green-700',
    partial_20: 'text-yellow-700',
    partial_50: 'text-orange-700',
    none: 'text-red-700'
  };

  const tierBg = {
    full: 'bg-green-50 border-green-200',
    partial_20: 'bg-yellow-50 border-yellow-200',
    partial_50: 'bg-orange-50 border-orange-200',
    none: 'bg-red-50 border-red-200'
  };

  const tierIcon = {
    full: <CheckCircle className="w-5 h-5 text-green-600" />,
    partial_20: <Clock className="w-5 h-5 text-yellow-600" />,
    partial_50: <AlertTriangle className="w-5 h-5 text-orange-600" />,
    none: <XCircle className="w-5 h-5 text-red-600" />
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-500" />
            <h2 className="text-lg font-semibold text-gray-900">Cancel Booking</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Step indicator */}
        <div className="flex items-center px-5 pt-4 gap-2">
          {['policy', 'reason', 'confirm']?.map((s, i) => (
            <React.Fragment key={s}>
              <div className={`flex items-center gap-1.5 text-xs font-medium ${step === s ? 'text-blue-600' : i < ['policy','reason','confirm']?.indexOf(step) ? 'text-green-600' : 'text-gray-400'}`}>
                <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ${step === s ? 'bg-blue-600 text-white' : i < ['policy','reason','confirm']?.indexOf(step) ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'}`}>
                  {i < ['policy','reason','confirm']?.indexOf(step) ? '✓' : i + 1}
                </div>
                <span className="hidden sm:inline capitalize">{s}</span>
              </div>
              {i < 2 && <div className="flex-1 h-px bg-gray-200" />}
            </React.Fragment>
          ))}
        </div>

        <div className="p-5">
          {/* STEP 1: Policy */}
          {step === 'policy' && policy && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Cancellation Policy</h3>
                <p className="text-sm text-gray-500">Review the refund policy before proceeding.</p>
              </div>

              {/* Booking summary */}
              <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-gray-500">Booking</span>
                  <span className="font-medium text-gray-900">#{booking?.bookingCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Pickup</span>
                  <span className="text-gray-700">{new Date(booking?.pickupDate)?.toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Total Paid</span>
                  <span className="font-semibold text-gray-900">₱{parseFloat(booking?.totalCost || 0)?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time Until Pickup</span>
                  <span className="text-gray-700">
                    {policy?.hoursUntilPickup >= 24
                      ? `${Math.floor(policy?.hoursUntilPickup / 24)} day(s)`
                      : `${Math.floor(policy?.hoursUntilPickup)} hour(s)`}
                  </span>
                </div>
              </div>

              {/* Policy result */}
              <div className={`rounded-lg border p-4 ${tierBg?.[policy?.tier]}`}>
                <div className="flex items-start gap-3">
                  {tierIcon?.[policy?.tier]}
                  <div className="flex-1">
                    <p className={`font-semibold text-sm ${tierColor?.[policy?.tier]}`}>{policy?.policy}</p>
                    <div className="mt-2 space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Cancellation Fee:</span>
                        <span className="font-medium text-gray-900">₱{policy?.cancellationFee?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Refund Amount:</span>
                        <span className={`font-semibold ${policy?.refundEligible ? 'text-green-700' : 'text-red-600'}`}>
                          ₱{policy?.refundAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Policy tiers reference */}
              <div className="text-xs text-gray-500 space-y-1 border rounded-lg p-3 bg-gray-50">
                <p className="font-medium text-gray-700 mb-1.5">Cancellation Policy Tiers:</p>
                <div className="flex items-center gap-2"><CheckCircle className="w-3.5 h-3.5 text-green-500 flex-shrink-0" /><span>24+ hours before pickup → Full refund</span></div>
                <div className="flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" /><span>6–24 hours before pickup → 80% refund (20% fee)</span></div>
                <div className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-orange-500 flex-shrink-0" /><span>2–6 hours before pickup → 50% refund (50% fee)</span></div>
                <div className="flex items-center gap-2"><XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" /><span>Less than 2 hours → No refund</span></div>
              </div>
            </div>
          )}

          {/* STEP 2: Reason */}
          {step === 'reason' && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Reason for Cancellation</h3>
                <p className="text-sm text-gray-500">Please select a reason to help us improve our service.</p>
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                {CANCELLATION_REASONS?.map(reason => (
                  <label
                    key={reason?.id}
                    className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${selectedReason === reason?.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'}`}
                  >
                    <input
                      type="radio"
                      name="reason"
                      value={reason?.id}
                      checked={selectedReason === reason?.id}
                      onChange={() => setSelectedReason(reason?.id)}
                      className="mt-0.5 accent-blue-600"
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{reason?.label}</p>
                      <p className="text-xs text-gray-500">{reason?.description}</p>
                    </div>
                  </label>
                ))}
              </div>
              {selectedReason === 'other' && (
                <textarea
                  value={otherReason}
                  onChange={e => setOtherReason(e?.target?.value)}
                  placeholder="Please describe your reason (minimum 5 characters)..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-lg p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              )}
            </div>
          )}

          {/* STEP 3: Confirm */}
          {step === 'confirm' && policy && (
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-gray-900 mb-1">Confirm Cancellation</h3>
                <p className="text-sm text-gray-500">Please review the details before finalizing.</p>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Booking Code:</span>
                  <span className="font-semibold text-gray-900">#{booking?.bookingCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cancellation Reason:</span>
                  <span className="font-medium text-gray-900 text-right max-w-[60%]">{finalReason}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Cancellation Fee:</span>
                  <span className="font-medium text-red-700">₱{policy?.cancellationFee?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between border-t border-red-200 pt-2 mt-2">
                  <span className="font-semibold text-gray-900">Refund Amount:</span>
                  <span className={`font-bold text-base ${policy?.refundEligible ? 'text-green-700' : 'text-red-600'}`}>
                    ₱{policy?.refundAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {policy?.refundEligible && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800">
                  <p className="font-medium mb-0.5">Refund Processing</p>
                  <p>A refund of <strong>₱{policy?.refundAmount?.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong> will be processed within 5–7 business days. A cancellation confirmation email will be sent to <strong>{booking?.guestEmail}</strong>.</p>
                </div>
              )}

              {!policy?.refundEligible && (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 text-xs text-gray-700">
                  <p className="font-medium mb-0.5">No Refund Applicable</p>
                  <p>Based on our cancellation policy, no refund is applicable for this cancellation. A confirmation email will still be sent to <strong>{booking?.guestEmail}</strong>.</p>
                </div>
              )}

              <p className="text-xs text-gray-500 text-center">This action cannot be undone. Your booking will be permanently cancelled.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-5 border-t bg-gray-50 rounded-b-xl gap-3">
          <Button
            onClick={step === 'policy' ? onClose : () => setStep(step === 'confirm' ? 'reason' : 'policy')}
            variant="outline"
            className="px-4 py-2 text-sm"
            disabled={loading}
          >
            {step === 'policy' ? 'Keep Booking' : 'Back'}
          </Button>

          <Button
            onClick={handleProceed}
            disabled={(step === 'reason' && !canProceedFromReason) || loading}
            className={`px-5 py-2 text-sm font-medium text-white rounded-lg transition-colors flex items-center gap-2 ${
              step === 'confirm' ?'bg-red-600 hover:bg-red-700 disabled:bg-red-300' :'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300'
            } disabled:cursor-not-allowed`}
          >
            {loading ? (
              <><Loader className="w-4 h-4 animate-spin" /> Processing...</>
            ) : step === 'confirm' ? (
              <><XCircle className="w-4 h-4" /> Confirm Cancellation</>
            ) : (
              <>Continue <ChevronDown className="w-4 h-4 rotate-[-90deg]" /></>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
