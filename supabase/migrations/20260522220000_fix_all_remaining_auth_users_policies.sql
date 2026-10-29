-- Migration: Fix ALL remaining RLS policies that query auth.users directly
-- Timestamp: 20260522220000
--
-- ROOT CAUSE: Multiple migrations created RLS policies with inline subqueries
-- against auth.users (e.g. EXISTS (SELECT 1 FROM auth.users au WHERE ...)).
-- Regular authenticated users lack SELECT permission on auth.users, so Postgres
-- raises "permission denied for table users" when evaluating ANY of these policies
-- — even for non-admin users who would never match the admin condition.
--
-- Affected tables / buckets (not yet fixed by prior migrations):
--   public.membership_benefits   → admins_manage_membership_benefits
--   public.user_kyc              → admin_full_access_user_kyc
--   public.driver_signup_requests → users_manage_own_driver_signup_requests
--   storage.objects (Profiles bucket)   → profiles_admin_full_access (various names)
--   storage.objects (driver-documents)  → driver_documents_admin_* (various names)
--   storage.objects (kyc-documents)     → kyc_documents_admin_*
--
-- FIX: Drop every broken policy and replace with the safe
-- public.is_admin_from_auth() SECURITY DEFINER function that already exists.
-- For driver_signup_requests we also fix the user-own policy to use
-- auth.uid() directly instead of a subquery against auth.users.

-- ============================================================
-- STEP 1: Ensure the safe is_admin_from_auth() function exists (idempotent)
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
-- STEP 2: Fix public.membership_benefits
-- ============================================================
DROP POLICY IF EXISTS "admins_manage_membership_benefits" ON public.membership_benefits;
CREATE POLICY "admins_manage_membership_benefits"
ON public.membership_benefits
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- ============================================================
-- STEP 3: Fix public.user_kyc
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_user_kyc" ON public.user_kyc;
CREATE POLICY "admin_full_access_user_kyc"
ON public.user_kyc
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- ============================================================
-- STEP 4: Fix public.driver_signup_requests
-- The user-own policy used: email = (SELECT email FROM auth.users WHERE id = auth.uid())
-- which also hits auth.users directly. Replace with a join via user_profiles.
-- ============================================================
DROP POLICY IF EXISTS "users_manage_own_driver_signup_requests" ON public.driver_signup_requests;
CREATE POLICY "users_manage_own_driver_signup_requests"
ON public.driver_signup_requests
FOR ALL
TO authenticated
USING (
  email = (
    SELECT up.email FROM public.user_profiles up WHERE up.id = auth.uid() LIMIT 1
  )
)
WITH CHECK (
  email = (
    SELECT up.email FROM public.user_profiles up WHERE up.id = auth.uid() LIMIT 1
  )
);

-- ============================================================
-- STEP 5: Fix storage.objects — Profiles bucket admin policies
-- (created in 20260522150000 and 20260522190000)
-- ============================================================
DROP POLICY IF EXISTS "profiles_admin_full_access" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access_v2" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access_v3" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access_v4" ON storage.objects;
DROP POLICY IF EXISTS "admin_full_access_profiles_bucket" ON storage.objects;

CREATE POLICY "profiles_admin_full_access_v4"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'Profiles'
  AND public.is_admin_from_auth()
)
WITH CHECK (
  bucket_id = 'Profiles'
  AND public.is_admin_from_auth()
);

-- ============================================================
-- STEP 6: Fix storage.objects — driver-documents bucket admin policies
-- (created in 20260509110000 and 20260509120000)
-- ============================================================
DROP POLICY IF EXISTS "driver_documents_admin_full_access" ON storage.objects;
DROP POLICY IF EXISTS "driver_documents_admin_full_access_v2" ON storage.objects;
DROP POLICY IF EXISTS "admin_full_access_driver_documents" ON storage.objects;

CREATE POLICY "driver_documents_admin_full_access_v3"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND public.is_admin_from_auth()
)
WITH CHECK (
  bucket_id = 'driver-documents'
  AND public.is_admin_from_auth()
);

-- ============================================================
-- STEP 7: Fix storage.objects — kyc-documents bucket admin policies
-- (created in 20260522140000)
-- ============================================================
DROP POLICY IF EXISTS "kyc_documents_admin_full_access" ON storage.objects;
DROP POLICY IF EXISTS "admin_full_access_kyc_documents" ON storage.objects;
DROP POLICY IF EXISTS "kyc_admin_full_access" ON storage.objects;

CREATE POLICY "kyc_documents_admin_full_access_v2"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND public.is_admin_from_auth()
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND public.is_admin_from_auth()
);

-- ============================================================
-- STEP 8: Fix storage.objects — profile-images bucket admin policies
-- (created in 20251104022134)
-- ============================================================
DROP POLICY IF EXISTS "admin_full_access_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "profile_images_admin_full_access" ON storage.objects;

CREATE POLICY "profile_images_admin_full_access_v2"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'profile-images'
  AND public.is_admin_from_auth()
)
WITH CHECK (
  bucket_id = 'profile-images'
  AND public.is_admin_from_auth()
);
