-- Routes table for admin-managed shuttle routes
CREATE TABLE IF NOT EXISTS public.routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    from_location TEXT NOT NULL,
    to_location TEXT NOT NULL,
    price INTEGER NOT NULL DEFAULT 0,
    duration TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    image_url TEXT DEFAULT '',
    image_alt TEXT DEFAULT '',
    is_popular BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    sort_order INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_routes_is_popular ON public.routes(is_popular);
CREATE INDEX IF NOT EXISTS idx_routes_is_active ON public.routes(is_active);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_routes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS routes_updated_at ON public.routes;
CREATE TRIGGER routes_updated_at
    BEFORE UPDATE ON public.routes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_routes_updated_at();

-- RLS
ALTER TABLE public.routes ENABLE ROW LEVEL SECURITY;

-- Public can read active routes
DROP POLICY IF EXISTS "public_read_active_routes" ON public.routes;
CREATE POLICY "public_read_active_routes"
ON public.routes
FOR SELECT
TO public
USING (is_active = true);

-- Admin full access using auth metadata
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE id = auth.uid() AND role = 'admin'
)
$$;

DROP POLICY IF EXISTS "admin_manage_routes" ON public.routes;
CREATE POLICY "admin_manage_routes"
ON public.routes
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- Seed default routes
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.routes LIMIT 1) THEN
        INSERT INTO public.routes (from_location, to_location, price, duration, description, tags, image_url, image_alt, is_popular, sort_order) VALUES
        ('Quezon City', 'Makati', 350, '45m', 'Express city shuttle route', ARRAY['Express Service', 'Business Route', 'Daily Commute'], 'https://images.unsplash.com/photo-1668563972736-157f88ddbf7b', 'Makati city skyline with modern skyscrapers and business district at dusk', true, 1),
        ('Alabang', 'Tagaytay', 600, '1h 30m', 'Scenic weekend getaway route', ARRAY['Scenic Route', 'Cool Weather', 'Weekend Favorite'], 'https://images.unsplash.com/photo-1594706504824-7ec050b66344', 'Panoramic view of Taal Lake and volcano from Tagaytay ridge with lush greenery', true, 2),
        ('Calamba', 'Makati', 750, '1h 45m', 'CALABARZON to Metro Manila express', ARRAY['Express Service', 'Corporate Preferred', 'Laguna Route'], 'https://images.unsplash.com/photo-1612500187852-1a31f58fb291', 'Modern highway connecting Laguna province to Metro Manila with vehicles in transit', true, 3),
        ('Cavite', 'Alabang', 400, '40m', 'South Metro connector route', ARRAY['Economy Pricing', 'Frequent Trips', 'South Route'], 'https://images.unsplash.com/photo-1711076234443-c9bc6bbf1b53', 'Busy transport hub with vehicles and passengers in a southern Metro Manila area', true, 4),
        ('Sto. Tomas Batangas', 'Makati', 850, '2h', 'Batangas to Metro Manila shuttle', ARRAY['Long Distance', 'Comfortable', 'Batangas Route'], 'https://images.unsplash.com/photo-1668563972736-157f88ddbf7b', 'Makati city skyline with modern skyscrapers and business district at dusk', true, 5),
        ('Quezon City', 'Tagaytay', 800, '2h', 'North to south scenic route', ARRAY['Scenic Route', 'Weekend Trip', 'Family Friendly'], 'https://images.unsplash.com/photo-1594706504824-7ec050b66344', 'Panoramic view of Taal Lake and volcano from Tagaytay ridge with lush greenery', false, 6)
        ON CONFLICT (id) DO NOTHING;
    END IF;
END $$;
