-- Add per-document review status and admin feedback to driver_applications
-- Also add email tracking fields for driver transactional emails

ALTER TABLE public.driver_applications
  ADD COLUMN IF NOT EXISTS doc_review_statuses jsonb DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS admin_feedback text,
  ADD COLUMN IF NOT EXISTS next_action text,
  ADD COLUMN IF NOT EXISTS signup_email_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS pending_email_sent boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS doc_request_email_sent boolean DEFAULT false;

-- Index for faster lookups by email (used for unauthenticated applicants)
CREATE INDEX IF NOT EXISTS idx_driver_applications_email ON public.driver_applications(email);
CREATE INDEX IF NOT EXISTS idx_driver_applications_status ON public.driver_applications(application_status);
