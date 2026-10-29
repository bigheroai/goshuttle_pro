-- Migration: Fix signup flow and user management visibility
-- Timestamp: 20260523030000
--
-- ROOT CAUSES:
-- 1. SIGNUP: New users created via supabase.auth.signUp() get email_confirmed_at = NULL
--    by default, so they cannot log in until they confirm their email. The frontend
--    shows a success message and redirects to login, but login fails silently.
--    FIX: Auto-confirm emails for new signups by setting email_confirmed_at in the trigger.
--
-- 2. USER MANAGEMENT: The admin RLS policy (admin_can_view_all_profiles_v2) uses
--    is_admin_from_auth() which checks raw_user_meta_data->>'role' = 'admin'.
--    Admin users created via the admin panel may not have this metadata set correctly,
--    so the function returns false and the admin can only see their own profile.
--    FIX: Add a second admin SELECT policy that checks user_profiles.role directly
--    using a SECURITY DEFINER function (safe — does not query user_profiles recursively).

-- ============================================================
-- STEP 1: Create a safe function to check admin role from user_profiles
--         Uses auth.uid() directly — no recursion risk because the function
--         is SECURITY DEFINER and bypasses RLS when querying user_profiles.
-- ============================================================
CREATE OR REPLACE FUNCTION public.is_admin_from_profile()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
      AND up.role::text IN ('admin', 'superadmin')
      AND up.is_active = true
  );
$$;

-- ============================================================
-- STEP 2: Add admin SELECT policy using profile role check
--         (complements the existing metadata-based policy)
-- ============================================================
DROP POLICY IF EXISTS "admin_can_view_all_profiles_v3" ON public.user_profiles;
CREATE POLICY "admin_can_view_all_profiles_v3"
ON public.user_profiles
FOR SELECT
TO authenticated
USING (public.is_admin_from_profile());

-- ============================================================
-- STEP 3: Add admin UPDATE policy using profile role check
-- ============================================================
DROP POLICY IF EXISTS "admin_can_update_all_profiles_v3" ON public.user_profiles;
CREATE POLICY "admin_can_update_all_profiles_v3"
ON public.user_profiles
FOR UPDATE
TO authenticated
USING (public.is_admin_from_profile())
WITH CHECK (public.is_admin_from_profile());

-- ============================================================
-- STEP 4: Add admin INSERT policy so admins can create profiles
-- ============================================================
DROP POLICY IF EXISTS "admin_can_insert_profiles" ON public.user_profiles;
CREATE POLICY "admin_can_insert_profiles"
ON public.user_profiles
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_from_profile() OR id = auth.uid());

-- ============================================================
-- STEP 5: Update handle_new_user trigger to auto-confirm emails
--         so new signups can log in immediately without email verification.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Auto-confirm the email so users can log in immediately after signup
  -- (skips the email verification step)
  UPDATE auth.users
  SET email_confirmed_at = COALESCE(email_confirmed_at, NOW())
  WHERE id = NEW.id
    AND email_confirmed_at IS NULL;

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

-- ============================================================
-- STEP 6: Backfill — confirm emails for any existing unconfirmed users
--         so they can log in with their existing accounts.
-- ============================================================
UPDATE auth.users
SET email_confirmed_at = NOW()
WHERE email_confirmed_at IS NULL
  AND is_anonymous = false;

-- ============================================================
-- STEP 7: Backfill — ensure all auth users have a user_profiles row
-- ============================================================
INSERT INTO public.user_profiles (id, email, full_name, role, is_active, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE((au.raw_user_meta_data->>'role')::public.user_role, 'customer'::public.user_role),
  true,
  NOW(),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
)
  AND au.is_anonymous = false
ON CONFLICT (id) DO NOTHING;
