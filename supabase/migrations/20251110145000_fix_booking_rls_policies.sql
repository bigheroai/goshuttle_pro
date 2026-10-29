-- Location: supabase/migrations/20251110145000_fix_booking_rls_policies.sql
-- Schema Analysis: Existing bookings table with RLS policies that are too restrictive
-- Integration Type: Modification - Fix existing RLS policies for booking creation
-- Dependencies: bookings table, user_profiles table, existing RLS policies

-- Fix RLS policies for bookings table to properly handle both authenticated users and guest bookings

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "allow_guest_booking_creation" ON public.bookings;

-- Create improved policies for booking creation and management

-- 1. Allow authenticated users to create their own bookings
CREATE POLICY "authenticated_users_create_bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() AND is_guest_booking = false);

-- 2. Allow authenticated users to view and update their own bookings
CREATE POLICY "authenticated_users_manage_own_bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (user_id = auth.uid() AND is_guest_booking = false)
WITH CHECK (user_id = auth.uid() AND is_guest_booking = false);

-- 3. Allow guest booking creation (anonymous users can insert guest bookings)
CREATE POLICY "allow_guest_booking_creation"
ON public.bookings
FOR INSERT
TO anon
WITH CHECK (
    is_guest_booking = true 
    AND user_id IS NULL 
    AND guest_email IS NOT NULL 
    AND guest_name IS NOT NULL
);

-- 4. Allow guest booking lookup (anonymous users can view their bookings)
CREATE POLICY "guest_booking_lookup"
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

-- 5. Keep existing admin policies (should already exist, but ensure they work)
-- Admin can read all bookings - existing policy should remain
-- Admin can update all bookings - existing policy should remain

-- Add index for guest booking lookups to improve performance
CREATE INDEX IF NOT EXISTS idx_bookings_guest_lookup 
ON public.bookings(is_guest_booking, guest_email, booking_code) 
WHERE is_guest_booking = true;

-- Add index for authenticated user bookings
CREATE INDEX IF NOT EXISTS idx_bookings_user_auth 
ON public.bookings(user_id, is_guest_booking) 
WHERE is_guest_booking = false;