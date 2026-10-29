/**
 * Driver-specific transactional email service
 * Sends emails via the existing send-booking-confirmation edge function
 * using driver-specific email types.
 */

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

async function callEdgeFunction(type, toEmail, driverData) {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/send-booking-confirmation`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        type,
        to_email: toEmail,
        driver_data: driverData,
        // API keys are NOT passed from the browser — edge functions use server-side secrets
      }),
    });
    const data = await response?.json();
    return data;
  } catch (err) {
    return { success: false, error: err?.message };
  }
}

/**
 * Send a driver signup confirmation email
 */
export async function sendDriverSignupConfirmation(toEmail, driverData) {
  return callEdgeFunction('driver_signup_confirmation', toEmail, driverData);
}

/**
 * Send a pending approval status email
 */
export async function sendDriverPendingApproval(toEmail, driverData) {
  return callEdgeFunction('driver_pending_approval', toEmail, driverData);
}

/**
 * Send a document upload request email
 */
export async function sendDriverDocUploadRequest(toEmail, driverData) {
  return callEdgeFunction('driver_doc_upload_request', toEmail, driverData);
}

/**
 * Send KYC approved email
 */
export async function sendDriverApproved(toEmail, driverData) {
  return callEdgeFunction('kyc_approved', toEmail, driverData);
}

/**
 * Send KYC rejected email
 */
export async function sendDriverRejected(toEmail, driverData) {
  return callEdgeFunction('kyc_rejected', toEmail, driverData);
}

/**
 * Generic driver email dispatcher
 * @param {'kyc_approved'|'kyc_rejected'|'driver_signup_confirmation'|'driver_pending_approval'|'driver_doc_upload_request'} type
 */
export async function sendDriverEmail(type, toEmail, driverData) {
  if (!toEmail) return { success: false, error: 'No email provided' };
  return callEdgeFunction(type, toEmail, driverData);
}
