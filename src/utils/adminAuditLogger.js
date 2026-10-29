import { supabase } from '../lib/supabase.js';

/**
 * Admin Audit Logger - Logs all admin/staff actions to admin_audit_logs table
 */

export const logAdminAction = async ({
  actionType,
  actorId,
  actorName,
  actorRole,
  targetId = null,
  targetType = null,
  targetName = null,
  description,
  metadata = {},
}) => {
  try {
    if (!actorId || !actionType || !description) return;

    const { error } = await supabase?.from('admin_audit_logs')?.insert([{
      action_type: actionType,
      actor_id: actorId,
      actor_name: actorName || 'Unknown',
      actor_role: actorRole || 'staff',
      target_id: targetId ? String(targetId) : null,
      target_type: targetType,
      target_name: targetName,
      description,
      metadata: metadata || {},
    }]);

    if (error) {
      console.warn('Audit log insert failed:', error?.message);
    }
  } catch (err) {
    // Non-blocking — audit logging should never break the main action
    console.warn('Audit logging error:', err?.message);
  }
};

export const AUDIT_ACTIONS = {
  USER_CREATED: 'user_created',
  USER_UPDATED: 'user_updated',
  USER_DEACTIVATED: 'user_deactivated',
  USER_ACTIVATED: 'user_activated',
  USER_ROLE_CHANGED: 'user_role_changed',
  DRIVER_CREATED: 'driver_created',
  KYC_APPROVED: 'kyc_approved',
  KYC_REJECTED: 'kyc_rejected',
  KYC_UNDER_REVIEW: 'kyc_under_review',
  DISPUTE_CREATED: 'dispute_created',
  DISPUTE_RESOLVED: 'dispute_resolved',
  DISPUTE_REJECTED: 'dispute_rejected',
  BOOKING_CREATED: 'booking_created',
  BOOKING_CANCELLED: 'booking_cancelled',
  BOOKING_ASSIGNED: 'booking_assigned',
  BOOKING_UPDATED: 'booking_updated',
  ROLE_CREATED: 'role_created',
  ROLE_UPDATED: 'role_updated',
  ROLE_DELETED: 'role_deleted',
  STAFF_ROLE_ASSIGNED: 'staff_role_assigned',
  PAYMENT_REFUNDED: 'payment_refunded',
  VEHICLE_CREATED: 'vehicle_created',
  VEHICLE_UPDATED: 'vehicle_updated',
  VEHICLE_DEACTIVATED: 'vehicle_deactivated',
  PARTNER_CREATED: 'partner_created',
  PARTNER_UPDATED: 'partner_updated',
  SETTINGS_UPDATED: 'settings_updated',
  OTHER: 'other',
};
