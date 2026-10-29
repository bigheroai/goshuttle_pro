-- Location: supabase/migrations/20260414121621_fix_bookings_rls_final.sql
-- Fix: "new row violates row-level security policy" on bookings table
-- Root cause: Multiple conflicting INSERT policies from previous migrations
-- Some policies restrict is_guest_booking = false, blocking bookings where the field
-- may be true or where the authenticated user is booking on behalf of a guest.

-- Drop ALL existing INSERT policies for authenticated users to eliminate conflicts
DROP POLICY IF EXISTS "auth_users_create_bookings" ON public.bookings;
DROP POLICY IF EXISTS "auth_users_create_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "auth_users_create_guest_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_users_create_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_users_manage_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "users_manage_own_bookings" ON public.bookings;

-- Drop existing SELECT/UPDATE policies to replace with clean versions
DROP POLICY IF EXISTS "auth_users_view_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "auth_users_update_own_bookings" ON public.bookings;

-- Single permissive INSERT policy for authenticated users:
-- Allows inserting bookings where user_id = auth.uid() (own bookings)
-- OR user_id IS NULL (guest bookings created by an authenticated user on behalf of a guest)
DROP POLICY IF EXISTS "authenticated_users_insert_bookings" ON public.bookings;
CREATE POLICY "authenticated_users_insert_bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
    user_id = auth.uid()
    OR user_id IS NULL
);

-- SELECT: authenticated users can view their own bookings
DROP POLICY IF EXISTS "authenticated_users_select_bookings" ON public.bookings;
CREATE POLICY "authenticated_users_select_bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (
    user_id = auth.uid()
);

-- UPDATE: authenticated users can update their own bookings
DROP POLICY IF EXISTS "authenticated_users_update_bookings" ON public.bookings;
CREATE POLICY "authenticated_users_update_bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admin full access (recreate to ensure it exists)
DROP POLICY IF EXISTS "admin_full_access_bookings" ON public.bookings;
CREATE POLICY "admin_full_access_bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Guest booking creation (anonymous users)
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

-- Guest booking lookup (anonymous users)
DROP POLICY IF EXISTS "guest_view_bookings" ON public.bookings;
CREATE POLICY "guest_view_bookings"
ON public.bookings
FOR SELECT
TO anon
USING (
    is_guest_booking = true
    AND user_id IS NULL
);

COMMENT ON TABLE public.bookings IS 'Bookings table - RLS fixed 2026-04-14: single permissive INSERT policy for authenticated users (user_id = auth.uid() OR user_id IS NULL)';
