-- Migration: Profiles bucket - absolute clean slate
-- Timestamp: 20260522230000
--
-- ROOT CAUSE ANALYSIS:
-- Multiple overlapping migrations have left conflicting policies on storage.objects
-- for the Profiles bucket. The upsert=true in ImageUpload triggers both INSERT and
-- UPDATE operations. The UPDATE policy must have a valid USING clause that matches
-- the file path pattern: {userId}/{filename}.
--
-- This migration drops EVERY policy ever created for the Profiles bucket across
-- all prior migrations and creates a minimal, correct set.

-- ============================================================
-- STEP 1: Drop EVERY policy ever created for Profiles bucket
-- (exhaustive list from ALL prior migrations)
-- ============================================================

-- From 20251104024155_image_storage_policies.sql
DROP POLICY IF EXISTS "users_view_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_upload_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_update_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_delete_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "admins_full_access_all_storage" ON storage.objects;

-- From 20260522130000
DROP POLICY IF EXISTS "profiles_bucket_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_select_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_update_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_delete_own" ON storage.objects;

-- From 20260522140000
DROP POLICY IF EXISTS "profiles_select_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_delete_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access" ON storage.objects;

-- From 20260522150000 (profiles_v2_*)
DROP POLICY IF EXISTS "profiles_v2_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_select" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_delete" ON storage.objects;

-- From 20260522160000 (mainbucket_v2_*)
DROP POLICY IF EXISTS "mainbucket_select_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_update_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_select" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_insert" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_update" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_delete" ON storage.objects;

-- From 20260522170000
DROP POLICY IF EXISTS "profiles_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_public_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_public_delete" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_select" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_insert" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_update" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_delete" ON storage.objects;

-- From 20260522180000
DROP POLICY IF EXISTS "profiles_allow_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_allow_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_allow_delete" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_allow_select" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_allow_insert" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_allow_update" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_allow_delete" ON storage.objects;

-- From 20260522190000
DROP POLICY IF EXISTS "profiles_public_select" ON storage.objects;
DROP POLICY IF EXISTS "profiles_insert_own_folder_v3" ON storage.objects;
DROP POLICY IF EXISTS "profiles_update_own_folder_v3" ON storage.objects;
DROP POLICY IF EXISTS "profiles_delete_own_folder_v3" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access_v3" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_select_v3" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_insert_v3" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_update_v3" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_delete_v3" ON storage.objects;

-- From 20260522220000
DROP POLICY IF EXISTS "profiles_admin_full_access_v2" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access_v4" ON storage.objects;
DROP POLICY IF EXISTS "admin_full_access_profiles_bucket" ON storage.objects;

-- Any other variants
DROP POLICY IF EXISTS "profiles_admin_full_access_v5" ON storage.objects;
DROP POLICY IF EXISTS "profiles_insert_v4" ON storage.objects;
DROP POLICY IF EXISTS "profiles_update_v4" ON storage.objects;
DROP POLICY IF EXISTS "profiles_delete_v4" ON storage.objects;
DROP POLICY IF EXISTS "profiles_select_v4" ON storage.objects;

-- ============================================================
-- STEP 2: Ensure Profiles bucket is public
-- ============================================================
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'Profiles';

-- ============================================================
-- STEP 3: Create clean, minimal policies for Profiles bucket
--
-- File path structure: {userId}/{timestamp}.{ext}
-- (storage.foldername(name))[1] = first folder segment = userId
--
-- Since bucket is public=true, SELECT needs no policy.
-- We only need INSERT, UPDATE, DELETE for authenticated users.
-- ============================================================

-- SELECT: Public bucket — no policy needed, but add one for authenticated users
-- to ensure signed URL generation works
CREATE POLICY "profiles_final_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'Profiles');

-- INSERT: Authenticated users can upload to their own userId folder
CREATE POLICY "profiles_final_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Profiles'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- UPDATE: Authenticated users can update files in their own userId folder
-- upsert=true in the app triggers this — USING must match the existing row
CREATE POLICY "profiles_final_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = (auth.uid())::text
)
WITH CHECK (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- DELETE: Authenticated users can delete their own files
CREATE POLICY "profiles_final_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = (auth.uid())::text
);

-- Admin full access using safe SECURITY DEFINER function (no direct auth.users query)
CREATE POLICY "profiles_final_admin"
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
-- STEP 4: Restore mainbucket policies (clean slate)
-- ============================================================
DROP POLICY IF EXISTS "mainbucket_final2_select" ON storage.objects;
CREATE POLICY "mainbucket_final2_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'mainbucket');

DROP POLICY IF EXISTS "mainbucket_final2_insert" ON storage.objects;
CREATE POLICY "mainbucket_final2_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mainbucket');

DROP POLICY IF EXISTS "mainbucket_final2_update" ON storage.objects;
CREATE POLICY "mainbucket_final2_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'mainbucket')
WITH CHECK (bucket_id = 'mainbucket');

DROP POLICY IF EXISTS "mainbucket_final2_delete" ON storage.objects;
CREATE POLICY "mainbucket_final2_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'mainbucket');
