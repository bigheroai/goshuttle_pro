-- Migration: Ensure user_profiles row exists for all auth users
-- Timestamp: 20260522240000
--
-- ROOT CAUSE: If a user exists in auth.users but has no row in user_profiles,
-- the avatar_url UPDATE returns 0 rows with no error — the image uploads to
-- storage successfully but the URL is never saved to the DB.
--
-- FIX 1: Backfill any auth users missing a user_profiles row.
-- FIX 2: Ensure the trigger that auto-creates user_profiles on signup is present.

-- ============================================================
-- STEP 1: Create or replace the trigger function that auto-creates
--         a user_profiles row whenever a new auth user signs up.
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, full_name, role, created_at, updated_at)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE((NEW.raw_user_meta_data->>'role')::user_role, 'customer'::user_role),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- ============================================================
-- STEP 2: Attach trigger to auth.users (idempotent)
-- ============================================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- STEP 3: Backfill any existing auth users who are missing
--         a user_profiles row (covers customer@email.com and others)
-- ============================================================
INSERT INTO public.user_profiles (id, email, full_name, role, created_at, updated_at)
SELECT
  au.id,
  au.email,
  COALESCE(au.raw_user_meta_data->>'full_name', split_part(au.email, '@', 1)),
  COALESCE((au.raw_user_meta_data->>'role')::user_role, 'customer'::user_role),
  NOW(),
  NOW()
FROM auth.users au
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_profiles up WHERE up.id = au.id
)
ON CONFLICT (id) DO NOTHING;
