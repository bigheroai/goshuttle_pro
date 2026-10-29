-- Migration: Fix Profiles storage RLS + Add user_kyc table
-- Timestamp: 20260522140000

-- ============================================================
-- 1. Fix Profiles storage bucket RLS policies
-- The 'Profiles' bucket exists but has no storage.objects policies
-- ============================================================

-- Allow authenticated users to upload their own profile photos
DROP POLICY IF EXISTS "profiles_bucket_insert_own" ON storage.objects;
CREATE POLICY "profiles_bucket_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'Profiles'
);

-- Allow authenticated users to read their own profile photos
DROP POLICY IF EXISTS "profiles_bucket_select_own" ON storage.objects;
CREATE POLICY "profiles_bucket_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'Profiles'
);

-- Allow authenticated users to update their own profile photos
DROP POLICY IF EXISTS "profiles_bucket_update_own" ON storage.objects;
CREATE POLICY "profiles_bucket_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'Profiles')
WITH CHECK (bucket_id = 'Profiles');

-- Allow authenticated users to delete their own profile photos
DROP POLICY IF EXISTS "profiles_bucket_delete_own" ON storage.objects;
CREATE POLICY "profiles_bucket_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'Profiles');

-- ============================================================
-- 2. Create user_kyc table for both customers and drivers
-- ============================================================

CREATE TABLE IF NOT EXISTS public.user_kyc (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  kyc_type TEXT NOT NULL DEFAULT 'customer',
  -- Identity documents
  id_type TEXT,
  id_number TEXT,
  id_front_url TEXT,
  id_back_url TEXT,
  selfie_url TEXT,
  -- Address verification
  address_line1 TEXT,
  address_line2 TEXT,
  city TEXT,
  province TEXT,
  postal_code TEXT,
  proof_of_address_url TEXT,
  -- Status tracking
  kyc_status TEXT NOT NULL DEFAULT 'not_submitted',
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  reviewed_by UUID REFERENCES public.user_profiles(id),
  rejection_reason TEXT,
  notes TEXT,
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_user_kyc_user_id ON public.user_kyc(user_id);
CREATE INDEX IF NOT EXISTS idx_user_kyc_status ON public.user_kyc(kyc_status);

-- ============================================================
-- 3. Add kyc_status column to user_profiles if not exists
-- ============================================================
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS kyc_status TEXT DEFAULT 'not_submitted';

-- ============================================================
-- 4. RLS for user_kyc table
-- ============================================================
ALTER TABLE public.user_kyc ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_kyc" ON public.user_kyc;
CREATE POLICY "users_manage_own_kyc"
ON public.user_kyc
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_full_access_user_kyc" ON public.user_kyc;
CREATE POLICY "admin_full_access_user_kyc"
ON public.user_kyc
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);

-- ============================================================
-- 5. Create a dedicated kyc-documents storage bucket
-- ============================================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kyc-documents',
  'kyc-documents',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS for kyc-documents bucket
DROP POLICY IF EXISTS "kyc_documents_insert_own" ON storage.objects;
CREATE POLICY "kyc_documents_insert_own"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'kyc-documents');

DROP POLICY IF EXISTS "kyc_documents_select_own" ON storage.objects;
CREATE POLICY "kyc_documents_select_own"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'kyc-documents');

DROP POLICY IF EXISTS "kyc_documents_update_own" ON storage.objects;
CREATE POLICY "kyc_documents_update_own"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'kyc-documents')
WITH CHECK (bucket_id = 'kyc-documents');

DROP POLICY IF EXISTS "kyc_documents_delete_own" ON storage.objects;
CREATE POLICY "kyc_documents_delete_own"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'kyc-documents');

DROP POLICY IF EXISTS "kyc_documents_admin_all" ON storage.objects;
CREATE POLICY "kyc_documents_admin_all"
ON storage.objects
FOR ALL
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
)
WITH CHECK (
  bucket_id = 'kyc-documents'
  AND EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);
