-- Domain Allow List: domains that are always considered valid by the AI scanner
CREATE TABLE IF NOT EXISTS public.domain_allowlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  description TEXT,
  added_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_domain_allowlist_domain ON public.domain_allowlist (lower(domain));
CREATE INDEX IF NOT EXISTS idx_domain_allowlist_created_at ON public.domain_allowlist (created_at);

-- Trusted Users: users that are always skipped by the AI scanner (e.g. test accounts)
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS is_trusted BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS trusted_note TEXT;

-- Enable RLS
ALTER TABLE public.domain_allowlist ENABLE ROW LEVEL SECURITY;

-- Admin-only access to domain_allowlist
DROP POLICY IF EXISTS "admin_manage_domain_allowlist" ON public.domain_allowlist;
CREATE POLICY "admin_manage_domain_allowlist"
  ON public.domain_allowlist
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.role IN ('admin', 'super_admin')
    )
  );

-- Seed default allowed domains
INSERT INTO public.domain_allowlist (domain, description) VALUES
  ('gmail.com', 'Google personal email'),
  ('yahoo.com', 'Yahoo personal email'),
  ('outlook.com', 'Microsoft Outlook'),
  ('hotmail.com', 'Microsoft Hotmail'),
  ('icloud.com', 'Apple iCloud email'),
  ('live.com', 'Microsoft Live'),
  ('msn.com', 'Microsoft MSN'),
  ('aol.com', 'AOL email'),
  ('protonmail.com', 'ProtonMail secure email'),
  ('zoho.com', 'Zoho business email'),
  ('yandex.com', 'Yandex email'),
  ('mail.com', 'Mail.com'),
  ('goshuttle.ph', 'GoShuttle official domain'),
  ('goshuttle.com', 'GoShuttle official domain')
ON CONFLICT DO NOTHING;
