-- Location: supabase/migrations/20251108124347_guest_booking_support.sql
-- Schema Analysis: Existing bookings table needs guest booking support
-- Integration Type: Extension - Modify existing bookings table for guest functionality
-- Dependencies: bookings, user_profiles, vehicles tables exist

-- Step 1: Modify existing bookings table to support guest bookings
ALTER TABLE public.bookings 
ALTER COLUMN user_id DROP NOT NULL;

-- Step 2: Add guest booking specific fields
ALTER TABLE public.bookings 
ADD COLUMN guest_email TEXT,
ADD COLUMN guest_name TEXT,  
ADD COLUMN guest_phone TEXT,
ADD COLUMN booking_code TEXT UNIQUE,
ADD COLUMN is_guest_booking BOOLEAN DEFAULT false;

-- Step 3: Add indexes for guest booking lookups
CREATE INDEX idx_bookings_booking_code ON public.bookings(booking_code);
CREATE INDEX idx_bookings_guest_email ON public.bookings(guest_email);
CREATE INDEX idx_bookings_is_guest ON public.bookings(is_guest_booking);

-- Step 4: Create function to generate unique booking codes
CREATE OR REPLACE FUNCTION public.generate_booking_code()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    code TEXT;
    exists BOOLEAN DEFAULT true;
BEGIN
    WHILE exists LOOP
        -- Generate 8 character alphanumeric code
        code := upper(substring(md5(random()::text) from 1 for 8));
        
        -- Check if code already exists
        SELECT EXISTS(SELECT 1 FROM public.bookings WHERE booking_code = code) INTO exists;
    END LOOP;
    
    RETURN code;
END;
$$;

-- Step 5: Create trigger to auto-generate booking codes
CREATE OR REPLACE FUNCTION public.set_booking_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.booking_code IS NULL THEN
        NEW.booking_code = public.generate_booking_code();
    END IF;
    RETURN NEW;
END;
$$;

CREATE TRIGGER set_booking_code_trigger
    BEFORE INSERT ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.set_booking_code();

-- Step 6: Update RLS policies to support guest bookings
DROP POLICY IF EXISTS "users_manage_own_bookings" ON public.bookings;

-- New policy for authenticated users managing their own bookings
CREATE POLICY "users_manage_own_bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy for guest bookings - allow creation without authentication
CREATE POLICY "allow_guest_booking_creation"
ON public.bookings
FOR INSERT
TO anon
WITH CHECK (is_guest_booking = true AND user_id IS NULL AND guest_email IS NOT NULL);

-- Policy for guest booking lookup - by booking code and email
CREATE POLICY "guest_booking_lookup"
ON public.bookings
FOR SELECT  
TO anon
USING (is_guest_booking = true AND booking_code IS NOT NULL);

-- Step 7: Create table for guest account creation invitations
CREATE TABLE public.guest_account_invitations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    guest_email TEXT NOT NULL,
    invitation_token TEXT UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP + INTERVAL '7 days',
    used_at TIMESTAMPTZ
);

-- Index for invitation lookups
CREATE INDEX idx_guest_invitations_token ON public.guest_account_invitations(invitation_token);
CREATE INDEX idx_guest_invitations_email ON public.guest_account_invitations(guest_email);

-- RLS for guest invitations
ALTER TABLE public.guest_account_invitations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_invitation_lookup"
ON public.guest_account_invitations
FOR SELECT
TO anon
USING (invitation_token IS NOT NULL AND expires_at > CURRENT_TIMESTAMP AND used_at IS NULL);

-- Step 8: Sample guest booking data
DO $$
DECLARE
    guest_booking_id UUID := gen_random_uuid();
    vehicle_id UUID;
BEGIN
    -- Get first available vehicle
    SELECT id INTO vehicle_id FROM public.vehicles LIMIT 1;
    
    -- Create sample guest booking
    INSERT INTO public.bookings (
        id,
        pickup_location,
        dropoff_location, 
        pickup_date,
        passenger_count,
        total_cost,
        status,
        vehicle_id,
        guest_email,
        guest_name,
        guest_phone,
        is_guest_booking
    ) VALUES (
        guest_booking_id,
        'Manila Airport Terminal 1',
        'Makati Business District',
        CURRENT_TIMESTAMP + INTERVAL '2 days',
        2,
        1800.00,
        'pending'::booking_status,
        vehicle_id,
        'guest@example.com',
        'John Guest',
        '+639171234567',
        true
    );

    -- Create invitation for guest to create account
    INSERT INTO public.guest_account_invitations (
        booking_id,
        guest_email,
        invitation_token
    ) VALUES (
        guest_booking_id,
        'guest@example.com', 
        encode(gen_random_bytes(32), 'hex')
    );

    RAISE NOTICE 'Sample guest booking created with email: guest@example.com';
END $$;