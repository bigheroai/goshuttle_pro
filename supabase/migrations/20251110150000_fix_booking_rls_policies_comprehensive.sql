-- Location: supabase/migrations/20251110150000_fix_booking_rls_policies_comprehensive.sql
-- Schema Analysis: Fix existing RLS policies that are causing booking creation failures
-- Integration Type: Modification - Replace all existing booking RLS policies with comprehensive ones
-- Dependencies: bookings table, user_profiles table, is_admin_from_auth() function

-- Comprehensive fix for booking RLS policies to handle both authenticated users and guest bookings

-- STEP 1: Drop ALL existing booking policies to avoid conflicts
DROP POLICY IF EXISTS "users_manage_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "allow_guest_booking_creation" ON public.bookings;
DROP POLICY IF EXISTS "admin_update_all_bookings" ON public.bookings;
DROP POLICY IF EXISTS "guest_booking_lookup" ON public.bookings;
DROP POLICY IF EXISTS "admin_read_all_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_users_create_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_users_manage_own_bookings" ON public.bookings;

-- STEP 2: Create comprehensive RLS policies for all scenarios

-- 1. Authenticated users can create their own bookings
CREATE POLICY "auth_users_create_bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid() 
    AND is_guest_booking = false
    AND user_id IS NOT NULL
);

-- 2. Authenticated users can view and update their own bookings
CREATE POLICY "auth_users_view_own_bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid() 
    AND is_guest_booking = false
);

CREATE POLICY "auth_users_update_own_bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (
    user_id = auth.uid() 
    AND is_guest_booking = false
)
WITH CHECK (
    user_id = auth.uid() 
    AND is_guest_booking = false
);

-- 3. Guest booking creation (anonymous users)
CREATE POLICY "guest_create_bookings"
ON public.bookings
FOR INSERT
TO anon
WITH CHECK (
    is_guest_booking = true 
    AND user_id IS NULL 
    AND guest_email IS NOT NULL 
    AND guest_name IS NOT NULL
    AND primary_passenger_email IS NOT NULL
    AND primary_passenger_first_name IS NOT NULL
    AND primary_passenger_last_name IS NOT NULL
);

-- 4. Guest booking lookup (anonymous users can view their bookings)
CREATE POLICY "guest_view_bookings"
ON public.bookings
FOR SELECT
TO anon
USING (
    is_guest_booking = true 
    AND user_id IS NULL 
    AND (
        booking_code IS NOT NULL OR 
        guest_email IS NOT NULL
    )
);

-- 5. Admin policies (can access all bookings)
CREATE POLICY "admin_full_access_bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (is_admin_from_auth())
WITH CHECK (is_admin_from_auth());

-- STEP 3: Ensure performance indexes exist
CREATE INDEX IF NOT EXISTS idx_bookings_guest_lookup 
ON public.bookings(is_guest_booking, guest_email, booking_code) 
WHERE is_guest_booking = true;

CREATE INDEX IF NOT EXISTS idx_bookings_user_auth 
ON public.bookings(user_id, is_guest_booking) 
WHERE is_guest_booking = false;

CREATE INDEX IF NOT EXISTS idx_bookings_primary_passenger_lookup
ON public.bookings(primary_passenger_email, primary_passenger_first_name, primary_passenger_last_name)
WHERE is_guest_booking = true;

-- STEP 4: Add helpful comment for debugging
COMMENT ON TABLE public.bookings IS 'Bookings table with comprehensive RLS policies for authenticated users, guest bookings, and admin access. Updated: 2025-11-10';