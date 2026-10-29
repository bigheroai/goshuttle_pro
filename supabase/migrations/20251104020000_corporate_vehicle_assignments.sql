-- Location: supabase/migrations/20251104020000_corporate_vehicle_assignments.sql
-- Schema Analysis: Extending existing GoShuttle Pro schema with corporate assignment features
-- Integration Type: Extension - Adding corporate vehicle assignments and pricing
-- Dependencies: companies, vehicles, user_profiles tables (existing)

-- 1. Create corporate vehicle assignments table
CREATE TABLE public.corporate_vehicle_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    assigned_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    
    -- Ensure unique active assignments
    CONSTRAINT unique_active_assignment EXCLUDE (company_id WITH =, vehicle_id WITH =) 
    WHERE (is_active = true)
);

-- 2. Create corporate pricing table
CREATE TABLE public.corporate_pricing (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    vehicle_type public.vehicle_type NOT NULL,
    daily_rate DECIMAL(10,2) NOT NULL,
    monthly_rate DECIMAL(10,2),
    discount_percentage DECIMAL(5,2) DEFAULT 0,
    min_booking_hours INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    valid_from TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    valid_until TIMESTAMPTZ,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Create indexes for performance
CREATE INDEX idx_corp_vehicle_assignments_company ON public.corporate_vehicle_assignments(company_id);
CREATE INDEX idx_corp_vehicle_assignments_vehicle ON public.corporate_vehicle_assignments(vehicle_id);
CREATE INDEX idx_corp_vehicle_assignments_active ON public.corporate_vehicle_assignments(is_active);

CREATE INDEX idx_corp_pricing_company ON public.corporate_pricing(company_id);
CREATE INDEX idx_corp_pricing_vehicle_type ON public.corporate_pricing(vehicle_type);
CREATE INDEX idx_corp_pricing_active ON public.corporate_pricing(is_active);

-- 4. Enable RLS
ALTER TABLE public.corporate_vehicle_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_pricing ENABLE ROW LEVEL SECURITY;

-- 5. RLS Policies - Admin-only access with public read for active records
CREATE POLICY "admin_full_access_corp_assignments"
ON public.corporate_vehicle_assignments
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

CREATE POLICY "authenticated_read_active_assignments"
ON public.corporate_vehicle_assignments
FOR SELECT
TO authenticated
USING (is_active = true);

CREATE POLICY "admin_full_access_corp_pricing"
ON public.corporate_pricing
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

CREATE POLICY "authenticated_read_active_pricing"
ON public.corporate_pricing
FOR SELECT
TO authenticated
USING (is_active = true);

-- 6. Add relationship linking user_profiles to companies (if not exists)
DO $$
BEGIN
    -- Check if foreign key constraint exists
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_profiles_company_id_fkey'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD CONSTRAINT user_profiles_company_id_fkey 
        FOREIGN KEY (company_id) REFERENCES public.companies(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 7. Mock data for corporate assignments and pricing
DO $$
DECLARE
    existing_company_id UUID;
    existing_vehicle_id UUID;
    admin_user_id UUID;
BEGIN
    -- Get existing company, vehicle, and admin user IDs
    SELECT id INTO existing_company_id FROM public.companies LIMIT 1;
    SELECT id INTO existing_vehicle_id FROM public.vehicles LIMIT 1;
    SELECT id INTO admin_user_id FROM public.user_profiles WHERE role = 'admin' LIMIT 1;
    
    -- Only create mock data if we have existing records
    IF existing_company_id IS NOT NULL AND existing_vehicle_id IS NOT NULL THEN
        -- Create vehicle assignment
        INSERT INTO public.corporate_vehicle_assignments 
        (company_id, vehicle_id, assigned_by, notes)
        VALUES
        (existing_company_id, existing_vehicle_id, admin_user_id, 'Initial corporate fleet assignment for TechCorp Solutions');
        
        -- Create corporate pricing
        INSERT INTO public.corporate_pricing 
        (company_id, vehicle_type, daily_rate, monthly_rate, discount_percentage, created_by)
        VALUES
        (existing_company_id, 'van', 2200.00, 60000.00, 15.00, admin_user_id),
        (existing_company_id, 'executive_car', 3200.00, 85000.00, 20.00, admin_user_id),
        (existing_company_id, 'corporate_car', 3000.00, 80000.00, 18.00, admin_user_id);
    END IF;
    
EXCEPTION
    WHEN foreign_key_violation THEN
        RAISE NOTICE 'Foreign key error: %', SQLERRM;
    WHEN unique_violation THEN
        RAISE NOTICE 'Unique constraint error: %', SQLERRM;
    WHEN OTHERS THEN
        RAISE NOTICE 'Unexpected error: %', SQLERRM;
END $$;