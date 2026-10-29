-- Location: supabase/migrations/20251107082000_fix_partner_fleet_enum_error.sql
-- Schema Analysis: Fixing enum transaction issue by separating enum modifications from usage
-- Integration Type: Fix - resolving PostgreSQL enum commit requirements
-- Dependencies: user_role enum, partners, user_profiles, vehicles tables

-- CRITICAL FIX: Split enum additions from their usage to avoid transaction conflicts

-- 1. Add new enum values first (these must be in separate transactions from usage)
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'partner_fleet';
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'driver';

-- 2. Create driver_applications table for driver registration
CREATE TABLE IF NOT EXISTS public.driver_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    license_number TEXT NOT NULL,
    license_expiry DATE NOT NULL,
    vehicle_owned BOOLEAN DEFAULT false,
    vehicle_details JSONB DEFAULT '{}',
    application_status TEXT DEFAULT 'pending',
    background_check_status TEXT DEFAULT 'pending',
    documents_uploaded JSONB DEFAULT '[]',
    preferred_fleet_type TEXT DEFAULT 'goshuttle',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    approved_at TIMESTAMPTZ,
    approved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- 3. Create partner_vehicles junction table for fleet-vehicle relationships
CREATE TABLE IF NOT EXISTS public.partner_vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    partner_id UUID REFERENCES public.partners(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    assigned_driver_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    assignment_date TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    UNIQUE(partner_id, vehicle_id)
);

-- 4. Create driver_schedules table for driver availability
CREATE TABLE IF NOT EXISTS public.driver_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    work_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Essential Indexes (only create if not exists)
CREATE INDEX IF NOT EXISTS idx_driver_applications_user_id ON public.driver_applications(user_id);
CREATE INDEX IF NOT EXISTS idx_driver_applications_partner_id ON public.driver_applications(partner_id);
CREATE INDEX IF NOT EXISTS idx_driver_applications_status ON public.driver_applications(application_status);
CREATE INDEX IF NOT EXISTS idx_partner_vehicles_partner_id ON public.partner_vehicles(partner_id);
CREATE INDEX IF NOT EXISTS idx_partner_vehicles_vehicle_id ON public.partner_vehicles(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_partner_vehicles_driver_id ON public.partner_vehicles(assigned_driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_driver_id ON public.driver_schedules(driver_id);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_partner_id ON public.driver_schedules(partner_id);
CREATE INDEX IF NOT EXISTS idx_driver_schedules_work_date ON public.driver_schedules(work_date);

-- 6. Enable RLS (only if not already enabled)
DO $$
BEGIN
    -- Check and enable RLS if not already enabled
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'driver_applications' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'partner_vehicles' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.partner_vehicles ENABLE ROW LEVEL SECURITY;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_class c 
        JOIN pg_namespace n ON n.oid = c.relnamespace 
        WHERE n.nspname = 'public' AND c.relname = 'driver_schedules' AND c.relrowsecurity = true
    ) THEN
        ALTER TABLE public.driver_schedules ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- 7. Helper Functions (must be before RLS policies)
CREATE OR REPLACE FUNCTION public.is_partner_fleet_owner(partner_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.partners p
    WHERE p.id = partner_uuid 
          AND p.created_by = auth.uid()
          AND p.is_active = true
)
$$;

-- 8. RLS Policies (drop existing and recreate to avoid conflicts)
-- Driver Applications: Users can manage their own applications, partners can view applications to their fleet
DROP POLICY IF EXISTS "users_manage_own_driver_applications" ON public.driver_applications;
CREATE POLICY "users_manage_own_driver_applications"
ON public.driver_applications
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "partners_view_fleet_applications" ON public.driver_applications;
CREATE POLICY "partners_view_fleet_applications"
ON public.driver_applications
FOR SELECT
TO authenticated
USING (
    partner_id IS NOT NULL 
    AND public.is_partner_fleet_owner(partner_id)
);

-- Partner Vehicles: Partner fleet owners can manage their vehicle assignments
DROP POLICY IF EXISTS "partner_fleet_manage_vehicles" ON public.partner_vehicles;
CREATE POLICY "partner_fleet_manage_vehicles"
ON public.partner_vehicles
FOR ALL
TO authenticated
USING (public.is_partner_fleet_owner(partner_id))
WITH CHECK (public.is_partner_fleet_owner(partner_id));

DROP POLICY IF EXISTS "drivers_view_assigned_vehicles" ON public.partner_vehicles;
CREATE POLICY "drivers_view_assigned_vehicles"
ON public.partner_vehicles
FOR SELECT
TO authenticated
USING (assigned_driver_id = auth.uid());

-- Driver Schedules: Drivers manage their own schedules, partners can view their drivers' schedules
DROP POLICY IF EXISTS "drivers_manage_own_schedules" ON public.driver_schedules;
CREATE POLICY "drivers_manage_own_schedules"
ON public.driver_schedules
FOR ALL
TO authenticated
USING (driver_id = auth.uid())
WITH CHECK (driver_id = auth.uid());

DROP POLICY IF EXISTS "partners_view_driver_schedules" ON public.driver_schedules;
CREATE POLICY "partners_view_driver_schedules"
ON public.driver_schedules
FOR SELECT
TO authenticated
USING (
    partner_id IS NOT NULL 
    AND public.is_partner_fleet_owner(partner_id)
);

-- Admin access to all partner fleet data
DROP POLICY IF EXISTS "admin_full_access_driver_applications" ON public.driver_applications;
CREATE POLICY "admin_full_access_driver_applications"
ON public.driver_applications
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

DROP POLICY IF EXISTS "admin_full_access_partner_vehicles" ON public.partner_vehicles;
CREATE POLICY "admin_full_access_partner_vehicles"
ON public.partner_vehicles
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

DROP POLICY IF EXISTS "admin_full_access_driver_schedules" ON public.driver_schedules;
CREATE POLICY "admin_full_access_driver_schedules"
ON public.driver_schedules
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- 9. Update triggers for timestamps (only create if not exists)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_driver_applications_updated_at') THEN
        CREATE TRIGGER update_driver_applications_updated_at
            BEFORE UPDATE ON public.driver_applications
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_driver_schedules_updated_at') THEN
        CREATE TRIGGER update_driver_schedules_updated_at
            BEFORE UPDATE ON public.driver_schedules
            FOR EACH ROW
            EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

-- 10. Mock Data (FIXED: Removed usage of new enum values in this transaction)
-- Instead, create a separate transaction-safe mock data block
DO $$
DECLARE
    partner_fleet_user_id UUID := gen_random_uuid();
    driver1_user_id UUID := gen_random_uuid();
    driver2_user_id UUID := gen_random_uuid();
    test_partner_id UUID;
    test_vehicle_id UUID;
    existing_records_count INTEGER;
BEGIN
    -- Check if mock data already exists
    SELECT COUNT(*) INTO existing_records_count FROM public.driver_applications;
    
    -- Only insert mock data if tables are empty
    IF existing_records_count = 0 THEN
        -- Create mock auth users WITHOUT using the new enum values immediately
        INSERT INTO auth.users (
            id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
            created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
            is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
            recovery_token, recovery_sent_at, email_change_token_new, email_change,
            email_change_sent_at, email_change_token_current, email_change_confirm_status,
            reauthentication_token, reauthentication_sent_at, phone, phone_change,
            phone_change_token, phone_change_sent_at
        ) VALUES
            (partner_fleet_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             'fleet@partner.com', crypt('fleet123', gen_salt('bf', 10)), now(), now(), now(),
             '{"full_name": "Fleet Partner Owner"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
             false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
            (driver1_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             'driver1@test.com', crypt('driver123', gen_salt('bf', 10)), now(), now(), now(),
             '{"full_name": "John Driver"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
             false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
            (driver2_user_id, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
             'driver2@test.com', crypt('driver123', gen_salt('bf', 10)), now(), now(), now(),
             '{"full_name": "Sarah Driver"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
             false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

        -- Get existing partner and vehicle for relationships
        SELECT id INTO test_partner_id FROM public.partners LIMIT 1;
        SELECT id INTO test_vehicle_id FROM public.vehicles LIMIT 1;

        -- Create partner fleet relationship if partner exists
        IF test_partner_id IS NOT NULL AND test_vehicle_id IS NOT NULL THEN
            INSERT INTO public.partner_vehicles (partner_id, vehicle_id, assigned_driver_id, created_by)
            VALUES (test_partner_id, test_vehicle_id, driver1_user_id, partner_fleet_user_id);
        END IF;

        -- Create sample driver applications
        INSERT INTO public.driver_applications (
            user_id, partner_id, full_name, phone, license_number, license_expiry,
            vehicle_owned, application_status, preferred_fleet_type
        ) VALUES
            (driver1_user_id, test_partner_id, 'John Driver', '+63917123456', 'DL123456789', '2025-12-31', false, 'approved', 'partner_fleet'),
            (driver2_user_id, NULL, 'Sarah Driver', '+63917654321', 'DL987654321', '2026-06-30', true, 'pending', 'goshuttle');

        -- Create sample driver schedules
        INSERT INTO public.driver_schedules (driver_id, partner_id, work_date, start_time, end_time)
        VALUES
            (driver1_user_id, test_partner_id, CURRENT_DATE + INTERVAL '1 day', '08:00', '17:00'),
            (driver1_user_id, test_partner_id, CURRENT_DATE + INTERVAL '2 days', '09:00', '18:00'),
            (driver2_user_id, NULL, CURRENT_DATE + INTERVAL '1 day', '06:00', '14:00');

        RAISE NOTICE 'Partner fleet management data created successfully';
    ELSE
        RAISE NOTICE 'Mock data already exists, skipping insertion';
    END IF;
    
    -- Note: The handle_new_user() trigger will automatically assign roles to the created user profiles
    -- based on the raw_user_meta_data, but only after the enum values are committed
    
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating mock data: %', SQLERRM;
        -- Continue execution, don't fail the migration for mock data issues
END $$;