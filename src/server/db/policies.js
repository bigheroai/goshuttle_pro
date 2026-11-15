import 'server-only';

/*
 * Row access rules for the data API, replacing Supabase row-level security.
 *
 * Admins (admin / super_admin) can read and write every table. For everyone
 * else each table lists SQL conditions per operation; `{t}` is the table's
 * alias and auth.uid() is the caller's profile id (set per transaction).
 * A missing entry means "not allowed".
 *
 *   select/update/delete : row filter applied to the statement
 *   insert               : check every inserted row must pass
 *   updateCheck          : check every updated row must still pass (defaults to `update`)
 *   anon                 : same keys, for signed-out visitors
 *   anonRequireEq        : signed-out reads must filter one of these columns with eq
 *   protect              : columns only admins may set
 */

const ME = 'auth.uid()';
const MY_EMAIL = `(SELECT lower(email) FROM public.user_profiles WHERE id = ${ME})`;
const MY_COMPANY = `(SELECT company_id FROM public.user_profiles WHERE id = ${ME})`;
const IS_MANAGER = `EXISTS (SELECT 1 FROM public.user_profiles WHERE id = ${ME} AND role = 'corporate_manager')`;
const IS_STAFF = `EXISTS (SELECT 1 FROM public.user_profiles WHERE id = ${ME} AND role::text IN ('staff'))`;
const MY_PARTNERS = `(SELECT id FROM public.partners WHERE created_by = ${ME})`;
const MY_DRIVER_PROFILES = `(SELECT id FROM public.driver_profiles WHERE user_id = ${ME})`;
const MY_BOOKINGS = `(SELECT id FROM public.bookings WHERE user_id = ${ME})`;

const own = (col) => `{t}.${col} = ${ME}`;
const sameCompany = `{t}.company_id IS NOT NULL AND {t}.company_id = ${MY_COMPANY}`;
const managerOfCompany = `${IS_MANAGER} AND ${sameCompany}`;
const partnerOwned = `{t}.partner_id IN ${MY_PARTNERS}`;
const rw = (cond) => ({ select: cond, insert: cond, update: cond, delete: cond });
const read = (cond) => ({ select: cond });
const or = (...conds) => conds.map((c) => `(${c})`).join(' OR ');

const SECRET_SETTINGS = `{t}.setting_key NOT ILIKE '%paymongo%' AND {t}.setting_key NOT ILIKE '%payment_processor%' AND {t}.setting_key NOT ILIKE '%secret%' AND {t}.setting_key NOT ILIKE '%api_key%'`;

export const POLICIES = {
  admin_audit_logs: { select: IS_STAFF, insert: or(own('actor_id'), IS_STAFF) },

  app_settings: { select: SECRET_SETTINGS, anon: { select: SECRET_SETTINGS } },

  booking_approvals: {
    ...rw(or(own('maker_id'), own('approver_id'), managerOfCompany)),
    insert: or(own('maker_id'), managerOfCompany),
  },

  bookings: {
    select: or(
      own('user_id'),
      own('approver_id'),
      `${IS_MANAGER} AND {t}.user_id IN (SELECT id FROM public.user_profiles WHERE company_id = ${MY_COMPANY})`,
      `{t}.id IN (SELECT booking_id FROM public.driver_assignments WHERE driver_id IN ${MY_DRIVER_PROFILES})`,
      `{t}.vehicle_id IN (SELECT vehicle_id FROM public.partner_vehicles WHERE partner_id IN ${MY_PARTNERS})`,
    ),
    insert: or(own('user_id'), '{t}.user_id IS NULL'),
    update: or(
      own('user_id'),
      own('approver_id'),
      `${IS_MANAGER} AND {t}.user_id IN (SELECT id FROM public.user_profiles WHERE company_id = ${MY_COMPANY})`,
    ),
    anon: {
      select: '{t}.is_guest_booking = true',
      insert: '{t}.is_guest_booking = true AND {t}.user_id IS NULL AND {t}.guest_email IS NOT NULL',
    },
    anonRequireEq: ['booking_code', 'id'],
  },

  bulk_bookings: rw(sameCompany),

  cms_pages: { select: '{t}.is_published = true', anon: { select: '{t}.is_published = true' } },

  communications: {
    ...rw(or(own('sender_id'), own('recipient_id'))),
    insert: own('sender_id'),
  },

  companies: { select: 'true', update: `${IS_MANAGER} AND {t}.id = ${MY_COMPANY}` },

  company_employees: {
    ...rw(managerOfCompany),
    select: or(managerOfCompany, `lower({t}.employee_email) = ${MY_EMAIL}`),
  },

  corporate_billing_accounts: read(sameCompany),
  corporate_billing_ledger: read(sameCompany),
  corporate_statements: read(sameCompany),
  corporate_pricing: read(or('{t}.is_active = true', sameCompany)),
  corporate_vehicle_assignments: read(or('{t}.is_active = true', sameCompany)),

  dispute_communications: {
    select: `{t}.dispute_id IN (SELECT id FROM public.payment_disputes WHERE booking_id IN ${MY_BOOKINGS} OR lower(customer_email) = ${MY_EMAIL})`,
    insert: `${own('author_id')} AND {t}.dispute_id IN (SELECT id FROM public.payment_disputes WHERE booking_id IN ${MY_BOOKINGS} OR lower(customer_email) = ${MY_EMAIL})`,
  },

  domain_allowlist: read('true'),

  driver_applications: {
    ...rw(own('user_id')),
    select: or(own('user_id'), `{t}.partner_id IS NOT NULL AND ${partnerOwned}`),
    insert: or(own('user_id'), '{t}.user_id IS NULL'),
    delete: undefined,
    anon: { insert: '{t}.user_id IS NULL' },
  },

  driver_assignments: {
    select: or(
      `{t}.driver_id IN ${MY_DRIVER_PROFILES}`,
      `{t}.driver_id IN (SELECT id FROM public.driver_profiles WHERE partner_id IN ${MY_PARTNERS})`,
      `{t}.booking_id IN ${MY_BOOKINGS}`,
    ),
    update: `{t}.driver_id IN ${MY_DRIVER_PROFILES}`,
  },

  driver_performance: read(`{t}.driver_id IN ${MY_DRIVER_PROFILES}`),

  driver_profiles: {
    ...rw(or(own('user_id'), partnerOwned)),
    delete: partnerOwned,
    protect: ['status'],
  },

  driver_schedules: rw(or(own('driver_id'), `{t}.driver_id IN ${MY_DRIVER_PROFILES}`, partnerOwned)),

  driver_signup_requests: {
    select: or(`lower({t}.email) = ${MY_EMAIL}`, partnerOwned),
    insert: 'true',
    update: or(`lower({t}.email) = ${MY_EMAIL}`, partnerOwned),
    anon: { insert: 'true' },
  },

  email_templates: read('true'),

  favorite_bookings: rw(own('user_id')),

  guest_account_invitations: {
    anon: { select: '{t}.expires_at > now() AND {t}.used_at IS NULL' },
    anonRequireEq: ['invitation_token'],
    select: `lower({t}.guest_email) = ${MY_EMAIL}`,
  },

  identity_links: {},

  membership_benefits: { select: 'true', anon: { select: 'true' } },

  partner_payable_accounts: read(or(own('driver_id'), partnerOwned)),
  partner_payable_ledger: read(
    `{t}.payable_account_id IN (SELECT id FROM public.partner_payable_accounts WHERE driver_id = ${ME} OR partner_id IN ${MY_PARTNERS})`,
  ),

  partner_vehicles: {
    ...rw(partnerOwned),
    select: or(own('assigned_driver_id'), partnerOwned),
  },

  partners: {
    select: or('{t}.is_active = true', own('created_by')),
    insert: own('created_by'),
    update: own('created_by'),
    protect: ['is_active', 'partnership_type', 'commission_rate'],
  },

  payment_disputes: {
    select: or(`{t}.booking_id IN ${MY_BOOKINGS}`, `lower({t}.customer_email) = ${MY_EMAIL}`),
    insert: or(`{t}.booking_id IN ${MY_BOOKINGS}`, `lower({t}.customer_email) = ${MY_EMAIL}`),
    protect: ['status', 'resolved_by', 'resolution_notes', 'resolved_at'],
  },

  points_transactions: read(own('user_id')),

  rate_sheets: { select: '{t}.is_active = true', anon: { select: '{t}.is_active = true' } },
  routes: { select: '{t}.is_active = true', anon: { select: '{t}.is_active = true' } },

  staff_roles: read('true'),

  support_messages: {
    select: `{t}.ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = ${ME})`,
    insert: `${own('sender_id')} AND {t}.ticket_id IN (SELECT id FROM public.support_tickets WHERE user_id = ${ME})`,
  },

  support_tickets: { select: own('user_id'), insert: own('user_id'), update: own('user_id'), protect: ['assigned_to'] },

  trip_extensions: {
    select: own('user_id'),
    insert: own('user_id'),
    update: `${own('user_id')} AND {t}.payment_status = 'pending'`,
    updateCheck: own('user_id'),
    protect: ['approved_by', 'approved_at', 'status'],
  },

  user_kyc: { ...rw(own('user_id')), protect: ['status', 'reviewed_by', 'reviewed_at', 'review_notes', 'rejection_reason'] },

  user_preferences: rw(own('user_id')),

  user_profiles: {
    select: or(
      `{t}.id = ${ME}`,
      `${IS_MANAGER} AND ${sameCompany}`,
      `{t}.role::text IN ('driver', 'admin', 'super_admin', 'staff')`,
    ),
    insert: `{t}.id = ${ME}`,
    update: `{t}.id = ${ME}`,
    protect: [
      'role', 'company_id', 'is_active', 'is_suspended', 'loyalty_points', 'points_lifetime',
      'membership_tier', 'tier_updated_at', 'staff_role_id', 'created_by_admin', 'notes', 'kyc_status',
      'ai_flagged', 'ai_flag_label', 'ai_flag_reasons', 'ai_flag_confidence', 'ai_flagged_at',
      'is_trusted', 'trusted_note', 'account_status', 'account_status_note', 'account_status_updated_at',
      'account_status_updated_by', 'email',
    ],
  },

  vehicles: {
    select: 'true',
    insert: own('created_by'),
    update: own('created_by'),
    anon: { select: "{t}.status = 'active'" },
  },
};

/** Database functions callable through the RPC endpoint, and who may call them. */
export const RPC_POLICIES = {
  get_company_contact_details: 'public',
  get_applicable_rate: 'public',
  get_enabled_payment_methods: 'public',
  submit_driver_application: 'public',
  lookup_driver_application_by_email: 'public',
  is_admin_from_auth: 'public',
  is_admin_from_profile: 'public',
  is_admin_user: 'public',
  get_conversation_id: 'authenticated',
  generate_conversation_id: 'authenticated',
  send_in_app_message: 'authenticated',
  send_communication_message: 'authenticated',
  mark_messages_as_read: 'authenticated',
  redeem_points: 'authenticated',
  get_user_managed_entities: 'authenticated',
  get_booking_with_relations: 'admin',
  admin_create_user_profile: 'admin',
  increment_partner_total_paid: 'admin',
  calculate_membership_tier: 'public',
  generate_booking_code: 'public',
};

/** Arguments that must equal the caller's own profile id unless the caller is an admin. */
export const RPC_SELF_ARGS = {
  send_in_app_message: 'p_sender_id',
  send_communication_message: 'p_sender_id',
  mark_messages_as_read: 'p_user_id',
  redeem_points: 'redeem_user_id',
  get_user_managed_entities: 'user_uuid',
  submit_driver_application: 'p_user_id',
};
