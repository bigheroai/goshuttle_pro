-- Migration: Make license_number and license_expiry nullable in driver_applications
-- Reason: Driver registration form was simplified — drivers now add license info in their profile
-- The form only collects full_name, email, phone at sign-up time
-- Timestamp: 20260629061000

-- Make license_number nullable (was NOT NULL, but drivers add it later via profile)
ALTER TABLE public.driver_applications
  ALTER COLUMN license_number DROP NOT NULL;

-- Make license_expiry nullable (was NOT NULL, but drivers add it later via profile)
ALTER TABLE public.driver_applications
  ALTER COLUMN license_expiry DROP NOT NULL;
