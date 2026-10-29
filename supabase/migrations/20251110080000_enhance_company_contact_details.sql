-- Enhanced Company Contact Details for Email Notifications
-- Migration: 20251110080000_enhance_company_contact_details.sql

-- Insert/Update company contact details in app_settings
INSERT INTO public.app_settings (setting_key, setting_value, updated_by)
VALUES (
  'company_contact_details',
  '{
    "company_name": "GoShuttle Philippines",
    "support_email": "support@goshuttle.com",
    "support_phone": "+63 2 8123 4567",
    "hotline_phone": "+63 917 123 4567",
    "emergency_phone": "+63 998 765 4321",
    "address": "Makati City, Philippines",
    "business_hours": "Monday - Sunday: 24/7 Support Available",
    "website": "https://goshuttle.com"
  }'::jsonb,
  (SELECT id FROM public.user_profiles WHERE role = 'admin' LIMIT 1)
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = EXCLUDED.updated_by;

-- Update existing booking email settings to include company contact references
INSERT INTO public.app_settings (setting_key, setting_value, updated_by)
VALUES (
  'booking_email_templates',
  '{
    "customer_confirmation": {
      "include_contact_details": true,
      "show_support_section": true,
      "show_emergency_contact": true
    },
    "admin_notification": {
      "include_contact_details": true,
      "show_company_branding": true
    },
    "guest_confirmation": {
      "include_contact_details": true,
      "show_support_section": true,
      "emphasize_booking_reference": true
    }
  }'::jsonb,
  (SELECT id FROM public.user_profiles WHERE role = 'admin' LIMIT 1)
)
ON CONFLICT (setting_key) 
DO UPDATE SET 
  setting_value = EXCLUDED.setting_value,
  updated_at = CURRENT_TIMESTAMP,
  updated_by = EXCLUDED.updated_by;

-- Function to get company contact details (for easy access)
CREATE OR REPLACE FUNCTION public.get_company_contact_details()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  contact_details jsonb;
BEGIN
  SELECT setting_value INTO contact_details
  FROM public.app_settings
  WHERE setting_key = 'company_contact_details';
  
  -- Return default values if not configured
  IF contact_details IS NULL THEN
    contact_details := '{
      "company_name": "GoShuttle Philippines",
      "support_email": "support@goshuttle.com",
      "support_phone": "+63 2 8123 4567",
      "hotline_phone": "+63 917 123 4567",
      "emergency_phone": "+63 998 765 4321",
      "address": "Makati City, Philippines",
      "business_hours": "Monday - Sunday: 24/7 Support Available",
      "website": "https://goshuttle.com"
    }'::jsonb;
  END IF;
  
  RETURN contact_details;
END;
$$;

-- RLS Policy for the function (allow all authenticated users to call it)
GRANT EXECUTE ON FUNCTION public.get_company_contact_details() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_company_contact_details() TO anon;

DO $$ BEGIN
  RAISE NOTICE 'Enhanced company contact details configuration completed successfully';
  RAISE NOTICE 'Company contact details are now available for dynamic email templates';
  RAISE NOTICE 'Email notifications will include actual company contact information';
END $$;