-- Add super_admin to user_role enum
-- This must be in its own committed transaction before any policy references it
ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'super_admin';
