-- =====================================================
-- Image Storage Policies Setup for All Buckets
-- Migration: 20251104024155_image_storage_policies.sql
-- =====================================================

-- Storage RLS policies for the Profiles bucket
-- Private bucket for user profile pictures
CREATE POLICY "users_view_own_profile_images"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'Profiles' AND owner = auth.uid());

CREATE POLICY "users_upload_own_profile_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'Profiles' 
    AND owner = auth.uid()
    AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "users_update_own_profile_images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'Profiles' AND owner = auth.uid())
WITH CHECK (bucket_id = 'Profiles' AND owner = auth.uid());

CREATE POLICY "users_delete_own_profile_images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'Profiles' AND owner = auth.uid());

-- Storage RLS policies for the mainbucket
-- Private bucket for general application assets
CREATE POLICY "users_view_own_main_assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'mainbucket' AND owner = auth.uid());

CREATE POLICY "users_upload_main_assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'mainbucket' 
    AND owner = auth.uid()
);

CREATE POLICY "users_update_own_main_assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'mainbucket' AND owner = auth.uid())
WITH CHECK (bucket_id = 'mainbucket' AND owner = auth.uid());

CREATE POLICY "users_delete_own_main_assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'mainbucket' AND owner = auth.uid());

-- Storage RLS policies for the company bucket
-- Private bucket for company logos and documents
CREATE POLICY "company_users_view_company_assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'company'
    AND (
        owner = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND (up.role = 'admin' OR up.role = 'corporate_manager')
        )
    )
);

CREATE POLICY "company_managers_upload_company_assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'company'
    AND owner = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND (up.role = 'admin' OR up.role = 'corporate_manager')
    )
);

CREATE POLICY "company_managers_update_company_assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'company'
    AND owner = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND (up.role = 'admin' OR up.role = 'corporate_manager')
    )
)
WITH CHECK (
    bucket_id = 'company'
    AND owner = auth.uid()
);

CREATE POLICY "company_managers_delete_company_assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'company'
    AND owner = auth.uid()
    AND EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND (up.role = 'admin' OR up.role = 'corporate_manager')
    )
);

-- Storage RLS policies for the partner bucket
-- Private bucket for partner/external assets
CREATE POLICY "partners_view_partner_assets"
ON storage.objects
FOR SELECT
TO authenticated
USING (
    bucket_id = 'partner'
    AND (
        owner = auth.uid()
        OR EXISTS (
            SELECT 1 FROM public.user_profiles up
            WHERE up.id = auth.uid()
            AND up.role = 'admin'
        )
    )
);

CREATE POLICY "partners_upload_partner_assets"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'partner'
    AND owner = auth.uid()
);

CREATE POLICY "partners_update_own_partner_assets"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'partner' AND owner = auth.uid())
WITH CHECK (bucket_id = 'partner' AND owner = auth.uid());

CREATE POLICY "partners_delete_own_partner_assets"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'partner' AND owner = auth.uid());

-- Admin policies for all buckets
CREATE POLICY "admins_full_access_all_storage"
ON storage.objects
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid()
        AND up.role = 'admin'
    )
);