-- ============================================================
-- GoShuttle Corporate Billing Flow (Items 1-7)
-- Migration: 20260821070000_corporate_billing_flow.sql
-- ============================================================

-- ── 1. ENUMS ─────────────────────────────────────────────────
DROP TYPE IF EXISTS public.approval_status_type CASCADE;
CREATE TYPE public.approval_status_type AS ENUM ('pending_approval', 'approved', 'rejected', 'cancelled');

DROP TYPE IF EXISTS public.ledger_entry_type CASCADE;
CREATE TYPE public.ledger_entry_type AS ENUM ('trip_charge', 'payment', 'adjustment', 'credit');

DROP TYPE IF EXISTS public.statement_status_type CASCADE;
CREATE TYPE public.statement_status_type AS ENUM ('draft', 'issued', 'paid', 'overdue', 'partially_paid');

DROP TYPE IF EXISTS public.payable_entry_type CASCADE;
CREATE TYPE public.payable_entry_type AS ENUM ('trip_earning', 'deduction', 'bonus', 'payment');

-- ── 2. BOOKING APPROVAL WORKFLOW ─────────────────────────────
-- Add approval columns to bookings table
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS approval_status public.approval_status_type DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approver_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS submitted_for_approval_at TIMESTAMPTZ DEFAULT NULL;

-- Booking approvals audit table
CREATE TABLE IF NOT EXISTS public.booking_approvals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  maker_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  approver_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  approval_status public.approval_status_type NOT NULL DEFAULT 'pending_approval',
  maker_notes TEXT,
  approver_notes TEXT,
  submitted_at TIMESTAMPTZ DEFAULT now(),
  decided_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ── 3. CORPORATE BILLING ACCOUNTS ────────────────────────────
CREATE TABLE IF NOT EXISTS public.corporate_billing_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  account_name TEXT NOT NULL,
  credit_limit NUMERIC(12,2) DEFAULT 0,
  current_balance NUMERIC(12,2) DEFAULT 0,
  billing_cycle TEXT DEFAULT 'monthly' CHECK (billing_cycle IN ('weekly','bi_weekly','monthly')),
  billing_day INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_corp_billing_accounts_company
  ON public.corporate_billing_accounts(company_id);

-- ── 4. CORPORATE BILLING LEDGER ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.corporate_billing_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_account_id UUID NOT NULL REFERENCES public.corporate_billing_accounts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  entry_type public.ledger_entry_type NOT NULL DEFAULT 'trip_charge',
  amount NUMERIC(12,2) NOT NULL,
  running_balance NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  reference_number TEXT,
  trip_date TIMESTAMPTZ,
  passenger_name TEXT,
  pickup_location TEXT,
  dropoff_location TEXT,
  vehicle_name TEXT,
  posted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ DEFAULT now(),
  statement_id UUID,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corp_billing_ledger_account
  ON public.corporate_billing_ledger(billing_account_id);
CREATE INDEX IF NOT EXISTS idx_corp_billing_ledger_company
  ON public.corporate_billing_ledger(company_id);
CREATE INDEX IF NOT EXISTS idx_corp_billing_ledger_booking
  ON public.corporate_billing_ledger(booking_id);

-- ── 5. CORPORATE STATEMENTS ──────────────────────────────────
CREATE TABLE IF NOT EXISTS public.corporate_statements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  billing_account_id UUID NOT NULL REFERENCES public.corporate_billing_accounts(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  statement_number TEXT NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_trips INTEGER DEFAULT 0,
  total_amount NUMERIC(12,2) DEFAULT 0,
  amount_paid NUMERIC(12,2) DEFAULT 0,
  balance_due NUMERIC(12,2) DEFAULT 0,
  statement_status public.statement_status_type DEFAULT 'draft',
  due_date DATE,
  issued_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_corp_statements_company
  ON public.corporate_statements(company_id);
CREATE INDEX IF NOT EXISTS idx_corp_statements_account
  ON public.corporate_statements(billing_account_id);

-- Add FK from ledger to statement
ALTER TABLE public.corporate_billing_ledger
  ADD CONSTRAINT fk_ledger_statement
  FOREIGN KEY (statement_id) REFERENCES public.corporate_statements(id) ON DELETE SET NULL;

-- ── 6. PARTNER PAYABLE ACCOUNTS ──────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_payable_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES public.partners(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  account_name TEXT NOT NULL,
  driver_rate_type TEXT DEFAULT 'percentage' CHECK (driver_rate_type IN ('percentage','fixed')),
  driver_rate_value NUMERIC(8,4) DEFAULT 0.80,
  current_balance NUMERIC(12,2) DEFAULT 0,
  total_earned NUMERIC(12,2) DEFAULT 0,
  total_paid NUMERIC(12,2) DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_payable_accounts_driver
  ON public.partner_payable_accounts(driver_id);
CREATE INDEX IF NOT EXISTS idx_partner_payable_accounts_partner
  ON public.partner_payable_accounts(partner_id);

-- ── 7. PARTNER PAYABLE LEDGER ────────────────────────────────
CREATE TABLE IF NOT EXISTS public.partner_payable_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  payable_account_id UUID NOT NULL REFERENCES public.partner_payable_accounts(id) ON DELETE CASCADE,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  entry_type public.payable_entry_type NOT NULL DEFAULT 'trip_earning',
  gross_fare NUMERIC(12,2) DEFAULT 0,
  driver_rate_value NUMERIC(8,4) DEFAULT 0.80,
  driver_rate_type TEXT DEFAULT 'percentage',
  amount NUMERIC(12,2) NOT NULL,
  running_balance NUMERIC(12,2) DEFAULT 0,
  description TEXT,
  trip_date TIMESTAMPTZ,
  passenger_name TEXT,
  pickup_location TEXT,
  dropoff_location TEXT,
  posted_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  posted_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_partner_payable_ledger_account
  ON public.partner_payable_ledger(payable_account_id);
CREATE INDEX IF NOT EXISTS idx_partner_payable_ledger_booking
  ON public.partner_payable_ledger(booking_id);

-- ── 8. FUNCTIONS ─────────────────────────────────────────────

-- Function: auto-post trip fare to corporate billing ledger on completion
CREATE OR REPLACE FUNCTION public.post_trip_to_corporate_billing()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_billing_account_id UUID;
  v_company_id UUID;
  v_running_balance NUMERIC(12,2);
  v_passenger_name TEXT;
  v_vehicle_name TEXT;
BEGIN
  -- Only trigger on status change to 'completed'
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Get company_id from booking user's profile
    SELECT up.company_id INTO v_company_id
    FROM public.user_profiles up
    WHERE up.id = NEW.user_id
    LIMIT 1;

    IF v_company_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get billing account for this company
    SELECT id INTO v_billing_account_id
    FROM public.corporate_billing_accounts
    WHERE company_id = v_company_id AND is_active = true
    LIMIT 1;

    IF v_billing_account_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get passenger name
    SELECT full_name INTO v_passenger_name
    FROM public.user_profiles WHERE id = NEW.user_id LIMIT 1;

    -- Get vehicle name
    SELECT name INTO v_vehicle_name
    FROM public.vehicles WHERE id = NEW.vehicle_id LIMIT 1;

    -- Get current running balance
    SELECT COALESCE(current_balance, 0) INTO v_running_balance
    FROM public.corporate_billing_accounts
    WHERE id = v_billing_account_id;

    v_running_balance := v_running_balance + COALESCE(NEW.total_cost, 0);

    -- Insert ledger entry
    INSERT INTO public.corporate_billing_ledger (
      billing_account_id, company_id, booking_id, entry_type,
      amount, running_balance, description, reference_number,
      trip_date, passenger_name, pickup_location, dropoff_location, vehicle_name,
      posted_at
    ) VALUES (
      v_billing_account_id, v_company_id, NEW.id, 'trip_charge',
      COALESCE(NEW.total_cost, 0), v_running_balance,
      'Trip charge - ' || COALESCE(NEW.pickup_location, '') || ' to ' || COALESCE(NEW.dropoff_location, ''),
      COALESCE(NEW.booking_code, NEW.id::TEXT),
      NEW.pickup_date, v_passenger_name,
      NEW.pickup_location, NEW.dropoff_location, v_vehicle_name,
      now()
    );

    -- Update billing account balance
    UPDATE public.corporate_billing_accounts
    SET current_balance = v_running_balance, updated_at = now()
    WHERE id = v_billing_account_id;
  END IF;

  RETURN NEW;
END;
$func$;

-- Function: auto-post driver earning to partner payable ledger on trip completion
CREATE OR REPLACE FUNCTION public.post_trip_to_partner_payable()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $func$
DECLARE
  v_driver_id UUID;
  v_payable_account_id UUID;
  v_rate_value NUMERIC(8,4);
  v_rate_type TEXT;
  v_driver_amount NUMERIC(12,2);
  v_running_balance NUMERIC(12,2);
  v_passenger_name TEXT;
BEGIN
  IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') THEN
    -- Get assigned driver from driver_assignments
    SELECT da.driver_id INTO v_driver_id
    FROM public.driver_assignments da
    WHERE da.booking_id = NEW.id
    LIMIT 1;

    IF v_driver_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Get payable account for this driver
    SELECT id, driver_rate_value, driver_rate_type
    INTO v_payable_account_id, v_rate_value, v_rate_type
    FROM public.partner_payable_accounts
    WHERE driver_id = v_driver_id AND is_active = true
    LIMIT 1;

    IF v_payable_account_id IS NULL THEN
      RETURN NEW;
    END IF;

    -- Calculate driver amount
    IF v_rate_type = 'percentage' THEN
      v_driver_amount := ROUND(COALESCE(NEW.total_cost, 0) * v_rate_value, 2);
    ELSE
      v_driver_amount := v_rate_value;
    END IF;

    -- Get passenger name
    SELECT full_name INTO v_passenger_name
    FROM public.user_profiles WHERE id = NEW.user_id LIMIT 1;

    -- Get current running balance
    SELECT COALESCE(current_balance, 0) INTO v_running_balance
    FROM public.partner_payable_accounts
    WHERE id = v_payable_account_id;

    v_running_balance := v_running_balance + v_driver_amount;

    -- Insert payable ledger entry
    INSERT INTO public.partner_payable_ledger (
      payable_account_id, booking_id, entry_type,
      gross_fare, driver_rate_value, driver_rate_type,
      amount, running_balance, description,
      trip_date, passenger_name, pickup_location, dropoff_location,
      posted_at
    ) VALUES (
      v_payable_account_id, NEW.id, 'trip_earning',
      COALESCE(NEW.total_cost, 0), v_rate_value, v_rate_type,
      v_driver_amount, v_running_balance,
      'Trip earning - ' || COALESCE(NEW.pickup_location, '') || ' to ' || COALESCE(NEW.dropoff_location, ''),
      NEW.pickup_date, v_passenger_name,
      NEW.pickup_location, NEW.dropoff_location,
      now()
    );

    -- Update payable account balances
    UPDATE public.partner_payable_accounts
    SET current_balance = v_running_balance,
        total_earned = total_earned + v_driver_amount,
        updated_at = now()
    WHERE id = v_payable_account_id;
  END IF;

  RETURN NEW;
END;
$func$;

-- ── 9. TRIGGERS ──────────────────────────────────────────────
DROP TRIGGER IF EXISTS trg_post_trip_corporate_billing ON public.bookings;
CREATE TRIGGER trg_post_trip_corporate_billing
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.post_trip_to_corporate_billing();

DROP TRIGGER IF EXISTS trg_post_trip_partner_payable ON public.bookings;
CREATE TRIGGER trg_post_trip_partner_payable
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.post_trip_to_partner_payable();

-- ── 10. RLS ───────────────────────────────────────────────────
ALTER TABLE public.booking_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_billing_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_billing_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.corporate_statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payable_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_payable_ledger ENABLE ROW LEVEL SECURITY;

-- booking_approvals: maker can see own, approver can see assigned, admin sees all
DROP POLICY IF EXISTS "booking_approvals_maker_access" ON public.booking_approvals;
CREATE POLICY "booking_approvals_maker_access"
  ON public.booking_approvals FOR ALL TO authenticated
  USING (maker_id = auth.uid() OR approver_id = auth.uid() OR public.is_admin_from_auth())
  WITH CHECK (maker_id = auth.uid() OR public.is_admin_from_auth());

-- corporate_billing_accounts: company members + admin
DROP POLICY IF EXISTS "corp_billing_accounts_access" ON public.corporate_billing_accounts;
CREATE POLICY "corp_billing_accounts_access"
  ON public.corporate_billing_accounts FOR ALL TO authenticated
  USING (
    public.is_admin_from_auth() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.company_id = corporate_billing_accounts.company_id
    )
  )
  WITH CHECK (public.is_admin_from_auth());

-- corporate_billing_ledger: company members + admin
DROP POLICY IF EXISTS "corp_billing_ledger_access" ON public.corporate_billing_ledger;
CREATE POLICY "corp_billing_ledger_access"
  ON public.corporate_billing_ledger FOR ALL TO authenticated
  USING (
    public.is_admin_from_auth() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.company_id = corporate_billing_ledger.company_id
    )
  )
  WITH CHECK (public.is_admin_from_auth());

-- corporate_statements: company members + admin
DROP POLICY IF EXISTS "corp_statements_access" ON public.corporate_statements;
CREATE POLICY "corp_statements_access"
  ON public.corporate_statements FOR ALL TO authenticated
  USING (
    public.is_admin_from_auth() OR
    EXISTS (
      SELECT 1 FROM public.user_profiles up
      WHERE up.id = auth.uid() AND up.company_id = corporate_statements.company_id
    )
  )
  WITH CHECK (public.is_admin_from_auth());

-- partner_payable_accounts: driver sees own, admin sees all
DROP POLICY IF EXISTS "partner_payable_accounts_access" ON public.partner_payable_accounts;
CREATE POLICY "partner_payable_accounts_access"
  ON public.partner_payable_accounts FOR ALL TO authenticated
  USING (driver_id = auth.uid() OR public.is_admin_from_auth())
  WITH CHECK (public.is_admin_from_auth());

-- partner_payable_ledger: driver sees own via account, admin sees all
DROP POLICY IF EXISTS "partner_payable_ledger_access" ON public.partner_payable_ledger;
CREATE POLICY "partner_payable_ledger_access"
  ON public.partner_payable_ledger FOR ALL TO authenticated
  USING (
    public.is_admin_from_auth() OR
    EXISTS (
      SELECT 1 FROM public.partner_payable_accounts ppa
      WHERE ppa.id = partner_payable_ledger.payable_account_id
        AND ppa.driver_id = auth.uid()
    )
  )
  WITH CHECK (public.is_admin_from_auth());
