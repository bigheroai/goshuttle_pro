import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';
import { logAdminAction, AUDIT_ACTIONS } from '../../../utils/adminAuditLogger';
import { useAuth } from '../../../contexts/AuthContext';

const PRIVILEGE_DEFINITIONS = [
  {
    key: 'users',
    label: 'Manage Users',
    icon: 'Users',
    description: 'User account management',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'add', label: 'Add' },
      { key: 'edit', label: 'Edit' },
      { key: 'deactivate', label: 'Deactivate' },
      { key: 'assign_role', label: 'Assign Role' },
    ],
  },
  {
    key: 'drivers',
    label: 'Manage Drivers',
    icon: 'UserCheck',
    description: 'Driver KYC and applications',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'add', label: 'Add' },
      { key: 'edit', label: 'Edit' },
      { key: 'approve', label: 'Approve' },
      { key: 'deactivate', label: 'Deactivate' },
      { key: 'assign', label: 'Assign' },
    ],
  },
  {
    key: 'bookings',
    label: 'Manage Bookings',
    icon: 'Calendar',
    description: 'Booking operations',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'cancel', label: 'Cancel' },
      { key: 'assign', label: 'Assign' },
    ],
  },
  {
    key: 'fleet',
    label: 'Manage Fleet',
    icon: 'Car',
    description: 'Vehicle management',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'add', label: 'Add' },
      { key: 'edit', label: 'Edit' },
      { key: 'deactivate', label: 'Deactivate' },
      { key: 'assign', label: 'Assign' },
    ],
  },
  {
    key: 'partners',
    label: 'Manage Partners',
    icon: 'Handshake',
    description: 'Fleet partner management',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'add', label: 'Add' },
      { key: 'edit', label: 'Edit' },
      { key: 'deactivate', label: 'Deactivate' },
      { key: 'approve', label: 'Approve' },
    ],
  },
  {
    key: 'payments',
    label: 'Manage Payments',
    icon: 'CreditCard',
    description: 'Transactions and disputes',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' },
      { key: 'refund', label: 'Refund' },
      { key: 'dispute', label: 'Dispute' },
    ],
  },
  {
    key: 'settings',
    label: 'Manage Settings',
    icon: 'Settings',
    description: 'App settings, rates, routes',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'edit', label: 'Edit' },
      { key: 'create', label: 'Create' },
      { key: 'deactivate', label: 'Deactivate' },
    ],
  },
  {
    key: 'reports',
    label: 'View Reports',
    icon: 'BarChart2',
    description: 'Revenue charts and analytics',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'export', label: 'Export' },
    ],
  },
  {
    key: 'roles',
    label: 'Manage Roles',
    icon: 'Shield',
    description: 'Staff roles and privileges',
    actions: [
      { key: 'view', label: 'View' },
      { key: 'create', label: 'Create' },
      { key: 'edit', label: 'Edit' },
      { key: 'deactivate', label: 'Deactivate' },
    ],
  },
];

const defaultPrivileges = () =>
  Object.fromEntries(
    PRIVILEGE_DEFINITIONS?.map(p => [
      p?.key,
      Object.fromEntries(p?.actions?.map(a => [a?.key, false])),
    ])
  );

// Migrate old flat boolean privileges to new nested structure
const migratePrivileges = (raw) => {
  if (!raw) return defaultPrivileges();
  const base = defaultPrivileges();
  // If already nested (new format), merge
  const isNested = PRIVILEGE_DEFINITIONS?.some(p => typeof raw?.[p?.key] === 'object' && raw?.[p?.key] !== null);
  if (isNested) {
    return Object.fromEntries(
      PRIVILEGE_DEFINITIONS?.map(p => [
        p?.key,
        { ...base?.[p?.key], ...(raw?.[p?.key] || {}) },
      ])
    );
  }
  // Old flat format: if manage_users was true, enable all actions for users
  const legacyMap = {
    manage_users: 'users',
    manage_drivers: 'drivers',
    manage_bookings: 'bookings',
    manage_fleet: 'fleet',
    manage_partners: 'partners',
    manage_payments: 'payments',
    manage_settings: 'settings',
    view_reports: 'reports',
    manage_roles: 'roles',
  };
  const result = { ...base };
  Object.entries(legacyMap)?.forEach(([oldKey, newKey]) => {
    if (raw?.[oldKey] === true) {
      result[newKey] = Object.fromEntries(
        PRIVILEGE_DEFINITIONS?.find(p => p?.key === newKey)?.actions?.map(a => [a?.key, true]) || []
      );
    }
  });
  return result;
};

const getPrivilegeCount = (privileges) => {
  if (!privileges) return 0;
  return Object.values(privileges)?.reduce((total, actions) => {
    if (typeof actions === 'object' && actions !== null) {
      return total + Object.values(actions)?.filter(Boolean)?.length;
    }
    return total + (actions ? 1 : 0);
  }, 0);
};

const getTotalActions = () =>
  PRIVILEGE_DEFINITIONS?.reduce((t, p) => t + p?.actions?.length, 0);

// Toggle component
const SubPrivilegeToggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    onClick={onChange}
    disabled={disabled}
    className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1 ${
      checked ? 'bg-blue-600' : 'bg-gray-200'
    } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
  >
    <span
      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
        checked ? 'translate-x-4' : 'translate-x-0'
      }`}
    />
  </button>
);

// Module privilege card
const ModulePrivilegeCard = ({ module, values, onChange, disabled }) => {
  const allEnabled = module?.actions?.every(a => !!values?.[a?.key]);
  const anyEnabled = module?.actions?.some(a => !!values?.[a?.key]);

  const handleToggleAll = () => {
    const newVal = !allEnabled;
    const updated = Object.fromEntries(module?.actions?.map(a => [a?.key, newVal]));
    onChange(updated);
  };

  const handleToggleAction = (actionKey) => {
    onChange({ ...values, [actionKey]: !values?.[actionKey] });
  };

  return (
    <div className={`rounded-xl border transition-all ${anyEnabled ? 'border-blue-200 bg-blue-50/40' : 'border-gray-200 bg-white'}`}>
      {/* Module header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${anyEnabled ? 'bg-blue-100' : 'bg-gray-100'}`}>
            <Icon name={module?.icon} size={14} className={anyEnabled ? 'text-blue-600' : 'text-gray-400'} />
          </div>
          <div>
            <p className={`text-sm font-semibold ${anyEnabled ? 'text-blue-800' : 'text-gray-800'}`}>{module?.label}</p>
            <p className="text-xs text-gray-400">{module?.description}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {module?.actions?.filter(a => !!values?.[a?.key])?.length}/{module?.actions?.length}
          </span>
          {!disabled && (
            <button
              type="button"
              onClick={handleToggleAll}
              className={`text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${
                allEnabled
                  ? 'border-blue-300 text-blue-600 hover:bg-blue-100' :'border-gray-300 text-gray-500 hover:bg-gray-100'
              }`}
            >
              {allEnabled ? 'Disable All' : 'Enable All'}
            </button>
          )}
        </div>
      </div>
      {/* Action toggles */}
      <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {module?.actions?.map(action => (
          <div key={action?.key} className="flex items-center justify-between gap-2 bg-white rounded-lg border border-gray-100 px-3 py-2">
            <span className={`text-xs font-medium ${values?.[action?.key] ? 'text-blue-700' : 'text-gray-600'}`}>
              {action?.label}
            </span>
            <SubPrivilegeToggle
              checked={!!values?.[action?.key]}
              onChange={() => handleToggleAction(action?.key)}
              disabled={disabled}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

const RoleManagement = () => {
  const { userProfile } = useAuth();
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRole, setNewRole] = useState({ name: '', description: '', privileges: defaultPrivileges() });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        ?.from('staff_roles')
        ?.select('*')
        ?.order('is_system_role', { ascending: false });
      if (error) throw error;
      setRoles(data || []);
    } catch (err) {
      console.error('Error loading roles:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectRole = (role) => {
    setSelectedRole(role);
    setEditForm({
      name: role?.name,
      description: role?.description || '',
      privileges: migratePrivileges(role?.privileges),
    });
    setError('');
    setSuccessMsg('');
  };

  const handleModuleChange = (moduleKey, updatedActions) => {
    setEditForm(prev => ({
      ...prev,
      privileges: { ...prev?.privileges, [moduleKey]: updatedActions },
    }));
  };

  const handleNewModuleChange = (moduleKey, updatedActions) => {
    setNewRole(prev => ({
      ...prev,
      privileges: { ...prev?.privileges, [moduleKey]: updatedActions },
    }));
  };

  const handleSaveRole = async () => {
    if (!editForm?.name?.trim()) { setError('Role name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const { error } = await supabase
        ?.from('staff_roles')
        ?.update({
          name: editForm?.name?.trim(),
          description: editForm?.description?.trim(),
          privileges: editForm?.privileges,
          updated_at: new Date()?.toISOString(),
        })
        ?.eq('id', selectedRole?.id);
      if (error) throw error;

      await logAdminAction({
        actionType: AUDIT_ACTIONS?.ROLE_UPDATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: selectedRole?.id,
        targetType: 'staff_role',
        targetName: editForm?.name?.trim(),
        description: `Updated staff role: ${editForm?.name?.trim()}`,
        metadata: { role_id: selectedRole?.id, privilege_count: getPrivilegeCount(editForm?.privileges) },
      });

      setSuccessMsg('Role updated successfully.');
      await loadRoles();
      setSelectedRole(null);
    } catch (err) {
      setError(err?.message || 'Failed to save role.');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateRole = async () => {
    if (!newRole?.name?.trim()) { setError('Role name is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const { data: createdRole, error } = await supabase?.from('staff_roles')?.insert({
        name: newRole?.name?.trim()?.toLowerCase()?.replace(/\s+/g, '_'),
        description: newRole?.description?.trim(),
        privileges: newRole?.privileges,
        is_system_role: false,
      })?.select()?.single();
      if (error) throw error;

      await logAdminAction({
        actionType: AUDIT_ACTIONS?.ROLE_CREATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: createdRole?.id,
        targetType: 'staff_role',
        targetName: newRole?.name?.trim(),
        description: `Created new staff role: ${newRole?.name?.trim()}`,
        metadata: { privilege_count: getPrivilegeCount(newRole?.privileges), description: newRole?.description?.trim() },
      });

      setSuccessMsg('Role created successfully.');
      setShowCreateForm(false);
      setNewRole({ name: '', description: '', privileges: defaultPrivileges() });
      await loadRoles();
    } catch (err) {
      setError(err?.message || 'Failed to create role.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRole = async (role) => {
    if (role?.is_system_role) { setError('System roles cannot be deleted.'); return; }
    if (!window.confirm(`Delete role "${role?.name}"? This cannot be undone.`)) return;
    try {
      const { error } = await supabase?.from('staff_roles')?.delete()?.eq('id', role?.id);
      if (error) throw error;

      await logAdminAction({
        actionType: AUDIT_ACTIONS?.ROLE_DELETED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: role?.id,
        targetType: 'staff_role',
        targetName: role?.name,
        description: `Deleted staff role: ${role?.name}`,
        metadata: { role_id: role?.id },
      });

      setSuccessMsg('Role deleted.');
      await loadRoles();
      if (selectedRole?.id === role?.id) setSelectedRole(null);
    } catch (err) {
      setError(err?.message || 'Failed to delete role.');
    }
  };

  const PrivilegesEditor = ({ privileges, onModuleChange, disabled }) => (
    <div className="space-y-3">
      {PRIVILEGE_DEFINITIONS?.map(module => (
        <ModulePrivilegeCard
          key={module?.key}
          module={module}
          values={privileges?.[module?.key] || {}}
          onChange={(updated) => onModuleChange(module?.key, updated)}
          disabled={disabled}
        />
      ))}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Role Management</h2>
          <p className="text-sm text-gray-500">Define staff roles and granular action-level privileges</p>
        </div>
        <Button
          onClick={() => { setShowCreateForm(true); setSelectedRole(null); setError(''); setSuccessMsg(''); }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm"
        >
          <Icon name="Plus" size={14} className="mr-1.5" />
          New Role
        </Button>
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Icon name="CheckCircle" size={16} className="text-green-500" />
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <Icon name="AlertCircle" size={16} className="text-red-500" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Roles List */}
        <div className="lg:col-span-1 space-y-2">
          {loading ? (
            <div className="flex items-center justify-center py-10">
              <Icon name="Loader2" size={20} className="animate-spin text-gray-400" />
            </div>
          ) : (
            roles?.map(role => (
              <div
                key={role?.id}
                onClick={() => { handleSelectRole(role); setShowCreateForm(false); }}
                className={`p-3.5 rounded-lg border cursor-pointer transition-all ${
                  selectedRole?.id === role?.id
                    ? 'border-blue-500 bg-blue-50' :'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-gray-900 capitalize">{role?.name?.replace(/_/g, ' ')}</p>
                      {role?.is_system_role && (
                        <span className="px-1.5 py-0.5 bg-purple-100 text-purple-700 text-xs rounded font-medium">System</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{role?.description}</p>
                    <p className="text-xs text-blue-600 mt-1 font-medium">
                      {getPrivilegeCount(migratePrivileges(role?.privileges))} / {getTotalActions()} actions enabled
                    </p>
                  </div>
                  {!role?.is_system_role && (
                    <button
                      onClick={e => { e?.stopPropagation(); handleDeleteRole(role); }}
                      className="flex-shrink-0 w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-gray-400 hover:text-red-500 transition-colors"
                    >
                      <Icon name="Trash2" size={13} />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Edit / Create Panel */}
        <div className="lg:col-span-2">
          {showCreateForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900">Create New Role</h3>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={newRole?.name}
                  onChange={e => setNewRole(p => ({ ...p, name: e?.target?.value }))}
                  placeholder="e.g. booking_agent"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-400 mt-1">Spaces will be replaced with underscores.</p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={newRole?.description}
                  onChange={e => setNewRole(p => ({ ...p, description: e?.target?.value }))}
                  placeholder="Brief description of this role"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Privileges
                  <span className="ml-2 text-xs font-normal text-gray-400">Toggle individual actions per module</span>
                </label>
                <PrivilegesEditor
                  privileges={newRole?.privileges}
                  onModuleChange={handleNewModuleChange}
                  disabled={false}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setShowCreateForm(false)} className="flex-1" disabled={saving}>Cancel</Button>
                <Button onClick={handleCreateRole} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
                  {saving ? <Icon name="Loader2" size={14} className="animate-spin mr-1" /> : <Icon name="Plus" size={14} className="mr-1" />}
                  Create Role
                </Button>
              </div>
            </div>
          )}

          {selectedRole && editForm && !showCreateForm && (
            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 capitalize">
                  Edit: {selectedRole?.name?.replace(/_/g, ' ')}
                </h3>
                {selectedRole?.is_system_role && (
                  <span className="text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full">System Role</span>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Role Name</label>
                <input
                  type="text"
                  value={editForm?.name}
                  onChange={e => setEditForm(p => ({ ...p, name: e?.target?.value }))}
                  disabled={selectedRole?.is_system_role}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-50 disabled:text-gray-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={editForm?.description}
                  onChange={e => setEditForm(p => ({ ...p, description: e?.target?.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Privileges
                  <span className="ml-2 text-xs font-normal text-gray-400">Toggle individual actions per module</span>
                </label>
                <PrivilegesEditor
                  privileges={editForm?.privileges}
                  onModuleChange={handleModuleChange}
                  disabled={!!selectedRole?.is_system_role}
                />
              </div>
              <div className="flex gap-3 pt-2">
                <Button variant="outline" onClick={() => setSelectedRole(null)} className="flex-1" disabled={saving}>Cancel</Button>
                <Button onClick={handleSaveRole} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white" disabled={saving}>
                  {saving ? <Icon name="Loader2" size={14} className="animate-spin mr-1" /> : <Icon name="Save" size={14} className="mr-1" />}
                  Save Changes
                </Button>
              </div>
            </div>
          )}

          {!selectedRole && !showCreateForm && (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
                <Icon name="Shield" size={22} className="text-gray-400" />
              </div>
              <p className="text-sm font-medium text-gray-700">Select a role to edit its privileges</p>
              <p className="text-xs text-gray-400 mt-1">Or create a new custom role with granular action-level permissions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RoleManagement;
