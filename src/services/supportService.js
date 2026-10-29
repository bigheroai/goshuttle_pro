import { supabase } from '../lib/supabase';

class SupportService {
  // Create a new support ticket
  async createTicket(ticketData) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase?.from('support_tickets')?.insert({
          user_id: user?.id,
          booking_id: ticketData?.bookingId || null,
          subject: ticketData?.subject,
          description: ticketData?.description,
          category: ticketData?.category || 'general',
          priority: ticketData?.priority || 'medium'
        })?.select(`
          *,
          user:user_profiles(full_name, email),
          booking:bookings(booking_code, pickup_location, dropoff_location)
        `)?.single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating support ticket:', error);
      throw error;
    }
  }

  // Get user's support tickets
  async getUserTickets(userId, status = null) {
    try {
      let query = supabase?.from('support_tickets')?.select(`
          *,
          booking:bookings(booking_code, pickup_location, dropoff_location),
          messages:support_messages(
            id,
            message_content,
            created_at,
            sender:sender_id(full_name)
          )
        `)?.eq('user_id', userId);

      if (status) {
        query = query?.eq('status', status);
      }

      const { data, error } = await query?.order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading support tickets:', error);
      return [];
    }
  }

  // Get ticket details with messages
  async getTicketDetails(ticketId) {
    try {
      const { data, error } = await supabase?.from('support_tickets')?.select(`
          *,
          user:user_profiles(full_name, email),
          booking:bookings(booking_code, pickup_location, dropoff_location),
          messages:support_messages(
            *,
            sender:sender_id(full_name, avatar_url)
          )
        `)?.eq('id', ticketId)?.single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error loading ticket details:', error);
      throw error;
    }
  }

  // Add message to support ticket
  async addMessage(ticketId, message, attachmentUrl = null) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase?.from('support_messages')?.insert({
          ticket_id: ticketId,
          sender_id: user?.id,
          message_content: message,
          attachment_url: attachmentUrl
        })?.select(`
          *,
          sender:sender_id(full_name, avatar_url)
        `)?.single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error adding support message:', error);
      throw error;
    }
  }

  // Update ticket status
  async updateTicketStatus(ticketId, status) {
    try {
      const updates = { status };
      if (status === 'resolved') {
        updates.resolved_at = new Date()?.toISOString();
      }

      const { data, error } = await supabase?.from('support_tickets')?.update(updates)?.eq('id', ticketId)?.select()?.single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating ticket status:', error);
      throw error;
    }
  }

  // Get support categories
  getSupportCategories() {
    return [
      { id: 'general', label: 'General Inquiry', icon: 'HelpCircle' },
      { id: 'booking', label: 'Booking Issues', icon: 'Calendar' },
      { id: 'driver', label: 'Driver Related', icon: 'User' },
      { id: 'payment', label: 'Payment & Billing', icon: 'CreditCard' },
      { id: 'technical', label: 'Technical Support', icon: 'Settings' },
      { id: 'safety', label: 'Safety & Emergency', icon: 'Shield' }
    ];
  }

  // Get priority levels
  getPriorityLevels() {
    return [
      { id: 'low', label: 'Low', color: 'gray' },
      { id: 'medium', label: 'Medium', color: 'yellow' },
      { id: 'high', label: 'High', color: 'orange' },
      { id: 'urgent', label: 'Urgent', color: 'red' }
    ];
  }

  // Create quick support tickets for common issues
  async createQuickTicket(type, bookingId = null) {
    const quickTickets = {
      'driver-contact': {
        subject: 'Unable to contact driver',
        description: 'I cannot reach my assigned driver for my upcoming trip.',
        category: 'driver',
        priority: 'high'
      },
      'booking-modification': {
        subject: 'Need to modify booking',
        description: 'I need to change my booking details (time, location, or passenger count).',
        category: 'booking',
        priority: 'medium'
      },
      'payment-issue': {
        subject: 'Payment processing problem',
        description: 'I am experiencing issues with payment processing for my booking.',
        category: 'payment',
        priority: 'medium'
      },
      'vehicle-issue': {
        subject: 'Vehicle or service issue',
        description: 'There is an issue with the vehicle or service quality.',
        category: 'general',
        priority: 'medium'
      }
    };

    const ticketTemplate = quickTickets?.[type];
    if (!ticketTemplate) {
      throw new Error('Invalid quick ticket type');
    }

    return await this.createTicket({
      ...ticketTemplate,
      bookingId
    });
  }

  // Get FAQ items
  getFAQItems() {
    return [
      {
        id: '1',
        question: 'How do I cancel my booking?',
        answer: 'You can cancel your booking from the live tracking page or customer account. Cancellation fees may apply depending on timing.',
        category: 'booking'
      },
      {
        id: '2', 
        question: 'What if my driver is late?',
        answer: 'If your driver is running late, you will receive SMS notifications. You can also contact the driver directly or call our support team.',
        category: 'driver'
      },
      {
        id: '3',
        question: 'How do I contact my driver?',
        answer: 'Once your booking is confirmed, you can call or message your driver directly from the live tracking page.',
        category: 'driver'
      },
      {
        id: '4',
        question: 'What payment methods are accepted?',
        answer: 'We accept cash, credit/debit cards, GCash, PayMaya, and other digital wallets. Payment can be made during booking or to the driver.',
        category: 'payment'
      },
      {
        id: '5',
        question: 'How do I track my trip?',
        answer: 'Use the live tracking feature in your account to see real-time location updates, ETA, and driver information.',
        category: 'tracking'
      }
    ];
  }
}

export const supportService = new SupportService();
export default supportService;