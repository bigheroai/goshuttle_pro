-- ============================================
-- Migration: Admin-Only Vehicle Fleet Management
-- Description: Updates RLS policies to ensure only admins can manage vehicles and creates vehicle storage bucket
-- Dependencies: Existing vehicles table, user_profiles table, is_admin_from_auth function
-- ============================================

-- 1. DROP EXISTING VEHICLE POLICIES TO RECREATE WITH ADMIN-ONLY ACCESS
DROP POLICY IF EXISTS "admin_full_access_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "public_can_read_vehicles" ON public.vehicles;

-- 2. CREATE NEW ADMIN-ONLY RLS POLICIES FOR VEHICLES
-- Policy 1: Only authenticated users can read active vehicles (for booking/viewing)
CREATE POLICY "authenticated_read_active_vehicles" ON public.vehicles
FOR SELECT TO authenticated
USING (status = 'active'::vehicle_status);

-- Policy 2: Only admins can insert new vehicles
CREATE POLICY "admin_only_insert_vehicles" ON public.vehicles
FOR INSERT TO authenticated
WITH CHECK (is_admin_from_auth());

-- Policy 3: Only admins can update vehicles
CREATE POLICY "admin_only_update_vehicles" ON public.vehicles
FOR UPDATE TO authenticated
USING (is_admin_from_auth())
WITH CHECK (is_admin_from_auth());

-- Policy 4: Only admins can delete vehicles
CREATE POLICY "admin_only_delete_vehicles" ON public.vehicles
FOR DELETE TO authenticated
USING (is_admin_from_auth());

-- 3. CREATE VEHICLES STORAGE BUCKET FOR VEHICLE IMAGES
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'vehicles',
    'vehicles',
    false,  -- Private bucket for security
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO NOTHING;

-- 4. RLS POLICIES FOR VEHICLES STORAGE BUCKET
-- Policy 1: Authenticated users can view vehicle images (for public display)
CREATE POLICY "authenticated_read_vehicle_images" ON storage.objects
FOR SELECT TO authenticated
USING (bucket_id = 'vehicles');

-- Policy 2: Only admins can upload vehicle images
CREATE POLICY "admin_upload_vehicle_images" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'vehicles' AND is_admin_from_auth());

-- Policy 3: Only admins can update vehicle images
CREATE POLICY "admin_update_vehicle_images" ON storage.objects
FOR UPDATE TO authenticated
USING (bucket_id = 'vehicles' AND is_admin_from_auth())
WITH CHECK (bucket_id = 'vehicles' AND is_admin_from_auth());

-- Policy 4: Only admins can delete vehicle images
CREATE POLICY "admin_delete_vehicle_images" ON storage.objects
FOR DELETE TO authenticated
USING (bucket_id = 'vehicles' AND is_admin_from_auth());

-- 5. SUCCESS NOTIFICATION
DO $$
BEGIN
    RAISE NOTICE 'Admin-only vehicle management successfully configured:';
    RAISE NOTICE '✅ Only admins can add, edit, or delete vehicles';
    RAISE NOTICE '✅ Companies and regular users can only book rides (view vehicles)';
    RAISE NOTICE '✅ Vehicle images storage bucket created with admin-only upload access';
    RAISE NOTICE '✅ All existing vehicle data preserved';
END $$;