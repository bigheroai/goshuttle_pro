-- Migration: Admin User Creation & Role Management
-- Adds staff_roles table, role_privileges, and admin function to create users

-- 0. Extend user_role enum with missing values (must be in its own transaction)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'staff'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'staff';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumlabel = 'partner'
    AND enumtypid = (SELECT oid FROM pg_type WHERE typname = 'user_role')
  ) THEN
    ALTER TYPE public.user_role ADD VALUE 'partner';
  END IF;
END $$;

-- 1. Create staff_roles table
CREATE TABLE IF NOT EXISTS public.staff_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  privileges JSONB NOT NULL DEFAULT '{}',
  is_system_role BOOLEAN DEFAULT false,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_staff_roles_name ON public.staff_roles(name);

ALTER TABLE public.staff_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admin_manage_staff_roles" ON public.staff_roles;
CREATE POLICY "admin_manage_staff_roles"
ON public.staff_roles
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.role::text IN ('admin', 'staff')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.role::text IN ('admin', 'staff')
  )
);

DROP POLICY IF EXISTS "public_read_staff_roles" ON public.staff_roles;
CREATE POLICY "public_read_staff_roles"
ON public.staff_roles
FOR SELECT
TO authenticated
USING (true);

-- 2. Add staff_role_id and additional fields to user_profiles if not exists
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS staff_role_id UUID REFERENCES public.staff_roles(id) ON DELETE SET NULL;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS created_by_admin UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 3. Function to allow admins to create users via Supabase admin API
-- This function creates a user_profile entry for manually-created users
CREATE OR REPLACE FUNCTION public.admin_create_user_profile(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT,
  p_phone TEXT DEFAULT NULL,
  p_staff_role_id UUID DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.user_profiles (
    id,
    email,
    full_name,
    role,
    phone,
    staff_role_id,
    notes,
    created_by_admin,
    is_active,
    created_at,
    updated_at
  ) VALUES (
    p_user_id,
    p_email,
    p_full_name,
    p_role::public.user_role,
    p_phone,
    p_staff_role_id,
    p_notes,
    p_created_by,
    true,
    now(),
    now()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    role = EXCLUDED.role,
    phone = EXCLUDED.phone,
    staff_role_id = EXCLUDED.staff_role_id,
    notes = EXCLUDED.notes,
    updated_at = now();

  RETURN p_user_id;
END;
$$;

-- 4. Seed default system roles
DO $$
BEGIN
  INSERT INTO public.staff_roles (name, description, privileges, is_system_role)
  VALUES
    (
      'admin',
      'Full system access — can manage all features, users, and settings',
      '{"manage_users": true, "manage_drivers": true, "manage_bookings": true, "manage_fleet": true, "manage_partners": true, "manage_payments": true, "manage_settings": true, "view_reports": true, "manage_roles": true}'::jsonb,
      true
    ),
    (
      'staff',
      'General staff — can manage bookings, drivers, and partners',
      '{"manage_users": false, "manage_drivers": true, "manage_bookings": true, "manage_fleet": false, "manage_partners": true, "manage_payments": false, "manage_settings": false, "view_reports": true, "manage_roles": false}'::jsonb,
      true
    ),
    (
      'dispatcher',
      'Dispatcher — can manage bookings and driver assignments',
      '{"manage_users": false, "manage_drivers": true, "manage_bookings": true, "manage_fleet": false, "manage_partners": false, "manage_payments": false, "manage_settings": false, "view_reports": false, "manage_roles": false}'::jsonb,
      true
    ),
    (
      'partner_manager',
      'Partner Manager — can manage fleet partners and their vehicles',
      '{"manage_users": false, "manage_drivers": false, "manage_bookings": false, "manage_fleet": true, "manage_partners": true, "manage_payments": false, "manage_settings": false, "view_reports": true, "manage_roles": false}'::jsonb,
      true
    )
  ON CONFLICT (name) DO NOTHING;
END $$;
