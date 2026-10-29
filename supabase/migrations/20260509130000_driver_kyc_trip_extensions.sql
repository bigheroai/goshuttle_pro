-- Migration: Driver KYC verification notes and trip extensions
-- Timestamp: 20260509130000

-- Add KYC verification fields to driver_applications if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_applications' AND column_name = 'kyc_status') THEN
    ALTER TABLE public.driver_applications ADD COLUMN kyc_status text DEFAULT 'pending';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_applications' AND column_name = 'kyc_notes') THEN
    ALTER TABLE public.driver_applications ADD COLUMN kyc_notes text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_applications' AND column_name = 'kyc_verified_at') THEN
    ALTER TABLE public.driver_applications ADD COLUMN kyc_verified_at timestamptz;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_applications' AND column_name = 'kyc_verified_by') THEN
    ALTER TABLE public.driver_applications ADD COLUMN kyc_verified_by uuid REFERENCES public.user_profiles(id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_applications' AND column_name = 'document_verification_notes') THEN
    ALTER TABLE public.driver_applications ADD COLUMN document_verification_notes jsonb DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'driver_applications' AND column_name = 'rejection_reason') THEN
    ALTER TABLE public.driver_applications ADD COLUMN rejection_reason text;
  END IF;
END $$;

-- Create trip_extensions table for post-booking excess/hr management
CREATE TABLE IF NOT EXISTS public.trip_extensions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_id uuid REFERENCES public.bookings(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.user_profiles(id),
  extra_hours integer NOT NULL DEFAULT 1,
  excess_hourly_rate numeric NOT NULL DEFAULT 0,
  extension_cost numeric NOT NULL DEFAULT 0,
  payment_status text DEFAULT 'pending',
  payment_method text,
  payment_reference text,
  notes text,
  requested_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  approved_at timestamptz,
  approved_by uuid REFERENCES public.user_profiles(id),
  created_at timestamptz DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamptz DEFAULT CURRENT_TIMESTAMP
);

-- Enable RLS on trip_extensions
ALTER TABLE public.trip_extensions ENABLE ROW LEVEL SECURITY;

-- RLS policies for trip_extensions
DO $$
BEGIN
  -- Users can view their own extensions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_extensions' AND policyname = 'Users can view own trip extensions') THEN
    CREATE POLICY "Users can view own trip extensions"
      ON public.trip_extensions FOR SELECT
      USING (user_id = auth.uid());
  END IF;

  -- Users can insert their own extensions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_extensions' AND policyname = 'Users can insert own trip extensions') THEN
    CREATE POLICY "Users can insert own trip extensions"
      ON public.trip_extensions FOR INSERT
      WITH CHECK (user_id = auth.uid());
  END IF;

  -- Users can update their own pending extensions
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_extensions' AND policyname = 'Users can update own pending extensions') THEN
    CREATE POLICY "Users can update own pending extensions"
      ON public.trip_extensions FOR UPDATE
      USING (user_id = auth.uid() AND payment_status = 'pending');
  END IF;

  -- Admins have full access
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'trip_extensions' AND policyname = 'Admins have full access to trip extensions') THEN
    CREATE POLICY "Admins have full access to trip extensions"
      ON public.trip_extensions FOR ALL
      USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles
          WHERE id = auth.uid()
          AND role IN ('admin', 'corporate_manager')
        )
      );
  END IF;
END $$;

-- Add excess_hours_used and extension_total to bookings if not present
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'excess_hours_used') THEN
    ALTER TABLE public.bookings ADD COLUMN excess_hours_used integer DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'extension_total') THEN
    ALTER TABLE public.bookings ADD COLUMN extension_total numeric DEFAULT 0;
  END IF;
END $$;
