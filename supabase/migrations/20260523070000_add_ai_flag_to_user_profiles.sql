-- Add AI fake user detection flag columns to user_profiles
ALTER TABLE public.user_profiles
  ADD COLUMN IF NOT EXISTS ai_flagged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ai_flag_label TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_flag_reasons TEXT[] DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_flag_confidence TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ai_flagged_at TIMESTAMPTZ DEFAULT NULL;

-- Index for quick lookup of flagged users
CREATE INDEX IF NOT EXISTS idx_user_profiles_ai_flagged ON public.user_profiles(ai_flagged) WHERE ai_flagged = TRUE;
