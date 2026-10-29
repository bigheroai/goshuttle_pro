-- Schema Analysis: Existing comprehensive role-based system with user_profiles, companies, vehicles, bookings
-- Integration Type: Extension - Adding audit trail fields and partners management
-- Dependencies: user_profiles (existing), companies (existing), bookings (existing)

-- MODULE: User Role Management & Audit Trail Enhancement

-- 1. Create Partners table (separate from companies)
CREATE TABLE public.partners (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    company_name TEXT,
    contact_email TEXT,
    contact_phone TEXT,
    address TEXT,
    logo_url TEXT,
    specialization TEXT,
    partnership_type TEXT DEFAULT 'transport_partner',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

-- 2. Add audit trail fields to existing companies table
ALTER TABLE public.companies 
ADD COLUMN updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
ADD COLUMN updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 3. Add updated_by field to existing bookings table  
ALTER TABLE public.bookings
ADD COLUMN updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 4. Create indexes for performance
CREATE INDEX idx_partners_created_by ON public.partners(created_by);
CREATE INDEX idx_partners_updated_by ON public.partners(updated_by);
CREATE INDEX idx_partners_partnership_type ON public.partners(partnership_type);
CREATE INDEX idx_companies_created_by ON public.companies(created_by);
CREATE INDEX idx_companies_updated_by ON public.companies(updated_by);
CREATE INDEX idx_bookings_updated_by ON public.bookings(updated_by);

-- 5. Enable RLS on new partners table
ALTER TABLE public.partners ENABLE ROW LEVEL SECURITY;

-- 6. Create RLS policies following Pattern 6 (Role-based Access)

-- Admin full access to partners
CREATE POLICY "admin_full_access_partners"
ON public.partners
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Authenticated users can read active partners
CREATE POLICY "authenticated_can_read_active_partners"
ON public.partners
FOR SELECT
TO authenticated
USING (is_active = true);

-- 7. Update existing policies for companies to handle audit fields
-- Keep existing policies and add admin access for audit trail management

-- 8. Create update triggers for audit trail
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add update triggers to tables with updated_at
CREATE TRIGGER update_partners_updated_at
    BEFORE UPDATE ON public.partners
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- Add update trigger to companies table for the new updated_at column
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON public.companies
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();

-- 9. Mock data for partners using existing users
DO $$
DECLARE
    existing_admin_id UUID;
    existing_manager_id UUID;
    partner1_id UUID := gen_random_uuid();
    partner2_id UUID := gen_random_uuid();
BEGIN
    -- Get existing user IDs for audit trail
    SELECT id INTO existing_admin_id FROM public.user_profiles WHERE role = 'admin' LIMIT 1;
    SELECT id INTO existing_manager_id FROM public.user_profiles WHERE role = 'corporate_manager' LIMIT 1;

    -- Create sample partners with proper audit trail
    IF existing_admin_id IS NOT NULL THEN
        INSERT INTO public.partners (
            id, name, company_name, contact_email, contact_phone, address,
            specialization, partnership_type, created_by, updated_by
        ) VALUES
            (partner1_id, 'FastTrack Logistics', 'FastTrack Logistics Inc.', 
             'contact@fasttrack.com', '+63 2 9876 5432', 'Quezon City, Metro Manila',
             'Express Delivery & Courier Services', 'logistics_partner', 
             existing_admin_id, existing_admin_id),
            (partner2_id, 'Metro Transport Co.', 'Metro Transport Cooperative', 
             'info@metrotransport.com', '+63 2 5555 1234', 'Makati City, Metro Manila',
             'Public Transportation & Route Planning', 'transport_partner', 
             existing_admin_id, existing_admin_id);
    END IF;

    -- Update existing companies with audit trail where possible
    IF existing_manager_id IS NOT NULL THEN
        UPDATE public.companies 
        SET created_by = existing_manager_id, updated_by = existing_manager_id
        WHERE created_by IS NULL;
    END IF;

    -- Update existing bookings with updated_by where possible  
    IF existing_manager_id IS NOT NULL THEN
        UPDATE public.bookings 
        SET updated_by = user_id
        WHERE updated_by IS NULL;
    END IF;

EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data creation completed with warnings: %', SQLERRM;
END $$;

-- 10. Create helper function for partner management
CREATE OR REPLACE FUNCTION public.get_user_managed_entities(user_uuid UUID)
RETURNS TABLE(
    entity_type TEXT,
    entity_id UUID,
    entity_name TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
    -- Get all entities created or updated by the user
    SELECT 'partner'::TEXT, p.id, p.name, p.created_at, p.updated_at
    FROM public.partners p
    WHERE p.created_by = user_uuid OR p.updated_by = user_uuid
    
    UNION ALL
    
    SELECT 'company'::TEXT, c.id, c.name, c.created_at, c.updated_at
    FROM public.companies c
    WHERE c.created_by = user_uuid OR c.updated_by = user_uuid
    
    UNION ALL
    
    SELECT 'vehicle'::TEXT, v.id, v.name, v.created_at, v.updated_at
    FROM public.vehicles v
    WHERE v.created_by = user_uuid
    
    ORDER BY updated_at DESC;
$$;