-- Location: supabase/migrations/20251107090000_create_missing_driver_tables.sql
-- Schema Analysis: Adding missing driver tables to existing GoShuttle schema
-- Integration Type: addition (extending existing driver functionality)
-- Dependencies: user_profiles, partners, vehicles, bookings

-- 1. Add missing ENUM types
CREATE TYPE public.driver_status AS ENUM ('available', 'busy', 'offline', 'on_trip');
CREATE TYPE public.assignment_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- 2. Create driver_profiles table (main driver data)
CREATE TABLE public.driver_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    license_number TEXT NOT NULL,
    license_expiry DATE NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    current_status public.driver_status DEFAULT 'offline'::public.driver_status,
    current_location JSONB,
    last_location_update TIMESTAMPTZ,
    rating DECIMAL(3,2) DEFAULT 0.0,
    total_trips INTEGER DEFAULT 0,
    fleet_type TEXT DEFAULT 'goshuttle',
    is_verified BOOLEAN DEFAULT false,
    qualifications JSONB DEFAULT '[]'::jsonb,
    availability_schedule JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create driver_assignments table (trip assignments)
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

-- 4. Create driver_performance table (performance tracking)
CREATE TABLE public.driver_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES public.driver_profiles(id) ON DELETE CASCADE,
    trip_date DATE NOT NULL,
    trips_completed INTEGER DEFAULT 0,
    total_earnings DECIMAL(10,2) DEFAULT 0.0,
    average_rating DECIMAL(3,2) DEFAULT 0.0,
    punctuality_score DECIMAL(3,2) DEFAULT 0.0,
    safety_incidents INTEGER DEFAULT 0,
    customer_complaints INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Create driver_signup_requests table (driver applications)
CREATE TABLE public.driver_signup_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email TEXT NOT NULL,
    full_name TEXT NOT NULL,
    phone TEXT NOT NULL,
    license_number TEXT NOT NULL,
    license_expiry DATE NOT NULL,
    partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
    fleet_type TEXT DEFAULT 'goshuttle',
    documents JSONB DEFAULT '[]'::jsonb,
    status TEXT DEFAULT 'pending',
    reviewed_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create indexes for performance
CREATE INDEX idx_driver_profiles_user_id ON public.driver_profiles(user_id);
CREATE INDEX idx_driver_profiles_partner_id ON public.driver_profiles(partner_id);
CREATE INDEX idx_driver_profiles_vehicle_id ON public.driver_profiles(vehicle_id);
CREATE INDEX idx_driver_profiles_status ON public.driver_profiles(current_status);

CREATE INDEX idx_driver_assignments_driver_id ON public.driver_assignments(driver_id);
CREATE INDEX idx_driver_assignments_booking_id ON public.driver_assignments(booking_id);
CREATE INDEX idx_driver_assignments_status ON public.driver_assignments(assignment_status);

CREATE INDEX idx_driver_performance_driver_id ON public.driver_performance(driver_id);
CREATE INDEX idx_driver_performance_date ON public.driver_performance(trip_date);

CREATE INDEX idx_driver_signup_requests_status ON public.driver_signup_requests(status);
CREATE INDEX idx_driver_signup_requests_email ON public.driver_signup_requests(email);

-- 7. Enable RLS on all new tables
ALTER TABLE public.driver_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.driver_signup_requests ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- Driver profiles - drivers manage own profiles, admins see all
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

-- Driver assignments - drivers see own assignments, admins see all
CREATE POLICY "drivers_view_own_assignments"
ON public.driver_assignments
FOR SELECT
TO authenticated
USING (
    driver_id IN (
        SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "admin_full_access_driver_assignments"
ON public.driver_assignments
FOR ALL
TO authenticated
USING (is_admin_from_auth())
WITH CHECK (is_admin_from_auth());

-- Driver performance - drivers see own performance, admins see all
CREATE POLICY "drivers_view_own_performance"
ON public.driver_performance
FOR SELECT
TO authenticated
USING (
    driver_id IN (
        SELECT id FROM public.driver_profiles WHERE user_id = auth.uid()
    )
);

CREATE POLICY "admin_full_access_driver_performance"
ON public.driver_performance
FOR ALL
TO authenticated
USING (is_admin_from_auth())
WITH CHECK (is_admin_from_auth());

-- Driver signup requests - users manage own requests, admins see all
CREATE POLICY "users_manage_own_driver_signup_requests"
ON public.driver_signup_requests
FOR ALL
TO authenticated
USING (email = (SELECT email FROM auth.users WHERE id = auth.uid()))
WITH CHECK (email = (SELECT email FROM auth.users WHERE id = auth.uid()));

CREATE POLICY "admin_full_access_driver_signup_requests"
ON public.driver_signup_requests
FOR ALL
TO authenticated
USING (is_admin_from_auth())
WITH CHECK (is_admin_from_auth());

-- 9. Add triggers for updated_at
CREATE TRIGGER update_driver_profiles_updated_at
    BEFORE UPDATE ON public.driver_profiles
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_assignments_updated_at
    BEFORE UPDATE ON public.driver_assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_driver_signup_requests_updated_at
    BEFORE UPDATE ON public.driver_signup_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- 10. Sample data linking existing tables
DO $$
DECLARE
    existing_user_id UUID;
    existing_partner_id UUID;
    existing_vehicle_id UUID;
    driver_profile_id UUID;
    existing_booking_id UUID;
BEGIN
    -- Get existing IDs from current schema
    SELECT id INTO existing_user_id FROM public.user_profiles WHERE role = 'driver' LIMIT 1;
    SELECT id INTO existing_partner_id FROM public.partners LIMIT 1;
    SELECT id INTO existing_vehicle_id FROM public.vehicles LIMIT 1;
    SELECT id INTO existing_booking_id FROM public.bookings LIMIT 1;

    IF existing_user_id IS NOT NULL THEN
        -- Create driver profile for existing driver user
        INSERT INTO public.driver_profiles (
            id, user_id, partner_id, license_number, license_expiry, vehicle_id,
            current_status, rating, total_trips, fleet_type, is_verified
        ) VALUES (
            gen_random_uuid(), existing_user_id, existing_partner_id, 'DL123456789',
            '2025-12-31', existing_vehicle_id, 'available', 4.8, 150, 'goshuttle', true
        ) RETURNING id INTO driver_profile_id;

        -- Create sample assignment if booking exists
        IF existing_booking_id IS NOT NULL AND driver_profile_id IS NOT NULL THEN
            INSERT INTO public.driver_assignments (
                booking_id, driver_id, assignment_status, assigned_at, accepted_at, earnings
            ) VALUES (
                existing_booking_id, driver_profile_id, 'completed', 
                CURRENT_TIMESTAMP - INTERVAL '2 hours',
                CURRENT_TIMESTAMP - INTERVAL '1 hour 50 minutes',
                45.50
            );

            -- Create performance record
            INSERT INTO public.driver_performance (
                driver_id, trip_date, trips_completed, total_earnings, average_rating, punctuality_score
            ) VALUES (
                driver_profile_id, CURRENT_DATE, 3, 135.75, 4.8, 95.5
            );
        END IF;

        -- Create sample signup request
        INSERT INTO public.driver_signup_requests (
            email, full_name, phone, license_number, license_expiry,
            partner_id, fleet_type, status
        ) VALUES (
            'newdriver@example.com', 'Maria Santos', '+639171234567',
            'DL987654321', '2026-06-30', existing_partner_id, 'partner_fleet', 'pending'
        );
    END IF;
END $$;