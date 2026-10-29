-- Location: supabase/migrations/20251110063400_in_app_messaging_system.sql
-- Schema Analysis: Extending existing communications table for in-app messaging
-- Integration Type: Extension of existing communications system
-- Dependencies: communications, bookings, user_profiles, driver_assignments, driver_profiles

-- Add support for in-app messaging to existing communications table
ALTER TABLE public.communications 
ADD COLUMN IF NOT EXISTS is_real_time BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS conversation_id UUID,
ADD COLUMN IF NOT EXISTS message_thread TEXT,
ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Create index for better real-time performance
CREATE INDEX IF NOT EXISTS idx_communications_conversation_id ON public.communications(conversation_id);
CREATE INDEX IF NOT EXISTS idx_communications_real_time ON public.communications(is_real_time, created_at);
CREATE INDEX IF NOT EXISTS idx_communications_thread ON public.communications(message_thread);

-- Create function to generate conversation ID between two users
CREATE OR REPLACE FUNCTION public.generate_conversation_id(user1_id UUID, user2_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT 
  CASE 
    WHEN user1_id < user2_id THEN 
      gen_random_uuid()
    ELSE 
      gen_random_uuid()
  END;
$$;

-- Function to get or create conversation between users
CREATE OR REPLACE FUNCTION public.get_conversation_id(user1_id UUID, user2_id UUID, booking_uuid UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    existing_conversation_id UUID;
    new_conversation_id UUID;
BEGIN
    -- Try to find existing conversation for this booking
    SELECT DISTINCT conversation_id INTO existing_conversation_id
    FROM public.communications c
    WHERE c.booking_id = booking_uuid
    AND c.conversation_id IS NOT NULL
    LIMIT 1;
    
    -- If conversation exists, return it
    IF existing_conversation_id IS NOT NULL THEN
        RETURN existing_conversation_id;
    END IF;
    
    -- Create new conversation ID
    new_conversation_id := gen_random_uuid();
    
    RETURN new_conversation_id;
END;
$func$;

-- Function to send in-app message
CREATE OR REPLACE FUNCTION public.send_in_app_message(
    p_booking_id UUID,
    p_sender_id UUID,
    p_recipient_id UUID,
    p_message_content TEXT,
    p_message_thread TEXT DEFAULT 'general'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    conversation_uuid UUID;
    new_message_id UUID;
BEGIN
    -- Get or create conversation
    conversation_uuid := public.get_conversation_id(p_sender_id, p_recipient_id, p_booking_id);
    
    -- Insert the message
    INSERT INTO public.communications (
        id,
        booking_id,
        sender_id,
        recipient_id,
        message_content,
        message_type,
        message_status,
        is_real_time,
        conversation_id,
        message_thread,
        created_at
    ) VALUES (
        gen_random_uuid(),
        p_booking_id,
        p_sender_id,
        p_recipient_id,
        p_message_content,
        'in_app',
        'sent',
        true,
        conversation_uuid,
        p_message_thread,
        CURRENT_TIMESTAMP
    ) RETURNING id INTO new_message_id;
    
    RETURN new_message_id;
END;
$func$;

-- Function to mark messages as read
CREATE OR REPLACE FUNCTION public.mark_messages_as_read(
    p_conversation_id UUID,
    p_user_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
    updated_count INTEGER;
BEGIN
    UPDATE public.communications
    SET 
        message_status = 'read',
        read_at = CURRENT_TIMESTAMP
    WHERE conversation_id = p_conversation_id
    AND recipient_id = p_user_id
    AND message_status != 'read';
    
    GET DIAGNOSTICS updated_count = ROW_COUNT;
    RETURN updated_count;
END;
$func$;

-- Create RLS policies for in-app messaging (extends existing policies)
-- The existing policy "users_access_own_communications" already covers this table
-- Adding specific policy for conversation access

CREATE POLICY "users_access_conversation_messages"
ON public.communications
FOR SELECT
TO authenticated
USING (
    (sender_id = auth.uid() OR recipient_id = auth.uid())
    AND message_type = 'in_app'
    AND conversation_id IS NOT NULL
);

-- Mock data for testing in-app messaging
DO $$
DECLARE
    existing_booking_id UUID;
    customer_id UUID;
    driver_id UUID;
    conversation_uuid UUID;
BEGIN
    -- Get existing booking and users
    SELECT b.id, b.user_id INTO existing_booking_id, customer_id
    FROM public.bookings b
    WHERE b.status = 'confirmed'
    LIMIT 1;
    
    -- Get driver for this booking
    SELECT dp.user_id INTO driver_id
    FROM public.driver_assignments da
    JOIN public.driver_profiles dp ON da.driver_id = dp.id
    WHERE da.booking_id = existing_booking_id
    AND da.assignment_status = 'confirmed'
    LIMIT 1;
    
    -- Only create sample data if we have the required relationships
    IF existing_booking_id IS NOT NULL AND customer_id IS NOT NULL AND driver_id IS NOT NULL THEN
        -- Create sample conversation
        conversation_uuid := public.get_conversation_id(customer_id, driver_id, existing_booking_id);
        
        -- Insert sample in-app messages
        INSERT INTO public.communications (
            booking_id,
            sender_id,
            recipient_id,
            message_content,
            message_type,
            message_status,
            is_real_time,
            conversation_id,
            message_thread,
            created_at
        ) VALUES
            (existing_booking_id, customer_id, driver_id, 'Hi! I am ready for pickup at the lobby.', 'in_app', 'delivered', true, conversation_uuid, 'general', CURRENT_TIMESTAMP - INTERVAL '10 minutes'),
            (existing_booking_id, driver_id, customer_id, 'Perfect! I will be there in 2 minutes. Look for the white Toyota Hiace.', 'in_app', 'read', true, conversation_uuid, 'general', CURRENT_TIMESTAMP - INTERVAL '8 minutes'),
            (existing_booking_id, customer_id, driver_id, 'Great! Thank you for the update.', 'in_app', 'sent', true, conversation_uuid, 'general', CURRENT_TIMESTAMP - INTERVAL '5 minutes');
    ELSE
        RAISE NOTICE 'Skipping in-app messaging mock data - missing booking or user relationships';
    END IF;
END $$;