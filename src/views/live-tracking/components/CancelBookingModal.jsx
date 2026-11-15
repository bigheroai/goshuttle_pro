import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import bookingCancellationService from '../../../services/bookingCancellationService';

const CancelBookingModal = ({ isOpen, onClose, currentTrip, onBookingCancelled }) => {
  const [step, setStep] = useState(1);
  const [selectedReason, setSelectedReason] = useState('');
  const [customReason, setCustomReason] = useState('');
  const [cancelling, setCancelling] = useState(false);
  const [cancellationPolicy, setCancellationPolicy] = useState(null);
  const [canCancel, setCanCancel] = useState(null);

  // Load cancellation eligibility when modal opens
  useEffect(() => {
    if (isOpen && currentTrip?.id) {
      checkCancellationEligibility();
    }
  }, [isOpen, currentTrip]);

  const checkCancellationEligibility = async () => {
    try {
      const result = await bookingCancellationService?.canCancelBooking(currentTrip?.id);
      setCanCancel(result);
      
      if (result?.canCancel && result?.policy) {
        setCancellationPolicy(result?.policy);
      }
    } catch (error) {
      console.error('Error checking cancellation eligibility:', error);
      setCanCancel({ canCancel: false, reason: 'Unable to check eligibility' });
    }
  };

  const handleCancel = async () => {
    const finalReason = selectedReason === 'other' ? customReason : selectedReason;
    
    if (!finalReason?.trim()) {
      alert('Please provide a cancellation reason');
      return;
    }

    try {
      setCancelling(true);
      
      const result = await bookingCancellationService?.cancelBooking(
        currentTrip?.id,
        finalReason,
        true // Request refund if eligible
      );

      // Show success message with policy info
      const successMessage = result?.refundEligible 
        ? `Booking cancelled successfully! Refund of ₱${result?.cancellationInfo?.refundAmount?.toFixed(2)} will be processed.`
        : `Booking cancelled successfully! ${result?.cancellationInfo?.policy}`;
      
      alert(successMessage);
      
      if (onBookingCancelled) {
        onBookingCancelled(result);
      }
      
      onClose();
    } catch (error) {
      console.error('Error cancelling booking:', error);
      alert(`Failed to cancel booking: ${error?.message}`);
    } finally {
      setCancelling(false);
    }
  };

  const resetModal = () => {
    setStep(1);
    setSelectedReason('');
    setCustomReason('');
    setCancelling(false);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  if (!isOpen) return null;

  const cancellationReasons = bookingCancellationService?.getCancellationReasons();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Icon name="X" size={24} className="text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Cancel Booking</h3>
              <p className="text-sm text-gray-600">Booking #{currentTrip?.id?.substring(0, 8)?.toUpperCase()}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClose}>
            <Icon name="X" size={20} />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {/* Check if cancellation is allowed */}
          {canCancel === null ? (
            <div className="flex items-center justify-center py-8">
              <Icon name="Loader2" className="animate-spin mr-2" size={24} />
              <span>Checking cancellation policy...</span>
            </div>
          ) : !canCancel?.canCancel ? (
            <div className="text-center py-8">
              <Icon name="AlertTriangle" size={48} className="text-red-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Cannot Cancel</h3>
              <p className="text-gray-600">{canCancel?.reason}</p>
            </div>
          ) : (
            <>
              {step === 1 && (
                <div className="space-y-6">
                  {/* Trip Details */}
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 mb-2">Trip Details</h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>From:</span>
                        <span className="font-medium">{currentTrip?.pickup}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>To:</span>
                        <span className="font-medium">{currentTrip?.destination}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Date & Time:</span>
                        <span className="font-medium">{currentTrip?.bookingTime}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Amount:</span>
                        <span className="font-medium">₱{currentTrip?.fare}</span>
                      </div>
                    </div>
                  </div>

                  {/* Cancellation Policy */}
                  {cancellationPolicy && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start space-x-3">
                        <Icon name="Clock" size={20} className="text-yellow-600 mt-0.5" />
                        <div>
                          <h4 className="font-medium text-yellow-800 mb-1">Cancellation Policy</h4>
                          <p className="text-sm text-yellow-700 mb-2">{cancellationPolicy?.policy}</p>
                          
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <span className="text-yellow-600">Cancellation Fee:</span>
                              <div className="font-medium">₱{cancellationPolicy?.cancellationFee?.toFixed(2)}</div>
                            </div>
                            <div>
                              <span className="text-yellow-600">Refund Amount:</span>
                              <div className="font-medium">₱{cancellationPolicy?.refundAmount?.toFixed(2)}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={handleClose}>
                      Keep Booking
                    </Button>
                    <Button variant="destructive" onClick={() => setStep(2)}>
                      Continue to Cancel
                    </Button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium text-gray-900 mb-3">Why are you cancelling?</h4>
                    <div className="space-y-2">
                      {cancellationReasons?.map((reason) => (
                        <label key={reason?.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                          <input
                            type="radio"
                            name="cancellationReason"
                            value={reason?.id}
                            checked={selectedReason === reason?.id}
                            onChange={(e) => setSelectedReason(e?.target?.value)}
                            className="text-primary focus:ring-primary"
                          />
                          <div>
                            <div className="font-medium text-gray-900">{reason?.label}</div>
                            <div className="text-sm text-gray-600">{reason?.description}</div>
                          </div>
                        </label>
                      ))}
                    </div>
                  </div>

                  {selectedReason === 'other' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Please specify your reason
                      </label>
                      <textarea
                        value={customReason}
                        onChange={(e) => setCustomReason(e?.target?.value)}
                        placeholder="Please provide details..."
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
                        rows={3}
                      />
                    </div>
                  )}

                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => setStep(1)}>
                      Back
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleCancel}
                      disabled={cancelling || !selectedReason || (selectedReason === 'other' && !customReason?.trim())}
                    >
                      {cancelling && <Icon name="Loader2" className="animate-spin mr-2" size={16} />}
                      Confirm Cancellation
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CancelBookingModal;