-- Location: supabase/migrations/20260413100000_fix_bookings_rls_allow_authenticated.sql
-- Fix: RLS policy was blocking authenticated users from creating bookings
-- The previous policy required is_guest_booking = false, but authenticated users
-- can also create bookings with is_guest_booking = true (e.g. booking for a guest).
-- This migration replaces the restrictive INSERT policy with a permissive one.

-- Drop the overly restrictive INSERT policy for authenticated users
DROP POLICY IF EXISTS "auth_users_create_bookings" ON public.bookings;

-- Drop other potentially conflicting policies
DROP POLICY IF EXISTS "authenticated_users_create_bookings" ON public.bookings;
DROP POLICY IF EXISTS "users_manage_own_bookings" ON public.bookings;

-- Create a permissive INSERT policy: authenticated users can insert bookings
-- where user_id matches their auth.uid() (their own bookings)
CREATE POLICY "auth_users_create_own_bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
);

-- Also allow authenticated users to create guest bookings on behalf of guests
-- (where user_id is null but they are authenticated)
DROP POLICY IF EXISTS "auth_users_create_guest_bookings" ON public.bookings;
CREATE POLICY "auth_users_create_guest_bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
    user_id IS NULL
    AND is_guest_booking = true
);

-- Ensure the SELECT policy for authenticated users is correct
DROP POLICY IF EXISTS "auth_users_view_own_bookings" ON public.bookings;
CREATE POLICY "auth_users_view_own_bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- Ensure UPDATE policy is correct
DROP POLICY IF EXISTS "auth_users_update_own_bookings" ON public.bookings;
CREATE POLICY "auth_users_update_own_bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admin full access (keep existing)
DROP POLICY IF EXISTS "admin_full_access_bookings" ON public.bookings;
CREATE POLICY "admin_full_access_bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (is_admin_from_auth())
WITH CHECK (is_admin_from_auth());

-- Guest booking creation (anonymous users) - keep existing
DROP POLICY IF EXISTS "guest_create_bookings" ON public.bookings;
CREATE POLICY "guest_create_bookings"
ON public.bookings
FOR INSERT
TO anon
WITH CHECK (
    is_guest_booking = true
    AND user_id IS NULL
    AND guest_email IS NOT NULL
    AND guest_name IS NOT NULL
);

-- Guest booking lookup
DROP POLICY IF EXISTS "guest_view_bookings" ON public.bookings;
CREATE POLICY "guest_view_bookings"
ON public.bookings
FOR SELECT
TO anon
USING (
    is_guest_booking = true
    AND user_id IS NULL
);

COMMENT ON TABLE public.bookings IS 'Bookings table - RLS fixed 2026-04-13: authenticated users can create bookings with user_id = auth.uid()';
