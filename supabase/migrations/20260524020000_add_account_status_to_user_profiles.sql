-- Add account_status column to user_profiles for pending/approved/rejected user review workflow
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS account_status TEXT DEFAULT 'approved',
ADD COLUMN IF NOT EXISTS account_status_note TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS account_status_updated_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS account_status_updated_by UUID DEFAULT NULL,
ADD COLUMN IF NOT EXISTS verification_requested_at TIMESTAMPTZ DEFAULT NULL;

-- Set existing users to 'approved' (they were already active before this feature)
UPDATE public.user_profiles
SET account_status = 'approved'
WHERE account_status IS NULL;

-- New signups should default to 'pending' — update the trigger to set pending status
-- The trigger is already defined; we just need the column to exist.
-- Admins can configure whether new signups require approval via app settings.

-- Index for quick lookup of pending/flagged users
CREATE INDEX IF NOT EXISTS idx_user_profiles_account_status ON public.user_profiles(account_status);
