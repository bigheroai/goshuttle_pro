-- Migration: Fix user_profiles RLS policies that query auth.users directly
-- Timestamp: 20260522210000
--
-- ROOT CAUSE: Migration 20260522130000 created two policies on user_profiles
-- that contain inline subqueries against auth.users:
--   admin_can_view_all_profiles  → SELECT 1 FROM auth.users au WHERE ...
--   admin_can_update_all_profiles → SELECT 1 FROM auth.users au WHERE ...
--
-- Regular authenticated users (customers, drivers) do NOT have SELECT permission
-- on auth.users. When Postgres evaluates ALL policies on a table (including
-- non-matching ones), it triggers "permission denied for table users" for every
-- user who is NOT an admin — causing profile loads to fail entirely.
--
-- FIX: Drop the broken policies and replace them with the safe
-- public.is_admin_from_auth() SECURITY DEFINER function that already exists
-- (created in 20251017040435_goshuttle_auth_admin.sql).
-- This function queries auth.users internally with elevated privileges,
-- so regular users never touch auth.users directly.

-- ============================================================
-- STEP 1: Drop the broken policies that query auth.users directly
-- ============================================================
DROP POLICY IF EXISTS "admin_can_view_all_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_can_update_all_profiles" ON public.user_profiles;

-- ============================================================
-- STEP 2: Ensure the safe is_admin_from_auth() function exists
-- (idempotent — safe to re-create)
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
-- STEP 3: Re-create admin policies using the safe function
-- ============================================================

-- Admin can view all profiles (safe — uses SECURITY DEFINER function)
DROP POLICY IF EXISTS "admin_can_view_all_profiles_v2" ON public.user_profiles;
CREATE POLICY "admin_can_view_all_profiles_v2"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin_from_auth());

-- Admin can update all profiles (safe — uses SECURITY DEFINER function)
DROP POLICY IF EXISTS "admin_can_update_all_profiles_v2" ON public.user_profiles;
CREATE POLICY "admin_can_update_all_profiles_v2"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- ============================================================
-- STEP 4: Also fix other tables from 20260522130000 that have
-- the same inline auth.users subquery pattern
-- ============================================================

-- Fix bookings admin policy
DROP POLICY IF EXISTS "admin_full_access_bookings" ON public.bookings;
DROP POLICY IF EXISTS "admin_full_access_bookings_v2" ON public.bookings;
CREATE POLICY "admin_full_access_bookings_v2"
ON public.bookings
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Fix driver_applications admin policy
DROP POLICY IF EXISTS "admin_full_access_driver_applications" ON public.driver_applications;
DROP POLICY IF EXISTS "admin_full_access_driver_applications_v2" ON public.driver_applications;
CREATE POLICY "admin_full_access_driver_applications_v2"
ON public.driver_applications
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Fix vehicles admin policy (from 20260522130000 — overrides the one from 20251017040435)
DROP POLICY IF EXISTS "admin_full_access_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "admin_full_access_vehicles_v2" ON public.vehicles;
CREATE POLICY "admin_full_access_vehicles_v2"
ON public.vehicles
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());
