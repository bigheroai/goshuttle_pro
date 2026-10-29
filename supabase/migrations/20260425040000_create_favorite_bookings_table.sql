-- Migration: Create favorite_bookings table
-- This table stores saved/favorite booking routes for users

CREATE TABLE IF NOT EXISTS public.favorite_bookings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    name TEXT NOT NULL DEFAULT 'My Favorite Route',
    route_from TEXT NOT NULL DEFAULT '',
    route_to TEXT NOT NULL DEFAULT '',
    vehicle_id UUID NULL,
    vehicle_name TEXT NULL,
    vehicle_type TEXT NULL,
    vehicle_price NUMERIC NULL,
    payment_method TEXT NULL,
    passenger_count INTEGER NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_favorite_bookings_user_id ON public.favorite_bookings(user_id);
CREATE INDEX IF NOT EXISTS idx_favorite_bookings_created_at ON public.favorite_bookings(created_at DESC);

-- Enable RLS
ALTER TABLE public.favorite_bookings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "users_manage_own_favorite_bookings" ON public.favorite_bookings;
CREATE POLICY "users_manage_own_favorite_bookings"
ON public.favorite_bookings
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Updated at trigger function (reuse if exists)
CREATE OR REPLACE FUNCTION public.update_favorite_bookings_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_favorite_bookings_updated_at ON public.favorite_bookings;
CREATE TRIGGER set_favorite_bookings_updated_at
    BEFORE UPDATE ON public.favorite_bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.update_favorite_bookings_updated_at();
