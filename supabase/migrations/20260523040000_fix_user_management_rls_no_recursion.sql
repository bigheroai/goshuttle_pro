-- Migration: Fix User Management RLS - eliminate recursion in admin policy
-- Timestamp: 20260523040000
--
-- ROOT CAUSE:
-- The is_admin_from_profile() function queries public.user_profiles to check if the
-- current user is an admin. When this function is used in an RLS policy ON user_profiles,
-- it creates a recursive loop:
--   SELECT from user_profiles → triggers RLS policy → calls is_admin_from_profile()
--   → queries user_profiles → triggers RLS policy → infinite recursion
--
-- FIX: Replace is_admin_from_profile() with is_admin_from_auth() which queries
-- auth.users metadata instead — no recursion possible.
-- Also set app_metadata role for existing admin users so the check works.

-- ============================================================
-- STEP 1: Create safe admin check using auth.users (no recursion)
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_from_auth()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users au
    WHERE au.id = auth.uid()
      AND (
        au.raw_user_meta_data->>'role' IN ('admin', 'superadmin')
        OR au.raw_app_meta_data->>'role' IN ('admin', 'superadmin')
      )
  );
$$;

-- ============================================================
-- STEP 2: Sync app_metadata role from user_profiles for all users
--         so is_admin_from_auth() can find admin users correctly
-- ============================================================
DO $$
DECLARE
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT up.id, up.role::text as role_text
    FROM public.user_profiles up
    WHERE up.role::text IN ('admin', 'superadmin')
  LOOP
    UPDATE auth.users
    SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', rec.role_text)
    WHERE id = rec.id;
  END LOOP;
END $$;

-- ============================================================
-- STEP 3: Drop the recursive policies and replace with safe ones
-- ============================================================
DROP POLICY IF EXISTS "admin_can_view_all_profiles_v3" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_can_update_all_profiles_v3" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_can_insert_profiles" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_can_view_all_profiles_v2" ON public.user_profiles;
DROP POLICY IF EXISTS "admin_can_update_all_profiles_v2" ON public.user_profiles;

-- Admin SELECT: uses auth.users metadata — no recursion
CREATE POLICY "admin_can_view_all_profiles_v4"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin_from_auth());

-- Admin UPDATE: uses auth.users metadata — no recursion
CREATE POLICY "admin_can_update_all_profiles_v4"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_from_auth())
WITH CHECK (public.is_admin_from_auth());

-- Admin INSERT: uses auth.users metadata — no recursion
CREATE POLICY "admin_can_insert_profiles_v2"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_from_auth() OR id = auth.uid());

-- ============================================================
-- STEP 4: Update handle_new_user trigger to also set app_metadata role
--         so newly created admin users are recognized immediately
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Auto-confirm the email so users can log in immediately after signup
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = NEW.id
    AND email_confirmed_at IS NULL;

  -- Determine role from metadata
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'customer');

  -- Sync role to app_metadata so RLS policies can read it without recursion
  UPDATE auth.users
  SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', user_role)
  WHERE id = NEW.id;

  -- Create user_profiles row
  INSERT INTO public.user_profiles (id, email, full_name, role, is_active, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::public.user_role, 'customer'::public.user_role),
    true,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(EXCLUDED.full_name, public.user_profiles.full_name),
    updated_at = NOW();

  RETURN NEW;
END;
$$;

-- Re-attach trigger (idempotent)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
