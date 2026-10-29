-- Migration: Fix driver_applications INSERT RLS to allow both anon and authenticated users
-- Problem: Previous policy only allowed user_id IS NULL, blocking authenticated users
--          who submit the form while logged in (their user_id is set, not null)
-- Fix: Allow INSERT when user_id IS NULL (anonymous) OR user_id = auth.uid() (authenticated)

-- Drop the old restrictive policy
DROP POLICY IF EXISTS "anon_insert_driver_application" ON public.driver_applications;

-- Create a new policy that covers both anonymous and authenticated applicants
CREATE POLICY "allow_driver_application_insert"
ON public.driver_applications
FOR INSERT
TO anon, authenticated
WITH CHECK (
  user_id IS NULL
  OR user_id = auth.uid()
);
