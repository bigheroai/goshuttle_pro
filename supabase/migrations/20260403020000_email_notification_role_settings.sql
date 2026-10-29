-- Migration: Email Notification Role-Based Settings
-- Ensures app_settings table has the booking_form_email_settings key with role_recipients structure

-- Ensure app_settings table exists (idempotent)
CREATE TABLE IF NOT EXISTS public.app_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key text UNIQUE NOT NULL,
  setting_value jsonb,
  updated_at timestamptz DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id)
);

-- Insert default email notification settings with role_recipients if not already present
INSERT INTO public.app_settings (setting_key, setting_value, updated_at)
VALUES (
  'booking_form_email_settings',
  jsonb_build_object(
    'admin_email', '',
    'admin_name', 'GoShuttle Admin',
    'booking_notifications_enabled', true,
    'smtp_enabled', false,
    'smtp_settings', null,
    'subject_template', 'New Booking Request #{booking_id}',
    'from_name', 'GoShuttle Pro',
    'from_email', 'noreply@goshuttlepro.com',
    'notification_triggers', jsonb_build_object(
      'new_booking', true,
      'booking_confirmed', true,
      'booking_cancelled', true,
      'payment_received', false
    ),
    'role_recipients', jsonb_build_object(
      'superadmin', jsonb_build_object(
        'email', '',
        'enabled', true,
        'triggers', jsonb_build_object(
          'new_booking', true,
          'booking_confirmed', true,
          'booking_cancelled', true,
          'payment_received', true,
          'driver_signup', true
        )
      ),
      'admin', jsonb_build_object(
        'email', '',
        'enabled', true,
        'triggers', jsonb_build_object(
          'new_booking', true,
          'booking_confirmed', true,
          'booking_cancelled', true,
          'payment_received', false,
          'driver_signup', true
        )
      ),
      'corporate', jsonb_build_object(
        'email', '',
        'enabled', false,
        'triggers', jsonb_build_object(
          'new_booking', true,
          'booking_confirmed', true,
          'booking_cancelled', true,
          'payment_received', true,
          'driver_signup', false
        )
      ),
      'partner', jsonb_build_object(
        'email', '',
        'enabled', false,
        'triggers', jsonb_build_object(
          'new_booking', true,
          'booking_confirmed', true,
          'booking_cancelled', true,
          'payment_received', false,
          'driver_signup', false
        )
      )
    ),
    'to_emails', '[]'::jsonb,
    'updated_at', to_char(now(), 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
  ),
  now()
)
ON CONFLICT (setting_key) DO NOTHING;

-- Add index for faster lookups
CREATE INDEX IF NOT EXISTS idx_app_settings_key ON public.app_settings (setting_key);
