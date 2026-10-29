-- Extended Email Templates Migration
-- Adds KYC, trip update, and account change email templates

INSERT INTO public.email_templates (template_key, template_name, subject, html_body, description) VALUES

-- KYC Approved
(
  'kyc_approved',
  'KYC Approved Notification',
  '✅ KYC Approved – Welcome to GoShuttle, {{driver_name}}!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #059669; margin: 0 0 6px 0; font-size: 24px;">✅ KYC Approved!</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Your identity verification has been successfully completed.</p>
    </div>
    <p style="color: #374151; font-size: 15px;">Dear <strong>{{driver_name}}</strong>,</p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.7;">Congratulations! Your KYC verification has been <strong style="color: #059669;">approved</strong>. You are now fully verified and can start accepting trips on the GoShuttle platform.</p>
    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 20px 0;">
      <h3 style="color: #15803d; margin: 0 0 14px 0; font-size: 15px;">📋 Verification Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Driver Name:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{driver_name}}</td></tr>
        <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">License Number:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{license_number}}</td></tr>
        <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Fleet Type:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{fleet_type}}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Approved On:</td><td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 13px;">{{approved_date}}</td></tr>
      </table>
    </div>
    <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
      <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>drivers@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Driver Management System</p>
    </div>
  </div>
</div>',
  'Sent to drivers when their KYC application is approved. Variables: {{driver_name}}, {{driver_email}}, {{license_number}}, {{fleet_type}}, {{approved_date}}'
),

-- KYC Rejected
(
  'kyc_rejected',
  'KYC Rejected Notification',
  '❌ KYC Application Update – Action Required',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #dc2626; margin: 0 0 6px 0; font-size: 24px;">❌ KYC Application Update</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Action required to complete your verification.</p>
    </div>
    <p style="color: #374151; font-size: 15px;">Dear <strong>{{driver_name}}</strong>,</p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.7;">We were unable to approve your KYC application at this time. Please review the reason below and resubmit the required documents.</p>
    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; margin: 20px 0;">
      <h3 style="color: #991b1b; margin: 0 0 12px 0; font-size: 15px;">⚠️ Rejection Reason</h3>
      <p style="color: #374151; font-size: 14px; margin: 0; line-height: 1.6;">{{rejection_reason}}</p>
    </div>
    <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
      <h4 style="color: #92400e; margin: 0 0 8px 0; font-size: 14px;">📋 What to Do Next</h4>
      <ol style="color: #92400e; margin: 0; padding-left: 18px; font-size: 13px; line-height: 1.8;">
        <li>Review the rejection reason above</li>
        <li>Prepare clear, valid copies of your documents</li>
        <li>Log in to the Driver Portal and resubmit your application</li>
        <li>Our team will review your resubmission within 2–3 business days</li>
      </ol>
    </div>
    <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
      <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>drivers@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Driver Management System</p>
    </div>
  </div>
</div>',
  'Sent to drivers when their KYC application is rejected. Variables: {{driver_name}}, {{driver_email}}, {{rejection_reason}}, {{rejected_date}}'
),

-- Trip Assigned
(
  'trip_assigned',
  'Driver Assigned Notification',
  '🚐 Driver Assigned – Booking {{booking_id}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #1d4ed8; margin: 0 0 6px 0; font-size: 24px;">🚐 Driver Assigned!</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Your driver has been assigned for your upcoming trip.</p>
    </div>
    <p style="color: #374151; font-size: 15px;">Dear <strong>{{customer_name}}</strong>,</p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.7;">Great news! A driver has been assigned to your booking. Here are your driver and trip details.</p>
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border: 1px solid #bfdbfe; margin: 20px 0;">
      <h3 style="color: #1e40af; margin: 0 0 14px 0; font-size: 15px;">👤 Your Driver</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #dbeafe;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Driver Name:</td><td style="padding: 8px 0; color: #1e40af; font-weight: 700; font-size: 13px;">{{driver_name}}</td></tr>
        <tr style="border-bottom: 1px solid #dbeafe;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Contact Number:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{driver_phone}}</td></tr>
        <tr style="border-bottom: 1px solid #dbeafe;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Vehicle:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{vehicle_name}}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Plate Number:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{vehicle_plate}}</td></tr>
      </table>
    </div>
    <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border-left: 4px solid #1d4ed8; margin-bottom: 20px;">
      <h3 style="color: #1e293b; margin: 0 0 14px 0; font-size: 15px;">📋 Trip Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Booking ID:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">{{booking_id}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: 600; color: #374151; font-size: 13px;">Pickup:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">{{pickup_location}}</td></tr>
        <tr style="border-bottom: 1px solid #e5e7eb;"><td style="padding: 7px 0; font-weight: 600; color: #374151; font-size: 13px;">Date:</td><td style="padding: 7px 0; color: #6b7280; font-size: 13px;">{{pickup_date}}</td></tr>
        <tr><td style="padding: 7px 0; font-weight: 600; color: #374151; font-size: 13px;">Time:</td><td style="padding: 7px 0; color: #1d4ed8; font-weight: 700; font-size: 13px;">{{pickup_time}}</td></tr>
      </table>
    </div>
    <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
      <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
    </div>
  </div>
</div>',
  'Sent to customers when a driver is assigned to their booking. Variables: {{customer_name}}, {{booking_id}}, {{driver_name}}, {{driver_phone}}, {{vehicle_name}}, {{vehicle_plate}}, {{pickup_location}}, {{pickup_date}}, {{pickup_time}}'
),

-- Trip Started
(
  'trip_started',
  'Trip Started Notification',
  '🚀 Your Trip Has Started – Booking {{booking_id}}',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #d97706; margin: 0 0 6px 0; font-size: 24px;">🚀 Your Trip Has Started!</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">You are now on your way to your destination.</p>
    </div>
    <p style="color: #374151; font-size: 15px;">Dear <strong>{{customer_name}}</strong>,</p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.7;">Your GoShuttle trip is now underway. Sit back, relax, and enjoy the ride!</p>
    <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; border: 1px solid #fde68a; margin: 20px 0;">
      <h3 style="color: #92400e; margin: 0 0 14px 0; font-size: 15px;">🗺️ Trip in Progress</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #fde68a;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Booking ID:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{booking_id}}</td></tr>
        <tr style="border-bottom: 1px solid #fde68a;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Driver:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{driver_name}}</td></tr>
        <tr style="border-bottom: 1px solid #fde68a;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">From:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{pickup_location}}</td></tr>
        <tr style="border-bottom: 1px solid #fde68a;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">To:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{dropoff_location}}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Started At:</td><td style="padding: 8px 0; color: #d97706; font-weight: 700; font-size: 13px;">{{started_at}}</td></tr>
      </table>
    </div>
    <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Emergency Contact</h4>
      <p style="color: #0277bd; margin: 0; font-size: 13px;">If you need assistance during your trip, call <strong>+63 2 8123 4567</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
    </div>
  </div>
</div>',
  'Sent to customers when their trip begins. Variables: {{customer_name}}, {{booking_id}}, {{driver_name}}, {{pickup_location}}, {{dropoff_location}}, {{started_at}}'
),

-- Trip Completed
(
  'trip_completed',
  'Trip Completed Notification',
  '✅ Trip Completed – Thank You for Riding with GoShuttle!',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #059669; margin: 0 0 6px 0; font-size: 24px;">🏁 Trip Completed!</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Thank you for riding with GoShuttle.</p>
    </div>
    <p style="color: #374151; font-size: 15px;">Dear <strong>{{customer_name}}</strong>,</p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.7;">Your trip has been successfully completed. We hope you had a comfortable journey!</p>
    <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; border: 1px solid #bbf7d0; margin: 20px 0;">
      <h3 style="color: #15803d; margin: 0 0 14px 0; font-size: 15px;">📋 Trip Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Booking ID:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{booking_id}}</td></tr>
        <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Route:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{pickup_location}} → {{dropoff_location}}</td></tr>
        <tr style="border-bottom: 1px solid #d1fae5;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Completed At:</td><td style="padding: 8px 0; color: #059669; font-weight: 700; font-size: 13px;">{{completed_at}}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 700; color: #374151; font-size: 15px;">Total Fare:</td><td style="padding: 8px 0; color: #059669; font-weight: 800; font-size: 18px;">₱{{total_cost}}</td></tr>
      </table>
    </div>
    <div style="background-color: #eff6ff; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-bottom: 20px;">
      <p style="color: #1e40af; margin: 0; font-size: 13px; line-height: 1.6;"><strong>⭐ Rate your experience!</strong> Your feedback helps us improve. Visit your booking history at <a href="https://goshuttle.ph/customer-account" style="color: #2563eb;">goshuttle.ph</a> to leave a review.</p>
    </div>
    <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
      <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Premium Transportation Service</p>
    </div>
  </div>
</div>',
  'Sent to customers when their trip is completed. Variables: {{customer_name}}, {{booking_id}}, {{pickup_location}}, {{dropoff_location}}, {{total_cost}}, {{completed_at}}'
),

-- Account Password Reset
(
  'account_password_reset',
  'Password Reset Request',
  '🔐 Password Reset Request – GoShuttle',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #7c3aed; margin: 0 0 6px 0; font-size: 24px;">🔐 Password Reset Request</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">We received a request to reset your password.</p>
    </div>
    <p style="color: #374151; font-size: 15px;">Dear <strong>{{customer_name}}</strong>,</p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.7;">We received a request to reset the password for your GoShuttle account. Click the button below to set a new password. This link will expire in <strong>1 hour</strong>.</p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="{{reset_url}}" style="display: inline-block; background-color: #7c3aed; color: #ffffff; font-size: 15px; font-weight: 700; padding: 14px 32px; border-radius: 8px; text-decoration: none;">🔐 Reset My Password</a>
    </div>
    <div style="background-color: #fef2f2; padding: 16px; border-radius: 6px; border-left: 4px solid #ef4444; margin-bottom: 20px;">
      <p style="color: #991b1b; margin: 0; font-size: 13px; line-height: 1.6;"><strong>⚠️ Didn''t request this?</strong> If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
    </div>
    <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
      <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Security Notification</p>
    </div>
  </div>
</div>',
  'Sent to users when they request a password reset. Variables: {{customer_name}}, {{reset_url}}, {{requested_at}}'
),

-- Account Deactivated
(
  'account_deactivated',
  'Account Deactivated Notice',
  '⚠️ Your GoShuttle Account Has Been Deactivated',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #dc2626; margin: 0 0 6px 0; font-size: 24px;">⚠️ Account Deactivated</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Your GoShuttle account has been deactivated.</p>
    </div>
    <p style="color: #374151; font-size: 15px;">Dear <strong>{{customer_name}}</strong>,</p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.7;">We are writing to inform you that your GoShuttle account has been deactivated. If you believe this is an error, please contact our support team.</p>
    <div style="background-color: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca; margin: 20px 0;">
      <h3 style="color: #991b1b; margin: 0 0 12px 0; font-size: 15px;">📋 Deactivation Details</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #fecaca;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Reason:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{deactivation_reason}}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Date:</td><td style="padding: 8px 0; color: #dc2626; font-weight: 700; font-size: 13px;">{{deactivated_at}}</td></tr>
      </table>
    </div>
    <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Contact Support</h4>
      <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Account Management</p>
    </div>
  </div>
</div>',
  'Sent to users when their account is deactivated. Variables: {{customer_name}}, {{deactivation_reason}}, {{deactivated_at}}'
),

-- Account Profile Updated
(
  'account_profile_updated',
  'Profile Updated Notification',
  '📝 Your GoShuttle Profile Has Been Updated',
  '<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
  <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
    <div style="text-align: center; margin-bottom: 28px;">
      <h1 style="color: #1d4ed8; margin: 0 0 6px 0; font-size: 24px;">📝 Profile Updated</h1>
      <p style="color: #6b7280; font-size: 14px; margin: 0;">Your account information has been updated.</p>
    </div>
    <p style="color: #374151; font-size: 15px;">Dear <strong>{{customer_name}}</strong>,</p>
    <p style="color: #6b7280; font-size: 14px; line-height: 1.7;">Your GoShuttle profile has been successfully updated. Here is a summary of the changes made.</p>
    <div style="background-color: #eff6ff; padding: 20px; border-radius: 8px; border: 1px solid #bfdbfe; margin: 20px 0;">
      <h3 style="color: #1e40af; margin: 0 0 12px 0; font-size: 15px;">📋 Update Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="border-bottom: 1px solid #dbeafe;"><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px; width: 45%;">Updated Fields:</td><td style="padding: 8px 0; color: #6b7280; font-size: 13px;">{{updated_fields}}</td></tr>
        <tr><td style="padding: 8px 0; font-weight: 600; color: #374151; font-size: 13px;">Updated At:</td><td style="padding: 8px 0; color: #1d4ed8; font-weight: 700; font-size: 13px;">{{updated_at}}</td></tr>
      </table>
    </div>
    <div style="background-color: #fef3c7; padding: 16px; border-radius: 6px; border-left: 4px solid #f59e0b; margin-bottom: 20px;">
      <p style="color: #92400e; margin: 0; font-size: 13px; line-height: 1.6;"><strong>⚠️ Wasn''t you?</strong> If you did not make these changes, please contact our support team immediately.</p>
    </div>
    <div style="background-color: #e0f2fe; padding: 16px; border-radius: 6px; margin-bottom: 20px;">
      <h4 style="color: #0277bd; margin: 0 0 6px 0; font-size: 14px;">📞 Need Help?</h4>
      <p style="color: #0277bd; margin: 0; font-size: 13px;">Contact us at <strong>support@goshuttle.ph</strong> or call <strong>+63 2 8123 4567</strong></p>
    </div>
    <div style="text-align: center; margin-top: 20px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">GoShuttle Pro – Account Management</p>
    </div>
  </div>
</div>',
  'Sent to users when their profile is updated. Variables: {{customer_name}}, {{updated_fields}}, {{updated_at}}'
)

ON CONFLICT (template_key) DO NOTHING;
