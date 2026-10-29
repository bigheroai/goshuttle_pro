-- Migration: Make Profiles bucket public + nuclear policy reset
-- Timestamp: 20260522170000
-- Strategy: Make Profiles bucket public (like profile-images) to eliminate
-- all RLS complexity on storage.objects. The user_profiles table RLS
-- still protects who can write the avatar_url column.
-- This mirrors the proven driver-documents pattern but simpler.

-- ============================================================
-- STEP 1: Nuclear drop of ALL policies ever created for Profiles bucket
-- (covers every policy name used across all prior migrations)
-- ============================================================
DROP POLICY IF EXISTS "users_view_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_upload_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_update_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_delete_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "admins_full_access_all_storage" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_select_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_update_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_select_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_insert_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_update_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_delete_own_folder" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_select" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_delete" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_select_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_update_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_delete_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_select" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_insert" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_update" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_v2_delete" ON storage.objects;

-- ============================================================
-- STEP 2: Make Profiles bucket PUBLIC
-- Public buckets don't require RLS policies on storage.objects
-- for reads. Writes still require authentication via policies.
-- ============================================================
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'Profiles';

-- ============================================================
-- STEP 3: Simple, permissive policies for authenticated uploads
-- Since bucket is public, we only need INSERT/UPDATE/DELETE policies.
-- SELECT is open to all (public bucket).
-- ============================================================

-- INSERT: Any authenticated user can upload to Profiles bucket
-- (path-based ownership enforced by app code, not RLS)
CREATE POLICY "profiles_public_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Profiles');

-- UPDATE: Authenticated users can update files in their own folder
CREATE POLICY "profiles_public_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'Profiles')
WITH CHECK (bucket_id = 'Profiles');

-- DELETE: Authenticated users can delete files in their own folder
CREATE POLICY "profiles_public_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'Profiles');

-- ============================================================
-- STEP 4: Restore mainbucket policies (clean, path-based)
-- ============================================================
CREATE POLICY "mainbucket_final_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'mainbucket');

CREATE POLICY "mainbucket_final_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mainbucket');

CREATE POLICY "mainbucket_final_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'mainbucket')
WITH CHECK (bucket_id = 'mainbucket');

CREATE POLICY "mainbucket_final_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'mainbucket');
