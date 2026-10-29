-- Fix RLS policies for profile photos (user_profiles), bookings, driver documents, and favorite_bookings
-- Timestamp: 20260522130000

-- ============================================================
-- 1. Fix user_profiles RLS - allow authenticated users to update their own avatar_url
-- ============================================================
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_update_own_profile" ON public.user_profiles;
CREATE POLICY "users_can_update_own_profile"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "users_can_view_own_profile" ON public.user_profiles;
CREATE POLICY "users_can_view_own_profile"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (id = auth.uid());

DROP POLICY IF EXISTS "users_can_insert_own_profile" ON public.user_profiles;
CREATE POLICY "users_can_insert_own_profile"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (id = auth.uid());

-- Admin can view all profiles
DROP POLICY IF EXISTS "admin_can_view_all_profiles" ON public.user_profiles;
CREATE POLICY "admin_can_view_all_profiles"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (au.raw_user_meta_data->>'role' = 'admin' OR au.raw_app_meta_data->>'role' = 'admin')
  )
);

-- Admin can update all profiles
DROP POLICY IF EXISTS "admin_can_update_all_profiles" ON public.user_profiles;
CREATE POLICY "admin_can_update_all_profiles"
ON public.user_profiles
FOR UPDATE
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
-- 2. Fix bookings RLS - allow authenticated users to insert their own bookings
-- ============================================================
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_can_insert_bookings" ON public.bookings;
CREATE POLICY "authenticated_users_can_insert_bookings"
ON public.bookings
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

DROP POLICY IF EXISTS "users_can_view_own_bookings" ON public.bookings;
CREATE POLICY "users_can_view_own_bookings"
ON public.bookings
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_update_own_bookings" ON public.bookings;
CREATE POLICY "users_can_update_own_bookings"
ON public.bookings
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Allow guest bookings (anon)
DROP POLICY IF EXISTS "anon_can_insert_guest_bookings" ON public.bookings;
CREATE POLICY "anon_can_insert_guest_bookings"
ON public.bookings
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);

-- Admin full access to bookings
DROP POLICY IF EXISTS "admin_full_access_bookings" ON public.bookings;
CREATE POLICY "admin_full_access_bookings"
ON public.bookings
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
-- 3. Fix favorite_bookings RLS
-- ============================================================
ALTER TABLE public.favorite_bookings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_favorite_bookings" ON public.favorite_bookings;
CREATE POLICY "users_manage_own_favorite_bookings"
ON public.favorite_bookings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- ============================================================
-- 4. Fix driver_applications RLS - allow authenticated users to insert their own applications
-- ============================================================
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_can_insert_driver_applications" ON public.driver_applications;
CREATE POLICY "users_can_insert_driver_applications"
ON public.driver_applications
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_view_own_driver_applications" ON public.driver_applications;
CREATE POLICY "users_can_view_own_driver_applications"
ON public.driver_applications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_can_update_own_driver_applications" ON public.driver_applications;
CREATE POLICY "users_can_update_own_driver_applications"
ON public.driver_applications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Admin full access to driver applications
DROP POLICY IF EXISTS "admin_full_access_driver_applications" ON public.driver_applications;
CREATE POLICY "admin_full_access_driver_applications"
ON public.driver_applications
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
-- 5. Fix vehicles RLS - allow authenticated users to read vehicles for booking
-- ============================================================
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "authenticated_users_can_read_vehicles" ON public.vehicles;
CREATE POLICY "authenticated_users_can_read_vehicles"
ON public.vehicles
FOR SELECT
TO authenticated
USING (true);

DROP POLICY IF EXISTS "anon_can_read_active_vehicles" ON public.vehicles;
CREATE POLICY "anon_can_read_active_vehicles"
ON public.vehicles
FOR SELECT
TO anon
USING (status = 'active');

DROP POLICY IF EXISTS "admin_full_access_vehicles" ON public.vehicles;
CREATE POLICY "admin_full_access_vehicles"
ON public.vehicles
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
