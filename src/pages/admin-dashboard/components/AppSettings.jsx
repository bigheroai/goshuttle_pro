import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Icon from '../../../components/AppIcon';
import ImageUpload from '../../../components/ImageUpload';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { useAppSettings } from '../../../hooks/useAppSettings';
import emailService from '../../../services/emailService';
import { useNavigate } from 'react-router-dom';
import EmailTemplatePreviewModal from './EmailTemplatePreviewModal';
import EmailTemplateEditor from './EmailTemplateEditor';

const AppSettings = () => {
  const { user } = useAuth();
  const { refreshMetaTags } = useAppSettings();
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    app_logo_url: '',
    app_meta_description: '',
    app_contact_info: '',
    fleet_capacity_limits: '',
    branding_logo: '',
    favicon_logo: '',
    mobile_logo: '',
    seo_meta_title: '',
    seo_meta_description: '',
    seo_keywords: '',
    og_title: '',
    og_description: '',
    og_image: '',
    og_url: '',
    company_name: ''
  });

  // Simplified email settings state with clearer structure
  const [emailSettings, setEmailSettings] = useState({
    // Admin Email Configuration
    admin_email: '',
    admin_name: 'GoShuttle Admin',
    booking_notifications_enabled: true,
    
    // Email Templates
    booking_subject: 'New Booking Request #{booking_id}',
    sender_name: 'GoShuttle Pro',
    sender_email: 'noreply@goshuttlepro.com',
    
    // Notification Types
    notify_new_booking: true,
    notify_booking_confirmed: true,
    notify_booking_cancelled: true,
    notify_payment_received: false,

    // Multi-role recipients
    superadmin_email: '',
    superadmin_enabled: true,
    superadmin_notify_new_booking: true,
    superadmin_notify_confirmed: true,
    superadmin_notify_cancelled: true,
    superadmin_notify_payment: true,
    superadmin_notify_driver_signup: true,

    admin_notify_new_booking: true,
    admin_notify_confirmed: true,
    admin_notify_cancelled: true,
    admin_notify_payment: false,
    admin_notify_driver_signup: true,

    corporate_email: '',
    corporate_enabled: true,
    corporate_notify_new_booking: true,
    corporate_notify_confirmed: true,
    corporate_notify_cancelled: true,
    corporate_notify_payment: true,
    corporate_notify_driver_signup: false,

    partner_email: '',
    partner_enabled: false,
    partner_notify_new_booking: true,
    partner_notify_confirmed: true,
    partner_notify_cancelled: true,
    partner_notify_payment: false,
    partner_notify_driver_signup: false,
  });

  // Add test email state
  const [testEmail, setTestEmail] = useState('');
  const [isTestingEmail, setIsTestingEmail] = useState(false);
  const [showEmailTemplateModal, setShowEmailTemplateModal] = useState(false);
  const [resendTestState, setResendTestState] = useState({
    testTo: '',
    testType: 'test_email',
    isTesting: false,
    lastResult: null,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // ENHANCED: Add separate state for different section messages
  const [sectionMessages, setSectionMessages] = useState({
    email: { success: '', error: '', info: '' },
    logo: { success: '', error: '', info: '' },
    general: { success: '', error: '', info: '' }
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        ?.from('app_settings')
        ?.select('*');

      if (error) {
        setError('Failed to load settings: ' + error?.message);
        return;
      }

      // Convert array to object for easier handling
      const settingsObj = {};
      data?.forEach(setting => {
        settingsObj[setting.setting_key] = setting?.setting_value;
      });

      setSettings({
        app_logo_url: settingsObj?.app_logo_url?.url || '',
        app_meta_description: settingsObj?.app_meta_description?.description || '',
        app_contact_info: JSON.stringify(settingsObj?.app_contact_info || {}, null, 2),
        fleet_capacity_limits: JSON.stringify(settingsObj?.fleet_capacity_limits || {}, null, 2),
        branding_logo: settingsObj?.branding_logo?.url || '',
        favicon_logo: settingsObj?.favicon_logo?.url || '',
        mobile_logo: settingsObj?.mobile_logo?.url || '',
        seo_meta_title: settingsObj?.seo_meta_title || '',
        seo_meta_description: settingsObj?.seo_meta_description?.description || '',
        seo_keywords: settingsObj?.seo_keywords || '',
        og_title: settingsObj?.og_title || '',
        og_description: settingsObj?.og_description || '',
        og_image: settingsObj?.og_image?.url || '',
        og_url: settingsObj?.og_url || '',
        company_name: settingsObj?.company_name || ''
      });

      // Parse email settings with simplified structure
      const emailConfig = settingsObj?.booking_form_email_settings || {};
      setEmailSettings({
              admin_email: Array.isArray(emailConfig?.admin_emails) && emailConfig?.admin_emails?.length > 0
        ? emailConfig?.admin_emails?.join(', ')
        : Array.isArray(emailConfig?.to_emails) ? emailConfig?.to_emails?.join(', ') : emailConfig?.admin_email || '',
        admin_name: emailConfig?.admin_name || 'GoShuttle Admin',
        booking_notifications_enabled: emailConfig?.booking_notifications_enabled !== false,
        
        booking_subject: emailConfig?.subject_template || 'New Booking Request #{booking_id}',
        sender_name: emailConfig?.from_name || 'GoShuttle Pro',
        sender_email: emailConfig?.from_email || 'noreply@goshuttlepro.com',
        
        notify_new_booking: emailConfig?.notification_triggers?.new_booking !== false,
        notify_booking_confirmed: emailConfig?.notification_triggers?.booking_confirmed !== false,
        notify_booking_cancelled: emailConfig?.notification_triggers?.booking_cancelled !== false,
        notify_payment_received: emailConfig?.notification_triggers?.payment_received || false,

        // Multi-role recipients
        superadmin_email: emailConfig?.role_recipients?.superadmin?.email || '',
        superadmin_enabled: emailConfig?.role_recipients?.superadmin?.enabled !== false,
        superadmin_notify_new_booking: emailConfig?.role_recipients?.superadmin?.triggers?.new_booking !== false,
        superadmin_notify_confirmed: emailConfig?.role_recipients?.superadmin?.triggers?.booking_confirmed !== false,
        superadmin_notify_cancelled: emailConfig?.role_recipients?.superadmin?.triggers?.booking_cancelled !== false,
        superadmin_notify_payment: emailConfig?.role_recipients?.superadmin?.triggers?.payment_received !== false,
        superadmin_notify_driver_signup: emailConfig?.role_recipients?.superadmin?.triggers?.driver_signup !== false,

        admin_notify_new_booking: emailConfig?.role_recipients?.admin?.triggers?.new_booking !== false,
        admin_notify_confirmed: emailConfig?.role_recipients?.admin?.triggers?.booking_confirmed !== false,
        admin_notify_cancelled: emailConfig?.role_recipients?.admin?.triggers?.booking_cancelled !== false,
        admin_notify_payment: emailConfig?.role_recipients?.admin?.triggers?.payment_received || false,
        admin_notify_driver_signup: emailConfig?.role_recipients?.admin?.triggers?.driver_signup !== false,

        corporate_email: emailConfig?.role_recipients?.corporate?.email || '',
        corporate_enabled: emailConfig?.role_recipients?.corporate?.enabled || false,
        corporate_notify_new_booking: emailConfig?.role_recipients?.corporate?.triggers?.new_booking !== false,
        corporate_notify_confirmed: emailConfig?.role_recipients?.corporate?.triggers?.booking_confirmed !== false,
        corporate_notify_cancelled: emailConfig?.role_recipients?.corporate?.triggers?.booking_cancelled !== false,
        corporate_notify_payment: emailConfig?.role_recipients?.corporate?.triggers?.payment_received !== false,
        corporate_notify_driver_signup: emailConfig?.role_recipients?.corporate?.triggers?.driver_signup || false,

        partner_email: emailConfig?.role_recipients?.partner?.email || '',
        partner_enabled: emailConfig?.role_recipients?.partner?.enabled || false,
        partner_notify_new_booking: emailConfig?.role_recipients?.partner?.triggers?.new_booking !== false,
        partner_notify_confirmed: emailConfig?.role_recipients?.partner?.triggers?.booking_confirmed !== false,
        partner_notify_cancelled: emailConfig?.role_recipients?.partner?.triggers?.booking_cancelled !== false,
        partner_notify_payment: emailConfig?.role_recipients?.partner?.triggers?.payment_received || false,
        partner_notify_driver_signup: emailConfig?.role_recipients?.partner?.triggers?.driver_signup || false,
      });

    } catch (error) {
      setError('An unexpected error occurred while loading settings');
    } finally {
      setLoading(false);
    }
  };

  // ENHANCED: Clear messages with timeout and make them more visible - MODIFIED for persistent error messages
  const clearSectionMessages = (section, delay = 8000, messageType = 'auto') => {
    setTimeout(() => {
      setSectionMessages(prev => {
        const currentMessages = prev?.[section];
        
        // CRITICAL FIX: Only auto-clear success and info messages, keep error messages until manually dismissed
        if (messageType === 'auto' && currentMessages?.error) {
          // Don't clear error messages automatically - they persist until manually dismissed
          return {
            ...prev,
            [section]: {
              success: '',
              info: '',
              error: currentMessages?.error // Keep error message
            }
          };
        }
        
        // Clear all messages for manual dismissal or if no error
        return {
          ...prev,
          [section]: { success: '', error: '', info: '' }
        };
      });
    }, delay);
  };

  // ENHANCED: Set section-specific messages with better visual feedback - MODIFIED for persistent errors
  const setSectionMessage = (section, type, message) => {
    setSectionMessages(prev => ({
      ...prev,
      [section]: {
        ...prev?.[section],
        [type]: message,
        [type === 'success' ? 'error' : type === 'error' ? 'success' : type === 'info' ? 'error' : 'success']: '' // Clear opposite message type
      }
    }));
    
    // CRITICAL FIX: Only auto-clear non-error messages
    if (type !== 'error') {
      clearSectionMessages(section, 8000, 'auto');
    }

    // Add visual feedback with scroll to message
    setTimeout(() => {
      const messageElement = document?.querySelector(`[data-section-message="${section}"]`);
      if (messageElement) {
        messageElement?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Add pulse animation
        messageElement?.classList?.add('animate-pulse');
        setTimeout(() => messageElement?.classList?.remove('animate-pulse'), 2000);
      }
    }, 100);
  };

  const handleSave = async (settingKey, settingValue, section = 'general') => {
    try {
      setSaving(true);
      setSectionMessage(section, 'info', `💾 Saving ${settingKey?.replace('_', ' ')}...`); // Show saving state
      
      let formattedValue;
      
      // Format different types of settings
      switch (settingKey) {
        case 'app_logo_url':
          formattedValue = { 
            url: settingValue,
            alt: "GoShuttle Pro transportation company logo with blue and white design"
          };
          break;
        case 'branding_logo':
          formattedValue = {
            url: settingValue,
            alt: "Company branding logo for admin dashboard and marketing materials"
          };
          break;
        case 'favicon_logo':
          formattedValue = {
            url: settingValue,
            alt: "Website favicon logo for browser tabs and bookmarks"
          };
          break;
        case 'mobile_logo':
          formattedValue = {
            url: settingValue,
            alt: "Mobile app logo optimized for mobile devices and responsive design"
          };
          break;
        case 'app_meta_description': case'seo_meta_description':
          formattedValue = { description: settingValue };
          break;
        case 'og_image':
          formattedValue = {
            url: settingValue,
            alt: "Social media sharing image for GoShuttle Pro transportation service"
          };
          break;
        case 'app_contact_info': case'fleet_capacity_limits':
          try {
            formattedValue = JSON.parse(settingValue);
          } catch (e) {
            setSectionMessage(section, 'error', `❌ Invalid JSON format in ${settingKey}`);
            return;
          }
          break;
        case 'booking_form_email_settings':
        case 'payment_processors_settings':
          formattedValue = settingValue; // Already formatted
          break;
        default:
          formattedValue = settingValue;
      }

      const { error } = await supabase
        ?.from('app_settings')
        ?.upsert({
          setting_key: settingKey,
          setting_value: formattedValue,
          updated_at: new Date()?.toISOString(),
          updated_by: user?.id
        }, {
          onConflict: 'setting_key'
        });

      if (error) {
        setSectionMessage(section, 'error', `❌ Failed to save ${settingKey?.replace('_', ' ')}: ${error?.message}`);
        return;
      }

      // Refresh meta tags and favicon after successful save
      setTimeout(() => {
        refreshMetaTags();
      }, 100);

      setSectionMessage(section, 'success', `✅ ${settingKey?.replace('_', ' ')} saved successfully! Changes are now active.`);
    } catch (error) {
      setSectionMessage(section, 'error', `❌ Failed to save ${settingKey?.replace('_', ' ')}: An unexpected error occurred`);
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = (logoType) => (uploadResult) => {
    if (uploadResult?.signedUrl) {
      setSectionMessage('logo', 'info', `🔄 Processing ${logoType?.replace('_', ' ')} upload...`);
      
      // Update local state
      setSettings(prev => ({
        ...prev,
        [logoType]: uploadResult?.signedUrl
      }));
      
      // Save to database with section-specific feedback
      handleSave(logoType, uploadResult?.signedUrl, 'logo');
    }
  };

  // Email test functionality
  const handleTestEmail = async () => {
    if (!testEmail) {
      alert('Please enter a test email address');
      return;
    }

    try {
      setIsTestingEmail(true);
      console.log('🧪 Testing email configuration...');

      // Import email service
      const { emailService } = await import('../../../services/emailService');
      
      // Test email configuration and send test email
      const testResult = await emailService?.sendTestEmail({
        to: testEmail,
        settings: {
          sender_name: emailSettings?.sender_name,
          sender_email: emailSettings?.sender_email,
        }
      });

      if (testResult?.success) {
        alert(`✅ Test email sent successfully! 
        
Service: ${testResult?.service?.toUpperCase()}
Email ID: ${testResult?.id}
Status: ${testResult?.message}

⚠️ IMPORTANT NOTES:
${!import.meta.env?.VITE_RESEND_API_KEY ? 
  '• No VITE_RESEND_API_KEY found - using Edge Function\n' : '• Using VITE_RESEND_API_KEY from environment\n'
}
• Check your email inbox (including spam/junk folder)
• For production, set up proper Resend API key with verified domain

📧 Sender: ${testResult?.from || 'noreply@goshuttle.ph'}
🕐 Sent: ${new Date()?.toLocaleString()}`);
      } else {
        alert(`❌ Test email failed: ${testResult?.error || testResult?.message}`);
      }

    } catch (error) {
      console.error('Email test error:', error);
      alert(`❌ Email test failed: ${error?.message}

🔧 TROUBLESHOOTING TIPS:
• Ensure Supabase Edge Function is deployed
• Check RESEND_API_KEY in Supabase secrets
• Verify email settings in admin dashboard
• Try different email address (avoid free email providers initially)

📋 Current Configuration:
• API Key Available: ${import.meta.env?.VITE_RESEND_API_KEY ? 'Yes' : 'No'}
• Test Email: ${testEmail}`);
    } finally {
      setIsTestingEmail(false);
    }
  };

  const saveEmailSettings = async () => {
    try {
      setSaving(true);
      setSectionMessage('email', 'info', '💾 Saving email notification settings...');

      // Validate required fields
      if (emailSettings?.booking_notifications_enabled && !emailSettings?.admin_email) {
        setSectionMessage('email', 'error', '❌ Admin email is required when notifications are enabled');
        return;
      }

      // Parse multiple emails from comma-separated string
      const adminEmails = emailSettings?.admin_email
        ? emailSettings?.admin_email?.split(',')?.map(e => e?.trim())?.filter(e => e?.length > 0)
        : [];

      // Convert form data to structured JSON
      const emailConfig = {
        admin_email: adminEmails?.[0] || emailSettings?.admin_email || '',
        admin_emails: adminEmails,
        admin_name: emailSettings?.admin_name,
        booking_notifications_enabled: emailSettings?.booking_notifications_enabled,
        
        subject_template: emailSettings?.booking_subject,
        from_name: emailSettings?.sender_name,
        from_email: emailSettings?.sender_email,
        
        notification_triggers: {
          new_booking: emailSettings?.notify_new_booking,
          booking_confirmed: emailSettings?.notify_booking_confirmed,
          booking_cancelled: emailSettings?.notify_booking_cancelled,
          payment_received: emailSettings?.notify_payment_received
        },

        // Multi-role recipients configuration
        role_recipients: {
          superadmin: {
            email: emailSettings?.superadmin_email,
            enabled: emailSettings?.superadmin_enabled,
            triggers: {
              new_booking: emailSettings?.superadmin_notify_new_booking,
              booking_confirmed: emailSettings?.superadmin_notify_confirmed,
              booking_cancelled: emailSettings?.superadmin_notify_cancelled,
              payment_received: emailSettings?.superadmin_notify_payment,
              driver_signup: emailSettings?.superadmin_notify_driver_signup,
            }
          },
          admin: {
            email: adminEmails?.[0] || emailSettings?.admin_email || '',
            emails: adminEmails,
            enabled: true,
            triggers: {
              new_booking: emailSettings?.admin_notify_new_booking,
              booking_confirmed: emailSettings?.admin_notify_confirmed,
              booking_cancelled: emailSettings?.admin_notify_cancelled,
              payment_received: emailSettings?.admin_notify_payment,
              driver_signup: emailSettings?.admin_notify_driver_signup,
            }
          },
          corporate: {
            email: emailSettings?.corporate_email,
            enabled: emailSettings?.corporate_enabled,
            triggers: {
              new_booking: emailSettings?.corporate_notify_new_booking,
              booking_confirmed: emailSettings?.corporate_notify_confirmed,
              booking_cancelled: emailSettings?.corporate_notify_cancelled,
              payment_received: emailSettings?.corporate_notify_payment,
              driver_signup: emailSettings?.corporate_notify_driver_signup,
            }
          },
          partner: {
            email: emailSettings?.partner_email,
            enabled: emailSettings?.partner_enabled,
            triggers: {
              new_booking: emailSettings?.partner_notify_new_booking,
              booking_confirmed: emailSettings?.partner_notify_confirmed,
              booking_cancelled: emailSettings?.partner_notify_cancelled,
              payment_received: emailSettings?.partner_notify_payment,
              driver_signup: emailSettings?.partner_notify_driver_signup,
            }
          }
        },

        // Legacy compatibility
        to_emails: adminEmails?.length > 0 ? adminEmails : [emailSettings?.admin_email],
        updated_at: new Date()?.toISOString()
      };

      await handleSave('booking_form_email_settings', emailConfig, 'email');
      setSectionMessage('email', 'success', '✅ Email notification settings saved successfully! Your email configuration is now active and will handle all booking notifications.');
    } catch (error) {
      setSectionMessage('email', 'error', '❌ Failed to save email settings: An unexpected error occurred while saving your configuration');
    } finally {
      setSaving(false);
    }
  };

  // ===== RESEND DIRECT TEST =====
  const handleResendTest = async () => {
    const { testTo, testType } = resendTestState;
    if (!testTo) {
      setResendTestState(prev => ({ ...prev, lastResult: { success: false, error: 'Please enter a recipient email address.' } }));
      return;
    }
    setResendTestState(prev => ({ ...prev, isTesting: true, lastResult: null }));
    try {
      const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

      const sampleBooking = {
        booking_id: 'TEST-' + Date.now(),
        customer_name: 'Test Customer',
        customer_email: testTo,
        guest_name: 'Test Guest',
        guest_email: testTo,
        pickup_location: 'NAIA Terminal 3, Pasay City',
        dropoff_location: 'Makati CBD, Ayala Avenue',
        vehicle_type: 'Executive Van',
        vehicle_name: 'Toyota HiAce Executive',
        passenger_count: 4,
        pickup_date: new Date()?.toLocaleDateString('en-PH'),
        pickup_time: '10:00 AM',
        total_cost: '2500.00',
        payment_method: 'GCash',
        special_requirements: 'Airport pickup - flight from Cebu',
        route: 'NAIA T3 → Makati CBD',
      };

      const payload = {
        type: testType,
        to_email: testTo,
        customer_email: testTo,
        admin_email: testTo,
        admin_name: emailSettings?.admin_name || 'GoShuttle Admin',
        test_data: sampleBooking,
        booking_data: sampleBooking,
      };

      // For multi_role_notification, add recipients
      if (testType === 'multi_role_notification') {
        payload.recipients = [
          { email: testTo, role: 'admin', event_type: 'new_booking' },
        ];
      }

      let sentVia = 'edge_function';
      let edgeFailed = false;

      // Try edge function first
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/send-booking-confirmation`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
            'apikey': SUPABASE_ANON_KEY,
          },
          body: JSON.stringify(payload),
        });

        const result = await response?.json();
        if (response?.ok && result?.success !== false && !result?.fallback_required) {
          setResendTestState(prev => ({ ...prev, isTesting: false, lastResult: { success: true, data: result, via: 'edge_function' } }));
          return;
        }
        // Edge function returned success:false or fallback_required — fall through to direct Resend
        edgeFailed = true;
        console.warn('Edge function test failed or requires fallback, using direct Resend:', result?.error);
      } catch (fetchErr) {
        edgeFailed = true;
        console.warn('Edge function fetch error, using direct Resend:', fetchErr?.message);
      }

      // Fallback: direct Resend API
      const { sendEmailViaResend } = await import('../../../utils/resendEmailService');
      const testSubject = `🧪 GoShuttle Pro – Email Test (${testType})`;
      const testHtml = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9fafb;">
          <div style="background-color: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
            <h1 style="color: #059669; text-align: center;">🚀 Test Email Successful!</h1>
            <p style="color: #6b7280;">Your GoShuttle Pro email configuration is working correctly.</p>
            <div style="background-color: #eff6ff; padding: 16px; border-radius: 6px; border-left: 4px solid #3b82f6; margin-top: 16px;">
              <p style="margin: 0; color: #1e40af;"><strong>Template Type:</strong> ${testType}</p>
              <p style="margin: 8px 0 0 0; color: #1e40af;"><strong>Sent To:</strong> ${testTo}</p>
              <p style="margin: 8px 0 0 0; color: #1e40af;"><strong>Sent Via:</strong> Direct Resend API (frontend fallback)</p>
              <p style="margin: 8px 0 0 0; color: #1e40af;"><strong>Time:</strong> ${new Date()?.toLocaleString()}</p>
            </div>
            <p style="color: #9ca3af; font-size: 12px; text-align: center; margin-top: 20px;">GoShuttle Pro - Premium Transportation Service</p>
          </div>
        </div>
      `;
      const directResult = await sendEmailViaResend(testTo, testSubject, testHtml);
      if (directResult?.success) {
        setResendTestState(prev => ({ ...prev, isTesting: false, lastResult: { success: true, data: { message: 'Test email sent via direct Resend API', id: directResult?.id }, via: 'resend_direct' } }));
      } else {
        throw new Error(directResult?.error || 'Direct Resend also failed');
      }
    } catch (err) {
      setResendTestState(prev => ({ ...prev, isTesting: false, lastResult: { success: false, error: err?.message } }));
    }
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    
    // Enhanced save with section-specific feedback
    setSectionMessage('general', 'info', '💾 Saving general application settings...');
    
    // Save general settings including new SEO and social media fields
    const generalSettings = [
      { key: 'app_logo_url', value: settings?.app_logo_url },
      { key: 'app_meta_description', value: settings?.app_meta_description },
      { key: 'app_contact_info', value: settings?.app_contact_info },
      { key: 'fleet_capacity_limits', value: settings?.fleet_capacity_limits },
      { key: 'seo_meta_title', value: settings?.seo_meta_title },
      { key: 'seo_meta_description', value: settings?.seo_meta_description },
      { key: 'seo_keywords', value: settings?.seo_keywords },
      { key: 'og_title', value: settings?.og_title },
      { key: 'og_description', value: settings?.og_description },
      { key: 'og_image', value: settings?.og_image },
      { key: 'og_url', value: settings?.og_url },
      { key: 'company_name', value: settings?.company_name }
    ];

    try {
      // Save general settings first
      for (const setting of generalSettings) {
        if (setting?.value) {
          await handleSave(setting?.key, setting?.value, 'general');
        }
      }

      setSectionMessage('general', 'success', '✅ All general settings saved successfully! Your application configuration has been updated.');
    } catch (error) {
      setSectionMessage('general', 'error', '❌ Failed to save some settings. Please review your input and try again.');
    }
  };

  // ENHANCED: Render section-specific messages with better styling and positioning - MODIFIED for persistent errors
  const renderSectionMessage = (section) => {
    const messages = sectionMessages?.[section];
    if (!messages?.success && !messages?.error && !messages?.info) return null;

    const messageType = messages?.success ? 'success' : messages?.error ? 'error' : 'info';
    const messageContent = messages?.success || messages?.error || messages?.info;

    return (
      <div 
        data-section-message={section}
        className={`p-4 rounded-lg border mb-6 transition-all duration-300 ${
          messageType === 'success' ? 'bg-green-50 border-green-200 shadow-green-100' : 
          messageType === 'error' ? 'bg-red-50 border-red-200 shadow-red-100' :
          'bg-blue-50 border-blue-200 shadow-blue-100'
        } shadow-lg ${messageType === 'error' ? 'ring-2 ring-red-200' : ''}`}
      >
        <div className="flex items-start">
          <Icon 
            name={messageType === 'success' ? "CheckCircle" : messageType === 'error' ? "AlertCircle" : "Info"} 
            className={`mt-0.5 mr-3 ${
              messageType === 'success' ? 'text-green-500' : 
              messageType === 'error' ? 'text-red-500' : 'text-blue-500'
            }`} 
            size={20} 
          />
          <div className="flex-1">
            <p className={`text-sm font-medium ${
              messageType === 'success' ? 'text-green-800' : 
              messageType === 'error' ? 'text-red-800' : 'text-blue-800'
            }`}>
              {messageContent}
            </p>
            {messageType === 'success' && (
              <p className="text-xs text-gray-600 mt-1">
                Changes have been applied to your GoShuttle Pro application.
              </p>
            )}
            {messageType === 'error' && (
              <p className="text-xs text-red-600 mt-1 font-medium">
                ⚠️ This error message will remain visible until you dismiss it manually.
              </p>
            )}
          </div>
          {/* ENHANCED: Manual dismiss button with better styling for errors */}
          <button
            onClick={() => {
              setSectionMessages(prev => {
                const currentMessages = prev?.[section];
                return {
                  ...prev,
                  [section]: {
                    success: '',
                    error: '',
                    info: ''
                  }
                };
              });
              // Also clear any auto-clear timeout for this section
              clearSectionMessages(section, 0, 'manual');
            }}
            className={`ml-2 p-1.5 rounded-full hover:bg-white hover:bg-opacity-50 transition-colors ${
              messageType === 'success' ? 'text-green-400 hover:text-green-600' : 
              messageType === 'error' ? 'text-red-400 hover:text-red-600 bg-red-100 hover:bg-red-200' : 'text-blue-400 hover:text-blue-600'
            } ${messageType === 'error' ? 'ring-1 ring-red-300' : ''}`}
            title={messageType === 'error' ? 'Click to dismiss this error message' : 'Dismiss notification'}
          >
            <Icon name="X" size={16} />
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Icon name="Loader2" className="animate-spin mr-2" size={20} />
        <span className="text-gray-600">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* ENHANCED: Better page header with title and description */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
            <Icon name="Settings" className="text-blue-600" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Application Settings</h1>
            <p className="text-gray-600 mt-1">
              Configure your GoShuttle Pro application branding, email notifications, payment processors, and system settings
            </p>
          </div>
        </div>

        {/* Quick Navigation Pills */}
        <div className="flex flex-wrap gap-2">
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
            <Icon name="Image" size={12} className="mr-1" />
            Logo Management
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <Icon name="Mail" size={12} className="mr-1" />
            Email Notifications
          </span>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
            <Icon name="Search" size={12} className="mr-1" />
            SEO & Meta Tags
          </span>
        </div>
      </div>
      {/* Global Status Messages */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex">
            <Icon name="AlertCircle" className="text-red-400 mt-0.5" size={20} />
            <div className="ml-3">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          </div>
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex">
            <Icon name="CheckCircle" className="text-green-400 mt-0.5" size={20} />
            <div className="ml-3">
              <p className="text-sm text-green-600">{success}</p>
            </div>
          </div>
        </div>
      )}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Logo Upload Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Icon name="Image" className="mr-2" size={20} />
                Logo & Branding Management
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Upload and manage your company logos for different applications (header, favicon, mobile)
              </p>
            </div>
            <div className="text-xs text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
              Auto-saves on upload
            </div>
          </div>
          
          {renderSectionMessage('logo')}
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <div className="flex items-center space-x-2 mb-3">
                <Icon name="Globe" size={16} className="text-gray-500" />
                <h4 className="font-medium text-gray-900">Main Website Logo</h4>
              </div>
              <ImageUpload
                bucketName="mainbucket"
                onUploadSuccess={handleLogoUpload('branding_logo')}
                onUploadError={(error) => setSectionMessage('logo', 'error', '❌ Logo upload failed: ' + error)}
                currentImageUrl={settings?.branding_logo}
                userId={user?.id}
                folder="branding"
                title="Main Logo"
                description="Company logo for headers and branding"
                maxSizeText="10MB"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 mb-3">
                <Icon name="Monitor" size={16} className="text-gray-500" />
                <h4 className="font-medium text-gray-900">Browser Favicon</h4>
              </div>
              <ImageUpload
                bucketName="mainbucket"
                onUploadSuccess={handleLogoUpload('favicon_logo')}
                onUploadError={(error) => setSectionMessage('logo', 'error', '❌ Favicon upload failed: ' + error)}
                currentImageUrl={settings?.favicon_logo}
                userId={user?.id}
                folder="favicon"
                title="Favicon"
                description="Browser tab icon (16x16px recommended)"
                maxSizeText="10MB"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center space-x-2 mb-3">
                <Icon name="Smartphone" size={16} className="text-gray-500" />
                <h4 className="font-medium text-gray-900">Mobile Logo</h4>
              </div>
              <ImageUpload
                bucketName="mainbucket"
                onUploadSuccess={handleLogoUpload('mobile_logo')}
                onUploadError={(error) => setSectionMessage('logo', 'error', '❌ Mobile logo upload failed: ' + error)}
                currentImageUrl={settings?.mobile_logo}
                userId={user?.id}
                folder="mobile"
                title="Mobile Logo"
                description="Mobile-optimized logo for responsive design"
                maxSizeText="10MB"
              />
            </div>
          </div>

          <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start">
              <Icon name="Info" className="text-blue-500 mt-0.5 mr-2" size={16} />
              <div className="text-sm text-blue-700">
                <p className="font-medium mb-1">Logo Upload Tips:</p>
                <ul className="text-xs space-y-1">
                  <li>• Main Logo: PNG/SVG with transparent background (recommended: 200x60px)</li>
                  <li>• Favicon: Square format, 16x16px or 32x32px for best browser compatibility</li>
                  <li>• Mobile Logo: Optimized for small screens, max width 150px</li>
                  <li>• All uploads are automatically saved and applied immediately</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* SEO & Meta Tags Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Icon name="Search" className="mr-2" size={20} />
                SEO & Meta Tags Configuration
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Configure meta tags for better search engine visibility and ranking
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* Company Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon name="Building" size={14} className="inline mr-1" />
                Company Name
              </label>
              <Input
                type="text"
                value={settings?.company_name}
                onChange={(e) => setSettings(prev => ({ ...prev, company_name: e?.target?.value }))}
                placeholder="GoShuttle Pro"
              />
              <p className="text-xs text-gray-500 mt-1">Official company name for branding and legal purposes</p>
            </div>

            {/* SEO Meta Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon name="FileText" size={14} className="inline mr-1" />
                Meta Title (SEO)
              </label>
              <Input
                type="text"
                value={settings?.seo_meta_title}
                onChange={(e) => setSettings(prev => ({ ...prev, seo_meta_title: e?.target?.value }))}
                placeholder="GoShuttle Pro - Premium Transportation Service in Metro Manila"
                maxLength="60"
              />
              <p className="text-xs text-gray-500 mt-1">
                Page title for search engines (50-60 characters recommended)
              </p>
            </div>

            {/* SEO Meta Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon name="AlignLeft" size={14} className="inline mr-1" />
                Meta Description (SEO)
              </label>
              <textarea
                value={settings?.seo_meta_description}
                onChange={(e) => setSettings(prev => ({ ...prev, seo_meta_description: e?.target?.value }))}
                placeholder="Professional shuttle service in Metro Manila. Reliable corporate transportation with modern fleet, experienced drivers, and 24/7 customer support."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
                maxLength="160"
              />
              <p className="text-xs text-gray-500 mt-1">
                Description for search engine results (150-160 characters recommended)
              </p>
            </div>

            {/* SEO Keywords */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon name="Tag" size={14} className="inline mr-1" />
                SEO Keywords
              </label>
              <Input
                type="text"
                value={settings?.seo_keywords}
                onChange={(e) => setSettings(prev => ({ ...prev, seo_keywords: e?.target?.value }))}
                placeholder="shuttle service, transportation, corporate travel, Metro Manila, Philippines"
              />
              <p className="text-xs text-gray-500 mt-1">
                Comma-separated keywords for search engine optimization
              </p>
            </div>
          </div>
        </div>

        {/* Social Media & Open Graph Tags */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Icon name="Share2" className="mr-2" size={20} />
                Social Media Sharing (Open Graph)
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Configure how your website appears when shared on social media platforms
              </p>
            </div>
          </div>
          
          <div className="space-y-6">
            {/* OG Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon name="Hash" size={14} className="inline mr-1" />
                Social Media Title
              </label>
              <Input
                type="text"
                value={settings?.og_title}
                onChange={(e) => setSettings(prev => ({ ...prev, og_title: e?.target?.value }))}
                placeholder="GoShuttle Pro - Your Trusted Transportation Partner"
              />
              <p className="text-xs text-gray-500 mt-1">
                Title that appears when shared on Facebook, Twitter, LinkedIn (leave empty to use Meta Title)
              </p>
            </div>

            {/* OG Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon name="MessageSquare" size={14} className="inline mr-1" />
                Social Media Description
              </label>
              <textarea
                value={settings?.og_description}
                onChange={(e) => setSettings(prev => ({ ...prev, og_description: e?.target?.value }))}
                placeholder="Experience premium transportation service in Metro Manila. Safe, reliable, and professional shuttle services for corporate and individual needs."
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows="3"
              />
              <p className="text-xs text-gray-500 mt-1">
                Description for social media sharing (leave empty to use Meta Description)
              </p>
            </div>

            {/* OG Image Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon name="Camera" size={14} className="inline mr-1" />
                Social Media Image
              </label>
              <ImageUpload
                bucketName="mainbucket"
                onUploadSuccess={(result) => {
                  if (result?.signedUrl) {
                    setSettings(prev => ({ ...prev, og_image: result?.signedUrl }));
                    handleSave('og_image', result?.signedUrl, 'general');
                  }
                }}
                onUploadError={(error) => setSectionMessage('general', 'error', '❌ Social image upload failed: ' + error)}
                currentImageUrl={settings?.og_image}
                userId={user?.id}
                folder="social-media"
                title="Social Media Image"
                description="Image for Facebook, Twitter, LinkedIn sharing (1200x630px recommended)"
                maxSizeText="10MB"
              />
              <p className="text-xs text-gray-500 mt-2">
                Optimal size: 1200x630 pixels for best appearance across platforms
              </p>
            </div>

            {/* Website URL */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon name="Globe" size={14} className="inline mr-1" />
                Website URL
              </label>
              <Input
                type="url"
                value={settings?.og_url}
                onChange={(e) => setSettings(prev => ({ ...prev, og_url: e?.target?.value }))}
                placeholder="https://www.goshuttlepro.com"
              />
              <p className="text-xs text-gray-500 mt-1">
                Your website's primary domain (leave empty to auto-detect)
              </p>
            </div>

            {/* Preview Section */}
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Icon name="Eye" size={14} className="mr-1" />
                Social Media Preview
              </h4>
              <div className="border border-gray-300 rounded-lg overflow-hidden bg-white max-w-md">
                {settings?.og_image && (
                  <img 
                    src={settings?.og_image} 
                    alt="Social media preview" 
                    className="w-full h-32 object-cover"
                  />
                )}
                <div className="p-3">
                  <h5 className="font-medium text-gray-900 text-sm mb-1">
                    {settings?.og_title || settings?.seo_meta_title || 'GoShuttle Pro'}
                  </h5>
                  <p className="text-xs text-gray-600 mb-2">
                    {settings?.og_description || settings?.seo_meta_description || 'Professional transportation service'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {settings?.og_url || window.location?.origin}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ========== EMAIL NOTIFICATION SETTINGS ========== */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Icon name="Mail" className="mr-2" size={20} />
                Email Configuration & SMTP Settings
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Configure your corporate email server for sending booking confirmations and notifications
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmailTemplateModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 rounded-lg hover:bg-sky-100 transition-colors"
              >
                <Icon name="FileText" size={13} />
                Email Templates
              </button>
              <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                <Icon name="Database" size={12} className="mr-1" />
                No Redeploy Needed
              </span>
            </div>
          </div>

          {renderSectionMessage('email')}

          <div className="space-y-6">
            {/* Enable/Disable Notifications */}
            <div className="flex items-center space-x-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <input
                type="checkbox"
                id="booking_notifications_enabled"
                checked={emailSettings?.booking_notifications_enabled}
                onChange={(e) => setEmailSettings(prev => ({ ...prev, booking_notifications_enabled: e?.target?.checked }))}
                className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <label htmlFor="booking_notifications_enabled" className="text-sm font-medium text-blue-900">
                <Icon name="Bell" size={14} className="inline mr-1" />
                Enable automated booking email notifications
              </label>
            </div>

            {emailSettings?.booking_notifications_enabled && (
              <>
                {/* Admin Email Configuration */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-blue-900 mb-3 flex items-center">
                    <Icon name="UserCheck" size={14} className="mr-1" />
                    Admin Email Configuration
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Icon name="AtSign" size={14} className="inline mr-1" />
                        Admin Email Address(es) *
                      </label>
                      <Input
                        type="text"
                        value={emailSettings?.admin_email}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, admin_email: e?.target?.value }))}
                        placeholder="admin@goshuttle.ph, ops@goshuttle.ph"
                        required
                      />
                      <p className="text-xs text-gray-500 mt-1">Where booking notifications will be sent. Separate multiple emails with commas.</p>
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Icon name="User" size={14} className="inline mr-1" />
                        Admin Display Name
                      </label>
                      <Input
                        type="text"
                        value={emailSettings?.admin_name}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, admin_name: e?.target?.value }))}
                        placeholder="GoShuttle Admin"
                      />
                      <p className="text-xs text-gray-500 mt-1">Display name for email recipient</p>
                    </div>
                  </div>
                </div>

                {/* Resend API Integration */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-green-900 mb-3 flex items-center">
                    <Icon name="Send" size={14} className="mr-1" />
                    Resend API Integration
                  </h4>
                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
                    <div className="flex items-start">
                      <Icon name="Key" className="text-yellow-600 mt-0.5 mr-2" size={16} />
                      <div className="flex-1">
                        <p className="text-sm text-yellow-700 mb-2">
                          <strong>Resend API Key Status:</strong> {import.meta.env?.VITE_RESEND_API_KEY ? 
                            <span className="text-green-700 font-semibold">✅ Configured</span> : 
                            <span className="text-red-700 font-semibold">❌ Not Set</span>
                          }
                        </p>
                        {!import.meta.env?.VITE_RESEND_API_KEY && (
                          <p className="text-xs text-yellow-700">
                            ⚠️ Add VITE_RESEND_API_KEY=re_xxxxxxxxxxxx to your .env file
                          </p>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Icon name="Tag" size={14} className="inline mr-1" />
                        Sender Display Name
                      </label>
                      <Input
                        type="text"
                        value={emailSettings?.sender_name}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, sender_name: e?.target?.value }))}
                        placeholder="GoShuttle Pro"
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        <Icon name="Mail" size={14} className="inline mr-1" />
                        From Email Address
                      </label>
                      <Input
                        type="email"
                        value={emailSettings?.sender_email}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, sender_email: e?.target?.value }))}
                        placeholder="noreply@company.com"
                      />
                      <p className="text-xs text-gray-500 mt-1">Domain <strong>goshuttle.ph</strong> is verified — use any address like noreply@goshuttle.ph</p>
                    </div>
                  </div>
                </div>

                {/* Email Subject and Templates */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                    <Icon name="FileText" size={14} className="mr-1" />
                    Email Templates & Subjects
                  </h4>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      <Icon name="MessageSquare" size={14} className="inline mr-1" />
                      Booking Email Subject Template
                    </label>
                    <Input
                      type="text"
                      value={emailSettings?.booking_subject}
                      onChange={(e) => setEmailSettings(prev => ({ ...prev, booking_subject: e?.target?.value }))}
                      placeholder="New Booking Request #{booking_id} - GoShuttle Pro"
                    />
                    <p className="text-xs text-gray-500 mt-1">Use #{"{booking_id}"}, #{"{customer_name}"}, #{"{route}"} as placeholders</p>
                  </div>
                </div>

                {/* Notification Types */}
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
                    <Icon name="Bell" size={14} className="mr-1" />
                    Email Notification Triggers
                  </h4>
                  <p className="text-sm text-gray-600 mb-3">Choose which booking events should send email notifications</p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="notify_new_booking"
                        checked={emailSettings?.notify_new_booking}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, notify_new_booking: e?.target?.checked }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="notify_new_booking" className="text-sm text-gray-700">
                        ✨ New booking submitted
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="notify_booking_confirmed"
                        checked={emailSettings?.notify_booking_confirmed}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, notify_booking_confirmed: e?.target?.checked }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="notify_booking_confirmed" className="text-sm text-gray-700">
                        ✅ Booking confirmed
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="notify_booking_cancelled"
                        checked={emailSettings?.notify_booking_cancelled}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, notify_booking_cancelled: e?.target?.checked }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="notify_booking_cancelled" className="text-sm text-gray-700">
                        ❌ Booking cancelled
                      </label>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="notify_payment_received"
                        checked={emailSettings?.notify_payment_received}
                        onChange={(e) => setEmailSettings(prev => ({ ...prev, notify_payment_received: e?.target?.checked }))}
                        className="h-4 w-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />
                      <label htmlFor="notify_payment_received" className="text-sm text-gray-700">
                        💰 Payment received
                      </label>
                    </div>
                  </div>
                </div>

                {/* ===== MULTI-ROLE RECIPIENT SETTINGS ===== */}
                <div className="bg-white border border-gray-200 rounded-lg p-5">
                  <div className="flex items-center gap-2 mb-1">
                    <Icon name="Shield" size={16} className="text-blue-600" />
                    <h4 className="text-sm font-semibold text-gray-900">GoShuttle Staff Email Recipients</h4>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">Staff Only</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-4">Configure which GoShuttle staff members receive email notifications for bookings and driver/partner sign-ups. Corporate accounts are restricted to booking GoShuttle services only and do not receive admin notifications.</p>

                  {/* Corporate Booking Restriction Notice */}
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4">
                    <Icon name="Building2" size={15} className="text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-amber-800">Corporate Account Policy</p>
                      <p className="text-xs text-amber-700 mt-0.5">Corporate accounts can only book GoShuttle services for their company. They do not receive admin-level notifications. Booking confirmations are sent directly to the corporate customer's email.</p>
                    </div>
                  </div>

                  <div className="space-y-4">

                    {/* SUPERADMIN */}
                    <div className="border border-purple-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-purple-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon name="ShieldCheck" size={16} className="text-purple-600" />
                          <span className="text-sm font-semibold text-purple-900">Super Admin</span>
                          <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">Full Access</span>
                        </div>
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={emailSettings?.superadmin_enabled}
                            onChange={(e) => setEmailSettings(prev => ({ ...prev, superadmin_enabled: e?.target?.checked }))}
                            className="h-4 w-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                          />
                          <span className="text-xs font-medium text-purple-800">{emailSettings?.superadmin_enabled ? 'Enabled' : 'Disabled'}</span>
                        </label>
                      </div>
                      {emailSettings?.superadmin_enabled && (
                        <div className="p-4 space-y-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Super Admin Email Address</label>
                            <input
                              type="email"
                              value={emailSettings?.superadmin_email}
                              onChange={(e) => setEmailSettings(prev => ({ ...prev, superadmin_email: e?.target?.value }))}
                              placeholder="superadmin@goshuttle.ph"
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                            />
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600 mb-2">Receive notifications for:</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {[
                                { key: 'superadmin_notify_new_booking', label: '✨ New Booking' },
                                { key: 'superadmin_notify_confirmed', label: '✅ Booking Confirmed' },
                                { key: 'superadmin_notify_cancelled', label: '❌ Booking Cancelled' },
                                { key: 'superadmin_notify_payment', label: '💰 Payment Received' },
                                { key: 'superadmin_notify_driver_signup', label: '🚗 Driver Sign-up' },
                              ]?.map(item => (
                                <label key={item?.key} className="flex items-center gap-1.5 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={emailSettings?.[item?.key]}
                                    onChange={(e) => setEmailSettings(prev => ({ ...prev, [item?.key]: e?.target?.checked }))}
                                    className="h-3.5 w-3.5 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                                  />
                                  <span className="text-xs text-gray-700">{item?.label}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* ADMIN */}
                    <div className="border border-blue-200 rounded-lg overflow-hidden">
                      <div className="flex items-center justify-between bg-blue-50 px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon name="UserCog" size={16} className="text-blue-600" />
                          <span className="text-sm font-semibold text-blue-900">Admin</span>
                          <span className="text-xs text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">Uses Admin Email above</span>
                        </div>
                        <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded-full">Always Active</span>
                      </div>
                      <div className="p-4 space-y-3">
                        <div className="text-xs text-gray-500 bg-blue-50 rounded p-2">
                          📧 Uses the <strong>Admin Email Address</strong> configured above
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-600 mb-2">Receive notifications for:</p>
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {[
                              { key: 'admin_notify_new_booking', label: '✨ New Booking' },
                              { key: 'admin_notify_confirmed', label: '✅ Booking Confirmed' },
                              { key: 'admin_notify_cancelled', label: '❌ Booking Cancelled' },
                              { key: 'admin_notify_payment', label: '💰 Payment Received' },
                              { key: 'admin_notify_driver_signup', label: '🚗 Driver Sign-up' },
                            ]?.map(item => (
                              <label key={item?.key} className="flex items-center gap-1.5 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={emailSettings?.[item?.key]}
                                  onChange={(e) => setEmailSettings(prev => ({ ...prev, [item?.key]: e?.target?.checked }))}
                                  className="h-3.5 w-3.5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                                />
                                <span className="text-xs text-gray-700">{item?.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>

                  {/* ===== RESEND EMAIL TESTING PANEL ===== */}
                  <div className="mt-6 bg-indigo-50 border border-indigo-200 rounded-lg p-5">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon name="Send" size={16} className="text-indigo-600" />
                      <h4 className="text-sm font-semibold text-indigo-900">Resend Email Testing</h4>
                      <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">Live Test</span>
                    </div>
                    <p className="text-xs text-indigo-700 mb-4">
                      Send a real test email via the Resend edge function to verify your configuration is working. Emails are sent from <strong>noreply@goshuttle.ph</strong> (verified domain).
                    </p>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Recipient Email *</label>
                        <input
                          type="email"
                          value={resendTestState?.testTo}
                          onChange={(e) => setResendTestState(prev => ({ ...prev, testTo: e?.target?.value }))}
                          placeholder="your@email.com"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">Email Template Type</label>
                        <select
                          value={resendTestState?.testType}
                          onChange={(e) => setResendTestState(prev => ({ ...prev, testType: e?.target?.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent bg-white"
                        >
                          <option value="test_email">🧪 Test Email (Config Check)</option>
                          <option value="admin_notification">🔔 Admin Notification (New Booking)</option>
                          <option value="customer_confirmation">✅ Customer Booking Confirmation</option>
                          <option value="guest_booking_confirmation">🎫 Guest Booking Confirmation</option>
                          <option value="multi_role_notification">👥 Multi-Role Notification</option>
                          <option value="welcome_email">🎉 Welcome Email</option>
                          <option value="partner_welcome">🤝 Partner Welcome Email</option>
                        </select>
                      </div>
                    </div>

                    {/* Template descriptions */}
                    <div className="mb-4 p-3 bg-white border border-indigo-100 rounded-lg">
                      <p className="text-xs text-gray-600">
                        {resendTestState?.testType === 'test_email' && '🧪 Sends a simple configuration test email to verify Resend is working.'}
                        {resendTestState?.testType === 'admin_notification' && '🔔 Sends a booking notification email as seen by admins — includes booking details and action required.'}
                        {resendTestState?.testType === 'customer_confirmation' && '✅ Sends the customer booking confirmation email with a "Confirm My Booking" CTA button.'}
                        {resendTestState?.testType === 'guest_booking_confirmation' && '🎫 Sends the guest booking confirmation email (same as customer but for non-registered users).'}
                        {resendTestState?.testType === 'multi_role_notification' && '👥 Sends a multi-role notification email (admin role) with booking details.'}
                        {resendTestState?.testType === 'welcome_email' && '🎉 Sends the welcome email sent to new customers after registration.'}
                        {resendTestState?.testType === 'partner_welcome' && '🤝 Sends the partner/driver welcome email after sign-up submission.'}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleResendTest}
                      disabled={resendTestState?.isTesting || !resendTestState?.testTo}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {resendTestState?.isTesting ? (
                        <>
                          <Icon name="Loader2" size={14} className="animate-spin" />
                          Sending Test Email...
                        </>
                      ) : (
                        <>
                          <Icon name="Send" size={14} />
                          Send Test Email
                        </>
                      )}
                    </button>

                    {/* Test Result */}
                    {resendTestState?.lastResult && (
                      <div className={`mt-4 p-3 rounded-lg border text-sm ${
                        resendTestState?.lastResult?.success
                          ? 'bg-green-50 border-green-200 text-green-800' :'bg-red-50 border-red-200 text-red-800'
                      }`}>
                        {resendTestState?.lastResult?.success ? (
                          <div>
                            <p className="font-semibold flex items-center gap-1">
                              <Icon name="CheckCircle" size={14} />
                              ✅ Email sent successfully!
                            </p>
                            <p className="text-xs mt-1 text-green-700">
                              Email ID: {resendTestState?.lastResult?.data?.email_id || resendTestState?.lastResult?.data?.id || 'N/A'} •
                              Sent to: {resendTestState?.testTo} •
                              Type: {resendTestState?.testType}
                              {resendTestState?.lastResult?.via ? ` • Via: ${resendTestState?.lastResult?.via === 'resend_direct' ? 'Direct Resend API' : 'Edge Function'}` : ''}
                            </p>
                            <p className="text-xs mt-1 text-green-600">Check your inbox (and spam folder) for the test email.</p>
                          </div>
                        ) : (
                          <div>
                            <p className="font-semibold flex items-center gap-1">
                              <Icon name="AlertCircle" size={14} />
                              ❌ Email failed to send
                            </p>
                            <p className="text-xs mt-1 text-red-700 font-mono bg-red-100 p-2 rounded">
                              {resendTestState?.lastResult?.error}
                            </p>
                            <div className="text-xs mt-2 text-red-600 space-y-1">
                              <p className="font-medium">Troubleshooting:</p>
                              <p>• Ensure RESEND_API_KEY is set in Supabase Edge Function secrets (not .env)</p>
                              <p>• Go to Supabase → Edge Functions → send-booking-confirmation → Secrets</p>
                              <p>• Add: RESEND_API_KEY = re_xxxxxxxxxxxx (your Resend API key)</p>
                              <p>• Redeploy the edge function after adding the secret</p>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Resend Setup Info */}
                    <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Icon name="Info" size={14} className="text-amber-600 mt-0.5 flex-shrink-0" />
                        <div className="text-xs text-amber-700 space-y-1">
                          <p className="font-semibold">Resend Setup Requirements:</p>
                          <p>1. Add <code className="bg-amber-100 px-1 rounded">RESEND_API_KEY</code> to Supabase Edge Function secrets (not .env)</p>
                          <p>2. Emails are sent from <code className="bg-amber-100 px-1 rounded">noreply@goshuttle.ph</code> — domain is verified ✅</p>
                          <p>3. You can send to any recipient email address</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Save button for email section */}
                  <div className="flex justify-end mt-5 pt-4 border-t border-gray-200">
                    <Button
                      type="button"
                      onClick={saveEmailSettings}
                      disabled={saving}
                      iconName="Save"
                      iconPosition="left"
                    >
                      {saving ? 'Saving...' : 'Save Email Settings'}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* ========== GENERAL SETTINGS ========== */}

        {/* Email Template Editor Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Icon name="FileText" className="mr-2" size={20} />
                Email Template Editor
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Edit booking confirmation email templates stored in the database — changes take effect immediately without redeploying the edge function.
              </p>
            </div>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
              <Icon name="Database" size={12} className="mr-1" />
              No Redeploy Needed
            </span>
          </div>
          <EmailTemplateEditor />
        </div>

        {/* Branding Section */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Icon name="Palette" className="mr-2" size={20} />
            Additional Branding & Configuration
          </h3>
          
          {renderSectionMessage('general')}
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon name="Link" size={14} className="inline mr-1" />
                Legacy Logo URL (Optional)
              </label>
              <Input
                type="url"
                value={settings?.app_logo_url}
                onChange={(e) => setSettings(prev => ({ ...prev, app_logo_url: e?.target?.value }))}
                placeholder="https://example.com/logo.png"
              />
              <p className="text-xs text-gray-500 mt-1">
                Fallback URL for legacy systems (use logo upload above instead)
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Icon name="FileText" size={14} className="inline mr-1" />
                Legacy SEO Meta Description
              </label>
              <textarea
                value={settings?.app_meta_description}
                onChange={(e) => setSettings(prev => ({ ...prev, app_meta_description: e?.target?.value }))}
                placeholder={`{
  "phone": "+63 2 8888 4567",
  "email": "support@goshuttlepro.com",
  "emergency": "117",
  "address": "Makati City, Metro Manila"
}`}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
                rows="3"
              />
              <p className="text-xs text-gray-500 mt-1">
                This description appears in search engine results (150-160 characters recommended)
              </p>
            </div>
          </div>
        </div>

        {/* Contact Information */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Icon name="Phone" className="mr-2" size={20} />
            Company Contact Information
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Icon name="Code" size={14} className="inline mr-1" />
              Contact Info (JSON format)
            </label>
            <textarea
              value={settings?.app_contact_info}
              onChange={(e) => setSettings(prev => ({ ...prev, app_contact_info: e?.target?.value }))}
              placeholder={`{
  "phone": "+63 2 8888 4567",
  "email": "support@goshuttlepro.com",
  "emergency": "117",
  "address": "Makati City, Metro Manila"
}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              rows="6"
            />
            <p className="text-xs text-gray-500 mt-1">
              Contact information in JSON format (phone, email, emergency numbers, address)
            </p>
          </div>
        </div>

        {/* Fleet Configuration */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <Icon name="Car" className="mr-2" size={20} />
            Fleet Configuration Settings
          </h3>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Icon name="Users" size={14} className="inline mr-1" />
              Vehicle Capacity Limits (JSON format)
            </label>
            <textarea
              value={settings?.fleet_capacity_limits}
              onChange={(e) => setSettings(prev => ({ ...prev, fleet_capacity_limits: e?.target?.value }))}
              placeholder={`{
  "van": 8,
  "shuttle": 15,
  "executive_car": 4,
  "corporate_car": 6
}`}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm"
              rows="6"
            />
            <p className="text-xs text-gray-500 mt-1">
              Maximum passenger capacity for each vehicle type
            </p>
          </div>
        </div>

        {/* ENHANCED: Action Buttons with better feedback */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-gray-900">Save Configuration</h3>
              <p className="text-sm text-gray-600 mt-1">Apply all changes to your GoShuttle Pro application</p>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                type="button"
                variant="outline"
                onClick={loadSettings}
                iconName="RotateCcw"
                iconPosition="left"
                disabled={saving}
              >
                Reset All Settings
              </Button>
              <Button
                type="submit"
                disabled={saving}
                iconName={saving ? "Loader2" : "Save"}
                iconPosition="left"
                className={saving ? "animate-spin" : ""}
              >
                {saving ? 'Saving All Settings...' : 'Save All Settings'}
              </Button>
            </div>
          </div>
        </div>
      </form>
      {/* Email Template Preview Modal */}
      <EmailTemplatePreviewModal
        isOpen={showEmailTemplateModal}
        onClose={() => setShowEmailTemplateModal(false)}
      />
    </div>
  );
};

export default AppSettings;