-- Migration: Fix driver_applications RLS for admin read access and consolidated INSERT
-- Problems:
--   1. Admins cannot see driver applications list (no admin SELECT policy)
--   2. INSERT RLS violations due to conflicting/overlapping policies
-- Fix:
--   1. Add admin full-access policy using is_admin_from_auth() (already exists)
--   2. Drop all conflicting INSERT policies and create one clean consolidated policy
-- Timestamp: 20260819080000

-- ============================================================
-- STEP 1: Drop ALL existing driver_applications policies to start clean
-- ============================================================
DROP POLICY IF EXISTS "authenticated_insert_own_driver_application" ON public.driver_applications;
DROP POLICY IF EXISTS "authenticated_select_own_driver_application" ON public.driver_applications;
DROP POLICY IF EXISTS "authenticated_update_own_driver_application" ON public.driver_applications;
DROP POLICY IF EXISTS "admin_all_driver_applications" ON public.driver_applications;
DROP POLICY IF EXISTS "anon_insert_driver_application" ON public.driver_applications;
DROP POLICY IF EXISTS "allow_driver_application_insert" ON public.driver_applications;
DROP POLICY IF EXISTS "drivers_can_insert_own_application" ON public.driver_applications;
DROP POLICY IF EXISTS "drivers_can_view_own_application" ON public.driver_applications;
DROP POLICY IF EXISTS "drivers_can_update_own_application" ON public.driver_applications;
DROP POLICY IF EXISTS "admin_full_access_driver_applications" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_insert_own" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_select_own" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_update_own" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_admin_all" ON public.driver_applications;

-- Ensure RLS is enabled
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: Admin full access (SELECT, INSERT, UPDATE, DELETE)
-- Uses is_admin_from_auth() which reads auth.users metadata — no recursion
-- ============================================================
CREATE POLICY "admin_full_access_driver_applications"
ON public.driver_applications
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- ============================================================
-- STEP 3: Authenticated users can INSERT their own application
-- Covers logged-in drivers submitting the form
-- ============================================================
CREATE POLICY "authenticated_insert_driver_application"
ON public.driver_applications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NULL
  OR user_id = auth.uid()
);

-- ============================================================
-- STEP 4: Authenticated users can SELECT their own application
-- ============================================================
CREATE POLICY "authenticated_select_own_driver_application"
ON public.driver_applications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- ============================================================
-- STEP 5: Authenticated users can UPDATE their own application
-- ============================================================
CREATE POLICY "authenticated_update_own_driver_application"
ON public.driver_applications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- STEP 6: Anonymous users can INSERT (public driver registration form)
-- user_id must be NULL for anonymous submissions
-- ============================================================
CREATE POLICY "anon_insert_driver_application"
ON public.driver_applications
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);
