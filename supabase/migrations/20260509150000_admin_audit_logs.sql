-- Admin Audit Logs Migration
-- Tracks all admin/staff actions: user creation, KYC approval, dispute resolution, role changes

-- Create action type enum
DROP TYPE IF EXISTS public.audit_action_type CASCADE;
CREATE TYPE public.audit_action_type AS ENUM (
  'user_created',
  'user_updated',
  'user_deactivated',
  'user_activated',
  'user_role_changed',
  'driver_created',
  'kyc_approved',
  'kyc_rejected',
  'kyc_under_review',
  'dispute_created',
  'dispute_resolved',
  'dispute_rejected',
  'booking_created',
  'booking_cancelled',
  'booking_assigned',
  'booking_updated',
  'role_created',
  'role_updated',
  'role_deleted',
  'staff_role_assigned',
  'payment_refunded',
  'vehicle_created',
  'vehicle_updated',
  'vehicle_deactivated',
  'partner_created',
  'partner_updated',
  'settings_updated',
  'other'
);

-- Create admin_audit_logs table
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type public.audit_action_type NOT NULL,
  actor_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  actor_name TEXT,
  actor_role TEXT,
  target_id TEXT,
  target_type TEXT,
  target_name TEXT,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_actor_id ON public.admin_audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_action_type ON public.admin_audit_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_created_at ON public.admin_audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_audit_logs_target_type ON public.admin_audit_logs(target_type);

-- Enable RLS
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Admin/staff can read all audit logs
DROP POLICY IF EXISTS "admin_staff_read_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "admin_staff_read_audit_logs"
ON public.admin_audit_logs
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.role::text IN ('admin', 'staff')
  )
);

-- Admin/staff can insert audit logs
DROP POLICY IF EXISTS "admin_staff_insert_audit_logs" ON public.admin_audit_logs;
CREATE POLICY "admin_staff_insert_audit_logs"
ON public.admin_audit_logs
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_profiles up
    WHERE up.id = auth.uid()
    AND up.role::text IN ('admin', 'staff')
  )
);

-- Seed some sample audit log entries for demonstration
DO $$
DECLARE
  admin_user_id UUID;
  staff_user_id UUID;
BEGIN
  -- Get an admin user
  SELECT id INTO admin_user_id FROM public.user_profiles WHERE role::text = 'admin' LIMIT 1;
  -- Get a staff user (may not exist)
  SELECT id INTO staff_user_id FROM public.user_profiles WHERE role::text = 'staff' LIMIT 1;

  IF admin_user_id IS NOT NULL THEN
    INSERT INTO public.admin_audit_logs (action_type, actor_id, actor_name, actor_role, target_type, target_name, description, metadata, created_at)
    VALUES
      ('user_created', admin_user_id, 'Admin', 'admin', 'user', 'John Doe', 'Created new customer account for John Doe', '{"email": "john.doe@example.com", "role": "customer"}'::jsonb, NOW() - INTERVAL '2 days'),
      ('kyc_approved', admin_user_id, 'Admin', 'admin', 'driver_application', 'Maria Santos', 'Approved KYC for driver application - Maria Santos', '{"application_id": "sample-id", "documents_verified": ["drivers_license", "nbi_clearance"]}'::jsonb, NOW() - INTERVAL '1 day 6 hours'),
      ('user_role_changed', admin_user_id, 'Admin', 'admin', 'user', 'Carlos Reyes', 'Changed role from customer to staff for Carlos Reyes', '{"old_role": "customer", "new_role": "staff"}'::jsonb, NOW() - INTERVAL '1 day'),
      ('dispute_resolved', admin_user_id, 'Admin', 'admin', 'dispute', 'Booking #BK-2024-001', 'Resolved chargeback dispute for booking BK-2024-001 - refund approved', '{"resolution": "refund_approved", "amount": 1500}'::jsonb, NOW() - INTERVAL '12 hours'),
      ('role_created', admin_user_id, 'Admin', 'admin', 'staff_role', 'Dispatcher', 'Created new staff role: Dispatcher with booking management privileges', '{"privileges": {"bookings": {"view": true, "assign": true}}}'::jsonb, NOW() - INTERVAL '6 hours'),
      ('driver_created', admin_user_id, 'Admin', 'admin', 'driver', 'Pedro Cruz', 'Created driver account for Pedro Cruz with vehicle assignment', '{"vehicle_type": "van", "fleet": "GoShuttle Fleet"}'::jsonb, NOW() - INTERVAL '3 hours'),
      ('kyc_rejected', admin_user_id, 'Admin', 'admin', 'driver_application', 'Ana Lim', 'Rejected KYC for driver application - incomplete documents', '{"reason": "Missing NBI clearance", "documents_missing": ["nbi_clearance"]}'::jsonb, NOW() - INTERVAL '1 hour'),
      ('settings_updated', admin_user_id, 'Admin', 'admin', 'settings', 'App Settings', 'Updated destination restrictions settings', '{"setting": "destination_restrictions", "changes": "Added new restricted zones"}'::jsonb, NOW() - INTERVAL '30 minutes')
    ON CONFLICT (id) DO NOTHING;
  END IF;

EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'Sample audit log seeding failed: %', SQLERRM;
END $$;
