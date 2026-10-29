-- Migration: Create Rate Sheets Table
-- Enhancement 1: Ratesheet Mapping Module
-- Supports rates per vehicle type, trip category, and destination zone

-- Create trip category enum
DROP TYPE IF EXISTS public.trip_category CASCADE;
CREATE TYPE public.trip_category AS ENUM (
  'airport_transfer',
  'city_tour',
  'provincial',
  'corporate_daily',
  'event_transfer',
  'multi_day'
);

-- Create destination zone enum
DROP TYPE IF EXISTS public.destination_zone CASCADE;
CREATE TYPE public.destination_zone AS ENUM (
  'metro_manila',
  'luzon_nearby',
  'luzon_far',
  'visayas',
  'mindanao',
  'international'
);

-- Create rate_sheets table
CREATE TABLE IF NOT EXISTS public.rate_sheets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  vehicle_type TEXT NOT NULL,
  trip_category public.trip_category NOT NULL,
  destination_zone public.destination_zone NOT NULL,
  base_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  base_hours INTEGER NOT NULL DEFAULT 10,
  excess_hourly_rate DECIMAL(10, 2) NOT NULL DEFAULT 0,
  multi_day_rate DECIMAL(10, 2),
  fuel_surcharge DECIMAL(10, 2) DEFAULT 0,
  notes TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Unique constraint: one rate per vehicle_type + trip_category + destination_zone
CREATE UNIQUE INDEX IF NOT EXISTS idx_rate_sheets_unique
  ON public.rate_sheets (vehicle_type, trip_category, destination_zone);

-- Indexes for fast lookups during booking
CREATE INDEX IF NOT EXISTS idx_rate_sheets_vehicle_type ON public.rate_sheets(vehicle_type);
CREATE INDEX IF NOT EXISTS idx_rate_sheets_trip_category ON public.rate_sheets(trip_category);
CREATE INDEX IF NOT EXISTS idx_rate_sheets_destination_zone ON public.rate_sheets(destination_zone);
CREATE INDEX IF NOT EXISTS idx_rate_sheets_is_active ON public.rate_sheets(is_active);

-- Enable RLS
ALTER TABLE public.rate_sheets ENABLE ROW LEVEL SECURITY;

-- Admin full access (using auth metadata to avoid recursion)
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
  SELECT 1 FROM auth.users au
  WHERE au.id = auth.uid()
  AND (
    au.raw_user_meta_data->>'role' = 'admin'
    OR au.raw_app_meta_data->>'role' = 'admin'
  )
)
$$;

DROP POLICY IF EXISTS "admin_full_access_rate_sheets" ON public.rate_sheets;
CREATE POLICY "admin_full_access_rate_sheets"
ON public.rate_sheets
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Public read for active rates (needed during booking)
DROP POLICY IF EXISTS "public_read_active_rate_sheets" ON public.rate_sheets;
CREATE POLICY "public_read_active_rate_sheets"
ON public.rate_sheets
FOR SELECT
TO public
USING (is_active = true);

-- Function to fetch applicable rate during booking
CREATE OR REPLACE FUNCTION public.get_applicable_rate(
  p_vehicle_type TEXT,
  p_trip_category TEXT,
  p_destination_zone TEXT
)
RETURNS TABLE(
  id UUID,
  base_rate DECIMAL,
  base_hours INTEGER,
  excess_hourly_rate DECIMAL,
  multi_day_rate DECIMAL,
  fuel_surcharge DECIMAL,
  notes TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    rs.id,
    rs.base_rate,
    rs.base_hours,
    rs.excess_hourly_rate,
    rs.multi_day_rate,
    rs.fuel_surcharge,
    rs.notes
  FROM public.rate_sheets rs
  WHERE rs.vehicle_type = p_vehicle_type
    AND rs.trip_category = p_trip_category::public.trip_category
    AND rs.destination_zone = p_destination_zone::public.destination_zone
    AND rs.is_active = true
  LIMIT 1;
END;
$$;

-- Seed sample rate data
DO $$
BEGIN
  INSERT INTO public.rate_sheets (
    vehicle_type, trip_category, destination_zone,
    base_rate, base_hours, excess_hourly_rate, multi_day_rate, fuel_surcharge, notes
  ) VALUES
    ('van', 'airport_transfer', 'metro_manila', 2800.00, 10, 280.00, NULL, 0, 'Standard van airport transfer within Metro Manila'),
    ('van', 'city_tour', 'metro_manila', 3200.00, 10, 320.00, NULL, 0, 'Van city tour Metro Manila'),
    ('van', 'provincial', 'luzon_nearby', 4500.00, 10, 450.00, 3800.00, 200, 'Van provincial Luzon nearby (e.g. Tagaytay, Batangas)'),
    ('van', 'corporate_daily', 'metro_manila', 3000.00, 10, 300.00, 2500.00, 0, 'Van corporate daily Metro Manila'),
    ('shuttle', 'airport_transfer', 'metro_manila', 3500.00, 10, 350.00, NULL, 0, 'Shuttle airport transfer Metro Manila'),
    ('shuttle', 'city_tour', 'metro_manila', 4000.00, 10, 400.00, NULL, 0, 'Shuttle city tour Metro Manila'),
    ('shuttle', 'provincial', 'luzon_nearby', 5500.00, 10, 550.00, 4800.00, 250, 'Shuttle provincial Luzon nearby'),
    ('shuttle', 'event_transfer', 'metro_manila', 4200.00, 10, 420.00, NULL, 0, 'Shuttle event transfer Metro Manila'),
    ('executive_car', 'airport_transfer', 'metro_manila', 2200.00, 10, 220.00, NULL, 0, 'Executive car airport transfer'),
    ('executive_car', 'corporate_daily', 'metro_manila', 2500.00, 10, 250.00, 2000.00, 0, 'Executive car corporate daily'),
    ('corporate_car', 'airport_transfer', 'metro_manila', 1800.00, 10, 180.00, NULL, 0, 'Corporate car airport transfer'),
    ('corporate_car', 'corporate_daily', 'metro_manila', 2000.00, 10, 200.00, 1700.00, 0, 'Corporate car daily rate')
  ON CONFLICT (vehicle_type, trip_category, destination_zone) DO NOTHING;

  RAISE NOTICE 'Rate sheets seeded successfully.';
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Rate sheet seeding encountered an issue: %', SQLERRM;
END $$;
