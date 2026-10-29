-- Schema Analysis: Existing bookings table with RLS that prevents admin access
-- Integration Type: Enhancement - Adding admin policies for booking management
-- Dependencies: bookings, user_profiles, vehicles tables

-- Fix RLS policies to allow admin access to all bookings
-- The existing is_admin_from_auth() function already exists and checks auth metadata

-- Drop existing restrictive policy and recreate with admin access
DROP POLICY IF EXISTS "users_manage_own_bookings" ON public.bookings;

-- Create comprehensive booking access policies
CREATE POLICY "users_manage_own_bookings" ON public.bookings
FOR ALL
TO authenticated
USING (user_id = auth.uid() OR public.is_admin_from_auth())
WITH CHECK (user_id = auth.uid() OR public.is_admin_from_auth());

-- Add specific admin read policy for better performance
CREATE POLICY "admin_read_all_bookings" ON public.bookings
FOR SELECT
TO authenticated
USING (public.is_admin_from_auth());

-- Add specific admin update policy for booking management
CREATE POLICY "admin_update_all_bookings" ON public.bookings
FOR UPDATE
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Create company_employees table for bulk booking functionality
CREATE TABLE public.company_employees (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    employee_name TEXT NOT NULL,
    employee_email TEXT NOT NULL,
    department TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for company_employees
CREATE INDEX idx_company_employees_company_id ON public.company_employees(company_id);
CREATE INDEX idx_company_employees_email ON public.company_employees(employee_email);

-- Enable RLS for company_employees
ALTER TABLE public.company_employees ENABLE ROW LEVEL SECURITY;

-- RLS policies for company_employees
CREATE POLICY "company_managers_manage_employees" ON public.company_employees
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() 
        AND up.company_id = company_employees.company_id
        AND up.role IN ('admin', 'corporate_manager')
    ) OR public.is_admin_from_auth()
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() 
        AND up.company_id = company_employees.company_id
        AND up.role IN ('admin', 'corporate_manager')
    ) OR public.is_admin_from_auth()
);

-- Create bulk_bookings table for tracking bulk booking requests
CREATE TABLE public.bulk_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
    created_by UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    booking_name TEXT NOT NULL,
    pickup_location TEXT NOT NULL,
    dropoff_location TEXT NOT NULL,
    pickup_date TIMESTAMPTZ NOT NULL,
    vehicle_id UUID REFERENCES public.vehicles(id) ON DELETE SET NULL,
    employee_ids TEXT[] NOT NULL, -- JSON array of employee IDs
    notes TEXT,
    status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for bulk_bookings
CREATE INDEX idx_bulk_bookings_company_id ON public.bulk_bookings(company_id);
CREATE INDEX idx_bulk_bookings_created_by ON public.bulk_bookings(created_by);
CREATE INDEX idx_bulk_bookings_status ON public.bulk_bookings(status);

-- Enable RLS for bulk_bookings
ALTER TABLE public.bulk_bookings ENABLE ROW LEVEL SECURITY;

-- RLS policies for bulk_bookings
CREATE POLICY "company_users_manage_bulk_bookings" ON public.bulk_bookings
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() 
        AND up.company_id = bulk_bookings.company_id
    ) OR public.is_admin_from_auth()
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.user_profiles up
        WHERE up.id = auth.uid() 
        AND up.company_id = bulk_bookings.company_id
    ) OR public.is_admin_from_auth()
);

-- Add trigger for updating updated_at timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_bulk_bookings()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

CREATE TRIGGER update_bulk_bookings_updated_at
    BEFORE UPDATE ON public.bulk_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_bulk_bookings();

-- Add some sample company employees for testing
DO $$
DECLARE
    company_id UUID;
BEGIN
    -- Get existing company ID
    SELECT id INTO company_id FROM public.companies LIMIT 1;
    
    -- Add sample employees if company exists
    IF company_id IS NOT NULL THEN
        INSERT INTO public.company_employees (company_id, employee_name, employee_email, department)
        VALUES
            (company_id, 'John Smith', 'john.smith@techcorp.com', 'Engineering'),
            (company_id, 'Sarah Johnson', 'sarah.johnson@techcorp.com', 'Marketing'),
            (company_id, 'Mike Wilson', 'mike.wilson@techcorp.com', 'Sales'),
            (company_id, 'Lisa Brown', 'lisa.brown@techcorp.com', 'HR'),
            (company_id, 'David Lee', 'david.lee@techcorp.com', 'Finance');
    END IF;
END $$;