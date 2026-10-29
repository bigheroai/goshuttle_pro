-- Location: supabase/migrations/20251017040435_goshuttle_auth_admin.sql
-- Schema Analysis: Fresh project - no existing tables
-- Integration Type: Complete authentication and admin system
-- Dependencies: None - creating complete schema

-- 1. Types and Enums
CREATE TYPE public.user_role AS ENUM ('admin', 'corporate_manager', 'employee', 'customer');
CREATE TYPE public.vehicle_type AS ENUM ('van', 'shuttle', 'executive_car', 'corporate_car');
CREATE TYPE public.vehicle_status AS ENUM ('active', 'maintenance', 'inactive');
CREATE TYPE public.booking_status AS ENUM ('pending', 'confirmed', 'in_progress', 'completed', 'cancelled');

-- 2. Core User Tables
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    email TEXT NOT NULL UNIQUE,
    full_name TEXT NOT NULL,
    phone TEXT,
    role public.user_role DEFAULT 'customer'::public.user_role,
    company_id UUID,
    department TEXT,
    avatar_url TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Company Management
CREATE TABLE public.companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    logo_url TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Fleet Management
CREATE TABLE public.vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    vehicle_type public.vehicle_type NOT NULL,
    license_plate TEXT UNIQUE NOT NULL,
    capacity INTEGER NOT NULL,
    image_url TEXT,
    description TEXT,
    features JSONB DEFAULT '[]'::JSONB,
    status public.vehicle_status DEFAULT 'active'::public.vehicle_status,
    daily_rate DECIMAL(10,2),
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Bookings System
CREATE TABLE public.bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id),
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    pickup_date TIMESTAMPTZ NOT NULL,
    return_date TIMESTAMPTZ,
    passenger_count INTEGER DEFAULT 1,
    status public.booking_status DEFAULT 'pending'::public.booking_status,
    total_cost DECIMAL(10,2),
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. App Settings
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    setting_key TEXT UNIQUE NOT NULL,
    setting_value JSONB NOT NULL,
    updated_by UUID REFERENCES public.user_profiles(id),
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 7. Essential Indexes
CREATE INDEX idx_user_profiles_email ON public.user_profiles(email);
CREATE INDEX idx_user_profiles_company ON public.user_profiles(company_id);
CREATE INDEX idx_vehicles_status ON public.vehicles(status);
CREATE INDEX idx_vehicles_type ON public.vehicles(vehicle_type);
CREATE INDEX idx_bookings_user ON public.bookings(user_id);
CREATE INDEX idx_bookings_vehicle ON public.bookings(vehicle_id);
CREATE INDEX idx_bookings_status ON public.bookings(status);
CREATE INDEX idx_app_settings_key ON public.app_settings(setting_key);

-- 8. Functions for automatic profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role)
  VALUES (
    NEW.id, 
    NEW.email, 
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer'::public.user_role)
  );
  RETURN NEW;
END;
$$;

-- 9. RLS Setup
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

-- 10. RLS Policies (Following Pattern Guidelines)

-- Pattern 1: Core user table (user_profiles) - Simple only, no functions
CREATE POLICY "users_manage_own_user_profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- Pattern 6A: Role-based access using auth.users metadata
CREATE OR REPLACE FUNCTION public.is_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid() 
    AND (au.raw_user_meta_data->>'role' = 'admin' 
         OR au.raw_app_meta_data->>'role' = 'admin')
)
$$;

-- Admin access to all tables
CREATE POLICY "admin_full_access_companies"
ON public.companies
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

CREATE POLICY "admin_full_access_vehicles"
ON public.vehicles
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

CREATE POLICY "admin_full_access_app_settings"
ON public.app_settings
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Pattern 4: Public read, private write for vehicles (customers can view)
CREATE POLICY "public_can_read_vehicles"
ON public.vehicles
FOR SELECT
TO authenticated
USING (status = 'active'::public.vehicle_status);

-- Pattern 2: Simple user ownership for bookings
CREATE POLICY "users_manage_own_bookings"
ON public.bookings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Pattern 4: Public read for companies (for corporate customers)
CREATE POLICY "authenticated_can_read_companies"
ON public.companies
FOR SELECT
TO authenticated
USING (true);

-- 11. Trigger for new user creation
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 12. Insert default app settings
INSERT INTO public.app_settings (setting_key, setting_value) VALUES
('app_logo_url', '{"url": "https://images.unsplash.com/photo-1558618644-fcd25c85cd64", "alt": "GoShuttle Pro transportation company logo with blue and white design"}'),
('app_meta_description', '{"description": "GoShuttle Pro - Premium corporate and personal transportation services in Metro Manila. Book reliable shuttles, vans, and executive cars with real-time tracking."}'),
('app_contact_info', '{"phone": "+63 2 8888 4567", "email": "support@goshuttlepro.com", "emergency": "117"}'),
('fleet_capacity_limits', '{"van": 8, "shuttle": 15, "executive_car": 4, "corporate_car": 6}');

-- 13. Complete Mock Data with Authentication
DO $$
DECLARE
    admin_uuid UUID := gen_random_uuid();
    manager_uuid UUID := gen_random_uuid();
    customer_uuid UUID := gen_random_uuid();
    company_uuid UUID := gen_random_uuid();
    van1_uuid UUID := gen_random_uuid();
    van2_uuid UUID := gen_random_uuid();
    car1_uuid UUID := gen_random_uuid();
BEGIN
    -- Create auth users with required fields
    INSERT INTO auth.users (
        id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
        created_at, updated_at, raw_user_meta_data, raw_app_meta_data,
        is_sso_user, is_anonymous, confirmation_token, confirmation_sent_at,
        recovery_token, recovery_sent_at, email_change_token_new, email_change,
        email_change_sent_at, email_change_token_current, email_change_confirm_status,
        reauthentication_token, reauthentication_sent_at, phone, phone_change,
        phone_change_token, phone_change_sent_at
    ) VALUES
        (admin_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'admin@goshuttlepro.com', crypt('admin123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Admin User", "role": "admin"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (manager_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'manager@techcorp.com', crypt('manager123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Maria Santos", "role": "corporate_manager"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null),
        (customer_uuid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
         'customer@email.com', crypt('customer123', gen_salt('bf', 10)), now(), now(), now(),
         '{"full_name": "Juan Dela Cruz", "role": "customer"}'::jsonb, '{"provider": "email", "providers": ["email"]}'::jsonb,
         false, false, '', null, '', null, '', '', null, '', 0, '', null, null, '', '', null);

    -- Create company
    INSERT INTO public.companies (id, name, contact_email, contact_phone, address)
    VALUES (company_uuid, 'TechCorp Solutions Inc.', 'contact@techcorp.com', '+63 2 1234 5678', 'Makati City, Metro Manila');

    -- Update user profiles with company relationships
    UPDATE public.user_profiles 
    SET company_id = company_uuid, department = 'Management' 
    WHERE id = manager_uuid;

    -- Create fleet vehicles
    INSERT INTO public.vehicles (id, name, vehicle_type, license_plate, capacity, image_url, description, features, daily_rate, created_by) VALUES
        (van1_uuid, 'GoShuttle Van 01', 'van'::public.vehicle_type, 'GSP-001', 8, 
         'https://images.unsplash.com/photo-1656385959898-7496979e7fd5', 
         'Premium 8-seater van with air conditioning and comfortable seating',
         '["Air Conditioning", "Wi-Fi", "USB Charging", "Comfortable Seating"]'::JSONB, 2500.00, admin_uuid),
        (van2_uuid, 'Corporate Express 02', 'corporate_car'::public.vehicle_type, 'GSP-002', 6,
         'https://images.unsplash.com/photo-1666312109760-9081d44ac690',
         'Executive vehicle for corporate clients with luxury amenities',
         '["Leather Seats", "Wi-Fi", "Refreshments", "Privacy Partition"]'::JSONB, 3500.00, admin_uuid),
        (car1_uuid, 'Executive Sedan 03', 'executive_car'::public.vehicle_type, 'GSP-003', 4,
         'https://images.unsplash.com/photo-1583121274602-3e2820c69888',
         'Luxury sedan for executive transportation',
         '["Premium Interior", "Climate Control", "Sound System", "Tinted Windows"]'::JSONB, 2000.00, admin_uuid);

    -- Create sample bookings
    INSERT INTO public.bookings (user_id, vehicle_id, pickup_location, dropoff_location, pickup_date, passenger_count, status, total_cost, notes)
    VALUES
        (manager_uuid, van1_uuid, 'Makati CBD - Ayala Avenue', 'NAIA Terminal 3', 
         CURRENT_TIMESTAMP + INTERVAL '2 days', 4, 'confirmed'::public.booking_status, 2500.00,
         'Airport transfer for business trip'),
        (customer_uuid, car1_uuid, 'BGC - The Fort', 'Ortigas Center',
         CURRENT_TIMESTAMP + INTERVAL '1 day', 2, 'pending'::public.booking_status, 1500.00,
         'Business meeting transportation');

EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint error: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error: %', SQLERRM;
END $$;