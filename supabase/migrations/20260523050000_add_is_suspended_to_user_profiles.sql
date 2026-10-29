-- Add is_suspended column to user_profiles for admin suspend/unsuspend functionality
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT false;

-- Update existing rows to have is_suspended = false
UPDATE public.user_profiles
SET is_suspended = false
WHERE is_suspended IS NULL;
