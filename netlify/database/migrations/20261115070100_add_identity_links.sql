-- Links a Netlify Identity account to its user_profiles row. Profiles imported
-- from Supabase keep their original ids; the first time that person signs up
-- with Netlify Identity (same email) the app records the link here.
CREATE TABLE IF NOT EXISTS public.identity_links (
  identity_id uuid PRIMARY KEY,
  profile_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  email text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_identity_links_profile_id ON public.identity_links (profile_id);
CREATE INDEX IF NOT EXISTS idx_user_profiles_lower_email ON public.user_profiles (lower(email));

-- Tracks one-time imports from Supabase so an admin can see what was copied.
CREATE TABLE IF NOT EXISTS public.data_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  started_by uuid,
  started_at timestamptz NOT NULL DEFAULT now(),
  finished_at timestamptz,
  status text NOT NULL DEFAULT 'running',
  summary jsonb NOT NULL DEFAULT '{}'::jsonb
);
