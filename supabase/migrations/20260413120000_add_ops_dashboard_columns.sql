-- Migration: Add ops dashboard columns to bookings table
-- Adds flagging and manual intervention fields

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS is_flagged BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS flag_reason TEXT,
  ADD COLUMN IF NOT EXISTS flag_note TEXT,
  ADD COLUMN IF NOT EXISTS flagged_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ops_intervention_note TEXT,
  ADD COLUMN IF NOT EXISTS ops_intervened_at TIMESTAMPTZ;

-- Index for fast flagged booking queries
CREATE INDEX IF NOT EXISTS idx_bookings_is_flagged ON public.bookings (is_flagged) WHERE is_flagged = TRUE;
