-- ============================================
-- Migration: Fix Vehicles RLS Policies
-- Description: Fix INSERT violation and ensure admins can see all vehicles (not just active)
-- ============================================

-- 1. Update is_admin_from_auth to also check user_profiles.role as fallback
CREATE OR REPLACE FUNCTION public.is_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
    AND (
        au.raw_user_meta_data->>'role' = 'admin'
        OR au.raw_app_meta_data->>'role' = 'admin'
    )
)
OR EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.role = 'admin'
)
$$;

-- 2. Drop all existing vehicle policies to recreate cleanly
DROP POLICY IF EXISTS "admin_full_access_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "public_can_read_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "authenticated_read_active_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "admin_only_insert_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "admin_only_update_vehicles" ON public.vehicles;
DROP POLICY IF EXISTS "admin_only_delete_vehicles" ON public.vehicles;

-- 3. Admins can do everything (SELECT all vehicles regardless of status)
CREATE POLICY "admin_full_access_vehicles"
ON public.vehicles
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- 4. Non-admin authenticated users can only read active vehicles
CREATE POLICY "authenticated_read_active_vehicles"
ON public.vehicles
FOR SELECT
TO authenticated
USING (
    status = 'active'::public.vehicle_status
    AND NOT public.is_admin_from_auth()
);

-- 5. Public (unauthenticated) can also read active vehicles for booking portal
CREATE POLICY "public_read_active_vehicles"
ON public.vehicles
FOR SELECT
TO anon
USING (status = 'active'::public.vehicle_status);

DO $$
BEGIN
    RAISE NOTICE 'Vehicles RLS policies fixed:';
    RAISE NOTICE 'Admins can now INSERT, UPDATE, DELETE, and SELECT ALL vehicles';
    RAISE NOTICE 'Regular users can only SELECT active vehicles';
    RAISE NOTICE 'is_admin_from_auth() now checks both auth metadata and user_profiles.role';
END $$;
