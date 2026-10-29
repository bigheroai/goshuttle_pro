-- Location: supabase/migrations/20251110124900_add_primary_passenger_contact_fields.sql
-- Schema Analysis: Existing bookings table with guest fields, but missing dedicated primary passenger contact fields for authenticated users
-- Integration Type: Modificative - Adding columns to existing bookings table
-- Dependencies: Existing bookings table

-- Add primary passenger contact fields to existing bookings table
ALTER TABLE public.bookings
ADD COLUMN primary_passenger_first_name TEXT,
ADD COLUMN primary_passenger_last_name TEXT,
ADD COLUMN primary_passenger_email TEXT,
ADD COLUMN primary_passenger_phone TEXT;

-- Add indexes for the new passenger contact fields for better query performance
CREATE INDEX idx_bookings_primary_passenger_email ON public.bookings(primary_passenger_email);
CREATE INDEX idx_bookings_primary_passenger_phone ON public.bookings(primary_passenger_phone);

-- Add comments to document the new fields
COMMENT ON COLUMN public.bookings.primary_passenger_first_name IS 'First name of the primary passenger contact for the booking';
COMMENT ON COLUMN public.bookings.primary_passenger_last_name IS 'Last name of the primary passenger contact for the booking';
COMMENT ON COLUMN public.bookings.primary_passenger_email IS 'Email address of the primary passenger contact for the booking';
COMMENT ON COLUMN public.bookings.primary_passenger_phone IS 'Phone number of the primary passenger contact for the booking';