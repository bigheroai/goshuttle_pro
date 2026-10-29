-- Migration: Driver Documents Storage Bucket
-- Creates a dedicated bucket for driver license and document uploads
-- with proper MIME type support (including PDF) and RLS policies

-- Create the driver-documents bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'driver-documents',
  'driver-documents',
  false,
  10485760, -- 10MB limit
  ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit = 10485760,
  allowed_mime_types = ARRAY[
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp',
    'application/pdf'
  ];

-- RLS: Authenticated users can upload their own documents
DROP POLICY IF EXISTS "driver_documents_insert_own" ON storage.objects;
CREATE POLICY "driver_documents_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Authenticated users can read their own documents
DROP POLICY IF EXISTS "driver_documents_select_own" ON storage.objects;
CREATE POLICY "driver_documents_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Authenticated users can update (replace) their own documents
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

-- RLS: Authenticated users can delete their own documents
DROP POLICY IF EXISTS "driver_documents_delete_own" ON storage.objects;
CREATE POLICY "driver_documents_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'driver-documents'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS: Admins can access all driver documents
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
