-- Migration: Mirror profile-images bucket RLS exactly for Profiles bucket
-- Timestamp: 20260522190000
-- 
-- DIAGNOSIS: The Profiles bucket keeps rejecting uploads because previous policies
-- used `owner = auth.uid()` — but Supabase no longer auto-populates the `owner`
-- column on storage.objects, so it is always NULL and the check always fails.
--
-- The working `profile-images` bucket uses `(storage.foldername(name))[1] = auth.uid()::text`
-- which checks the file PATH (folder = userId), not the owner column.
-- This migration applies the IDENTICAL pattern to the Profiles bucket.

-- ============================================================
-- STEP 1: Drop every known policy that touches the Profiles bucket
-- (exhaustive list from all prior migrations)
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

-- From 20260522150000
DROP POLICY IF EXISTS "profiles_v2_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_select" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_v2_delete" ON storage.objects;

-- From 20260522160000
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

-- ============================================================
-- STEP 2: Ensure Profiles bucket is public (same as profile-images)
-- ============================================================
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'Profiles';

-- ============================================================
-- STEP 3: Create policies IDENTICAL to the working profile-images bucket
-- Pattern: (storage.foldername(name))[1] = auth.uid()::text
-- This checks the file PATH folder (userId/filename.ext), NOT the owner column
-- ============================================================

-- SELECT: Public bucket — anyone can view (mirrors profile-images public_can_view policy)
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

-- Admin full access (mirrors admins_manage_all_profile_images from profile-images)
DROP POLICY IF EXISTS "profiles_admin_full_access_v3" ON storage.objects;
CREATE POLICY "profiles_admin_full_access_v3"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'Profiles'
  AND EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'Profiles'
  AND EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
);

-- ============================================================
-- STEP 4: Restore mainbucket policies (clean slate)
-- ============================================================

DROP POLICY IF EXISTS "mainbucket_select_v3" ON storage.objects;
CREATE POLICY "mainbucket_select_v3"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'mainbucket');

DROP POLICY IF EXISTS "mainbucket_insert_v3" ON storage.objects;
CREATE POLICY "mainbucket_insert_v3"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mainbucket');

DROP POLICY IF EXISTS "mainbucket_update_v3" ON storage.objects;
CREATE POLICY "mainbucket_update_v3"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'mainbucket')
WITH CHECK (bucket_id = 'mainbucket');

DROP POLICY IF EXISTS "mainbucket_delete_v3" ON storage.objects;
CREATE POLICY "mainbucket_delete_v3"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'mainbucket');
