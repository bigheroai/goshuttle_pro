-- Location: supabase/migrations/20251104022133_loyalty_points_system.sql
-- Schema Analysis: Existing user_profiles and bookings tables found
-- Integration Type: Addition - Adding loyalty/points system
-- Dependencies: user_profiles (existing), bookings (existing)

-- 1. Create membership tier enum
CREATE TYPE public.membership_tier AS ENUM ('bronze', 'silver', 'gold', 'platinum');

-- 2. Create points transaction type enum
CREATE TYPE public.transaction_type AS ENUM ('earned', 'redeemed', 'expired', 'adjustment');

-- 3. Add loyalty columns to existing user_profiles table
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS loyalty_points INTEGER DEFAULT 0 CHECK (loyalty_points >= 0),
ADD COLUMN IF NOT EXISTS membership_tier public.membership_tier DEFAULT 'bronze'::public.membership_tier,
ADD COLUMN IF NOT EXISTS tier_updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN IF NOT EXISTS points_lifetime INTEGER DEFAULT 0 CHECK (points_lifetime >= 0);

-- 4. Create points transactions table for tracking point history
CREATE TABLE public.points_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE NOT NULL,
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    transaction_type public.transaction_type NOT NULL,
    points_amount INTEGER NOT NULL CHECK (points_amount > 0),
    description TEXT NOT NULL,
    reference_id TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMPTZ
);

-- 5. Create membership benefits table
CREATE TABLE public.membership_benefits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tier public.membership_tier NOT NULL,
    benefit_type TEXT NOT NULL,
    benefit_value NUMERIC,
    benefit_description TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 6. Create indexes for performance
CREATE INDEX idx_points_transactions_user_id ON public.points_transactions(user_id);
CREATE INDEX idx_points_transactions_booking_id ON public.points_transactions(booking_id);
CREATE INDEX idx_points_transactions_type ON public.points_transactions(transaction_type);
CREATE INDEX idx_points_transactions_expires ON public.points_transactions(expires_at) WHERE expires_at IS NOT NULL;
CREATE INDEX idx_user_profiles_tier ON public.user_profiles(membership_tier);
CREATE INDEX idx_membership_benefits_tier ON public.membership_benefits(tier);

-- 7. Enable RLS for new tables
ALTER TABLE public.points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.membership_benefits ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies using Pattern 2 (Simple User Ownership)
CREATE POLICY "users_manage_own_points_transactions"
ON public.points_transactions
FOR ALL
TO authenticated
USING (user_id = auth.uid())
WITH CHECK (user_id = auth.uid());

-- Pattern 4: Public read for membership benefits (everyone can see benefits)
CREATE POLICY "public_can_read_membership_benefits"
ON public.membership_benefits
FOR SELECT
TO public
USING (true);

-- Pattern 6A: Admin management using auth metadata
CREATE POLICY "admins_manage_membership_benefits"
ON public.membership_benefits
FOR ALL
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND (au.raw_user_meta_data->>'role' = 'admin')
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM auth.users au
        WHERE au.id = auth.uid() 
        AND (au.raw_user_meta_data->>'role' = 'admin')
    )
);

-- 9. Create function to calculate tier based on points
CREATE OR REPLACE FUNCTION public.calculate_membership_tier(total_points INTEGER)
RETURNS public.membership_tier
LANGUAGE sql
STABLE
AS $$
    SELECT CASE 
        WHEN total_points >= 10000 THEN 'platinum'::public.membership_tier
        WHEN total_points >= 5000 THEN 'gold'::public.membership_tier  
        WHEN total_points >= 2000 THEN 'silver'::public.membership_tier
        ELSE 'bronze'::public.membership_tier
    END;
$$;

-- 10. Create function to award points for booking
CREATE OR REPLACE FUNCTION public.award_booking_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    points_to_award INTEGER;
    new_tier public.membership_tier;
BEGIN
    -- Award points only when booking is completed
    IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
        -- Calculate points: 1 point per 100 pesos spent, minimum 10 points
        points_to_award := GREATEST(FLOOR((NEW.total_cost / 100)::INTEGER), 10);
        
        -- Update user points
        UPDATE public.user_profiles 
        SET 
            loyalty_points = loyalty_points + points_to_award,
            points_lifetime = points_lifetime + points_to_award
        WHERE id = NEW.user_id;
        
        -- Record points transaction
        INSERT INTO public.points_transactions (
            user_id, 
            booking_id, 
            transaction_type, 
            points_amount, 
            description
        ) VALUES (
            NEW.user_id, 
            NEW.id, 
            'earned'::public.transaction_type, 
            points_to_award, 
            'Points earned from booking completion'
        );
        
        -- Check and update membership tier
        SELECT public.calculate_membership_tier(points_lifetime) INTO new_tier
        FROM public.user_profiles 
        WHERE id = NEW.user_id;
        
        UPDATE public.user_profiles 
        SET 
            membership_tier = new_tier,
            tier_updated_at = CURRENT_TIMESTAMP
        WHERE id = NEW.user_id AND membership_tier != new_tier;
    END IF;
    
    RETURN NEW;
END;
$$;

-- 11. Create trigger to automatically award points
CREATE TRIGGER award_points_on_booking_completion
    AFTER UPDATE ON public.bookings
    FOR EACH ROW
    EXECUTE FUNCTION public.award_booking_points();

-- 12. Create function to redeem points
CREATE OR REPLACE FUNCTION public.redeem_points(
    redeem_user_id UUID,
    points_to_redeem INTEGER,
    redeem_description TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    current_points INTEGER;
BEGIN
    -- Check if user has enough points
    SELECT loyalty_points INTO current_points
    FROM public.user_profiles
    WHERE id = redeem_user_id;
    
    IF current_points < points_to_redeem THEN
        RETURN FALSE;
    END IF;
    
    -- Deduct points
    UPDATE public.user_profiles
    SET loyalty_points = loyalty_points - points_to_redeem
    WHERE id = redeem_user_id;
    
    -- Record redemption transaction
    INSERT INTO public.points_transactions (
        user_id,
        transaction_type,
        points_amount,
        description
    ) VALUES (
        redeem_user_id,
        'redeemed'::public.transaction_type,
        points_to_redeem,
        redeem_description
    );
    
    RETURN TRUE;
END;
$$;

-- 13. Insert default membership benefits
INSERT INTO public.membership_benefits (tier, benefit_type, benefit_value, benefit_description) VALUES
    ('bronze', 'discount_percentage', 0, 'No discount - standard pricing'),
    ('bronze', 'priority_support', 0, 'Standard customer support'),
    ('silver', 'discount_percentage', 5, '5% discount on all bookings'),
    ('silver', 'priority_support', 1, 'Priority customer support'),
    ('silver', 'point_multiplier', 1.2, '20% bonus points on bookings'),
    ('gold', 'discount_percentage', 10, '10% discount on all bookings'),
    ('gold', 'priority_support', 1, 'Priority customer support'),
    ('gold', 'point_multiplier', 1.5, '50% bonus points on bookings'),
    ('gold', 'cancellation_window', 24, 'Free cancellation up to 24 hours'),
    ('platinum', 'discount_percentage', 15, '15% discount on all bookings'),
    ('platinum', 'priority_support', 1, 'VIP customer support'),
    ('platinum', 'point_multiplier', 2.0, 'Double points on all bookings'),
    ('platinum', 'cancellation_window', 48, 'Free cancellation up to 48 hours'),
    ('platinum', 'complimentary_upgrades', 1, 'Complimentary vehicle upgrades when available');

-- 14. Mock data for testing (reference existing users)
DO $$
DECLARE
    existing_user_id UUID;
    sample_booking_id UUID;
BEGIN
    -- Get an existing user
    SELECT id INTO existing_user_id FROM public.user_profiles LIMIT 1;
    
    IF existing_user_id IS NOT NULL THEN
        -- Update user with some initial points and silver tier
        UPDATE public.user_profiles 
        SET 
            loyalty_points = 2500,
            points_lifetime = 2500,
            membership_tier = 'silver'::public.membership_tier,
            tier_updated_at = CURRENT_TIMESTAMP
        WHERE id = existing_user_id;
        
        -- Add some sample point transactions
        INSERT INTO public.points_transactions (user_id, transaction_type, points_amount, description) VALUES
            (existing_user_id, 'earned'::public.transaction_type, 150, 'Welcome bonus points'),
            (existing_user_id, 'earned'::public.transaction_type, 85, 'Points earned from booking completion'),
            (existing_user_id, 'earned'::public.transaction_type, 120, 'Points earned from booking completion'),
            (existing_user_id, 'redeemed'::public.transaction_type, 100, 'Redeemed for booking discount');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Mock data setup failed: %', SQLERRM;
END $$;