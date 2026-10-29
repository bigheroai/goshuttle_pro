-- Migration: Allow unauthenticated (anon) users to submit driver applications
-- The driver registration form is public-facing; user_id is optional (null for guests)
-- Timestamp: 20260629043653

-- Add anon INSERT policy so unauthenticated visitors can submit applications
DROP POLICY IF EXISTS "anon_insert_driver_application" ON public.driver_applications;
CREATE POLICY "anon_insert_driver_application"
ON public.driver_applications
FOR INSERT
TO anon
WITH CHECK (user_id IS NULL);
