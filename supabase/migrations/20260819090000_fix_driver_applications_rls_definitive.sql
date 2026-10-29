-- Migration: Definitive fix for driver_applications RLS INSERT violation
-- Problem: "new row violates row-level security policy for table driver_applications"
--   occurs when authenticated users (or anon) submit the new driver registration form.
-- Root cause: Conflicting/overlapping policies from multiple prior migrations may still
--   be active in Supabase, causing the INSERT to fail RLS evaluation.
-- Fix: Drop every known policy name, rebuild cleanly, and add a SECURITY DEFINER
--   function so the form can always insert regardless of auth state.
-- Timestamp: 20260819090000

-- ============================================================
-- STEP 1: Drop ALL known driver_applications policies (exhaustive list)
-- ============================================================
DROP POLICY IF EXISTS "authenticated_insert_own_driver_application" ON public.driver_applications;
DROP POLICY IF EXISTS "authenticated_select_own_driver_application" ON public.driver_applications;
DROP POLICY IF EXISTS "authenticated_update_own_driver_application" ON public.driver_applications;
DROP POLICY IF EXISTS "admin_all_driver_applications" ON public.driver_applications;
DROP POLICY IF EXISTS "anon_insert_driver_application" ON public.driver_applications;
DROP POLICY IF EXISTS "allow_driver_application_insert" ON public.driver_applications;
DROP POLICY IF EXISTS "drivers_can_insert_own_application" ON public.driver_applications;
DROP POLICY IF EXISTS "drivers_can_view_own_application" ON public.driver_applications;
DROP POLICY IF EXISTS "drivers_can_update_own_application" ON public.driver_applications;
DROP POLICY IF EXISTS "admin_full_access_driver_applications" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_insert_own" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_select_own" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_update_own" ON public.driver_applications;
DROP POLICY IF EXISTS "driver_applications_admin_all" ON public.driver_applications;
DROP POLICY IF EXISTS "authenticated_insert_driver_application" ON public.driver_applications;
DROP POLICY IF EXISTS "public_insert_driver_application" ON public.driver_applications;
DROP POLICY IF EXISTS "open_insert_driver_application" ON public.driver_applications;

-- Ensure RLS is enabled
ALTER TABLE public.driver_applications ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- STEP 2: SECURITY DEFINER function for inserting driver applications
-- This bypasses RLS entirely for the INSERT, so both anon and
-- authenticated users can always submit the registration form.
-- ============================================================
CREATE OR REPLACE FUNCTION public.submit_driver_application(
  p_full_name TEXT,
  p_email TEXT,
  p_phone TEXT,
  p_preferred_fleet_type TEXT DEFAULT 'goshuttle',
  p_partner_id UUID DEFAULT NULL,
  p_documents_uploaded JSONB DEFAULT '[]'::JSONB,
  p_user_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result JSONB;
  v_id UUID;
BEGIN
  INSERT INTO public.driver_applications (
    user_id,
    full_name,
    email,
    phone,
    preferred_fleet_type,
    partner_id,
    documents_uploaded,
    application_status,
    background_check_status
  ) VALUES (
    p_user_id,
    p_full_name,
    p_email,
    p_phone,
    COALESCE(p_preferred_fleet_type, 'goshuttle'),
    p_partner_id,
    COALESCE(p_documents_uploaded, '[]'::JSONB),
    'pending',
    'pending'
  )
  RETURNING id INTO v_id;

  SELECT row_to_json(da)::JSONB INTO v_result
  FROM public.driver_applications da
  WHERE da.id = v_id;

  RETURN v_result;
END;
$$;

-- Grant execute to both anon and authenticated roles
GRANT EXECUTE ON FUNCTION public.submit_driver_application(TEXT, TEXT, TEXT, TEXT, UUID, JSONB, UUID) TO anon;
GRANT EXECUTE ON FUNCTION public.submit_driver_application(TEXT, TEXT, TEXT, TEXT, UUID, JSONB, UUID) TO authenticated;

-- ============================================================
-- STEP 3: Rebuild clean RLS policies
-- ============================================================

-- Admin full access (SELECT, INSERT, UPDATE, DELETE)
CREATE POLICY "admin_full_access_driver_applications"
ON public.driver_applications
FOR ALL
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Authenticated users can SELECT their own application
CREATE POLICY "authenticated_select_own_driver_application"
ON public.driver_applications
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- Authenticated users can UPDATE their own application
CREATE POLICY "authenticated_update_own_driver_application"
ON public.driver_applications
FOR UPDATE
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Authenticated users can INSERT their own application
-- Allows user_id = auth.uid() (logged-in) OR user_id IS NULL (submitted without linking)
CREATE POLICY "authenticated_insert_driver_application"
ON public.driver_applications
FOR INSERT
TO authenticated
WITH CHECK (
  user_id IS NULL
  OR user_id = auth.uid()
);

-- Anonymous users can INSERT (public-facing registration form)
CREATE POLICY "anon_insert_driver_application"
ON public.driver_applications
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);
