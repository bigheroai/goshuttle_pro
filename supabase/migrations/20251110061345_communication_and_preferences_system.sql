-- Location: supabase/migrations/20251110061345_communication_and_preferences_system.sql
-- Schema Analysis: Extending existing GoShuttle schema with user preferences, communications, and support features
-- Integration Type: Extension - Adding new tables to support missing functionality
-- Dependencies: user_profiles, bookings, driver_profiles

-- Create ENUM types for new functionality
CREATE TYPE public.preference_category AS ENUM ('travel', 'communication', 'accessibility', 'routes');
CREATE TYPE public.message_status AS ENUM ('sent', 'delivered', 'read');
CREATE TYPE public.support_status AS ENUM ('open', 'in_progress', 'resolved', 'closed');
CREATE TYPE public.support_priority AS ENUM ('low', 'medium', 'high', 'urgent');

-- User preferences table for saving travel, pickup, communication, and accessibility preferences
CREATE TABLE public.user_preferences (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    category public.preference_category NOT NULL,
    preference_key TEXT NOT NULL,
    preference_value JSONB NOT NULL DEFAULT '{}',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Communications table for driver-passenger messaging via Twilio
CREATE TABLE public.communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    recipient_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    message_type TEXT NOT NULL DEFAULT 'sms', -- 'sms', 'call', 'app_message'
    message_content TEXT NOT NULL,
    message_status public.message_status DEFAULT 'sent',
    twilio_message_sid TEXT, -- Store Twilio message SID for tracking
    phone_number TEXT, -- For SMS/call communications
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    delivered_at TIMESTAMPTZ,
    read_at TIMESTAMPTZ
);

-- Support tickets table for enhanced support functionality
CREATE TABLE public.support_tickets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL, -- Optional booking reference
    subject TEXT NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'general', -- 'general', 'booking', 'driver', 'payment', 'technical'
    priority public.support_priority DEFAULT 'medium',
    status public.support_status DEFAULT 'open',
    assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL, -- Admin/support staff
    resolved_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Support ticket messages for conversation threads
CREATE TABLE public.support_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    sender_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    message_content TEXT NOT NULL,
    attachment_url TEXT, -- For file attachments
    is_internal BOOLEAN DEFAULT false, -- For admin-only messages
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Add cancel_reason to bookings for tracking cancellation reasons
ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS cancel_reason TEXT,
ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS cancelled_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Essential Indexes for performance
CREATE INDEX idx_user_preferences_user_id ON public.user_preferences(user_id);
CREATE INDEX idx_user_preferences_category ON public.user_preferences(category);
CREATE INDEX idx_user_preferences_active ON public.user_preferences(is_active);

CREATE INDEX idx_communications_booking_id ON public.communications(booking_id);
CREATE INDEX idx_communications_sender ON public.communications(sender_id);
CREATE INDEX idx_communications_recipient ON public.communications(recipient_id);
CREATE INDEX idx_communications_status ON public.communications(message_status);

CREATE INDEX idx_support_tickets_user_id ON public.support_tickets(user_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);
CREATE INDEX idx_support_tickets_priority ON public.support_tickets(priority);
CREATE INDEX idx_support_tickets_created ON public.support_tickets(created_at);

CREATE INDEX idx_support_messages_ticket_id ON public.support_messages(ticket_id);
CREATE INDEX idx_support_messages_sender ON public.support_messages(sender_id);

CREATE INDEX idx_bookings_cancelled ON public.bookings(cancelled_at);

-- RLS Setup
ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- RLS Policies using Pattern 2 (Simple User Ownership)
CREATE POLICY "users_manage_own_preferences"
ON public.user_preferences
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Communication policies - users can access messages they send or receive
CREATE POLICY "users_access_own_communications"
ON public.communications
FOR ALL
TO authenticated
USING (sender_id = auth.uid() OR recipient_id = auth.uid())
WITH CHECK (sender_id = auth.uid());

CREATE POLICY "users_manage_own_support_tickets"
ON public.support_tickets
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Support staff can view/update all tickets (admin access)
CREATE POLICY "admin_access_all_support_tickets"
ON public.support_tickets
FOR ALL
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'corporate_manager')
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'corporate_manager')
));

-- Support messages - users can only access messages from their tickets
CREATE POLICY "users_access_own_ticket_messages"
ON public.support_messages
FOR ALL
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id AND st.user_id = auth.uid()
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.support_tickets st
    WHERE st.id = ticket_id AND st.user_id = auth.uid()
));

-- Admin access to all support messages
CREATE POLICY "admin_access_all_support_messages"
ON public.support_messages
FOR ALL
TO authenticated
USING (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'corporate_manager')
))
WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role IN ('admin', 'corporate_manager')
));

-- Update triggers for updated_at columns
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_user_preferences_updated_at
    BEFORE UPDATE ON public.user_preferences
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_support_tickets_updated_at
    BEFORE UPDATE ON public.support_tickets
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Helper function to send communication via Twilio
CREATE OR REPLACE FUNCTION public.send_communication_message(
    p_booking_id UUID,
    p_sender_id UUID,
    p_recipient_id UUID,
    p_message_content TEXT,
    p_message_type TEXT DEFAULT 'sms'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    communication_id UUID;
    recipient_phone TEXT;
BEGIN
    -- Get recipient phone number
    SELECT phone INTO recipient_phone
    FROM public.user_profiles
    WHERE id = p_recipient_id;
    
    -- Insert communication record
    INSERT INTO public.communications (
        booking_id,
        sender_id,
        recipient_id,
        message_content,
        message_type,
        phone_number
    ) VALUES (
        p_booking_id,
        p_sender_id,
        p_recipient_id,
        p_message_content,
        p_message_type,
        recipient_phone
    ) RETURNING id INTO communication_id;
    
    RETURN communication_id;
END;
$$;

-- Sample data for testing functionality
DO $$
DECLARE
    existing_user_id UUID;
    existing_booking_id UUID;
    preference_id UUID;
    communication_id UUID;
    ticket_id UUID;
BEGIN
    -- Get existing user and booking for sample data
    SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;
    SELECT id INTO existing_booking_id FROM public.bookings LIMIT 1;
    
    -- Only create sample data if we have existing users
    IF existing_user_id IS NOT NULL THEN
        -- Sample user preferences
        INSERT INTO public.user_preferences (user_id, category, preference_key, preference_value) VALUES
            (existing_user_id, 'travel', 'preferred_pickup_time', '"morning"'::jsonb),
            (existing_user_id, 'travel', 'favorite_routes', '["BGC to Makati", "Ortigas to QC"]'::jsonb),
            (existing_user_id, 'communication', 'notification_sms', 'true'::jsonb),
            (existing_user_id, 'communication', 'notification_email', 'true'::jsonb),
            (existing_user_id, 'accessibility', 'wheelchair_accessible', 'false'::jsonb);
        
        -- Sample support ticket if booking exists
        IF existing_booking_id IS NOT NULL THEN
            INSERT INTO public.support_tickets (
                user_id, 
                booking_id, 
                subject, 
                description, 
                category,
                priority
            ) VALUES (
                existing_user_id,
                existing_booking_id,
                'Unable to contact driver',
                'I cannot reach my assigned driver and my pickup time is approaching.',
                'driver',
                'high'
            ) RETURNING id INTO ticket_id;
            
            -- Sample support message
            INSERT INTO public.support_messages (ticket_id, sender_id, message_content) VALUES
                (ticket_id, existing_user_id, 'I have been trying to call the driver but no response. Please help.');
        END IF;
    ELSE
        RAISE NOTICE 'No existing users found. Create users first to see sample preferences and support data.';
    END IF;
END $$;