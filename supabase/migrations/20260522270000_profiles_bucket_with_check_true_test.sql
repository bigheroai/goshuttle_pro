-- ============================================================
-- DIAGNOSTIC: WITH CHECK (true) Test for Profiles Bucket
-- Purpose: Determine if the RLS policy expression is failing
--          or if the issue is external (session, client, etc.)
-- ============================================================
-- If upload SUCCEEDS with this policy → policy expression was wrong
-- If upload STILL FAILS with this policy → issue is external (session/client)
-- ============================================================

-- Step 1: Drop ALL existing INSERT policies on storage.objects for Profiles bucket
DROP POLICY IF EXISTS "profiles_nuke_insert" ON storage.objects;
DROP POLICY IF EXISTS "profiles_robust_insert" ON storage.objects;
DROP POLICY IF EXISTS "Profiles bucket insert policy" ON storage.objects;
DROP POLICY IF EXISTS "temporary_allow_all_inserts" ON storage.objects;
DROP POLICY IF EXISTS "profiles_with_check_true_test" ON storage.objects;

-- Step 2: Create completely permissive INSERT policy (WITH CHECK (true))
-- This bypasses ALL expression evaluation — if upload still fails, the issue is NOT the policy
CREATE POLICY "profiles_with_check_true_test"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Step 3: Verify the policy was created
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND policyname = 'profiles_with_check_true_test'
  ) THEN
    RAISE NOTICE 'SUCCESS: profiles_with_check_true_test policy created. Now test your upload.';
    RAISE NOTICE 'If upload succeeds → policy expression was the problem.';
    RAISE NOTICE 'If upload still fails → issue is external (auth session, client key, bucket config).';
  ELSE
    RAISE NOTICE 'WARNING: Policy may not have been created. Check pg_policies manually.';
  END IF;
END $$;
