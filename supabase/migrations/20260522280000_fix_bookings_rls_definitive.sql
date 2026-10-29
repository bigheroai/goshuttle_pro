-- Migration: Definitive fix for bookings RLS INSERT policy
-- Timestamp: 20260522280000
--
-- ROOT CAUSE: Multiple conflicting INSERT policies accumulated across migrations:
--   - "auth_users_create_bookings"            (20251110150000)
--   - "auth_users_create_own_bookings"        (20260413100000)
--   - "auth_users_create_guest_bookings"      (20260413100000)
--   - "authenticated_users_insert_bookings"   (20260414121621)
--   - "authenticated_users_can_insert_bookings" (20260522130000)
--
-- PostgreSQL evaluates multiple INSERT WITH CHECK policies with OR logic
-- (any one passing is sufficient), BUT if any policy references auth.users
-- directly without SECURITY DEFINER, it can fail with permission errors for
-- regular authenticated users. Additionally, the admin policy in 20260522130000
-- uses an inline EXISTS subquery against auth.users which is unsafe.
--
-- FIX: Drop ALL existing bookings INSERT/SELECT/UPDATE/admin policies and
-- recreate them cleanly using the safe public.is_admin_from_auth() function.

-- ============================================================
-- STEP 1: Ensure is_admin_from_auth() SECURITY DEFINER function exists
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
      AND (
        au.raw_user_meta_data->>'role' = 'admin'
        OR au.raw_app_meta_data->>'role' = 'admin'
      )
  );
$$;

-- ============================================================
-- STEP 2: Drop ALL existing bookings RLS policies (clean slate)
-- ============================================================

-- INSERT policies (authenticated)
DROP POLICY IF EXISTS "auth_users_create_bookings" ON public.bookings;
DROP POLICY IF EXISTS "auth_users_create_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "auth_users_create_guest_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_users_create_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_users_manage_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "users_manage_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_users_insert_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_users_can_insert_bookings" ON public.bookings;

-- SELECT policies (authenticated)
DROP POLICY IF EXISTS "auth_users_view_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_users_select_bookings" ON public.bookings;
DROP POLICY IF EXISTS "users_can_view_own_bookings" ON public.bookings;

-- UPDATE policies (authenticated)
DROP POLICY IF EXISTS "auth_users_update_own_bookings" ON public.bookings;
DROP POLICY IF EXISTS "authenticated_users_update_bookings" ON public.bookings;
DROP POLICY IF EXISTS "users_can_update_own_bookings" ON public.bookings;

-- Admin policies
DROP POLICY IF EXISTS "admin_full_access_bookings" ON public.bookings;
DROP POLICY IF EXISTS "admin_read_all_bookings" ON public.bookings;
DROP POLICY IF EXISTS "admin_update_all_bookings" ON public.bookings;

-- Guest policies (anon)
DROP POLICY IF EXISTS "guest_create_bookings" ON public.bookings;
DROP POLICY IF EXISTS "guest_view_bookings" ON public.bookings;
DROP POLICY IF EXISTS "guest_booking_lookup" ON public.bookings;
DROP POLICY IF EXISTS "allow_guest_booking_creation" ON public.bookings;
DROP POLICY IF EXISTS "anon_can_insert_guest_bookings" ON public.bookings;

-- ============================================================
-- STEP 3: Ensure RLS is enabled
-- ============================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 4: Create clean, non-conflicting RLS policies
-- ============================================================

-- INSERT: Authenticated users can create their own bookings (user_id = their uid)
-- OR create guest bookings on behalf of guests (user_id IS NULL)
CREATE POLICY "bookings_authenticated_insert"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  OR user_id IS NULL
);

-- SELECT: Authenticated users can view their own bookings
CREATE POLICY "bookings_authenticated_select"
ON public.bookings
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
);

-- UPDATE: Authenticated users can update their own bookings
CREATE POLICY "bookings_authenticated_update"
ON public.bookings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ALL: Admin full access using safe SECURITY DEFINER function
CREATE POLICY "bookings_admin_full_access"
ON public.bookings
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- INSERT: Anonymous users can create guest bookings
CREATE POLICY "bookings_anon_guest_insert"
ON public.bookings
FOR INSERT
TO anon
WITH CHECK (
  is_guest_booking = true
  AND user_id IS NULL
  AND guest_email IS NOT NULL
  AND guest_name IS NOT NULL
);

-- SELECT: Anonymous users can look up guest bookings
CREATE POLICY "bookings_anon_guest_select"
ON public.bookings
FOR SELECT
TO anon
USING (
  is_guest_booking = true
  AND user_id IS NULL
);

COMMENT ON TABLE public.bookings IS 'Bookings table - RLS definitively fixed 2026-05-22: single clean INSERT policy for authenticated users (user_id = auth.uid() OR user_id IS NULL), admin access via is_admin_from_auth() SECURITY DEFINER function.';
