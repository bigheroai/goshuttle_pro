import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';
import { logAdminAction, AUDIT_ACTIONS } from '../../../utils/adminAuditLogger';
import { useAuth } from '../../../contexts/AuthContext';

const ROLE_OPTIONS = [
  { value: 'customer', label: 'Customer', description: 'Regular booking user' },
  { value: 'staff', label: 'Staff', description: 'Internal Goshuttle staff member' },
  { value: 'corporate_manager', label: 'Corporate Manager', description: 'Manages corporate account bookings' },
  { value: 'employee', label: 'Employee', description: 'Corporate employee' },
  { value: 'admin', label: 'Admin', description: 'Full system administrator' },
];

const AddUserModal = ({ onClose, onSuccess }) => {
  const { userProfile } = useAuth();
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    password: '',
    phone: '',
    role: 'customer',
    staff_role_id: '',
    notes: '',
  });
  const [staffRoles, setStaffRoles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    loadStaffRoles();
  }, []);

  const loadStaffRoles = async () => {
    try {
      const { data } = await supabase?.from('staff_roles')?.select('*')?.order('name');
      setStaffRoles(data || []);
    } catch (err) {
      console.error('Error loading staff roles:', err);
    }
  };

  const handleChange = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setError('');
  };

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form?.full_name?.trim() || !form?.email?.trim() || !form?.password?.trim()) {
      setError('Full name, email, and password are required.');
      return;
    }
    if (form?.password?.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Create auth user via Supabase admin signUp
      const { data: authData, error: authError } = await supabase?.auth?.signUp({
        email: form?.email?.trim()?.toLowerCase(),
        password: form?.password,
        options: {
          data: {
            full_name: form?.full_name?.trim(),
            role: form?.role,
          },
        },
      });

      if (authError) throw new Error(authError.message);
      if (!authData?.user?.id) throw new Error('Failed to create auth user.');

      // Upsert profile with extra fields via RPC
      const { error: profileError } = await supabase?.rpc('admin_create_user_profile', {
        p_user_id: authData?.user?.id,
        p_email: form?.email?.trim()?.toLowerCase(),
        p_full_name: form?.full_name?.trim(),
        p_role: form?.role,
        p_phone: form?.phone?.trim() || null,
        p_staff_role_id: form?.staff_role_id || null,
        p_notes: form?.notes?.trim() || null,
        p_created_by: (await supabase?.auth?.getUser())?.data?.user?.id || null,
      });

      if (profileError) {
        console.warn('Profile upsert warning:', profileError?.message);
      }

      await logAdminAction({
        actionType: AUDIT_ACTIONS?.USER_CREATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: authData?.user?.id,
        targetType: 'user',
        targetName: form?.full_name?.trim(),
        description: `Created new ${form?.role} account for ${form?.full_name?.trim()}`,
        metadata: { email: form?.email?.trim()?.toLowerCase(), role: form?.role, has_staff_role: !!form?.staff_role_id },
      });

      onSuccess?.(`User "${form?.full_name}" created successfully.`);
      onClose?.();
    } catch (err) {
      setError(err?.message || 'Failed to create user. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isStaffRole = ['staff', 'admin']?.includes(form?.role);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-blue-100 rounded-lg flex items-center justify-center">
              <Icon name="UserPlus" size={18} className="text-blue-600" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-gray-900">Add New User</h3>
              <p className="text-xs text-gray-500">Create a user account manually</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 transition-colors"
          >
            <Icon name="X" size={16} className="text-gray-500" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <Icon name="AlertCircle" size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form?.full_name}
              onChange={e => handleChange('full_name', e?.target?.value)}
              placeholder="e.g. Juan dela Cruz"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email Address <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={form?.email}
              onChange={e => handleChange('email', e?.target?.value)}
              placeholder="user@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={form?.password}
                onChange={e => handleChange('password', e?.target?.value)}
                placeholder="Min. 8 characters"
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(p => !p)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                <Icon name={showPassword ? 'EyeOff' : 'Eye'} size={16} />
              </button>
            </div>
          </div>

          {/* Phone */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
            <input
              type="tel"
              value={form?.phone}
              onChange={e => handleChange('phone', e?.target?.value)}
              placeholder="+63 9XX XXX XXXX"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Role */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              User Role <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-1 gap-2">
              {ROLE_OPTIONS?.map(opt => (
                <button
                  key={opt?.value}
                  type="button"
                  onClick={() => handleChange('role', opt?.value)}
                  className={`flex items-center justify-between px-3 py-2.5 rounded-lg border text-left transition-colors ${
                    form?.role === opt?.value
                      ? 'border-blue-500 bg-blue-50' :'border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  <div>
                    <p className={`text-sm font-medium ${form?.role === opt?.value ? 'text-blue-700' : 'text-gray-900'}`}>
                      {opt?.label}
                    </p>
                    <p className="text-xs text-gray-500">{opt?.description}</p>
                  </div>
                  {form?.role === opt?.value && (
                    <Icon name="CheckCircle" size={16} className="text-blue-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Staff Role (only for staff/admin) */}
          {isStaffRole && staffRoles?.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Staff Role / Privileges</label>
              <select
                value={form?.staff_role_id}
                onChange={e => handleChange('staff_role_id', e?.target?.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">— Select a staff role —</option>
                {staffRoles?.map(sr => (
                  <option key={sr?.id} value={sr?.id}>{sr?.name} — {sr?.description}</option>
                ))}
              </select>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Internal Notes</label>
            <textarea
              value={form?.notes}
              onChange={e => handleChange('notes', e?.target?.value)}
              placeholder="Optional notes about this user..."
              rows={2}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              disabled={loading}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <Icon name="Loader2" size={14} className="animate-spin" />
                  Creating...
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Icon name="UserPlus" size={14} />
                  Create User
                </span>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddUserModal;
