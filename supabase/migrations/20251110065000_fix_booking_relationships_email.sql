-- Fix booking relationship issues and enhance email functionality
-- Migration: 20251110065000_fix_booking_relationships_email.sql

BEGIN;

-- 1. Add function to get booking with explicit relationship joins (avoids ambiguous relationships)
CREATE OR REPLACE FUNCTION get_booking_with_relations(booking_uuid UUID)
RETURNS TABLE (
  id UUID,
  booking_code TEXT,
  user_id UUID,
  guest_name TEXT,
  guest_email TEXT,
  guest_phone TEXT,
  pickup_location TEXT,
  dropoff_location TEXT,
  pickup_date TIMESTAMPTZ,
  return_date TIMESTAMPTZ,
  passenger_count INTEGER,
  vehicle_id UUID,
  notes TEXT,
  total_cost NUMERIC,
  status booking_status,
  is_guest_booking BOOLEAN,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  -- User profile fields
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  -- Vehicle fields
  vehicle_name TEXT,
  vehicle_type vehicle_type,
  vehicle_capacity INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.booking_code,
    b.user_id,
    b.guest_name,
    b.guest_email,
    b.guest_phone,
    b.pickup_location,
    b.dropoff_location,
    b.pickup_date,
    b.return_date,
    b.passenger_count,
    b.vehicle_id,
    b.notes,
    b.total_cost,
    b.status,
    b.is_guest_booking,
    b.created_at,
    b.updated_at,
    -- User profile data (null for guest bookings)
    up.full_name as customer_name,
    up.email as customer_email,
    up.phone as customer_phone,
    -- Vehicle data
    v.name as vehicle_name,
    v.vehicle_type,
    v.capacity as vehicle_capacity
  FROM bookings b
  LEFT JOIN user_profiles up ON b.user_id = up.id
  LEFT JOIN vehicles v ON b.vehicle_id = v.id
  WHERE b.id = booking_uuid;
END;
$$;

-- 2. Create function to send booking confirmation emails
CREATE OR REPLACE FUNCTION send_booking_email_notification(
  booking_uuid UUID,
  email_type TEXT DEFAULT 'customer_confirmation'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  booking_record RECORD;
  email_settings JSONB;
  function_response JSONB;
BEGIN
  -- Get booking with all related data
  SELECT * INTO booking_record 
  FROM get_booking_with_relations(booking_uuid);
  
  IF booking_record IS NULL THEN
    RAISE EXCEPTION 'Booking not found: %', booking_uuid;
  END IF;
  
  -- Get email settings
  SELECT setting_value INTO email_settings
  FROM app_settings 
  WHERE setting_key = 'booking_form_email_settings';
  
  -- Prepare email data
  DECLARE
    email_data JSONB := jsonb_build_object(
      'booking_id', UPPER(SUBSTRING(booking_record.id::TEXT FROM 1 FOR 8)),
      'customer_name', COALESCE(booking_record.customer_name, booking_record.guest_name),
      'customer_email', COALESCE(booking_record.customer_email, booking_record.guest_email),
      'customer_phone', COALESCE(booking_record.customer_phone, booking_record.guest_phone),
      'guest_name', booking_record.guest_name,
      'guest_email', booking_record.guest_email,
      'guest_phone', booking_record.guest_phone,
      'pickup_location', booking_record.pickup_location,
      'dropoff_location', booking_record.dropoff_location,
      'pickup_date', TO_CHAR(booking_record.pickup_date, 'Mon DD, YYYY'),
      'pickup_time', TO_CHAR(booking_record.pickup_date, 'HH12:MI AM'),
      'return_date', CASE 
        WHEN booking_record.return_date IS NOT NULL 
        THEN TO_CHAR(booking_record.return_date, 'Mon DD, YYYY') 
        ELSE NULL 
      END,
      'return_time', CASE 
        WHEN booking_record.return_date IS NOT NULL 
        THEN TO_CHAR(booking_record.return_date, 'HH12:MI AM') 
        ELSE NULL 
      END,
      'vehicle_name', booking_record.vehicle_name,
      'vehicle_type', booking_record.vehicle_type,
      'passenger_count', booking_record.passenger_count,
      'special_requirements', booking_record.notes,
      'total_cost', booking_record.total_cost,
      'is_guest_booking', booking_record.is_guest_booking
    );
  BEGIN
    -- Call the edge function based on email type
    IF email_type = 'customer_confirmation' THEN
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-booking-confirmation',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        ),
        body := jsonb_build_object(
          'type', 'customer_confirmation',
          'customer_email', COALESCE(booking_record.customer_email, booking_record.guest_email),
          'booking_data', email_data
        )
      ) INTO function_response;
    ELSIF email_type = 'admin_notification' THEN
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-booking-confirmation',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        ),
        body := jsonb_build_object(
          'type', 'admin_notification',
          'admin_email', email_settings->>'admin_email',
          'booking_data', email_data
        )
      ) INTO function_response;
    ELSIF email_type = 'guest_booking_confirmation' THEN
      SELECT net.http_post(
        url := current_setting('app.supabase_url') || '/functions/v1/send-booking-confirmation',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.supabase_anon_key')
        ),
        body := jsonb_build_object(
          'type', 'guest_booking_confirmation',
          'booking_data', email_data
        )
      ) INTO function_response;
    END IF;
    
    RETURN jsonb_build_object(
      'success', true,
      'booking_id', booking_record.id,
      'email_type', email_type,
      'response', function_response
    );
  EXCEPTION WHEN OTHERS THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', SQLERRM,
      'booking_id', booking_record.id,
      'email_type', email_type
    );
  END;
END;
$$;

-- 3. Create trigger to automatically send confirmation emails on booking creation
CREATE OR REPLACE FUNCTION trigger_booking_email_notifications()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Only send emails for new bookings (INSERT) with pending status
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    -- Send customer/guest confirmation
    IF NEW.is_guest_booking THEN
      PERFORM send_booking_email_notification(NEW.id, 'guest_booking_confirmation');
    ELSE
      PERFORM send_booking_email_notification(NEW.id, 'customer_confirmation');
    END IF;
    
    -- Send admin notification
    PERFORM send_booking_email_notification(NEW.id, 'admin_notification');
  END IF;
  
  RETURN NEW;
END;
$$;

-- 4. Create the trigger (drop if exists first)
DROP TRIGGER IF EXISTS booking_email_notifications_trigger ON bookings;
CREATE TRIGGER booking_email_notifications_trigger
  AFTER INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_booking_email_notifications();

-- 5. Add email configuration to app_settings if not exists
INSERT INTO app_settings (setting_key, setting_value, updated_by)
VALUES (
  'booking_form_email_settings',
  jsonb_build_object(
    'booking_notifications_enabled', true,
    'guest_booking_notifications_enabled', true,
    'admin_email', 'admin@goshuttle.com',
    'admin_name', 'GoShuttle Admin',
    'customer_copy_enabled', true,
    'template_version', '2.0'
  ),
  (SELECT id FROM user_profiles WHERE role = 'admin' LIMIT 1)
)
ON CONFLICT (setting_key) DO UPDATE SET
  setting_value = EXCLUDED.setting_value,
  updated_at = CURRENT_TIMESTAMP;

-- 6. Grant necessary permissions
GRANT EXECUTE ON FUNCTION get_booking_with_relations(UUID) TO authenticated, anon;
GRANT EXECUTE ON FUNCTION send_booking_email_notification(UUID, TEXT) TO authenticated, anon;

-- 7. Add helpful indexes for email functionality
CREATE INDEX IF NOT EXISTS idx_bookings_email_notifications 
ON bookings (is_guest_booking, status, created_at) 
WHERE status = 'pending';

CREATE INDEX IF NOT EXISTS idx_app_settings_email 
ON app_settings (setting_key) 
WHERE setting_key LIKE '%email%';

COMMIT;