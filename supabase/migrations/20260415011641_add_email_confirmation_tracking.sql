-- Migration: Add email confirmation tracking columns to bookings table
-- Tracks email delivery status (sent, delivered, failed) with timestamps and error logs

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS email_confirmation_status TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_confirmation_sent_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_confirmation_delivered_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_confirmation_failed_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_confirmation_error TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_confirmation_resend_id TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS email_confirmation_recipient TEXT DEFAULT NULL;

-- Index for querying by email status (e.g., find all failed emails)
CREATE INDEX IF NOT EXISTS idx_bookings_email_confirmation_status
  ON public.bookings (email_confirmation_status)
  WHERE email_confirmation_status IS NOT NULL;

-- Index for querying recent failed emails
CREATE INDEX IF NOT EXISTS idx_bookings_email_confirmation_failed_at
  ON public.bookings (email_confirmation_failed_at)
  WHERE email_confirmation_failed_at IS NOT NULL;

COMMENT ON COLUMN public.bookings.email_confirmation_status IS 'Email delivery status: sent, delivered, failed';
COMMENT ON COLUMN public.bookings.email_confirmation_sent_at IS 'Timestamp when confirmation email was sent';
COMMENT ON COLUMN public.bookings.email_confirmation_delivered_at IS 'Timestamp when confirmation email was delivered (if tracked)';
COMMENT ON COLUMN public.bookings.email_confirmation_failed_at IS 'Timestamp when confirmation email failed';
COMMENT ON COLUMN public.bookings.email_confirmation_error IS 'Error message if email delivery failed, for debugging';
COMMENT ON COLUMN public.bookings.email_confirmation_resend_id IS 'Resend API email ID for delivery tracking';
COMMENT ON COLUMN public.bookings.email_confirmation_recipient IS 'Email address the confirmation was sent to';
