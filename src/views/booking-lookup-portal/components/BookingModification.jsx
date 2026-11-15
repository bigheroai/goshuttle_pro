import React, { useState } from 'react';
import { Save, X, AlertCircle, User, Phone, Users, MessageSquare, Clock } from 'lucide-react';
import { guestBookingService } from '../../../services/guestBookingService';
import { supabase } from '../../../lib/supabase';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';

export default function BookingModification({ booking, onComplete, onCancel }) {
  const [formData, setFormData] = useState({
    guestName: booking?.guestName || '',
    guestPhone: booking?.guestPhone || '',
    passengerCount: booking?.passengerCount || 1,
    notes: booking?.notes || ''
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [validationErrors, setValidationErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (validationErrors?.[field]) {
      setValidationErrors(prev => ({ ...prev, [field]: '' }));
    }
    setError('');
  };

  const validateForm = () => {
    const errors = {};

    if (!formData?.guestName) {
      errors.guestName = 'Full name is required';
    } else if (formData?.guestName?.length < 2) {
      errors.guestName = 'Full name must be at least 2 characters';
    }

    if (!formData?.guestPhone) {
      errors.guestPhone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/?.test(formData?.guestPhone)) {
      errors.guestPhone = 'Please enter a valid phone number';
    }

    if (formData?.passengerCount < 1 || formData?.passengerCount > 15) {
      errors.passengerCount = 'Passenger count must be between 1 and 15';
    }

    // Check if passenger count exceeds vehicle capacity
    if (booking?.vehicle && formData?.passengerCount > booking?.vehicle?.capacity) {
      errors.passengerCount = `This vehicle can only accommodate ${booking?.vehicle?.capacity} passengers`;
    }

    setValidationErrors(errors);
    return Object.keys(errors)?.length === 0;
  };

  const hasChanges = () => {
    return (formData?.guestName !== booking?.guestName ||
    formData?.guestPhone !== booking?.guestPhone ||
    formData?.passengerCount !== booking?.passengerCount || formData?.notes !== (booking?.notes || ''));
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    if (!hasChanges()) {
      setError('No changes detected. Please make modifications before saving.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      if (booking?._isAuthenticatedBooking) {
        // Direct supabase update for authenticated user bookings
        const { error: updateError } = await supabase
          ?.from('bookings')
          ?.update({
            guest_name: formData?.guestName,
            guest_phone: formData?.guestPhone,
            contact_name: formData?.guestName,
            contact_phone: formData?.guestPhone,
            passenger_count: formData?.passengerCount,
            notes: formData?.notes,
            updated_at: new Date()?.toISOString()
          })
          ?.eq('id', booking?._rawId);

        if (updateError) throw updateError;
      } else {
        await guestBookingService?.updateGuestBooking(
          booking?.id,
          formData,
          booking?.bookingCode,
          booking?.guestEmail
        );
      }
      
      onComplete();
    } catch (err) {
      setError(err?.message || 'Failed to update booking');
    } finally {
      setLoading(false);
    }
  };

  const canModify = () => {
    const now = new Date();
    const pickupDate = new Date(booking.pickupDate);
    const hoursUntilPickup = (pickupDate - now) / (1000 * 60 * 60);
    
    return (booking?.status === 'pending' || booking?.status === 'confirmed') && hoursUntilPickup > 2;
  };

  if (!canModify()) {
    return (
      <div className="bg-white rounded-lg shadow-sm border p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
            Modification Not Available
          </h3>
          <p className="text-gray-600 mb-4">
            This booking cannot be modified because it's either too close to the pickup time 
            (less than 2 hours) or the booking status doesn't allow modifications.
          </p>
          <Button onClick={onCancel} variant="outline">
            Back to Booking Details
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Modify Booking</h3>
          <p className="text-gray-600">Update your booking information</p>
        </div>
        <Button onClick={onCancel} variant="outline" className="px-4 py-2">
          <X className="w-4 h-4 mr-1" />
          Cancel
        </Button>
      </div>
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}
      {/* What Can Be Modified */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h4 className="font-medium text-blue-900 mb-2">What You Can Modify:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• Contact information (name and phone number)</li>
          <li>• Number of passengers (within vehicle capacity)</li>
          <li>• Special requests or notes</li>
        </ul>
        <div className="mt-2 text-xs text-blue-700">
          <strong>Note:</strong> Pickup/dropoff locations and dates cannot be changed. 
          For major changes, please cancel and create a new booking.
        </div>
      </div>
      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <User className="w-4 h-4 inline mr-1" />
              Full Name *
            </label>
            <Input
              type="text"
              value={formData?.guestName}
              onChange={(e) => handleInputChange('guestName', e?.target?.value)}
              placeholder="John Doe"
              className={validationErrors?.guestName ? 'border-red-500' : ''}
            />
            {validationErrors?.guestName && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {validationErrors?.guestName}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Phone className="w-4 h-4 inline mr-1" />
              Phone Number *
            </label>
            <Input
              type="tel"
              value={formData?.guestPhone}
              onChange={(e) => handleInputChange('guestPhone', e?.target?.value)}
              placeholder="+639171234567"
              className={validationErrors?.guestPhone ? 'border-red-500' : ''}
            />
            {validationErrors?.guestPhone && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {validationErrors?.guestPhone}
              </p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Users className="w-4 h-4 inline mr-1" />
              Number of Passengers *
            </label>
            <Input
              type="number"
              min="1"
              max={booking?.vehicle?.capacity || 15}
              value={formData?.passengerCount}
              onChange={(e) => handleInputChange('passengerCount', parseInt(e?.target?.value) || 1)}
              className={validationErrors?.passengerCount ? 'border-red-500' : ''}
            />
            {validationErrors?.passengerCount && (
              <p className="text-red-500 text-sm mt-1 flex items-center">
                <AlertCircle className="w-4 h-4 mr-1" />
                {validationErrors?.passengerCount}
              </p>
            )}
            {booking?.vehicle && (
              <p className="text-gray-500 text-xs mt-1">
                Vehicle capacity: {booking?.vehicle?.capacity} passengers
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <MessageSquare className="w-4 h-4 inline mr-1" />
              Special Requests
            </label>
            <Input
              type="text"
              value={formData?.notes}
              onChange={(e) => handleInputChange('notes', e?.target?.value)}
              placeholder="Any special requirements or notes"
            />
            <p className="text-gray-500 text-xs mt-1">Optional</p>
          </div>
        </div>

        {/* Current vs New Comparison */}
        {hasChanges() && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Summary of Changes</h4>
            <div className="space-y-2 text-sm">
              {formData?.guestName !== booking?.guestName && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Name:</span>
                  <div className="text-right">
                    <div className="line-through text-gray-400">{booking?.guestName}</div>
                    <div className="text-green-600">{formData?.guestName}</div>
                  </div>
                </div>
              )}
              
              {formData?.guestPhone !== booking?.guestPhone && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Phone:</span>
                  <div className="text-right">
                    <div className="line-through text-gray-400">{booking?.guestPhone}</div>
                    <div className="text-green-600">{formData?.guestPhone}</div>
                  </div>
                </div>
              )}
              
              {formData?.passengerCount !== booking?.passengerCount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Passengers:</span>
                  <div className="text-right">
                    <div className="line-through text-gray-400">{booking?.passengerCount}</div>
                    <div className="text-green-600">{formData?.passengerCount}</div>
                  </div>
                </div>
              )}
              
              {formData?.notes !== (booking?.notes || '') && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Notes:</span>
                  <div className="text-right max-w-xs">
                    <div className="line-through text-gray-400">
                      {booking?.notes || 'None'}
                    </div>
                    <div className="text-green-600">
                      {formData?.notes || 'None'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modification Restrictions */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h4 className="font-medium text-yellow-900 mb-2">Modification Restrictions</h4>
          <ul className="text-sm text-yellow-800 space-y-1">
            <li>• Modifications can only be made up to 2 hours before pickup time</li>
            <li>• Pickup/dropoff locations and dates cannot be changed</li>
            <li>• Increasing passengers may require vehicle change (subject to availability)</li>
            <li>• Price adjustments may apply for passenger count changes</li>
          </ul>
        </div>

        <div className="flex justify-end space-x-3 pt-6 border-t">
          <Button
            type="button"
            onClick={onCancel}
            variant="outline"
            className="px-6 py-2"
            disabled={loading}
          >
            Cancel
          </Button>
          
          <Button
            type="submit"
            disabled={loading || !hasChanges()}
            className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? (
              <>
                <Clock className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}