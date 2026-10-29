-- Location: supabase/migrations/20251107075248_driver_assignment_partner_fleet.sql
-- Schema Analysis: Existing schema has user_profiles, partners, vehicles, bookings tables
-- Integration Type: Extension - adding driver management and partner fleet functionality
-- Dependencies: user_profiles, partners, vehicles tables (existing)

-- 1. ENUM Types for driver management
CREATE TYPE public.driver_status AS ENUM ('available', 'busy', 'offline', 'on_break');
CREATE TYPE public.assignment_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');
CREATE TYPE public.fleet_type AS ENUM ('goshuttle_main', 'partner_fleet');

-- 2. Extend user_role enum to include driver and partner_fleet_manager
ALTER TYPE public.user_role ADD VALUE 'driver';
ALTER TYPE public.user_role ADD VALUE 'partner_fleet_manager';

-- 3. Driver profiles table
CREATE TABLE public.driver_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    license_number TEXT NOT NULL,
    license_expiry DATE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    current_status public.driver_status DEFAULT 'available'::public.driver_status,
    current_location JSONB,
    last_location_update TIMESTAMPTZ,
    rating DECIMAL(3,2) DEFAULT 0.00,
    total_trips INTEGER DEFAULT 0,
    fleet_type public.fleet_type DEFAULT 'goshuttle_main'::public.fleet_type,
    is_verified BOOLEAN DEFAULT false,
    qualifications JSONB DEFAULT '[]'::jsonb,
    availability_schedule JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- 4. Driver assignments table
CREATE TABLE public.driver_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE CASCADE,
    driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    assigned_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    assignment_status public.assignment_status DEFAULT 'pending'::public.assignment_status,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    accepted_at TIMESTAMPTZ,
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    cancelled_at TIMESTAMPTZ,
    cancellation_reason TEXT,
    earnings DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Driver performance metrics table
CREATE TABLE public.driver_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    trip_date DATE NOT NULL,
    trips_completed INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.00,
    average_rating DECIMAL(3,2) DEFAULT 0.00,
    punctuality_score DECIMAL(3,2) DEFAULT 0.00,
    safety_incidents INTEGER DEFAULT 0,
    customer_complaints INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(driver_id, trip_date)
);

-- 6. Driver signup requests table
CREATE TABLE public.driver_signup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    license_number TEXT NOT NULL,
    license_expiry DATE NOT NULL,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    fleet_type public.fleet_type DEFAULT 'goshuttle_main'::public.fleet_type,
    documents JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Essential Indexes
CREATE INDEX idx_driver_profiles_user_id ON public.driver_profiles(user_id);
CREATE INDEX idx_driver_profiles_partner_id ON public.driver_profiles(partner_id);
CREATE INDEX idx_driver_profiles_status ON public.driver_profiles(current_status);
CREATE INDEX idx_driver_profiles_fleet_type ON public.driver_profiles(fleet_type);
CREATE INDEX idx_driver_assignments_driver_id ON public.driver_assignments(driver_id);
CREATE INDEX idx_driver_assignments_booking_id ON public.driver_assignments(booking_id);
CREATE INDEX idx_driver_assignments_status ON public.driver_assignments(assignment_status);
CREATE INDEX idx_driver_performance_driver_id ON public.driver_performance(driver_id);
CREATE INDEX idx_driver_signup_requests_status ON public.driver_signup_requests(status);
CREATE INDEX idx_driver_signup_requests_partner_id ON public.driver_signup_requests(partner_id);

-- 8. Updated timestamp triggers
CREATE TRIGGER update_driver_profiles_updated_at
    BEFORE UPDATE ON public.driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_assignments_updated_at
    BEFORE UPDATE ON public.driver_assignments
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_driver_signup_requests_updated_at
    BEFORE UPDATE ON public.driver_signup_requests
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Enable RLS
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_signup_requests ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies

-- Driver profiles policies
CREATE POLICY "drivers_manage_own_driver_profiles"
ON public.driver_profiles
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

CREATE POLICY "admin_full_access_driver_profiles"
ON public.driver_profiles
FOR ALL
TO authenticated
USING (is_admin_from_auth())
WITH CHECK (is_admin_from_auth());

-- Partner fleet managers can view their drivers
CREATE POLICY "partner_managers_view_their_drivers"
ON public.driver_profiles
FOR SELECT
TO authenticated
USING (
    partner_id IN (
        SELECT p.id FROM public.partners p
        WHERE p.created_by = auth.uid()
    )
);

-- Driver assignments policies
CREATE POLICY "drivers_view_own_assignments"
ON public.driver_assignments
FOR SELECT
TO authenticated
USING (
    driver_id IN (
        SELECT dp.id FROM public.driver_profiles dp
        WHERE dp.user_id = auth.uid()
    )
);

CREATE POLICY "admin_full_access_driver_assignments"
ON public.driver_assignments
FOR ALL
TO authenticated
USING (is_admin_from_auth())
WITH CHECK (is_admin_from_auth());

-- Driver performance policies
CREATE POLICY "drivers_view_own_performance"
ON public.driver_performance
FOR SELECT
TO authenticated
USING (
    driver_id IN (
        SELECT dp.id FROM public.driver_profiles dp
        WHERE dp.user_id = auth.uid()
    )
);

CREATE POLICY "admin_full_access_driver_performance"
ON public.driver_performance
FOR ALL
TO authenticated
USING (is_admin_from_auth())
WITH CHECK (is_admin_from_auth());

-- Driver signup requests policies (public can create, admins/partners can manage)
CREATE POLICY "public_can_create_driver_signup_requests"
ON public.driver_signup_requests
FOR INSERT
TO public
WITH CHECK (true);

CREATE POLICY "admin_full_access_driver_signup_requests"
ON public.driver_signup_requests
FOR ALL
TO authenticated
USING (is_admin_from_auth())
WITH CHECK (is_admin_from_auth());

CREATE POLICY "partners_manage_their_driver_requests"
ON public.driver_signup_requests
FOR ALL
TO authenticated
USING (
    partner_id IN (
        SELECT p.id FROM public.partners p
        WHERE p.created_by = auth.uid()
    )
)
WITH CHECK (
    partner_id IN (
        SELECT p.id FROM public.partners p
        WHERE p.created_by = auth.uid()
    )
);

-- 11. Mock Data
DO $$
DECLARE
    admin_user_id UUID;
    partner_user_id UUID;
    partner1_id UUID;
    partner2_id UUID;
    driver1_id UUID;
    driver2_id UUID;
    driver3_id UUID;
    vehicle1_id UUID;
    vehicle2_id UUID;
    booking1_id UUID;
    assignment1_id UUID;
BEGIN
    -- Get existing admin user
    SELECT id INTO admin_user_id FROM public.user_profiles WHERE role = 'admin' LIMIT 1;
    
    -- Get existing partner
    SELECT id INTO partner1_id FROM public.partners LIMIT 1;
    
    -- Get existing vehicles
    SELECT id INTO vehicle1_id FROM public.vehicles LIMIT 1;
    SELECT id INTO vehicle2_id FROM public.vehicles WHERE id != vehicle1_id LIMIT 1;
    
    -- Get existing booking
    SELECT id INTO booking1_id FROM public.bookings LIMIT 1;

    -- Create partner fleet manager user
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'partner@fleet.com', crypt('partner123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Fleet Manager"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    -- Get the partner user ID
    SELECT id INTO partner_user_id FROM auth.users WHERE email = 'partner@fleet.com';

    -- Create sample partner fleet
    INSERT INTO public.partners (id, name, company_name, contact_email, contact_phone, 
                                 partnership_type, specialization, created_by)
    VALUES 
        (gen_random_uuid(), 'Elite Fleet Partners', 'Elite Fleet Partners Ltd.', 
         'contact@elitefleet.com', '+63 917 123 4567', 'fleet_partner', 
         'Executive Transportation & Corporate Services', admin_user_id)
    RETURNING id INTO partner2_id;

    -- Create driver users
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'driver1@goshuttle.com', crypt('driver123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Carlos Mendez", "role": "driver"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'driver2@partner.com', crypt('driver123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Maria Rodriguez", "role": "driver"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (gen_random_uuid(), '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'driver3@goshuttle.com', crypt('driver123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Roberto Santos", "role": "driver"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    -- Create driver profiles
    INSERT INTO public.driver_profiles (id, user_id, partner_id, license_number, license_expiry, 
                                        vehicle_id, current_status, rating, total_trips, 
                                        fleet_type, is_verified, qualifications)
    VALUES 
        (gen_random_uuid(), 
         (SELECT id FROM auth.users WHERE email = 'driver1@goshuttle.com'),
         NULL, 'DL-123456789', '2026-12-31', vehicle1_id, 'available',
         4.8, 150, 'goshuttle_main', true, 
         '["Defensive Driving", "First Aid Certified", "Customer Service"]'::jsonb)
    RETURNING id INTO driver1_id;

    INSERT INTO public.driver_profiles (id, user_id, partner_id, license_number, license_expiry,
                                        vehicle_id, current_status, rating, total_trips,
                                        fleet_type, is_verified, qualifications)
    VALUES 
        (gen_random_uuid(),
         (SELECT id FROM auth.users WHERE email = 'driver2@partner.com'),
         partner2_id, 'DL-987654321', '2027-06-30', vehicle2_id, 'busy',
         4.9, 89, 'partner_fleet', true,
         '["Executive Driving", "Airport Specialist", "VIP Service"]'::jsonb)
    RETURNING id INTO driver2_id;

    INSERT INTO public.driver_profiles (id, user_id, partner_id, license_number, license_expiry,
                                        current_status, rating, total_trips, fleet_type, is_verified)
    VALUES 
        (gen_random_uuid(),
         (SELECT id FROM auth.users WHERE email = 'driver3@goshuttle.com'),
         NULL, 'DL-456789123', '2025-09-15', 'offline',
         4.6, 67, 'goshuttle_main', true)
    RETURNING id INTO driver3_id;

    -- Create sample driver assignments
    IF booking1_id IS NOT NULL THEN
        INSERT INTO public.driver_assignments (booking_id, driver_id, assigned_by, 
                                               assignment_status, assigned_at, accepted_at, 
                                               earnings)
        VALUES 
            (booking1_id, driver1_id, admin_user_id, 'confirmed', 
             now() - interval '2 hours', now() - interval '1 hour 45 minutes', 2500.00);
    END IF;

    -- Create sample driver performance records
    INSERT INTO public.driver_performance (driver_id, trip_date, trips_completed, 
                                           total_earnings, average_rating, punctuality_score)
    VALUES 
        (driver1_id, CURRENT_DATE - 1, 8, 12500.00, 4.8, 4.9),
        (driver1_id, CURRENT_DATE - 2, 6, 9800.00, 4.7, 4.8),
        (driver2_id, CURRENT_DATE - 1, 5, 15600.00, 4.9, 5.0),
        (driver3_id, CURRENT_DATE - 1, 4, 7200.00, 4.6, 4.5);

    -- Create sample driver signup requests
    INSERT INTO public.driver_signup_requests (email, full_name, phone, license_number,
                                               license_expiry, partner_id, fleet_type, status)
    VALUES 
        ('newdriver1@email.com', 'Juan dela Cruz', '+63 917 555 0001', 'DL-NEW123456',
         '2027-12-31', NULL, 'goshuttle_main', 'pending'),
        ('newdriver2@email.com', 'Anna Reyes', '+63 918 555 0002', 'DL-NEW789012',
         '2026-08-15', partner2_id, 'partner_fleet', 'under_review'),
        ('newdriver3@email.com', 'Michael Torres', '+63 919 555 0003', 'DL-NEW345678',
         '2028-03-20', NULL, 'goshuttle_main', 'approved');

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Error creating mock data: %', SQLERRM;
END $$;