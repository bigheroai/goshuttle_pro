-- Chargebacks, Disputes, and Failed Reversals Tracking
-- Migration: 20260509020000_create_chargebacks_disputes_table.sql

-- 1. ENUM Types
DROP TYPE IF EXISTS public.dispute_type CASCADE;
CREATE TYPE public.dispute_type AS ENUM ('chargeback', 'dispute', 'failed_reversal');

DROP TYPE IF EXISTS public.dispute_status CASCADE;
CREATE TYPE public.dispute_status AS ENUM ('open', 'under_review', 'awaiting_response', 'resolved_won', 'resolved_lost', 'resolved_partial', 'closed');

DROP TYPE IF EXISTS public.dispute_priority CASCADE;
CREATE TYPE public.dispute_priority AS ENUM ('low', 'medium', 'high', 'critical');

-- 2. Core Table
CREATE TABLE IF NOT EXISTS public.payment_disputes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
    dispute_type public.dispute_type NOT NULL DEFAULT 'dispute'::public.dispute_type,
    dispute_status public.dispute_status NOT NULL DEFAULT 'open'::public.dispute_status,
    priority public.dispute_priority NOT NULL DEFAULT 'medium'::public.dispute_priority,
    title TEXT NOT NULL,
    description TEXT,
    amount NUMERIC(10, 2),
    currency TEXT DEFAULT 'PHP',
    payment_reference TEXT,
    payment_method TEXT,
    customer_name TEXT,
    customer_email TEXT,
    assigned_to UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    resolution_notes TEXT,
    resolved_at TIMESTAMPTZ,
    resolved_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    due_date DATE,
    external_reference TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 3. Communication Logs Table
CREATE TABLE IF NOT EXISTS public.dispute_communications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    dispute_id UUID NOT NULL REFERENCES public.payment_disputes(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    author_role TEXT NOT NULL DEFAULT 'admin',
    message TEXT NOT NULL,
    is_internal BOOLEAN DEFAULT false,
    attachment_url TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_payment_disputes_booking_id ON public.payment_disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_status ON public.payment_disputes(dispute_status);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_type ON public.payment_disputes(dispute_type);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_assigned_to ON public.payment_disputes(assigned_to);
CREATE INDEX IF NOT EXISTS idx_payment_disputes_created_at ON public.payment_disputes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_dispute_communications_dispute_id ON public.dispute_communications(dispute_id);

-- 5. Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_payment_disputes_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;

-- 6. Enable RLS
ALTER TABLE public.payment_disputes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispute_communications ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies - Admin only access using auth metadata
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
SELECT EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid() AND up.role = 'admin'
)
$$;

DROP POLICY IF EXISTS "admin_full_access_payment_disputes" ON public.payment_disputes;
CREATE POLICY "admin_full_access_payment_disputes"
ON public.payment_disputes
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

DROP POLICY IF EXISTS "admin_full_access_dispute_communications" ON public.dispute_communications;
CREATE POLICY "admin_full_access_dispute_communications"
ON public.dispute_communications
FOR ALL
TO authenticated
USING (public.is_admin_user())
WITH CHECK (public.is_admin_user());

-- 8. Triggers
DROP TRIGGER IF EXISTS update_payment_disputes_updated_at ON public.payment_disputes;
CREATE TRIGGER update_payment_disputes_updated_at
    BEFORE UPDATE ON public.payment_disputes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_payment_disputes_updated_at();

-- 9. Sample data
DO $$
DECLARE
    existing_admin_id UUID;
    existing_booking_id UUID;
    dispute1_id UUID := gen_random_uuid();
    dispute2_id UUID := gen_random_uuid();
    dispute3_id UUID := gen_random_uuid();
BEGIN
    SELECT id INTO existing_admin_id FROM public.user_profiles WHERE role = 'admin' LIMIT 1;
    SELECT id INTO existing_booking_id FROM public.bookings LIMIT 1;

    IF existing_admin_id IS NOT NULL THEN
        INSERT INTO public.payment_disputes (id, booking_id, dispute_type, dispute_status, priority, title, description, amount, payment_reference, payment_method, customer_name, customer_email, assigned_to, due_date)
        VALUES
            (dispute1_id, existing_booking_id, 'chargeback'::public.dispute_type, 'under_review'::public.dispute_status, 'high'::public.dispute_priority,
             'GCash Chargeback - Booking #BK-001', 'Customer claims they did not authorize this transaction. Bank has initiated a chargeback process.',
             1500.00, 'PAY-REF-001', 'gcash', 'Juan dela Cruz', 'juan@example.com', existing_admin_id, CURRENT_DATE + INTERVAL '7 days'),
            (dispute2_id, NULL, 'failed_reversal'::public.dispute_type, 'open'::public.dispute_status, 'critical'::public.dispute_priority,
             'Failed Refund Reversal - Maya Payment', 'Refund was initiated but reversal failed due to gateway timeout. Customer has not received funds.',
             2200.00, 'PAY-REF-002', 'maya', 'Maria Santos', 'maria@example.com', existing_admin_id, CURRENT_DATE + INTERVAL '3 days'),
            (dispute3_id, NULL, 'dispute'::public.dispute_type, 'resolved_won'::public.dispute_status, 'medium'::public.dispute_priority,
             'Card Payment Dispute - Double Charge', 'Customer reported being charged twice for the same booking. Investigation confirmed single charge.',
             3000.00, 'PAY-REF-003', 'card', 'Pedro Reyes', 'pedro@example.com', existing_admin_id, CURRENT_DATE - INTERVAL '2 days')
        ON CONFLICT (id) DO NOTHING;

        INSERT INTO public.dispute_communications (dispute_id, author_id, author_name, author_role, message, is_internal)
        VALUES
            (dispute1_id, existing_admin_id, 'Admin', 'admin', 'Dispute received. Initiating review process and contacting payment gateway for transaction details.', false),
            (dispute1_id, existing_admin_id, 'Admin', 'admin', 'Internal note: Transaction logs show legitimate charge. Preparing evidence package for bank.', true),
            (dispute2_id, existing_admin_id, 'Admin', 'admin', 'Failed reversal detected. Escalating to payment gateway support team.', false),
            (dispute3_id, existing_admin_id, 'Admin', 'admin', 'Investigation complete. Transaction logs confirm single charge. Dispute resolved in our favor.', false)
        ON CONFLICT (id) DO NOTHING;
    ELSE
        RAISE NOTICE 'No admin user found. Skipping sample dispute data.';
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        RAISE NOTICE 'Sample data insertion failed: %', SQLERRM;
END $$;
