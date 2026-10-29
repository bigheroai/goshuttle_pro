-- Migration: Fix Profiles bucket admin policy that queries auth.users directly
-- Timestamp: 20260522200000
--
-- ROOT CAUSE: The profiles_admin_full_access_v3 policy in 20260522190000 contains
-- an inline subquery against auth.users:
--   SELECT 1 FROM auth.users au WHERE au.id = auth.uid() AND ...
--
-- Regular authenticated users (customers, drivers) do NOT have SELECT permission
-- on auth.users. This causes "permission denied for table users" when ANY user
-- triggers the policy evaluation — which happens on every storage operation.
-- The profile load fails → user object is null → ImageUpload button is disabled.
--
-- FIX: Replace the inline auth.users subquery with a SECURITY DEFINER function
-- that runs with elevated privileges, OR simply check user_profiles.role.
-- We use user_profiles.role (simpler, no auth.users access needed).

-- ============================================================
-- STEP 1: Drop the broken admin policy
-- ============================================================
DROP POLICY IF EXISTS "profiles_admin_full_access_v3" ON storage.objects;

-- ============================================================
-- STEP 2: Create a SECURITY DEFINER function to check admin role
-- This function runs as the DB owner (bypasses RLS on user_profiles)
-- and does NOT query auth.users directly
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- ============================================================
-- STEP 3: Recreate admin policy using the safe function
-- ============================================================
DROP POLICY IF EXISTS "profiles_admin_full_access_v4" ON storage.objects;
CREATE POLICY "profiles_admin_full_access_v4"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'Profiles'
  AND public.is_admin_user()
)
WITH CHECK (
  bucket_id = 'Profiles'
  AND public.is_admin_user()
);

-- ============================================================
-- STEP 4: Verify the three core Profiles policies from 20260522190000
-- are still in place (re-create them idempotently to be safe)
-- ============================================================

-- SELECT: Public bucket — anyone can view
DROP POLICY IF EXISTS "profiles_public_select" ON storage.objects;
CREATE POLICY "profiles_public_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'Profiles');

-- INSERT: Authenticated users upload into their own userId folder
DROP POLICY IF EXISTS "profiles_insert_own_folder_v3" ON storage.objects;
CREATE POLICY "profiles_insert_own_folder_v3"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: Authenticated users update files in their own userId folder
DROP POLICY IF EXISTS "profiles_update_own_folder_v3" ON storage.objects;
CREATE POLICY "profiles_update_own_folder_v3"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- DELETE: Authenticated users delete files in their own userId folder
DROP POLICY IF EXISTS "profiles_delete_own_folder_v3" ON storage.objects;
CREATE POLICY "profiles_delete_own_folder_v3"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
