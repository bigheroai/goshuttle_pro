-- Migration: Final fix for Profiles storage bucket RLS policies
-- Timestamp: 20260522150000
-- Root cause: Old policies used `owner = auth.uid()` which fails because
-- storage.objects.owner is NULL for new uploads. Replace ALL policies
-- with path-based checks using (storage.foldername(name))[1] = auth.uid()::text

-- ============================================================
-- 1. Drop ALL existing conflicting policies on storage.objects
--    for the Profiles bucket (from multiple prior migrations)
-- ============================================================

-- From 20251104024155_image_storage_policies.sql
DROP POLICY IF EXISTS "users_view_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_upload_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_update_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "users_delete_own_profile_images" ON storage.objects;
DROP POLICY IF EXISTS "admins_full_access_all_storage" ON storage.objects;

-- From 20260522140000_fix_profiles_storage_rls_and_kyc.sql
DROP POLICY IF EXISTS "profiles_bucket_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_select_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_update_own" ON storage.objects;
DROP POLICY IF EXISTS "profiles_bucket_delete_own" ON storage.objects;

-- ============================================================
-- 2. Update Profiles bucket configuration
--    - Allow image/webp (was missing, causing upload failures)
--    - Increase file size limit to 5MB (was 3MB)
-- ============================================================
UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'Profiles';

-- ============================================================
-- 3. Create clean path-based RLS policies for Profiles bucket
--    Uses (storage.foldername(name))[1] = auth.uid()::text
--    This checks the folder name (userId) in the file path,
--    NOT the owner column (which can be NULL)
-- ============================================================

-- SELECT: Users can view files in their own folder
DROP POLICY IF EXISTS "profiles_select_own_folder" ON storage.objects;
CREATE POLICY "profiles_select_own_folder"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- INSERT: Users can upload files to their own folder
DROP POLICY IF EXISTS "profiles_insert_own_folder" ON storage.objects;
CREATE POLICY "profiles_insert_own_folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: Users can update files in their own folder
DROP POLICY IF EXISTS "profiles_update_own_folder" ON storage.objects;
CREATE POLICY "profiles_update_own_folder"
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

-- DELETE: Users can delete files in their own folder
DROP POLICY IF EXISTS "profiles_delete_own_folder" ON storage.objects;
CREATE POLICY "profiles_delete_own_folder"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- Admin full access to Profiles bucket
DROP POLICY IF EXISTS "profiles_admin_full_access" ON storage.objects;
CREATE POLICY "profiles_admin_full_access"
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
-- 4. Re-apply clean policies for other buckets that were
--    previously using owner = auth.uid() (also broken)
-- ============================================================

-- mainbucket: drop old owner-based policies, add path-based
DROP POLICY IF EXISTS "users_view_own_main_assets" ON storage.objects;
DROP POLICY IF EXISTS "users_upload_main_assets" ON storage.objects;
DROP POLICY IF EXISTS "users_update_own_main_assets" ON storage.objects;
DROP POLICY IF EXISTS "users_delete_own_main_assets" ON storage.objects;

DROP POLICY IF EXISTS "mainbucket_select_own" ON storage.objects;
CREATE POLICY "mainbucket_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'mainbucket' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "mainbucket_insert_own" ON storage.objects;
CREATE POLICY "mainbucket_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'mainbucket' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "mainbucket_update_own" ON storage.objects;
CREATE POLICY "mainbucket_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'mainbucket' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'mainbucket' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "mainbucket_delete_own" ON storage.objects;
CREATE POLICY "mainbucket_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'mainbucket' AND (storage.foldername(name))[1] = auth.uid()::text);
