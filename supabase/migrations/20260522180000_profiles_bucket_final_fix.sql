-- Migration: Profiles bucket - definitive RLS fix
-- Timestamp: 20260522180000
-- Strategy: Drop EVERY known policy that could affect the Profiles bucket
-- (including the catch-all admins_full_access_all_storage from 20251104024155)
-- then create one simple INSERT policy for authenticated users.
-- The bucket is already public=true so SELECT needs no policy.

-- ============================================================
-- STEP 1: Drop ALL policies that could affect Profiles bucket
-- (exhaustive list from all prior migrations)
-- ============================================================

-- From 20251104024155_image_storage_policies.sql
DROP POLICY IF EXISTS "users_view_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_upload_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_update_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_delete_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "admins_full_access_all_storage" ON storage.objects;

-- From 20260522130000_fix_rls_policies_comprehensive.sql
DROP POLICY IF EXISTS "profiles_bucket_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_select_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_update_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_delete_own" ON storage.objects;

-- From 20260522140000_fix_profiles_storage_rls_and_kyc.sql
DROP POLICY IF EXISTS "profiles_select_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_delete_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access" ON storage.objects;

-- From 20260522150000_fix_profiles_bucket_rls_final.sql
DROP POLICY IF EXISTS "profiles_v2_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_select" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_delete" ON storage.objects;

-- From 20260522160000_fix_profiles_rls_bare_then_refined.sql
DROP POLICY IF EXISTS "mainbucket_select_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_update_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_select" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_insert" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_update" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_delete" ON storage.objects;

-- From 20260522170000_profiles_bucket_public_fix.sql
DROP POLICY IF EXISTS "profiles_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_public_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_public_delete" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_select" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_insert" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_update" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_delete" ON storage.objects;

-- ============================================================
-- STEP 2: Ensure Profiles bucket is public with correct settings
-- ============================================================
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'Profiles';

-- ============================================================
-- STEP 3: Create ONE simple INSERT policy for Profiles bucket
-- Public bucket = no SELECT policy needed
-- INSERT: any authenticated user can upload
-- UPDATE/DELETE: any authenticated user can manage their files
-- ============================================================

DROP POLICY IF EXISTS "profiles_allow_insert" ON storage.objects;
CREATE POLICY "profiles_allow_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Profiles');

DROP POLICY IF EXISTS "profiles_allow_update" ON storage.objects;
CREATE POLICY "profiles_allow_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'Profiles')
WITH CHECK (bucket_id = 'Profiles');

DROP POLICY IF EXISTS "profiles_allow_delete" ON storage.objects;
CREATE POLICY "profiles_allow_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'Profiles');

-- ============================================================
-- STEP 4: Restore mainbucket policies (clean slate)
-- ============================================================

DROP POLICY IF EXISTS "mainbucket_allow_select" ON storage.objects;
CREATE POLICY "mainbucket_allow_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'mainbucket');

DROP POLICY IF EXISTS "mainbucket_allow_insert" ON storage.objects;
CREATE POLICY "mainbucket_allow_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mainbucket');

DROP POLICY IF EXISTS "mainbucket_allow_update" ON storage.objects;
CREATE POLICY "mainbucket_allow_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'mainbucket')
WITH CHECK (bucket_id = 'mainbucket');

DROP POLICY IF EXISTS "mainbucket_allow_delete" ON storage.objects;
CREATE POLICY "mainbucket_allow_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'mainbucket');
