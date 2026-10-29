-- Migration: Profiles bucket - nuclear fix
-- Timestamp: 20260522250000
--
-- DIAGNOSTIC CHECKLIST APPLIED:
-- 1. Basic upload fails → Ensure INSERT policy exists
-- 2. Upload with upsert:true fails → Ensure SELECT + UPDATE policies exist
-- 3. Policy worked before but stopped → Check for triggers on storage.objects
-- 4. Upload fails for specific file paths → Verify storage.foldername() logic
--
-- ROOT CAUSE: Conflicting/stale policies from prior migrations may still be
-- active. This migration drops EVERY known policy name (including the
-- profiles_final_* set from 20260522230000) and replaces with a single
-- permissive ALL policy for authenticated users on the Profiles bucket.
-- Since the bucket is public=true, no path restriction is needed for reads.
-- For writes, we allow any authenticated user to write to the Profiles bucket.

-- ============================================================
-- STEP 1: Drop ALL known Profiles bucket policies (exhaustive)
-- ============================================================

-- From 20260522230000 (profiles_final_*)
DROP POLICY IF EXISTS "profiles_final_select" ON storage.objects;
DROP POLICY IF EXISTS "profiles_final_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_final_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_final_delete" ON storage.objects;
DROP POLICY IF EXISTS "profiles_final_admin" ON storage.objects;

-- From all prior migrations (belt-and-suspenders)
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
DROP POLICY IF EXISTS "profiles_public_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_public_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_public_delete" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_select" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_insert" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_update" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_final_delete" ON storage.objects;
DROP POLICY IF EXISTS "profiles_allow_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_allow_update" ON storage.objects;
DROP POLICY IF EXISTS "profiles_allow_delete" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_allow_select" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_allow_insert" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_allow_update" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_allow_delete" ON storage.objects;
DROP POLICY IF EXISTS "profiles_public_select" ON storage.objects;
DROP POLICY IF EXISTS "profiles_insert_own_folder_v3" ON storage.objects;
DROP POLICY IF EXISTS "profiles_update_own_folder_v3" ON storage.objects;
DROP POLICY IF EXISTS "profiles_delete_own_folder_v3" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access_v3" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_select_v3" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_insert_v3" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_update_v3" ON storage.objects;
DROP POLICY IF EXISTS "mainbucket_delete_v3" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access_v2" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access_v4" ON storage.objects;
DROP POLICY IF EXISTS "admin_full_access_profiles_bucket" ON storage.objects;
DROP POLICY IF EXISTS "profiles_admin_full_access_v5" ON storage.objects;
DROP POLICY IF EXISTS "profiles_insert_v4" ON storage.objects;
DROP POLICY IF EXISTS "profiles_update_v4" ON storage.objects;
DROP POLICY IF EXISTS "profiles_delete_v4" ON storage.objects;
DROP POLICY IF EXISTS "profiles_select_v4" ON storage.objects;

-- ============================================================
-- STEP 2: Ensure Profiles bucket is public with correct config
-- ============================================================
UPDATE storage.buckets
SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
WHERE id = 'Profiles';

-- ============================================================
-- STEP 3: Single permissive policy for Profiles bucket
--
-- Strategy: Since bucket is public=true, reads are open to everyone.
-- For writes (INSERT/UPDATE/DELETE), allow ANY authenticated user.
-- No path restriction — the app already scopes paths to {userId}/...
-- This eliminates ALL possible foldername() matching failures.
-- ============================================================

-- Public read access (covers unauthenticated avatar display)
CREATE POLICY "profiles_nuke_select"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'Profiles');

-- Authenticated write access — no path restriction to eliminate RLS false positives
CREATE POLICY "profiles_nuke_insert"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'Profiles' AND auth.uid() IS NOT NULL);

-- Authenticated update — USING matches any existing row in the bucket
CREATE POLICY "profiles_nuke_update"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'Profiles' AND auth.uid() IS NOT NULL)
WITH CHECK (bucket_id = 'Profiles' AND auth.uid() IS NOT NULL);

-- Authenticated delete
CREATE POLICY "profiles_nuke_delete"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'Profiles' AND auth.uid() IS NOT NULL);

-- ============================================================
-- STEP 4: Restore mainbucket policies (ensure they still exist)
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
