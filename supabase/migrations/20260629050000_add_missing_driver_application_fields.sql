-- Migration: Add missing fields to driver_applications table
-- Adds email, address, emergency contact, driving experience, license type/restrictions, violations
-- Timestamp: 20260629050000

ALTER TABLE public.driver_applications
  ADD COLUMN IF NOT EXISTS email TEXT,
  ADD COLUMN IF NOT EXISTS address TEXT,
  ADD COLUMN IF NOT EXISTS emergency_contact TEXT,
  ADD COLUMN IF NOT EXISTS emergency_phone TEXT,
  ADD COLUMN IF NOT EXISTS driving_experience TEXT,
  ADD COLUMN IF NOT EXISTS license_type TEXT,
  ADD COLUMN IF NOT EXISTS license_restrictions TEXT,
  ADD COLUMN IF NOT EXISTS previous_violations TEXT;
