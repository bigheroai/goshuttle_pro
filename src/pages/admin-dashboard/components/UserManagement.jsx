import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';
import AddUserModal from './AddUserModal';
import AddDriverModal from './AddDriverModal';
import { logAdminAction, AUDIT_ACTIONS } from '../../../utils/adminAuditLogger';
import { useAuth } from '../../../contexts/AuthContext';
import { detectFakeUser } from '../../../services/fakeUserDetectionService';

const UserManagement = ({ users: propUsers, onUpdate }) => {
  const { userProfile } = useAuth();
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(false);
  const [users, setUsers] = useState(propUsers || []);
  const [companies, setCompanies] = useState([]);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showAddDriver, setShowAddDriver] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmAction, setConfirmAction] = useState(null); // { type: 'delete'|'suspend'|'unsuspend', user }
  const [confirmReason, setConfirmReason] = useState('');
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [nameError, setNameError] = useState('');
  // Checkbox selection
  const [selectedIds, setSelectedIds] = useState([]);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(10);
  // AI Detection
  const [aiScanning, setAiScanning] = useState(false);
  const [aiScanResults, setAiScanResults] = useState({});
  const [showFlaggedOnly, setShowFlaggedOnly] = useState(false);
  const [aiScanSummary, setAiScanSummary] = useState(null); // { total, flagged, byLabel, byConfidence, scannedAt }
  const [aiScanProgress, setAiScanProgress] = useState(0); // 0-100
  const [showScanSummary, setShowScanSummary] = useState(false);
  // Batch action
  const [batchAction, setBatchAction] = useState(null); // { type: 'suspend'|'unsuspend'|'delete'|'role', role?: string }
  const [batchReason, setBatchReason] = useState('');
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchRoleValue, setBatchRoleValue] = useState('customer');

  useEffect(() => {
    loadCompanies();
    loadUsers();
  }, []);

  // Sync with prop updates from parent
  useEffect(() => {
    if (propUsers && propUsers?.length > 0) {
      setUsers(propUsers);
    }
  }, [propUsers]);

  const loadUsers = async () => {
    try {
      setFetchLoading(true);
      // Query without companies join to avoid FK ambiguity issues
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select('*')
        ?.order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading users:', error?.code, error?.message, error?.details, error?.hint);
        return;
      }

      if (data) {
        setUsers(data);
        console.log('Loaded users:', data?.length);
      }
    } catch (err) {
      console.error('Unexpected error loading users:', err);
    } finally {
      setFetchLoading(false);
    }
  };

  const loadCompanies = async () => {
    try {
      const { data, error } = await supabase?.from('companies')?.select('*');
      if (data && !error) setCompanies(data);
    } catch (error) {
      console.error('Error loading companies:', error);
    }
  };

  const handleSuccess = (msg) => {
    setSuccessMsg(msg);
    loadUsers();
    onUpdate?.();
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const handleRoleUpdate = async (userId, newRole) => {
    try {
      setLoading(true);
      const targetUser = users?.find(u => u?.id === userId);
      const oldRole = targetUser?.role;
      const { error } = await supabase
        ?.from('user_profiles')
        ?.update({ 
          role: newRole,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', userId);

      if (error) {
        alert('Error updating user role: ' + error?.message);
        return;
      }

      await logAdminAction({
        actionType: AUDIT_ACTIONS?.USER_ROLE_CHANGED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: userId,
        targetType: 'user',
        targetName: targetUser?.full_name || targetUser?.email,
        description: `Changed role from ${oldRole} to ${newRole} for ${targetUser?.full_name || targetUser?.email}`,
        metadata: { old_role: oldRole, new_role: newRole, user_email: targetUser?.email },
      });

      alert('User role updated successfully');
      loadUsers();
      onUpdate?.();
    } catch (error) {
      console.error('Role update error:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCompanyUpdate = async (userId, companyId) => {
    try {
      setLoading(true);
      const { error } = await supabase
        ?.from('user_profiles')
        ?.update({ 
          company_id: companyId || null,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', userId);

      if (error) {
        alert('Error updating user company: ' + error?.message);
        return;
      }

      alert('User company assignment updated successfully');
      loadUsers();
      onUpdate?.();
      setSelectedUser(null);
    } catch (error) {
      console.error('Company update error:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusToggle = async (userId, currentStatus) => {
    try {
      setLoading(true);
      const newStatus = !currentStatus;
      const targetUser = users?.find(u => u?.id === userId);
      
      const { error } = await supabase
        ?.from('user_profiles')
        ?.update({ 
          is_active: newStatus,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', userId);

      if (error) {
        alert('Error updating user status: ' + error?.message);
        return;
      }

      await logAdminAction({
        actionType: newStatus ? AUDIT_ACTIONS?.USER_ACTIVATED : AUDIT_ACTIONS?.USER_DEACTIVATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: userId,
        targetType: 'user',
        targetName: targetUser?.full_name || targetUser?.email,
        description: `${newStatus ? 'Activated' : 'Deactivated'} user account for ${targetUser?.full_name || targetUser?.email}`,
        metadata: { user_email: targetUser?.email, new_status: newStatus ? 'active' : 'inactive' },
      });

      // Send account deactivated email notification
      if (!newStatus && targetUser?.email) {
        try {
          const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
          const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;
          await fetch(`${SUPABASE_URL}/functions/v1/send-booking-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
              'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({
              type: 'account_deactivated',
              to_email: targetUser?.email,
              booking_data: {
                customer_name: targetUser?.full_name || targetUser?.email,
                full_name: targetUser?.full_name || targetUser?.email,
                deactivation_reason: 'Administrative action',
                deactivated_at: new Date()?.toLocaleString('en-PH'),
              },
            }),
          });
        } catch (emailErr) {
          console.warn('Account deactivation email failed (non-blocking):', emailErr?.message);
        }
      }

      loadUsers();
      onUpdate?.();
    } catch (error) {
      console.error('Status update error:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const sendAccountActionEmail = async (action, targetUser, reason) => {
    try {
      const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;
      if (!targetUser?.email) return;
      await fetch(`${SUPABASE_URL}/functions/v1/send-account-action-email`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          action,
          to_email: targetUser?.email,
          user_name: targetUser?.full_name || targetUser?.email,
          reason: reason || '',
          // API keys are NOT passed from the browser — edge functions use server-side secrets
        }),
      });
    } catch (emailErr) {
      console.warn(`Account ${action} email failed (non-blocking):`, emailErr?.message);
    }
  };

  const handleSuspend = async (userId, isSuspended) => {
    try {
      setLoading(true);
      const targetUser = users?.find(u => u?.id === userId);
      const newSuspended = !isSuspended;

      const { error } = await supabase
        ?.from('user_profiles')
        ?.update({
          is_suspended: newSuspended,
          is_active: isSuspended ? true : false,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', userId);

      if (error) {
        alert('Error updating user suspension: ' + error?.message);
        return;
      }

      await logAdminAction({
        actionType: newSuspended ? AUDIT_ACTIONS?.USER_DEACTIVATED : AUDIT_ACTIONS?.USER_ACTIVATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: userId,
        targetType: 'user',
        targetName: targetUser?.full_name || targetUser?.email,
        description: `${newSuspended ? 'Suspended' : 'Unsuspended'} user account for ${targetUser?.full_name || targetUser?.email}`,
        metadata: { user_email: targetUser?.email, action: newSuspended ? 'suspended' : 'unsuspended', reason: confirmReason || '' },
      });

      // Send suspension email notification
      if (newSuspended && targetUser?.email) {
        await sendAccountActionEmail('suspend', targetUser, confirmReason);
      }

      setConfirmAction(null);
      setConfirmReason('');
      loadUsers();
      onUpdate?.();
    } catch (error) {
      console.error('Suspend error:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (userId) => {
    try {
      setLoading(true);
      const targetUser = users?.find(u => u?.id === userId);

      const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;

      // Get current session token to authenticate the edge function call
      const { data: { session } } = await supabase?.auth?.getSession();
      const authToken = session?.access_token || SUPABASE_ANON_KEY;

      const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authToken}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id: userId }),
      });

      const result = await response?.json();

      if (!response?.ok || !result?.success) {
        alert('Error deleting user: ' + (result?.error || 'Unknown error'));
        return;
      }

      await logAdminAction({
        actionType: AUDIT_ACTIONS?.USER_DEACTIVATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: userId,
        targetType: 'user',
        targetName: targetUser?.full_name || targetUser?.email,
        description: `Deleted user account for ${targetUser?.full_name || targetUser?.email}`,
        metadata: { user_email: targetUser?.email, action: 'deleted', reason: confirmReason || '' },
      });

      // Send deletion email notification
      if (targetUser?.email) {
        await sendAccountActionEmail('delete', targetUser, confirmReason);
      }

      setConfirmAction(null);
      setConfirmReason('');
      loadUsers();
      onUpdate?.();
    } catch (error) {
      console.error('Delete error:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleNameUsernameUpdate = async () => {
    if (!editName?.trim()) {
      setNameError('Full name cannot be empty.');
      return;
    }
    setNameError('');
    try {
      setLoading(true);
      const targetUser = users?.find(u => u?.id === selectedUser?.id);
      const updates = {
        full_name: editName?.trim(),
        updated_at: new Date()?.toISOString(),
      };
      if (editUsername?.trim()) {
        updates.username = editUsername?.trim();
      }

      const { error } = await supabase
        ?.from('user_profiles')
        ?.update(updates)
        ?.eq('id', selectedUser?.id);

      if (error) {
        alert('Error updating user: ' + error?.message);
        return;
      }

      await logAdminAction({
        actionType: AUDIT_ACTIONS?.USER_ROLE_CHANGED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: selectedUser?.id,
        targetType: 'user',
        targetName: targetUser?.full_name || targetUser?.email,
        description: `Updated name/username for ${targetUser?.email} — name: "${editName?.trim()}"${editUsername?.trim() ? `, username: "${editUsername?.trim()}"` : ''}`,
        metadata: { old_name: targetUser?.full_name, new_name: editName?.trim(), new_username: editUsername?.trim() },
      });

      setSelectedUser(prev => ({ ...prev, full_name: editName?.trim(), username: editUsername?.trim() || prev?.username }));
      handleSuccess('User name/username updated successfully.');
    } catch (err) {
      console.error('Name/username update error:', err);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleAiScanAll = async () => {
    try {
      setAiScanning(true);
      setAiScanProgress(0);
      setShowScanSummary(false);

      const batchSize = 5;
      const allResults = {};
      const total = users?.length;

      for (let i = 0; i < total; i += batchSize) {
        const batch = users?.slice(i, i + batchSize);
        const batchResults = await Promise.allSettled(
          batch?.map(async (user) => {
            const { detectFakeUser: detect } = await import('../../../services/fakeUserDetectionService');
            const detection = await detect({
              full_name: user?.full_name,
              username: user?.username,
              email: user?.email,
              userId: user?.id,
            });
            return { id: user?.id, detection };
          })
        );

        batchResults?.forEach((res) => {
          if (res?.status === 'fulfilled') {
            allResults[res.value.id] = res?.value?.detection;
          }
        });

        const progress = Math.min(100, Math.round(((i + batchSize) / total) * 100));
        setAiScanProgress(progress);

        if (i + batchSize < total) {
          await new Promise((r) => setTimeout(r, 300));
        }
      }

      setAiScanResults(allResults);

      // Persist flags to Supabase for flagged users
      const flaggedEntries = Object.entries(allResults)?.filter(([, r]) => r?.isSuspicious);
      for (const [userId, detection] of flaggedEntries) {
        await supabase?.from('user_profiles')?.update({
          ai_flagged: true,
          ai_flag_label: detection?.flagLabel,
          ai_flag_reasons: detection?.reasons,
          ai_flag_confidence: detection?.confidence,
          ai_flagged_at: new Date()?.toISOString(),
        })?.eq('id', userId);
      }

      // Clear flags for users that are now clean
      const cleanEntries = Object.entries(allResults)?.filter(([, r]) => !r?.isSuspicious);
      for (const [userId] of cleanEntries) {
        await supabase?.from('user_profiles')?.update({
          ai_flagged: false,
          ai_flag_label: null,
          ai_flag_reasons: null,
          ai_flag_confidence: null,
          ai_flagged_at: null,
        })?.eq('id', userId);
      }

      // Build summary
      const byLabel = {};
      const byConfidence = { high: 0, medium: 0, low: 0 };
      flaggedEntries?.forEach(([, r]) => {
        const lbl = r?.flagLabel || 'Suspicious Account';
        byLabel[lbl] = (byLabel?.[lbl] || 0) + 1;
        if (r?.confidence) byConfidence[r?.confidence] = (byConfidence?.[r?.confidence] || 0) + 1;
      });

      setAiScanSummary({
        total,
        flagged: flaggedEntries?.length,
        clean: cleanEntries?.length,
        byLabel,
        byConfidence,
        scannedAt: new Date(),
      });
      setShowScanSummary(true);

      loadUsers();
      const flaggedCount = flaggedEntries?.length;
      setSuccessMsg(`AI scan complete. ${flaggedCount} suspicious account${flaggedCount !== 1 ? 's' : ''} flagged.`);
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (err) {
      console.error('AI scan error:', err);
    } finally {
      setAiScanning(false);
      setAiScanProgress(0);
    }
  };

  const handleSuspendAllFlagged = async () => {
    const flaggedIds = Object.entries(aiScanResults)
      ?.filter(([, r]) => r?.isSuspicious)
      ?.map(([id]) => id);

    if (flaggedIds?.length === 0) return;
    if (!window.confirm(`Suspend all ${flaggedIds?.length} flagged user${flaggedIds?.length !== 1 ? 's' : ''}?`)) return;

    setLoading(true);
    try {
      for (const userId of flaggedIds) {
        const targetUser = users?.find(u => u?.id === userId);
        if (!targetUser || targetUser?.is_suspended) continue;
        await supabase?.from('user_profiles')?.update({
          is_suspended: true,
          is_active: false,
          updated_at: new Date()?.toISOString(),
        })?.eq('id', userId);
        await sendAccountActionEmail('suspend', targetUser, 'Flagged by AI fraud detection scan');
        await logAdminAction({
          actionType: AUDIT_ACTIONS?.USER_DEACTIVATED,
          actorId: userProfile?.id,
          actorName: userProfile?.full_name,
          actorRole: userProfile?.role,
          targetId: userId,
          targetType: 'user',
          targetName: targetUser?.full_name || targetUser?.email,
          description: `[AI Scan] Suspended flagged user ${targetUser?.full_name || targetUser?.email}`,
          metadata: { reason: 'AI fraud detection', ai_flag: aiScanResults?.[userId]?.flagLabel },
        });
      }
      setSuccessMsg(`${flaggedIds?.length} flagged user${flaggedIds?.length !== 1 ? 's' : ''} suspended.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      loadUsers();
    } catch (err) {
      console.error('Suspend flagged error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAiScanSingle = async (user) => {
    try {
      const detection = await detectFakeUser({
        full_name: user?.full_name,
        username: user?.username,
        email: user?.email,
      });

      setAiScanResults(prev => ({ ...prev, [user?.id]: detection }));

      await supabase?.from('user_profiles')?.update({
        ai_flagged: detection?.isSuspicious,
        ai_flag_label: detection?.isSuspicious ? detection?.flagLabel : null,
        ai_flag_reasons: detection?.isSuspicious ? detection?.reasons : null,
        ai_flag_confidence: detection?.isSuspicious ? detection?.confidence : null,
        ai_flagged_at: detection?.isSuspicious ? new Date()?.toISOString() : null,
      })?.eq('id', user?.id);

      loadUsers();
    } catch (err) {
      console.error('Single AI scan error:', err);
    }
  };

  const handleBatchAction = async () => {
    if (!batchAction || selectedIds?.length === 0) return;
    setBatchLoading(true);
    try {
      const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL;
      const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY;
      const { data: { session } } = await supabase?.auth?.getSession();
      const authToken = session?.access_token || SUPABASE_ANON_KEY;

      for (const userId of selectedIds) {
        const targetUser = users?.find(u => u?.id === userId);
        if (!targetUser) continue;

        if (batchAction?.type === 'delete') {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/delete-user`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${authToken}`,
              'apikey': SUPABASE_ANON_KEY,
            },
            body: JSON.stringify({ user_id: userId }),
          });
          const result = await response?.json();
          if (result?.success) {
            await sendAccountActionEmail('delete', targetUser, batchReason);
            await logAdminAction({
              actionType: AUDIT_ACTIONS?.USER_DEACTIVATED,
              actorId: userProfile?.id,
              actorName: userProfile?.full_name,
              actorRole: userProfile?.role,
              targetId: userId,
              targetType: 'user',
              targetName: targetUser?.full_name || targetUser?.email,
              description: `[Batch] Deleted user ${targetUser?.full_name || targetUser?.email}`,
              metadata: { reason: batchReason, batch: true },
            });
          }
        } else if (batchAction?.type === 'suspend') {
          await supabase?.from('user_profiles')?.update({
            is_suspended: true,
            is_active: false,
            updated_at: new Date()?.toISOString(),
          })?.eq('id', userId);
          await sendAccountActionEmail('suspend', targetUser, batchReason);
          await logAdminAction({
            actionType: AUDIT_ACTIONS?.USER_DEACTIVATED,
            actorId: userProfile?.id,
            actorName: userProfile?.full_name,
            actorRole: userProfile?.role,
            targetId: userId,
            targetType: 'user',
            targetName: targetUser?.full_name || targetUser?.email,
            description: `[Batch] Suspended user ${targetUser?.full_name || targetUser?.email}`,
            metadata: { reason: batchReason, batch: true },
          });
        } else if (batchAction?.type === 'unsuspend') {
          await supabase?.from('user_profiles')?.update({
            is_suspended: false,
            is_active: true,
            updated_at: new Date()?.toISOString(),
          })?.eq('id', userId);
          await logAdminAction({
            actionType: AUDIT_ACTIONS?.USER_ACTIVATED,
            actorId: userProfile?.id,
            actorName: userProfile?.full_name,
            actorRole: userProfile?.role,
            targetId: userId,
            targetType: 'user',
            targetName: targetUser?.full_name || targetUser?.email,
            description: `[Batch] Unsuspended user ${targetUser?.full_name || targetUser?.email}`,
            metadata: { batch: true },
          });
        } else if (batchAction?.type === 'role') {
          await supabase?.from('user_profiles')?.update({
            role: batchRoleValue,
            updated_at: new Date()?.toISOString(),
          })?.eq('id', userId);
          await logAdminAction({
            actionType: AUDIT_ACTIONS?.USER_ROLE_CHANGED,
            actorId: userProfile?.id,
            actorName: userProfile?.full_name,
            actorRole: userProfile?.role,
            targetId: userId,
            targetType: 'user',
            targetName: targetUser?.full_name || targetUser?.email,
            description: `[Batch] Changed role to ${batchRoleValue} for ${targetUser?.full_name || targetUser?.email}`,
            metadata: { new_role: batchRoleValue, batch: true },
          });
        }
      }

      const count = selectedIds?.length;
      const actionLabel = batchAction?.type === 'role' ? `role changed to ${batchRoleValue}` : `${batchAction?.type}ed`;
      setSuccessMsg(`${count} user${count !== 1 ? 's' : ''} ${actionLabel} successfully.`);
      setTimeout(() => setSuccessMsg(''), 5000);
      setSelectedIds([]);
      setBatchAction(null);
      setBatchReason('');
      loadUsers();
      onUpdate?.();
    } catch (err) {
      console.error('Batch action error:', err);
    } finally {
      setBatchLoading(false);
    }
  };

  const getAiFlagBadge = (user) => {
    const scanResult = aiScanResults?.[user?.id];
    const isFlagged = scanResult ? scanResult?.isSuspicious : user?.ai_flagged;
    const label = scanResult ? scanResult?.flagLabel : user?.ai_flag_label;
    const confidence = scanResult ? scanResult?.confidence : user?.ai_flag_confidence;

    if (!isFlagged) return null;

    const confidenceColor = confidence === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
      confidence === 'medium'? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200';

    return (
      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${confidenceColor}`}>
        <Icon name="ShieldAlert" size={10} />
        {label || 'Suspicious'}
      </span>
    );
  };

  const getRoleBadge = (role) => {
    const roleConfig = {
      admin: { color: 'bg-purple-100 text-purple-800', label: 'Admin' },
      staff: { color: 'bg-indigo-100 text-indigo-800', label: 'Staff' },
      driver: { color: 'bg-teal-100 text-teal-800', label: 'Driver' },
      corporate_manager: { color: 'bg-blue-100 text-blue-800', label: 'Corp Manager' },
      employee: { color: 'bg-green-100 text-green-800', label: 'Employee' },
      customer: { color: 'bg-gray-100 text-gray-800', label: 'Customer' }
    };
    const config = roleConfig?.[role] || roleConfig?.customer;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  const getStatusBadge = (isActive, isSuspended) => {
    if (isSuspended) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
          Suspended
        </span>
      );
    }
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
        isActive 
          ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
      }`}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    );
  };

  const filteredUsers = users?.filter(u => {
    const matchesSearch = !searchQuery ||
      u?.full_name?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
      u?.email?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
      u?.role?.toLowerCase()?.includes(searchQuery?.toLowerCase());

    const scanResult = aiScanResults?.[u?.id];
    const isFlagged = scanResult ? scanResult?.isSuspicious : u?.ai_flagged;
    const matchesFlagFilter = !showFlaggedOnly || isFlagged;

    return matchesSearch && matchesFlagFilter;
  });

  // Pagination calculations
  const totalPages = Math.ceil((filteredUsers?.length || 0) / perPage);
  const paginatedUsers = filteredUsers?.slice((currentPage - 1) * perPage, currentPage * perPage);

  // Reset to page 1 when search or perPage changes
  const handleSearchChange = (e) => {
    setSearchQuery(e?.target?.value);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  const handlePerPageChange = (val) => {
    setPerPage(val);
    setCurrentPage(1);
    setSelectedIds([]);
  };

  // Checkbox helpers
  const allOnPageSelected = paginatedUsers?.length > 0 && paginatedUsers?.every(u => selectedIds?.includes(u?.id));
  const someOnPageSelected = paginatedUsers?.some(u => selectedIds?.includes(u?.id)) && !allOnPageSelected;

  const toggleSelectAll = () => {
    if (allOnPageSelected) {
      setSelectedIds(prev => prev?.filter(id => !paginatedUsers?.some(u => u?.id === id)));
    } else {
      const newIds = paginatedUsers?.map(u => u?.id)?.filter(id => !selectedIds?.includes(id));
      setSelectedIds(prev => [...prev, ...newIds]);
    }
  };

  const toggleSelectOne = (id) => {
    setSelectedIds(prev => prev?.includes(id) ? prev?.filter(i => i !== id) : [...prev, id]);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">User Management</h2>
          <p className="text-sm sm:text-base text-gray-600">Manage user accounts, roles, and permissions</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs sm:text-sm text-gray-500 mr-1">
            {filteredUsers?.length || 0} users
          </span>
          <Button
            size="sm"
            onClick={handleAiScanAll}
            disabled={aiScanning || users?.length === 0}
            className="bg-violet-600 hover:bg-violet-700 text-white text-xs sm:text-sm"
          >
            {aiScanning ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5"></div>
                Scanning...
              </>
            ) : (
              <>
                <Icon name="ShieldCheck" size={14} className="mr-1.5" />
                AI Scan All
              </>
            )}
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddDriver(true)}
            className="bg-green-600 hover:bg-green-700 text-white text-xs sm:text-sm"
          >
            <Icon name="Car" size={14} className="mr-1.5" />
            Add Driver
          </Button>
          <Button
            size="sm"
            onClick={() => setShowAddUser(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm"
          >
            <Icon name="UserPlus" size={14} className="mr-1.5" />
            Add User
          </Button>
        </div>
      </div>
      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg">
          <Icon name="CheckCircle" size={16} className="text-green-500" />
          <p className="text-sm text-green-700">{successMsg}</p>
        </div>
      )}
      {/* Search + Per-page filter */}
      <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
        <div className="relative flex-1">
          <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search by name, email, or role..."
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => { setShowFlaggedOnly(f => !f); setCurrentPage(1); }}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition-colors ${
            showFlaggedOnly
              ? 'bg-red-600 text-white border-red-600' :'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
          }`}
        >
          <Icon name="ShieldAlert" size={13} />
          {showFlaggedOnly ? 'All Users' : 'Flagged Only'}
        </button>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-gray-500 whitespace-nowrap">Show:</span>
          {[10, 20, 50]?.map(n => (
            <button
              key={n}
              onClick={() => handlePerPageChange(n)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                perPage === n
                  ? 'bg-blue-600 text-white border-blue-600' :'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>
      {/* Selected count bar + Batch Actions */}
      {selectedIds?.length > 0 && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 px-4 py-3 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-2 text-sm text-blue-700">
            <Icon name="CheckSquare" size={15} className="text-blue-500" />
            <span><strong>{selectedIds?.length}</strong> user{selectedIds?.length !== 1 ? 's' : ''} selected</span>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-blue-500 hover:text-blue-700 underline ml-1"
            >
              Clear
            </button>
          </div>
          <div className="flex items-center gap-2 flex-wrap sm:ml-auto">
            <span className="text-xs text-blue-600 font-medium">Batch:</span>
            <button
              onClick={() => setBatchAction({ type: 'suspend' })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-800 border border-yellow-300 hover:bg-yellow-200 transition-colors"
            >
              <Icon name="PauseCircle" size={12} className="inline mr-1" />
              Suspend
            </button>
            <button
              onClick={() => setBatchAction({ type: 'unsuspend' })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-green-100 text-green-800 border border-green-300 hover:bg-green-200 transition-colors"
            >
              <Icon name="PlayCircle" size={12} className="inline mr-1" />
              Unsuspend
            </button>
            <button
              onClick={() => setBatchAction({ type: 'role' })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-100 text-indigo-800 border border-indigo-300 hover:bg-indigo-200 transition-colors"
            >
              <Icon name="UserCog" size={12} className="inline mr-1" />
              Change Role
            </button>
            <button
              onClick={() => setBatchAction({ type: 'delete' })}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-red-100 text-red-800 border border-red-300 hover:bg-red-200 transition-colors"
            >
              <Icon name="Trash2" size={12} className="inline mr-1" />
              Delete
            </button>
          </div>
        </div>
      )}
      {fetchLoading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
          <p className="text-gray-600 text-sm">Loading users...</p>
        </div>
      )}
      {/* Users Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    ref={el => { if (el) el.indeterminate = someOnPageSelected; }}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  AI Flag
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedUsers?.map((user) => (
                <tr key={user?.id} className={`hover:bg-gray-50 ${selectedIds?.includes(user?.id) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedIds?.includes(user?.id)}
                      onChange={() => toggleSelectOne(user?.id)}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 bg-gray-300 rounded-full flex items-center justify-center">
                          <Icon name="User" size={20} className="text-gray-600" />
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {user?.full_name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {user?.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getRoleBadge(user?.role)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {user?.companies?.name || 'Individual'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(user?.is_active, user?.is_suspended)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-1">
                      {getAiFlagBadge(user) || (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                      <button
                        onClick={() => handleAiScanSingle(user)}
                        title="Re-scan this user"
                        className="ml-1 p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-violet-600 transition-colors"
                      >
                        <Icon name="ScanLine" size={13} />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(user?.created_at)?.toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => { setSelectedUser(user); setEditName(user?.full_name || ''); setEditUsername(user?.username || ''); setNameError(''); }}
                        iconName="Edit"
                      >
                        Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleStatusToggle(user?.id, user?.is_active)}
                        disabled={loading}
                        className={user?.is_active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}
                      >
                        {user?.is_active ? 'Deactivate' : 'Activate'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmAction({ type: user?.is_suspended ? 'unsuspend' : 'suspend', user })}
                        disabled={loading}
                        className={user?.is_suspended ? 'text-green-600 border-green-200 hover:bg-green-50' : 'text-yellow-600 border-yellow-200 hover:bg-yellow-50'}
                      >
                        <Icon name={user?.is_suspended ? 'PlayCircle' : 'PauseCircle'} size={14} className="mr-1" />
                        {user?.is_suspended ? 'Unsuspend' : 'Suspend'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setConfirmAction({ type: 'delete', user })}
                        disabled={loading}
                        className="text-red-600 border-red-200 hover:bg-red-50"
                      >
                        <Icon name="Trash2" size={14} className="mr-1" />
                        Delete
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {/* Users Cards - Mobile */}
      <div className="lg:hidden space-y-4">
        {paginatedUsers?.map((user) => (
          <div key={user?.id} className={`bg-white rounded-lg shadow-sm border p-4 ${selectedIds?.includes(user?.id) ? 'border-blue-400 bg-blue-50' : 'border-gray-200'}`}>
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={selectedIds?.includes(user?.id)}
                  onChange={() => toggleSelectOne(user?.id)}
                  className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 cursor-pointer mt-1"
                />
                <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center">
                  <Icon name="User" size={20} className="text-gray-600" />
                </div>
                <div>
                  <h3 className="text-sm font-medium text-gray-900">{user?.full_name}</h3>
                  <p className="text-xs text-gray-500">{user?.email}</p>
                </div>
              </div>
              {getStatusBadge(user?.is_active, user?.is_suspended)}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs font-medium text-gray-500">Role</p>
                <div className="mt-1">{getRoleBadge(user?.role)}</div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Company</p>
                <p className="text-xs text-gray-900 mt-1">{user?.companies?.name || 'Individual'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">AI Flag</p>
                <div className="mt-1 flex items-center gap-1">
                  {getAiFlagBadge(user) || <span className="text-xs text-gray-400">Clean</span>}
                  <button
                    onClick={() => handleAiScanSingle(user)}
                    title="Re-scan"
                    className="p-0.5 rounded hover:bg-gray-100 text-gray-400 hover:text-violet-600"
                  >
                    <Icon name="ScanLine" size={12} />
                  </button>
                </div>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500">Created</p>
                <p className="text-xs text-gray-900 mt-1">{new Date(user?.created_at)?.toLocaleDateString()}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setSelectedUser(user); setEditName(user?.full_name || ''); setEditUsername(user?.username || ''); setNameError(''); }}
                className="text-xs"
              >
                <Icon name="Edit" size={14} className="mr-1" />
                Edit
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStatusToggle(user?.id, user?.is_active)}
                disabled={loading}
                className={`text-xs ${user?.is_active ? 'text-red-600 border-red-200 hover:bg-red-50' : 'text-green-600 border-green-200 hover:bg-green-50'}`}
              >
                {user?.is_active ? 'Deactivate' : 'Activate'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction({ type: user?.is_suspended ? 'unsuspend' : 'suspend', user })}
                disabled={loading}
                className={`text-xs ${user?.is_suspended ? 'text-green-600 border-green-200 hover:bg-green-50' : 'text-yellow-600 border-yellow-200 hover:bg-yellow-50'}`}
              >
                <Icon name={user?.is_suspended ? 'PlayCircle' : 'PauseCircle'} size={14} className="mr-1" />
                {user?.is_suspended ? 'Unsuspend' : 'Suspend'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmAction({ type: 'delete', user })}
                disabled={loading}
                className="text-xs text-red-600 border-red-200 hover:bg-red-50"
              >
                <Icon name="Trash2" size={14} className="mr-1" />
                Delete
              </Button>
            </div>
          </div>
        ))}
      </div>
      {filteredUsers?.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <Icon name="Users" size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">No users found</h3>
          <p className="text-sm sm:text-base text-gray-600">
            {searchQuery ? 'Try a different search term.' : showFlaggedOnly ? 'No flagged users found.' : 'Users will appear here once they register.'}
          </p>
        </div>
      )}
      {/* Pagination */}
      {filteredUsers?.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <p className="text-xs text-gray-500">
            Showing {((currentPage - 1) * perPage) + 1}–{Math.min(currentPage * perPage, filteredUsers?.length)} of {filteredUsers?.length} users
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="First page"
            >
              <Icon name="ChevronsLeft" size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Previous page"
            >
              <Icon name="ChevronLeft" size={14} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              ?.filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
              ?.reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr?.[idx - 1] > 1) acc?.push('...');
                acc?.push(p);
                return acc;
              }, [])
              ?.map((item, idx) =>
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="px-2 text-gray-400 text-xs">…</span>
                ) : (
                  <button
                    key={item}
                    onClick={() => setCurrentPage(item)}
                    className={`min-w-[30px] h-[30px] rounded border text-xs font-medium transition-colors ${
                      currentPage === item
                        ? 'bg-blue-600 text-white border-blue-600' :'border-gray-300 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {item}
                  </button>
                )
              )
            }
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Next page"
            >
              <Icon name="ChevronRight" size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded border border-gray-300 text-gray-500 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              title="Last page"
            >
              <Icon name="ChevronsRight" size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Batch Action Confirmation Modal */}
      {batchAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                batchAction?.type === 'delete' ? 'bg-red-100' :
                batchAction?.type === 'suspend' ? 'bg-yellow-100' :
                batchAction?.type === 'role' ? 'bg-indigo-100' : 'bg-green-100'
              }`}>
                <Icon
                  name={
                    batchAction?.type === 'delete' ? 'Trash2' :
                    batchAction?.type === 'suspend' ? 'PauseCircle' :
                    batchAction?.type === 'role' ? 'UserCog' : 'PlayCircle'
                  }
                  size={20}
                  className={
                    batchAction?.type === 'delete' ? 'text-red-600' :
                    batchAction?.type === 'suspend' ? 'text-yellow-600' :
                    batchAction?.type === 'role' ? 'text-indigo-600' : 'text-green-600'
                  }
                />
              </div>
              <div>
                <h3 className="text-base font-semibold text-gray-900">
                  Batch {batchAction?.type === 'role' ? 'Role Change' : batchAction?.type?.charAt(0)?.toUpperCase() + batchAction?.type?.slice(1)}
                </h3>
                <p className="text-xs text-gray-500">{selectedIds?.length} user{selectedIds?.length !== 1 ? 's' : ''} selected</p>
              </div>
            </div>

            <p className="text-sm text-gray-600 mb-4">
              {batchAction?.type === 'delete' && (
                <>This will <strong>permanently delete</strong> {selectedIds?.length} user account{selectedIds?.length !== 1 ? 's' : ''}. This action cannot be undone.</>
              )}
              {batchAction?.type === 'suspend' && (
                <>This will <strong>suspend</strong> {selectedIds?.length} user account{selectedIds?.length !== 1 ? 's' : ''}. They will lose access until unsuspended.</>
              )}
              {batchAction?.type === 'unsuspend' && (
                <>This will <strong>restore access</strong> for {selectedIds?.length} suspended user{selectedIds?.length !== 1 ? 's' : ''}.</>
              )}
              {batchAction?.type === 'role' && (
                <>This will change the role for {selectedIds?.length} user{selectedIds?.length !== 1 ? 's' : ''} to:</>
              )}
            </p>

            {batchAction?.type === 'role' && (
              <div className="mb-4">
                <select
                  value={batchRoleValue}
                  onChange={e => setBatchRoleValue(e?.target?.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {['customer', 'employee', 'staff', 'driver', 'corporate_manager', 'admin']?.map(r => (
                    <option key={r} value={r}>{r?.replace(/_/g, ' ')?.replace(/\b\w/g, c => c?.toUpperCase())}</option>
                  ))}
                </select>
              </div>
            )}

            {(batchAction?.type === 'suspend' || batchAction?.type === 'delete') && (
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason <span className="text-gray-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={batchReason}
                  onChange={e => setBatchReason(e?.target?.value)}
                  placeholder="Reason for this batch action..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>
            )}

            <div className="flex space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setBatchAction(null); setBatchReason(''); }}
                className="flex-1"
                disabled={batchLoading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleBatchAction}
                disabled={batchLoading}
                className={`flex-1 ${
                  batchAction?.type === 'delete' ? 'bg-red-600 hover:bg-red-700 text-white' :
                  batchAction?.type === 'suspend' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' :
                  batchAction?.type === 'role'? 'bg-indigo-600 hover:bg-indigo-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {batchLoading ? (
                  <><div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-1.5 inline-block"></div>Processing...</>
                ) : (
                  `Confirm ${batchAction?.type === 'role' ? 'Role Change' : batchAction?.type?.charAt(0)?.toUpperCase() + batchAction?.type?.slice(1)}`
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Action Modal (single user) */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-sm p-6">
            <div className="flex items-center mb-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center mr-3 ${
                confirmAction?.type === 'delete' ? 'bg-red-100' : 'bg-yellow-100'
              }`}>
                <Icon
                  name={confirmAction?.type === 'delete' ? 'Trash2' : confirmAction?.type === 'suspend' ? 'PauseCircle' : 'PlayCircle'}
                  size={20}
                  className={confirmAction?.type === 'delete' ? 'text-red-600' : 'text-yellow-600'}
                />
              </div>
              <h3 className="text-base font-semibold text-gray-900">
                {confirmAction?.type === 'delete' && 'Delete User'}
                {confirmAction?.type === 'suspend' && 'Suspend User'}
                {confirmAction?.type === 'unsuspend' && 'Unsuspend User'}
              </h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">
              {confirmAction?.type === 'delete' && (
                <>Are you sure you want to <strong>permanently delete</strong> <span className="font-medium text-gray-900">{confirmAction?.user?.full_name || confirmAction?.user?.email}</span>? This action cannot be undone.</>
              )}
              {confirmAction?.type === 'suspend' && (
                <>Are you sure you want to <strong>suspend</strong> <span className="font-medium text-gray-900">{confirmAction?.user?.full_name || confirmAction?.user?.email}</span>? They will not be able to access their account.</>
              )}
              {confirmAction?.type === 'unsuspend' && (
                <>Are you sure you want to <strong>unsuspend</strong> <span className="font-medium text-gray-900">{confirmAction?.user?.full_name || confirmAction?.user?.email}</span>? Their account access will be restored.</>
              )}
            </p>
            {(confirmAction?.type === 'suspend' || confirmAction?.type === 'delete') && (
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Reason <span className="text-gray-400 font-normal">(optional — included in email to user)</span>
                </label>
                <textarea
                  value={confirmReason}
                  onChange={e => setConfirmReason(e?.target?.value)}
                  placeholder={confirmAction?.type === 'suspend' ?'e.g. Violation of community guidelines...' :'e.g. Repeated policy violations...'}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
                <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                  <Icon name="Mail" size={11} />
                  An automated email will be sent to {confirmAction?.user?.email} explaining the action and appeal process.
                </p>
              </div>
            )}
            <div className="flex space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => { setConfirmAction(null); setConfirmReason(''); }}
                className="flex-1"
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={() => {
                  if (confirmAction?.type === 'delete') {
                    handleDelete(confirmAction?.user?.id);
                  } else {
                    handleSuspend(confirmAction?.user?.id, confirmAction?.type === 'unsuspend');
                  }
                }}
                disabled={loading}
                className={`flex-1 ${
                  confirmAction?.type === 'delete'
                    ? 'bg-red-600 hover:bg-red-700 text-white'
                    : confirmAction?.type === 'suspend' ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-green-600 hover:bg-green-700 text-white'
                }`}
              >
                {loading ? 'Processing...' : (
                  confirmAction?.type === 'delete' ? 'Delete' :
                  confirmAction?.type === 'suspend' ? 'Suspend' : 'Unsuspend'
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
      {/* Edit User Modal - Mobile Optimized */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Edit User</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedUser(null)}
                  iconName="X"
                />
              </div>

              <div className="space-y-4">
                <div className="text-center">
                  <div className="w-12 h-12 sm:w-16 sm:h-16 bg-gray-300 rounded-full flex items-center justify-center mx-auto mb-3 sm:mb-4">
                    <Icon name="User" size={24} className="sm:w-8 sm:h-8 text-gray-600" />
                  </div>
                  <h4 className="text-sm sm:text-lg font-medium text-gray-900">{selectedUser?.full_name}</h4>
                  <p className="text-xs sm:text-base text-gray-500">{selectedUser?.email}</p>
                  {getAiFlagBadge(selectedUser) && (
                    <div className="mt-2 flex justify-center">
                      {getAiFlagBadge(selectedUser)}
                    </div>
                  )}
                </div>

                {/* Edit Name & Username */}
                <div className="border-t pt-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3 flex items-center gap-1">
                    <Icon name="PenLine" size={14} className="text-orange-500" />
                    Edit Name &amp; Username
                    <span className="ml-1 text-xs text-orange-500 font-normal">(for inappropriate content)</span>
                  </label>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={editName}
                        onChange={e => { setEditName(e?.target?.value); setNameError(''); }}
                        placeholder={selectedUser?.full_name || 'Enter full name'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                      {nameError && <p className="text-xs text-red-500 mt-1">{nameError}</p>}
                    </div>
                    <div>
                      <label className="block text-xs text-gray-600 mb-1">Username</label>
                      <input
                        type="text"
                        value={editUsername}
                        onChange={e => setEditUsername(e?.target?.value)}
                        placeholder={selectedUser?.username || 'Enter username'}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                      />
                    </div>
                    <Button
                      size="sm"
                      onClick={handleNameUsernameUpdate}
                      disabled={loading}
                      className="w-full bg-orange-500 hover:bg-orange-600 text-white text-xs sm:text-sm"
                    >
                      <Icon name="Save" size={14} className="mr-1.5" />
                      {loading ? 'Saving...' : 'Save Name / Username'}
                    </Button>
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3">
                    Change Role
                  </label>
                  <div className="space-y-2">
                    {['customer', 'employee', 'staff', 'driver', 'corporate_manager', 'admin']?.map((role) => (
                      <button
                        key={role}
                        onClick={() => handleRoleUpdate(selectedUser?.id, role)}
                        disabled={loading || selectedUser?.role === role}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors text-xs sm:text-sm ${
                          selectedUser?.role === role
                            ? 'border-primary bg-primary text-white' :'border-gray-200 hover:bg-gray-50 text-gray-900'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="capitalize">{role?.replace(/_/g, ' ')}</span>
                          {selectedUser?.role === role && (
                            <Icon name="Check" size={16} />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="border-t pt-4">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 mb-3">
                    Company Assignment
                  </label>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    <button
                      onClick={() => handleCompanyUpdate(selectedUser?.id, null)}
                      disabled={loading || !selectedUser?.company_id}
                      className={`w-full text-left px-3 py-2 rounded-lg border transition-colors text-xs sm:text-sm ${
                        !selectedUser?.company_id
                          ? 'border-primary bg-primary text-white' :'border-gray-200 hover:bg-gray-50 text-gray-900'
                      } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                    >
                      <div className="flex items-center justify-between">
                        <span>Individual (No Company)</span>
                        {!selectedUser?.company_id && (
                          <Icon name="Check" size={16} />
                        )}
                      </div>
                    </button>
                    
                    {companies?.map((company) => (
                      <button
                        key={company?.id}
                        onClick={() => handleCompanyUpdate(selectedUser?.id, company?.id)}
                        disabled={loading || selectedUser?.company_id === company?.id}
                        className={`w-full text-left px-3 py-2 rounded-lg border transition-colors text-xs sm:text-sm ${
                          selectedUser?.company_id === company?.id
                            ? 'border-primary bg-primary text-white' :'border-gray-200 hover:bg-gray-50 text-gray-900'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="truncate">{company?.name}</span>
                          {selectedUser?.company_id === company?.id && (
                            <Icon name="Check" size={16} />
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedUser(null)}
                    size="sm"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Add User Modal */}
      {showAddUser && (
        <AddUserModal
          onClose={() => setShowAddUser(false)}
          onSuccess={handleSuccess}
        />
      )}
      {/* Add Driver Modal */}
      {showAddDriver && (
        <AddDriverModal
          onClose={() => setShowAddDriver(false)}
          onSuccess={handleSuccess}
        />
      )}

      {/* AI Scan Progress Bar */}
      {aiScanning && (
        <div className="p-4 bg-violet-50 border border-violet-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-violet-600"></div>
              <span className="text-sm font-medium text-violet-700">AI scanning users for fake accounts...</span>
            </div>
            <span className="text-xs text-violet-600 font-medium">{aiScanProgress}%</span>
          </div>
          <div className="w-full bg-violet-200 rounded-full h-2">
            <div
              className="bg-violet-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${aiScanProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-violet-500 mt-1.5">Analyzing email patterns, names, and usernames with AI fraud detection</p>
        </div>
      )}

      {/* AI Scan Summary Panel */}
      {showScanSummary && aiScanSummary && !aiScanning && (
        <div className="bg-white border border-violet-200 rounded-lg shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 bg-violet-50 border-b border-violet-200">
            <div className="flex items-center gap-2">
              <Icon name="ShieldCheck" size={16} className="text-violet-600" />
              <span className="text-sm font-semibold text-violet-800">AI Scan Results</span>
              <span className="text-xs text-violet-500">
                — {aiScanSummary?.scannedAt?.toLocaleTimeString()}
              </span>
            </div>
            <button
              onClick={() => setShowScanSummary(false)}
              className="text-violet-400 hover:text-violet-600 p-1 rounded"
            >
              <Icon name="X" size={14} />
            </button>
          </div>

          <div className="p-4">
            {/* Stats Row */}
            <div className="grid grid-cols-3 gap-3 mb-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-2xl font-bold text-gray-800">{aiScanSummary?.total}</p>
                <p className="text-xs text-gray-500 mt-0.5">Users Scanned</p>
              </div>
              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                <p className="text-2xl font-bold text-red-700">{aiScanSummary?.flagged}</p>
                <p className="text-xs text-red-500 mt-0.5">Flagged</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                <p className="text-2xl font-bold text-green-700">{aiScanSummary?.clean}</p>
                <p className="text-xs text-green-500 mt-0.5">Clean</p>
              </div>
            </div>

            {aiScanSummary?.flagged > 0 ? (
              <div className="space-y-3">
                {/* Breakdown by Label */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Flagged by Category</p>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(aiScanSummary?.byLabel)?.map(([label, count]) => (
                      <span key={label} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 border border-red-200">
                        <Icon name="AlertTriangle" size={10} />
                        {label}: {count}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Breakdown by Confidence */}
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Confidence Breakdown</p>
                  <div className="flex gap-3">
                    {aiScanSummary?.byConfidence?.high > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
                        <span className="text-xs text-gray-600">High: <strong>{aiScanSummary?.byConfidence?.high}</strong></span>
                      </div>
                    )}
                    {aiScanSummary?.byConfidence?.medium > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-orange-400"></div>
                        <span className="text-xs text-gray-600">Medium: <strong>{aiScanSummary?.byConfidence?.medium}</strong></span>
                      </div>
                    )}
                    {aiScanSummary?.byConfidence?.low > 0 && (
                      <div className="flex items-center gap-1.5">
                        <div className="w-2.5 h-2.5 rounded-full bg-yellow-400"></div>
                        <span className="text-xs text-gray-600">Low: <strong>{aiScanSummary?.byConfidence?.low}</strong></span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
                  <button
                    onClick={() => { setShowFlaggedOnly(true); setCurrentPage(1); setShowScanSummary(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-violet-100 text-violet-700 border border-violet-200 hover:bg-violet-200 transition-colors"
                  >
                    <Icon name="Filter" size={12} />
                    View Flagged Users
                  </button>
                  <button
                    onClick={handleSuspendAllFlagged}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-yellow-100 text-yellow-700 border border-yellow-200 hover:bg-yellow-200 transition-colors disabled:opacity-50"
                  >
                    <Icon name="PauseCircle" size={12} />
                    Suspend All Flagged
                  </button>
                  <button
                    onClick={() => { setAiScanResults({}); setAiScanSummary(null); setShowScanSummary(false); setShowFlaggedOnly(false); }}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200 transition-colors"
                  >
                    <Icon name="RotateCcw" size={12} />
                    Clear Results
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 bg-green-50 rounded-lg border border-green-200">
                <Icon name="CheckCircle" size={16} className="text-green-500" />
                <p className="text-sm text-green-700 font-medium">All {aiScanSummary?.total} users passed the AI fraud detection scan. No suspicious accounts found.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;