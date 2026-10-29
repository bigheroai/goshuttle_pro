-- Migration: Fix driver_applications RLS policies
-- Allows authenticated drivers to submit applications and upload documents after signup
-- Timestamp: 20260509120000

-- Drop all existing RLS policies on driver_applications to start clean
DROP POLICY IF EXISTS "driver_applications_insert_own" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_select_own" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_update_own" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_admin_all" ON public.driver_applications;
DROP POLICY IF EXISTS "drivers_can_insert_own_application" ON public.driver_applications;
DROP POLICY IF EXISTS "drivers_can_view_own_application" ON public.driver_applications;
DROP POLICY IF EXISTS "drivers_can_update_own_application" ON public.driver_applications;
DROP POLICY IF EXISTS "admin_full_access_driver_applications" ON public.driver_applications;

-- Ensure RLS is enabled
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can INSERT their own application (user_id = auth.uid())
DROP POLICY IF EXISTS "authenticated_insert_own_driver_application" ON public.driver_applications;
CREATE POLICY "authenticated_insert_own_driver_application"
ON public.driver_applications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Policy 2: Authenticated users can SELECT their own application
DROP POLICY IF EXISTS "authenticated_select_own_driver_application" ON public.driver_applications;
CREATE POLICY "authenticated_select_own_driver_application"
ON public.driver_applications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Policy 3: Authenticated users can UPDATE their own application (e.g., add documents after signup)
DROP POLICY IF EXISTS "authenticated_update_own_driver_application" ON public.driver_applications;
CREATE POLICY "authenticated_update_own_driver_application"
ON public.driver_applications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Policy 4: Admins can access all driver applications
DROP POLICY IF EXISTS "admin_all_driver_applications" ON public.driver_applications;
CREATE POLICY "admin_all_driver_applications"
ON public.driver_applications
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
);

-- Also fix storage RLS for driver-documents bucket to ensure path matching works
-- The bucket already exists; just ensure policies are correct

-- Drop and recreate storage policies to ensure they work for authenticated users
DROP POLICY IF EXISTS "driver_documents_insert_own" ON storage.objects;
CREATE POLICY "driver_documents_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "driver_documents_select_own" ON storage.objects;
CREATE POLICY "driver_documents_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "driver_documents_update_own" ON storage.objects;
CREATE POLICY "driver_documents_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "driver_documents_delete_own" ON storage.objects;
CREATE POLICY "driver_documents_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

DROP POLICY IF EXISTS "driver_documents_admin_all" ON storage.objects;
CREATE POLICY "driver_documents_admin_all"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'driver-documents'
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
  bucket_id = 'driver-documents'
  AND EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
      au.raw_user_meta_data->>'role' = 'admin'
      OR au.raw_app_meta_data->>'role' = 'admin'
    )
  )
);
