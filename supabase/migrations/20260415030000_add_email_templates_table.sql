-- Email Templates Table
-- Allows admins to edit booking confirmation email templates without redeploying edge functions

CREATE TABLE IF NOT EXISTS public.email_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_key TEXT NOT NULL UNIQUE,
  template_name TEXT NOT NULL,
  subject TEXT NOT NULL,
  html_body TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
  updated_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_email_templates_key ON public.email_templates(template_key);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "admins_manage_email_templates" ON public.email_templates;
CREATE POLICY "admins_manage_email_templates"
ON public.email_templates
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- Seed default templates
INSERT INTO public.email_templates (template_key, template_name, subject, html_body, description) VALUES
(
  'customer_confirmation',
  'Customer Booking Confirmation',
  '✅ Booking Confirmed - {{booking_id}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #059669; margin-bottom: 10px;">✅ Booking Confirmed!</h1>
      <p style="color: #6b7280; font-size: 16px;">Thank you for choosing GoShuttle Pro</p>
    </div>
    <p style="color: #374151;">Dear {{customer_name}},</p>
    <p style="color: #6b7280; line-height: 1.6;">Your booking has been successfully received. Here are your booking details:</p>
    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #22c55e; margin-bottom: 20px;">
      <h3 style="color: #15803d; margin-bottom: 15px;">📋 Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Booking ID:</td><td style="padding: 8px 0; color: #6b7280;">{{booking_id}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Route:</td><td style="padding: 8px 0; color: #6b7280;">{{pickup_location}} → {{dropoff_location}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Vehicle:</td><td style="padding: 8px 0; color: #6b7280;">{{vehicle_name}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Passengers:</td><td style="padding: 8px 0; color: #6b7280;">{{passenger_count}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Date:</td><td style="padding: 8px 0; color: #6b7280;">{{pickup_date}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Time:</td><td style="padding: 8px 0; color: #6b7280;">{{pickup_time}}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Total Cost:</td><td style="padding: 8px 0; color: #059669; font-weight: bold; font-size: 18px;">₱{{total_cost}}</td></tr>
      </table>
    </div>
    <div style="text-align: center; margin-bottom: 24px;">
      <p style="color: #374151; font-size: 14px; margin-bottom: 12px;">Please confirm your booking by clicking the button below:</p>
      <a href="{{confirm_url}}" style="display: inline-block; background-color: #059669; color: #ffffff; font-size: 16px; font-weight: 700; padding: 14px 32px; border-radius: 8px; text-decoration: none;">✅ Confirm My Booking</a>
    </div>
    <div style="background-color: #e0f2fe; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #0277bd; margin: 0 0 10px 0;">📞 Need Help?</h4>
      <p style="color: #0277bd; margin: 0;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
    </div>
    <p style="color: #6b7280; text-align: center; margin-bottom: 0;">Thank you for choosing GoShuttle Pro for your transportation needs!</p>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro - Premium Transportation Service</p>
    </div>
  </div>
</div>',
  'Sent to customers when their booking is confirmed. Supports variables: {{booking_id}}, {{customer_name}}, {{pickup_location}}, {{dropoff_location}}, {{vehicle_name}}, {{passenger_count}}, {{pickup_date}}, {{pickup_time}}, {{total_cost}}, {{confirm_url}}'
),
(
  'admin_notification',
  'Admin New Booking Notification',
  '🆕 New Booking Request - {{booking_id}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 24px;">
      <h1 style="color: #1f2937; margin: 0 0 8px 0; font-size: 22px;">🆕 New Booking Request</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">GoShuttle Pro Booking System</p>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 6px; border-left: 4px solid #1d4ed8; margin-bottom: 20px;">
      <h3 style="color: #1e293b; margin-bottom: 15px; font-size: 15px;">📋 Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Booking ID:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">{{booking_id}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Customer:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">{{customer_name}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Email:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">{{customer_email}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Route:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">{{pickup_location}} → {{dropoff_location}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Vehicle:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">{{vehicle_name}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Pickup Date:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">{{pickup_date}} at {{pickup_time}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Passengers:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">{{passenger_count}}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: bold; color: #374151; font-size: 13px;">Total Cost:</td><td style="padding: 7px 0; color: #059669; font-weight: bold; font-size: 15px;">₱{{total_cost}}</td></tr>
      </table>
    </div>
    <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 16px;">
      <p style="color: #374151; margin: 0; font-size: 13px;"><strong>⚡ Action Required:</strong> Please log in to the admin dashboard to review and manage this booking.</p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro Admin Notification System</p>
    </div>
  </div>
</div>',
  'Sent to admin when a new booking is submitted. Supports variables: {{booking_id}}, {{customer_name}}, {{customer_email}}, {{pickup_location}}, {{dropoff_location}}, {{vehicle_name}}, {{pickup_date}}, {{pickup_time}}, {{passenger_count}}, {{total_cost}}'
),
(
  'booking_cancelled',
  'Booking Cancellation Notice',
  '❌ Booking Cancelled - {{booking_id}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #dc2626; margin-bottom: 10px;">❌ Booking Cancelled</h1>
      <p style="color: #6b7280; font-size: 16px;">Your booking has been cancelled</p>
    </div>
    <p style="color: #374151;">Dear {{customer_name}},</p>
    <p style="color: #6b7280; line-height: 1.6;">We are sorry to inform you that your booking has been cancelled.</p>
    <div style="background-color: #fef2f2; padding: 20px; border-radius: 6px; border-left: 4px solid #ef4444; margin-bottom: 20px;">
      <h3 style="color: #991b1b; margin-bottom: 15px;">Cancelled Booking Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #fecaca;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Booking ID:</td><td style="padding: 8px 0; color: #6b7280;">{{booking_id}}</td></tr>
        <tr style="border-bottom: 1px solid #fecaca;"><td style="padding: 8px 0; font-weight: bold; color: #374151;">Route:</td><td style="padding: 8px 0; color: #6b7280;">{{pickup_location}} → {{dropoff_location}}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: bold; color: #374151;">Pickup Date:</td><td style="padding: 8px 0; color: #6b7280;">{{pickup_date}}</td></tr>
      </table>
    </div>
    <div style="background-color: #e0f2fe; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #0277bd; margin: 0 0 10px 0;">📞 Need Help?</h4>
      <p style="color: #0277bd; margin: 0;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro - Premium Transportation Service</p>
    </div>
  </div>
</div>',
  'Sent to customers when their booking is cancelled. Supports variables: {{booking_id}}, {{customer_name}}, {{pickup_location}}, {{dropoff_location}}, {{pickup_date}}'
),
(
  'welcome_email',
  'Welcome Email',
  '🎉 Welcome to GoShuttle, {{customer_name}}!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #059669; margin: 0 0 8px 0; font-size: 26px;">🎉 Welcome to GoShuttle!</h1>
      <p style="color: #6b7280; font-size: 15px; margin: 0;">Your account has been created successfully</p>
    </div>
    <p style="color: #374151; font-size: 15px;">Hi <strong>{{customer_name}}</strong>,</p>
    <p style="color: #6b7280; line-height: 1.7;">Thank you for creating a GoShuttle account! You can now track your bookings, earn loyalty points, and enjoy a faster booking experience.</p>
    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 6px; border-left: 4px solid #22c55e; margin: 20px 0;">
      <h3 style="color: #15803d; margin: 0 0 12px 0; font-size: 15px;">✅ What you can do now</h3>
      <ul style="color: #374151; line-height: 1.8; margin: 0; padding-left: 20px; font-size: 14px;">
        <li>Track all your bookings in one place</li>
        <li>Earn loyalty points on every ride</li>
        <li>Save favorite routes for quick rebooking</li>
        <li>Manage your profile and preferences</li>
      </ul>
    </div>
    <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #0277bd; margin: 0 0 8px 0; font-size: 14px;">📞 Need Help?</h4>
      <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro - Premium Transportation Service</p>
    </div>
  </div>
</div>',
  'Sent to new customers when they register. Supports variables: {{customer_name}}, {{customer_email}}'
)
ON CONFLICT (template_key) DO NOTHING;
