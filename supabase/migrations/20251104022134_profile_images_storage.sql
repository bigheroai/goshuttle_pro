-- Location: supabase/migrations/20251104022134_profile_images_storage.sql
-- Storage setup for profile images
-- Dependencies: Existing auth system

-- Create profile images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'profile-images',
    'profile-images', 
    true,
    5242880, -- 5MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/jpg']
);

-- RLS Policy: Anyone can view profile images (public bucket)
CREATE POLICY "public_can_view_profile_images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'profile-images');

-- RLS Policy: Users can upload their own profile images
CREATE POLICY "users_upload_own_profile_images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Users can update their own profile images
CREATE POLICY "users_update_own_profile_images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Users can delete their own profile images
CREATE POLICY "users_delete_own_profile_images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
    bucket_id = 'profile-images'
    AND (storage.foldername(name))[1] = auth.uid()::text
);

-- RLS Policy: Admins can manage all profile images
CREATE POLICY "admins_manage_all_profile_images"
ON storage.objects
FOR ALL
TO authenticated
USING (
    bucket_id = 'profile-images'
    AND EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND (au.raw_user_meta_data->>'role' = 'admin')
    )
)
WITH CHECK (
    bucket_id = 'profile-images'
    AND EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND (au.raw_user_meta_data->>'role' = 'admin')
    )
);