import { supabase } from '../lib/supabase';

class CommunicationService {
  // Send in-app message instead of SMS
  async sendInAppMessage(bookingId, recipientId, message, messageThread = 'general') {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase?.rpc('send_in_app_message', {
        p_booking_id: bookingId,
        p_sender_id: user?.id,
        p_recipient_id: recipientId,
        p_message_content: message,
        p_message_thread: messageThread
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('In-app message sending failed:', error);
      throw error;
    }
  }

  // Send SMS to driver via Twilio Edge Function (kept for fallback)
  async sendSMS(bookingId, recipientPhone, message, recipientId) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase?.functions?.invoke('send-sms-communication', {
        body: {
          to: recipientPhone,
          message: message,
          bookingId: bookingId,
          senderId: user?.id,
          recipientId: recipientId
        }
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('SMS sending failed:', error);
      throw error;
    }
  }

  // Make a call to driver
  async callDriver(phoneNumber) {
    try {
      // Open phone dialer
      window.open(`tel:${phoneNumber}`);
      
      // Log the communication attempt
      const { data: { user } } = await supabase?.auth?.getUser();
      if (user) {
        await this.logCommunication(null, user?.id, null, 'call', `Call attempted to ${phoneNumber}`);
      }
      
      return { success: true };
    } catch (error) {
      console.error('Call failed:', error);
      throw error;
    }
  }

  // Get communication history for a conversation
  async getConversationHistory(conversationId) {
    try {
      const { data, error } = await supabase?.from('communications')?.select(`
          *,
          sender:sender_id(full_name, avatar_url),
          recipient:recipient_id(full_name, avatar_url)
        `)?.eq('conversation_id', conversationId)?.eq('message_type', 'in_app')?.order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  }

  // Get communication history for a booking (legacy support)
  async getCommunicationHistory(bookingId) {
    try {
      const { data, error } = await supabase?.from('communications')?.select(`
          *,
          sender:sender_id(full_name, avatar_url),
          recipient:recipient_id(full_name, avatar_url)
        `)?.eq('booking_id', bookingId)?.order('created_at', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error loading communication history:', error);
      return [];
    }
  }

  // Get conversation ID for booking
  async getConversationId(bookingId, recipientId) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase?.rpc('get_conversation_id', {
        user1_id: user?.id,
        user2_id: recipientId,
        booking_uuid: bookingId
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error getting conversation ID:', error);
      return null;
    }
  }

  // Subscribe to real-time messages for a conversation
  subscribeToConversation(conversationId, onMessageReceived) {
    try {
      const channel = supabase?.channel(`conversation:${conversationId}`)?.on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'communications',
          filter: `conversation_id=eq.${conversationId}`
        }, (payload) => {
          if (onMessageReceived) {
            onMessageReceived(payload?.new);
          }
        })?.subscribe();

      return channel;
    } catch (error) {
      console.error('Error subscribing to conversation:', error);
      return null;
    }
  }

  // Unsubscribe from real-time messages
  unsubscribeFromConversation(channel) {
    if (channel) {
      supabase?.removeChannel(channel);
    }
  }

  // Mark messages as read
  async markMessagesAsRead(conversationId) {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data, error } = await supabase?.rpc('mark_messages_as_read', {
        p_conversation_id: conversationId,
        p_user_id: user?.id
      });

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marking messages as read:', error);
      throw error;
    }
  }

  // Log communication attempt
  async logCommunication(bookingId, senderId, recipientId, messageType, messageContent) {
    try {
      const { data, error } = await supabase?.from('communications')?.insert({
          booking_id: bookingId,
          sender_id: senderId,
          recipient_id: recipientId,
          message_type: messageType,
          message_content: messageContent,
          message_status: 'sent'
        })?.select()?.single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error logging communication:', error);
      throw error;
    }
  }

  // Contact driver with in-app messaging (primary method)
  async contactDriver(booking, message, contactMethod = 'in_app') {
    try {
      const { data: { user } } = await supabase?.auth?.getUser();
      if (!user) throw new Error('Not authenticated');

      // Get driver information from booking
      const { data: driverAssignment } = await supabase?.from('driver_assignments')?.select(`
          driver:driver_profiles(
            user_id,
            user:user_profiles(phone, full_name)
          )
        `)?.eq('booking_id', booking?.id)?.eq('assignment_status', 'confirmed')?.single();

      if (!driverAssignment?.driver?.user) {
        throw new Error('Driver contact information not available');
      }

      const driver = driverAssignment?.driver;
      const driverPhone = driver?.user?.phone;

      if (contactMethod === 'call') {
        return await this.callDriver(driverPhone);
      } else if (contactMethod === 'sms') {
        // Fallback to SMS if explicitly requested
        const contextMessage = `GoShuttle - Booking ${booking?.booking_code}: ${message}`;
        return await this.sendSMS(booking?.id, driverPhone, contextMessage, driver?.user_id);
      } else {
        // Default to in-app messaging
        return await this.sendInAppMessage(booking?.id, driver?.user_id, message);
      }
    } catch (error) {
      console.error('Error contacting driver:', error);
      throw error;
    }
  }

  // Mark single communication as read (legacy support)
  async markAsRead(communicationId) {
    try {
      const { data, error } = await supabase?.from('communications')?.update({ 
          message_status: 'read',
          read_at: new Date()?.toISOString()
        })?.eq('id', communicationId)?.select()?.single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error marking communication as read:', error);
      throw error;
    }
  }
}

export const communicationService = new CommunicationService();
export default communicationService;