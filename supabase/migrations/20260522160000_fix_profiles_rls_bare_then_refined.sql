-- Migration: Fix Profiles storage RLS - bare policy first, then refined
-- Timestamp: 20260522160000
-- Strategy: Step-by-step approach
--   1. Drop ALL existing policies for Profiles bucket on storage.objects
--   2. Create bare INSERT WITH CHECK (true) — most permissive, confirms RLS is the blocker
--   3. Add SELECT + UPDATE policies (required when upsert is used)
--   4. Refine all policies to lock down to bucket + user folder path

-- ============================================================
-- STEP 1: Drop ALL existing policies that touch storage.objects
-- (accumulated from multiple prior migrations)
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
DROP POLICY IF EXISTS "mainbucket_select_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_insert_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_update_own" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_delete_own" ON storage.objects;

-- ============================================================
-- STEP 2: Ensure Profiles bucket exists with correct settings
-- ============================================================
UPDATE storage.buckets
SET
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'Profiles';

-- ============================================================
-- STEP 3: Create refined policies locked to Profiles bucket
--         + user folder path (userId is the top-level folder)
--
-- File path structure: {userId}/{timestamp}.{ext}
-- (storage.foldername(name))[1] returns the first folder = userId
--
-- NOTE: INSERT uses WITH CHECK only (no USING clause for INSERT)
--       UPDATE uses both USING and WITH CHECK
--       SELECT/DELETE use USING only
-- ============================================================

-- INSERT: Authenticated users can upload to their own userId folder in Profiles bucket
-- Start with bucket_id check + user folder — this is the refined version
CREATE POLICY "profiles_v2_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Profiles'
  AND auth.uid() IS NOT NULL
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- SELECT: Users can read files from their own folder in Profiles bucket
CREATE POLICY "profiles_v2_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- UPDATE: Required for upsert operations — users can update their own files
CREATE POLICY "profiles_v2_update"
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

-- DELETE: Users can delete their own files
CREATE POLICY "profiles_v2_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'Profiles'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- ============================================================
-- STEP 4: Restore mainbucket policies (dropped above)
-- ============================================================
CREATE POLICY "mainbucket_v2_select"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'mainbucket'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "mainbucket_v2_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'mainbucket'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "mainbucket_v2_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'mainbucket' AND (storage.foldername(name))[1] = auth.uid()::text)
WITH CHECK (bucket_id = 'mainbucket' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "mainbucket_v2_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'mainbucket'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
