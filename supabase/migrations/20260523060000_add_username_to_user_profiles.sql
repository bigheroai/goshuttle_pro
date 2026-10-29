-- Add username column to user_profiles table
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS username TEXT DEFAULT NULL;

-- Create a unique index on username (allowing NULLs, which are not considered duplicates)
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_profiles_username
ON public.user_profiles (username)
WHERE username IS NOT NULL;
