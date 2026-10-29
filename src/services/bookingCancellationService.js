import { supabase } from '../lib/supabase';

class BookingCancellationService {
  // Cancel a booking with reason
  async cancelBooking(bookingId, reason, refundRequested = false) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get booking details first
      const { data: booking, error: fetchError } = await supabase?.from('bookings')?.select('*')?.eq('id', bookingId)?.eq('user_id', user?.id)?.single();

      if (fetchError || !booking) {
        throw new Error('Booking not found or access denied');
      }

      // Check if booking can be cancelled
      if (['completed', 'cancelled']?.includes(booking?.status)) {
        throw new Error('This booking cannot be cancelled');
      }

      // Calculate cancellation fee based on timing
      const cancellationInfo = this.calculateCancellationPolicy(booking);
      
      // Update booking status and details
      const { data, error } = await supabase?.from('bookings')?.update({
          status: 'cancelled',
          cancel_reason: reason,
          cancelled_at: new Date()?.toISOString(),
          cancelled_by: user?.id
        })?.eq('id', bookingId)?.select()?.single();

      if (error) throw error;

      // Create support ticket for refund if requested
      if (refundRequested && cancellationInfo?.refundEligible) {
        await this.createRefundRequest(booking, cancellationInfo, reason);
      }

      // Notify relevant parties
      await this.notifyCancellation(booking, reason);

      return {
        ...data,
        cancellationInfo,
        refundEligible: cancellationInfo?.refundEligible
      };
    } catch (error) {
      console.error('Error cancelling booking:', error);
      throw error;
    }
  }

  // Calculate cancellation policy and fees
  calculateCancellationPolicy(booking) {
    const now = new Date();
    const pickupTime = new Date(booking.pickup_date);
    const hoursUntilPickup = (pickupTime - now) / (1000 * 60 * 60);

    let cancellationFee = 0;
    let refundAmount = booking?.total_cost || 0;
    let refundEligible = true;
    let policy = '';

    if (hoursUntilPickup >= 24) {
      // Free cancellation 24+ hours before
      cancellationFee = 0;
      policy = 'Free cancellation - 24+ hours notice';
    } else if (hoursUntilPickup >= 6) {
      // 20% fee for 6-24 hours before
      cancellationFee = refundAmount * 0.2;
      policy = '20% cancellation fee - 6-24 hours notice';
    } else if (hoursUntilPickup >= 2) {
      // 50% fee for 2-6 hours before
      cancellationFee = refundAmount * 0.5;
      policy = '50% cancellation fee - 2-6 hours notice';
    } else if (hoursUntilPickup >= 0) {
      // No refund for less than 2 hours or after pickup time
      cancellationFee = refundAmount;
      refundEligible = false;
      policy = 'No refund - Less than 2 hours notice';
    } else {
      // Past pickup time
      cancellationFee = refundAmount;
      refundEligible = false;
      policy = 'No refund - Past pickup time';
    }

    refundAmount = Math.max(0, refundAmount - cancellationFee);

    return {
      hoursUntilPickup: Math.max(0, hoursUntilPickup),
      cancellationFee,
      refundAmount,
      refundEligible,
      policy
    };
  }

  // Create refund request support ticket
  async createRefundRequest(booking, cancellationInfo, reason) {
    try {
      const { data, error } = await supabase?.from('support_tickets')?.insert({
          user_id: booking?.user_id,
          booking_id: booking?.id,
          subject: `Refund Request - Booking ${booking?.booking_code}`,
          description: `Cancellation Reason: ${reason}\n\nRefund Amount: ₱${cancellationInfo?.refundAmount?.toFixed(2)}\nCancellation Fee: ₱${cancellationInfo?.cancellationFee?.toFixed(2)}\nPolicy: ${cancellationInfo?.policy}`,
          category: 'payment',
          priority: 'medium'
        })?.select()?.single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating refund request:', error);
    }
  }

  // Send cancellation notifications
  async notifyCancellation(booking, reason) {
    try {
      // Check if there's an assigned driver
      const { data: assignment } = await supabase?.from('driver_assignments')?.select(`
          driver_id,
          driver:driver_profiles(
            user:user_profiles(phone, full_name)
          )
        `)?.eq('booking_id', booking?.id)?.eq('assignment_status', 'confirmed')?.single();

      if (assignment?.driver?.user?.phone) {
        // Notify driver via SMS
        try {
          await supabase?.functions?.invoke('send-sms-communication', {
            body: {
              to: assignment?.driver?.user?.phone,
              message: `GoShuttle - Booking ${booking?.booking_code} has been cancelled by the passenger. Reason: ${reason}`,
              bookingId: booking?.id,
              senderId: booking?.user_id,
              recipientId: assignment?.driver_id
            }
          });
        } catch (smsError) {
          console.error('Failed to notify driver:', smsError);
        }
      }

      // Update assignment status
      if (assignment) {
        await supabase?.from('driver_assignments')?.update({ assignment_status: 'cancelled' })?.eq('booking_id', booking?.id);
      }

    } catch (error) {
      console.error('Error sending cancellation notifications:', error);
    }
  }

  // Get cancellation reasons
  getCancellationReasons() {
    return [
      { id: 'schedule_change', label: 'Schedule changed', description: 'My plans have changed' },
      { id: 'found_alternative', label: 'Found alternative', description: 'Found another transportation option' },
      { id: 'emergency', label: 'Emergency', description: 'Emergency situation arose' },
      { id: 'driver_issue', label: 'Driver issue', description: 'Issue with assigned driver' },
      { id: 'weather', label: 'Weather conditions', description: 'Weather or road conditions' },
      { id: 'price_concern', label: 'Price concern', description: 'Pricing issue or concern' },
      { id: 'duplicate_booking', label: 'Duplicate booking', description: 'Accidentally booked multiple trips' },
      { id: 'other', label: 'Other', description: 'Other reason (please specify)' }
    ];
  }

  // Check if booking can be cancelled
  async canCancelBooking(bookingId) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) return { canCancel: false, reason: 'Not authenticated' };

      const { data: booking, error } = await supabase?.from('bookings')?.select('status, pickup_date')?.eq('id', bookingId)?.eq('user_id', user?.id)?.single();

      if (error || !booking) {
        return { canCancel: false, reason: 'Booking not found' };
      }

      if (['completed', 'cancelled']?.includes(booking?.status)) {
        return { canCancel: false, reason: 'Booking already completed or cancelled' };
      }

      const now = new Date();
      const pickupTime = new Date(booking.pickup_date);
      const hoursUntilPickup = (pickupTime - now) / (1000 * 60 * 60);

      // Allow cancellation but show policy
      return {
        canCancel: true,
        hoursUntilPickup: Math.max(0, hoursUntilPickup),
        policy: this.calculateCancellationPolicy(booking)
      };
    } catch (error) {
      console.error('Error checking cancellation eligibility:', error);
      return { canCancel: false, reason: 'Error checking eligibility' };
    }
  }

  // Get user's cancelled bookings
  async getCancelledBookings(userId) {
    try {
      const { data, error } = await supabase?.from('bookings')?.select(`
          *,
          vehicle:vehicles(name, type),
          cancelled_by_user:cancelled_by(full_name)
        `)?.eq('user_id', userId)?.eq('status', 'cancelled')?.order('cancelled_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading cancelled bookings:', error);
      return [];
    }
  }
}

export const bookingCancellationService = new BookingCancellationService();
export default bookingCancellationService;