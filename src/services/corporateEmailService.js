// Corporate Email Service - Resend Integration
// Handles booking confirmations, team invitations, and monthly expense reports

import { supabase } from '../lib/supabase';

class CorporateEmailService {
  /**
   * Send email via the existing send-email-notification Edge Function
   */
  async _sendEmail({ to, subject, html }) {
    try {
      const resendApiKey = import.meta.env?.VITE_RESEND_API_KEY || '';
      const { data, error } = await supabase?.functions?.invoke('send-email-notification', {
        body: { to, subject, html, emailType: 'corporate', resend_api_key: resendApiKey }
      });

      if (error) throw new Error(error?.message || 'Edge Function error');
      if (!data?.success) throw new Error(data?.error || data?.message || 'Email sending failed');

      return { success: true, id: data?.id };
    } catch (err) {
      console.error('CorporateEmailService._sendEmail error:', err);
      return { success: false, error: err?.message };
    }
  }

  // ─────────────────────────────────────────────
  // 1. BOOKING CONFIRMATION
  // ─────────────────────────────────────────────
  async sendBookingConfirmation({ booking, recipientEmail, recipientName, companyName }) {
    const subject = `Booking Confirmed – ${booking?.bookingCode || booking?.id}`;
    const html = this._bookingConfirmationTemplate({ booking, recipientName, companyName });
    return this._sendEmail({ to: recipientEmail, subject, html });
  }

  _bookingConfirmationTemplate({ booking, recipientName, companyName }) {
    const pickupDate = booking?.pickupDate
      ? new Date(booking.pickupDate)?.toLocaleString('en-PH', {
          weekday: 'long', year: 'numeric', month: 'long',
          day: 'numeric', hour: '2-digit', minute: '2-digit'
        })
      : 'TBD';

    const cost = booking?.totalCost
      ? `₱${parseFloat(booking?.totalCost)?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
      : 'TBD';

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Booking Confirmed</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">GoShuttle Pro</h1>
          <p style="color:#bfdbfe;margin:8px 0 0;font-size:14px;">Corporate Transportation</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px 20px;margin-bottom:28px;display:flex;align-items:center;">
            <span style="font-size:24px;margin-right:12px;">✅</span>
            <div>
              <p style="margin:0;font-size:16px;font-weight:700;color:#15803d;">Booking Confirmed!</p>
              <p style="margin:4px 0 0;font-size:13px;color:#166534;">Reference: <strong>${booking?.bookingCode || booking?.id || 'N/A'}</strong></p>
            </div>
          </div>

          <p style="color:#374151;font-size:15px;margin:0 0 24px;">Hi <strong>${recipientName || 'there'}</strong>,</p>
          <p style="color:#374151;font-size:15px;margin:0 0 24px;">Your ride has been confirmed for <strong>${companyName || 'your company'}</strong>. Here are the details:</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;width:40%;">PICKUP</td>
              <td style="padding:12px 16px;font-size:14px;color:#111827;">${booking?.pickupLocation || 'N/A'}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">DROP-OFF</td>
              <td style="padding:12px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${booking?.dropoffLocation || 'N/A'}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">DATE & TIME</td>
              <td style="padding:12px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${pickupDate}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">VEHICLE</td>
              <td style="padding:12px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${booking?.vehicleName || booking?.vehicles?.name || 'N/A'}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">PASSENGERS</td>
              <td style="padding:12px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${booking?.passengerCount || 1}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">TOTAL COST</td>
              <td style="padding:12px 16px;font-size:15px;font-weight:700;color:#2563eb;border-top:1px solid #e5e7eb;">${cost}</td>
            </tr>
          </table>

          ${booking?.notes ? `<div style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px;padding:14px 16px;margin-bottom:28px;"><p style="margin:0;font-size:13px;color:#92400e;"><strong>Notes:</strong> ${booking?.notes}</p></div>` : ''}

          <p style="color:#6b7280;font-size:13px;margin:0;">Need to make changes? Contact your corporate account manager or visit the GoShuttle Pro portal.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date()?.getFullYear()} GoShuttle Pro · Corporate Transportation Platform</p>
          <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">This is an automated message. Please do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // ─────────────────────────────────────────────
  // 2. TEAM INVITATION
  // ─────────────────────────────────────────────
  async sendTeamInvitation({ inviteeEmail, inviteeName, inviterName, companyName, department, role }) {
    const subject = `You've been invited to join ${companyName || 'GoShuttle Pro Corporate'}`;
    const html = this._teamInvitationTemplate({ inviteeEmail, inviteeName, inviterName, companyName, department, role });
    return this._sendEmail({ to: inviteeEmail, subject, html });
  }

  _teamInvitationTemplate({ inviteeName, inviterName, companyName, department, role }) {
    const signupUrl = 'https://goshuttle6927.builtwithrocket.new/signup';
    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Team Invitation</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#7c3aed,#6d28d9);padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">GoShuttle Pro</h1>
          <p style="color:#ddd6fe;margin:8px 0 0;font-size:14px;">Corporate Transportation</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <div style="text-align:center;margin-bottom:32px;">
            <div style="width:64px;height:64px;background:#ede9fe;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:28px;margin-bottom:16px;">🎉</div>
            <h2 style="margin:0;font-size:22px;font-weight:700;color:#111827;">You're Invited!</h2>
          </div>

          <p style="color:#374151;font-size:15px;margin:0 0 16px;">Hi <strong>${inviteeName || 'there'}</strong>,</p>
          <p style="color:#374151;font-size:15px;margin:0 0 24px;"><strong>${inviterName || 'Your manager'}</strong> has invited you to join the <strong>${companyName || 'company'}</strong> corporate account on GoShuttle Pro.</p>

          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;width:40%;">COMPANY</td>
              <td style="padding:12px 16px;font-size:14px;color:#111827;">${companyName || 'N/A'}</td>
            </tr>
            ${department ? `<tr><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">DEPARTMENT</td><td style="padding:12px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${department}</td></tr>` : ''}
            ${role ? `<tr style="background:#f9fafb;"><td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">ROLE</td><td style="padding:12px 16px;font-size:14px;color:#111827;border-top:1px solid #e5e7eb;">${role}</td></tr>` : ''}
          </table>

          <p style="color:#374151;font-size:14px;margin:0 0 24px;">With GoShuttle Pro Corporate, you can:</p>
          <ul style="color:#374151;font-size:14px;margin:0 0 28px;padding-left:20px;line-height:1.8;">
            <li>Book rides charged directly to your company account</li>
            <li>Track your trips in real-time</li>
            <li>Access your booking history and receipts</li>
          </ul>

          <div style="text-align:center;margin-bottom:28px;">
            <a href="${signupUrl}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#6d28d9);color:#ffffff;text-decoration:none;padding:14px 36px;border-radius:8px;font-size:15px;font-weight:600;">Accept Invitation & Sign Up</a>
          </div>

          <p style="color:#9ca3af;font-size:12px;text-align:center;margin:0;">If you weren't expecting this invitation, you can safely ignore this email.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date()?.getFullYear()} GoShuttle Pro · Corporate Transportation Platform</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }

  // ─────────────────────────────────────────────
  // 3. MONTHLY EXPENSE REPORT
  // ─────────────────────────────────────────────
  async sendMonthlyExpenseReport({ recipientEmail, recipientName, companyName, reportData, month, year }) {
    const monthLabel = new Date(year, month - 1)?.toLocaleString('en-PH', { month: 'long', year: 'numeric' });
    const subject = `Monthly Expense Report – ${monthLabel} | ${companyName || 'GoShuttle Pro'}`;
    const html = this._monthlyReportTemplate({ recipientName, companyName, reportData, monthLabel });
    return this._sendEmail({ to: recipientEmail, subject, html });
  }

  _monthlyReportTemplate({ recipientName, companyName, reportData, monthLabel }) {
    const totalCost = parseFloat(reportData?.totalCost || 0);
    const totalBookings = reportData?.totalBookings || 0;
    const completedBookings = reportData?.completedBookings || 0;
    const cancelledBookings = reportData?.cancelledBookings || 0;
    const completionRate = reportData?.completionRate || 0;
    const avgCost = parseFloat(reportData?.averageCost || 0);

    // Department rows
    const deptRows = Array.isArray(reportData?.departmentCosts) && reportData?.departmentCosts?.length > 0
      ? reportData?.departmentCosts?.sort((a, b) => b?.totalCost - a?.totalCost)?.map(dept => `
            <tr>
              <td style="padding:10px 16px;font-size:13px;color:#374151;border-top:1px solid #e5e7eb;">${dept?.department || 'Unknown'}</td>
              <td style="padding:10px 16px;font-size:13px;color:#374151;border-top:1px solid #e5e7eb;text-align:center;">${dept?.bookingCount || 0}</td>
              <td style="padding:10px 16px;font-size:13px;font-weight:600;color:#2563eb;border-top:1px solid #e5e7eb;text-align:right;">₱${parseFloat(dept?.totalCost || 0)?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
            </tr>`)?.join('')
      : `<tr><td colspan="3" style="padding:16px;text-align:center;color:#9ca3af;font-size:13px;border-top:1px solid #e5e7eb;">No department data available</td></tr>`;

    return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Monthly Expense Report</title></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:'Helvetica Neue',Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#0f766e,#0d9488);padding:32px 40px;text-align:center;">
          <h1 style="color:#ffffff;margin:0;font-size:24px;font-weight:700;">GoShuttle Pro</h1>
          <p style="color:#99f6e4;margin:8px 0 0;font-size:14px;">Monthly Expense Report · ${monthLabel}</p>
        </td></tr>
        <!-- Body -->
        <tr><td style="padding:40px;">
          <p style="color:#374151;font-size:15px;margin:0 0 8px;">Hi <strong>${recipientName || 'there'}</strong>,</p>
          <p style="color:#374151;font-size:15px;margin:0 0 28px;">Here is the transportation expense summary for <strong>${companyName || 'your company'}</strong> for <strong>${monthLabel}</strong>.</p>

          <!-- Summary Cards -->
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
            <tr>
              <td width="50%" style="padding-right:8px;">
                <div style="background:#eff6ff;border:1px solid #bfdbfe;border-radius:8px;padding:16px;text-align:center;">
                  <p style="margin:0;font-size:12px;font-weight:600;color:#3b82f6;text-transform:uppercase;letter-spacing:0.05em;">Total Spend</p>
                  <p style="margin:8px 0 0;font-size:24px;font-weight:800;color:#1d4ed8;">₱${totalCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</p>
                </div>
              </td>
              <td width="50%" style="padding-left:8px;">
                <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;text-align:center;">
                  <p style="margin:0;font-size:12px;font-weight:600;color:#22c55e;text-transform:uppercase;letter-spacing:0.05em;">Total Bookings</p>
                  <p style="margin:8px 0 0;font-size:24px;font-weight:800;color:#15803d;">${totalBookings}</p>
                </div>
              </td>
            </tr>
          </table>

          <!-- Stats Row -->
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;">Completed Rides</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#15803d;text-align:right;">${completedBookings}</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Cancelled Rides</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#dc2626;text-align:right;border-top:1px solid #e5e7eb;">${cancelledBookings}</td>
            </tr>
            <tr style="background:#f9fafb;">
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Completion Rate</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#2563eb;text-align:right;border-top:1px solid #e5e7eb;">${completionRate}%</td>
            </tr>
            <tr>
              <td style="padding:12px 16px;font-size:13px;font-weight:600;color:#6b7280;border-top:1px solid #e5e7eb;">Average Cost per Ride</td>
              <td style="padding:12px 16px;font-size:14px;font-weight:700;color:#374151;text-align:right;border-top:1px solid #e5e7eb;">₱${avgCost?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}</td>
            </tr>
          </table>

          <!-- Department Breakdown -->
          <h3 style="margin:0 0 12px;font-size:15px;font-weight:700;color:#111827;">Cost by Department</h3>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:8px;overflow:hidden;margin-bottom:28px;">
            <tr style="background:#f9fafb;">
              <th style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-align:left;text-transform:uppercase;">Department</th>
              <th style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-align:center;text-transform:uppercase;">Bookings</th>
              <th style="padding:10px 16px;font-size:12px;font-weight:600;color:#6b7280;text-align:right;text-transform:uppercase;">Total Cost</th>
            </tr>
            ${deptRows}
          </table>

          <p style="color:#6b7280;font-size:13px;margin:0;">For a full breakdown, log in to your GoShuttle Pro Corporate Dashboard and generate a detailed report.</p>
        </td></tr>
        <!-- Footer -->
        <tr><td style="background:#f9fafb;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">© ${new Date()?.getFullYear()} GoShuttle Pro · Corporate Transportation Platform</p>
          <p style="margin:4px 0 0;font-size:12px;color:#9ca3af;">This report was automatically generated. Please do not reply.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
  }
}

const corporateEmailService = new CorporateEmailService();
export default corporateEmailService;
