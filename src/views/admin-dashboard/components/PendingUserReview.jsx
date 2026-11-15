import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';

import Icon from '../../../components/AppIcon';
import { useAuth } from '../../../contexts/AuthContext';
import { logAdminAction, AUDIT_ACTIONS } from '../../../utils/adminAuditLogger';
import { detectFakeUser } from '../../../services/fakeUserDetectionService';
import { AlertTriangle, CheckCircle, XCircle, Clock, RefreshCw, Search, Filter, ChevronDown, ChevronUp, Shield, User, Flag } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  approved: 'bg-green-100 text-green-800 border-green-200',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  flagged: 'bg-orange-100 text-orange-800 border-orange-200',
};

const STATUS_ICONS = {
  pending: Clock,
  approved: CheckCircle,
  rejected: XCircle,
  flagged: AlertTriangle,
};

const PendingUserReview = () => {
  const { userProfile } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [actionLoading, setActionLoading] = useState({});
  const [bulkLoading, setBulkLoading] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all'); // all | pending | flagged | rejected
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [expandedUser, setExpandedUser] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});
  const [aiScanLoading, setAiScanLoading] = useState({});
  const [aiResults, setAiResults] = useState({});
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [stats, setStats] = useState({ pending: 0, flagged: 0, rejected: 0, total: 0 });

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const showError = (msg) => {
    setErrorMsg(msg);
    setTimeout(() => setErrorMsg(''), 5000);
  };

  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        ?.from('user_profiles')
        ?.select('*')
        ?.order(sortField, { ascending: sortDir === 'asc' });

      if (error) {
        showError('Failed to load users: ' + error?.message);
        return;
      }

      const allUsers = data || [];

      // Compute stats
      const pending = allUsers?.filter(u => u?.account_status === 'pending' || (!u?.account_status && !u?.is_active))?.length;
      const flagged = allUsers?.filter(u => u?.ai_flagged === true)?.length;
      const rejected = allUsers?.filter(u => u?.account_status === 'rejected')?.length;
      setStats({ pending, flagged, rejected, total: allUsers?.length });
      setUsers(allUsers);
    } catch (err) {
      showError('Unexpected error loading users');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDir]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const filteredUsers = users?.filter(u => {
    const matchesSearch =
      !searchQuery ||
      u?.full_name?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
      u?.email?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
      u?.username?.toLowerCase()?.includes(searchQuery?.toLowerCase());

    const isPending = u?.account_status === 'pending' || (!u?.account_status && !u?.is_active);
    const isFlagged = u?.ai_flagged === true;
    const isRejected = u?.account_status === 'rejected';

    if (filterStatus === 'pending') return matchesSearch && isPending;
    if (filterStatus === 'flagged') return matchesSearch && isFlagged;
    if (filterStatus === 'rejected') return matchesSearch && isRejected;
    if (filterStatus === 'all_review') return matchesSearch && (isPending || isFlagged || isRejected);
    return matchesSearch;
  });

  const handleAction = async (userId, action, note) => {
    try {
      setActionLoading(prev => ({ ...prev, [userId]: action }));
      const targetUser = users?.find(u => u?.id === userId);

      let updateData = {
        account_status_updated_at: new Date()?.toISOString(),
        account_status_updated_by: userProfile?.id,
        account_status_note: note || null,
      };

      if (action === 'approve') {
        updateData.account_status = 'approved';
        updateData.is_active = true;
        updateData.is_suspended = false;
      } else if (action === 'reject') {
        updateData.account_status = 'rejected';
        updateData.is_active = false;
      } else if (action === 'request_verification') {
        updateData.account_status = 'pending';
        updateData.verification_requested_at = new Date()?.toISOString();
      }

      const { error } = await supabase
        ?.from('user_profiles')
        ?.update(updateData)
        ?.eq('id', userId);

      if (error) {
        showError('Action failed: ' + error?.message);
        return;
      }

      await logAdminAction({
        actionType: action === 'approve' ? AUDIT_ACTIONS?.USER_ACTIVATED : AUDIT_ACTIONS?.USER_DEACTIVATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: userId,
        targetType: 'user',
        targetName: targetUser?.full_name || targetUser?.email,
        description: `Admin ${action} user account for ${targetUser?.full_name || targetUser?.email}${note ? ': ' + note : ''}`,
        metadata: { action, user_email: targetUser?.email, note },
      });

      showSuccess(`User ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged for verification'} successfully`);
      setNoteInputs(prev => ({ ...prev, [userId]: '' }));
      setExpandedUser(null);
      await loadUsers();
    } catch (err) {
      showError('Unexpected error: ' + err?.message);
    } finally {
      setActionLoading(prev => ({ ...prev, [userId]: null }));
    }
  };

  const handleBulkAction = async (action) => {
    if (!selectedIds?.length) return;
    try {
      setBulkLoading(true);
      let updateData = {
        account_status_updated_at: new Date()?.toISOString(),
        account_status_updated_by: userProfile?.id,
      };

      if (action === 'approve') {
        updateData.account_status = 'approved';
        updateData.is_active = true;
        updateData.is_suspended = false;
      } else if (action === 'reject') {
        updateData.account_status = 'rejected';
        updateData.is_active = false;
      } else if (action === 'request_verification') {
        updateData.account_status = 'pending';
        updateData.verification_requested_at = new Date()?.toISOString();
      }

      const { error } = await supabase
        ?.from('user_profiles')
        ?.update(updateData)
        ?.in('id', selectedIds);

      if (error) {
        showError('Bulk action failed: ' + error?.message);
        return;
      }

      showSuccess(`${selectedIds?.length} users ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'flagged for verification'}`);
      setSelectedIds([]);
      await loadUsers();
    } catch (err) {
      showError('Unexpected error: ' + err?.message);
    } finally {
      setBulkLoading(false);
    }
  };

  const handleAiScan = async (user) => {
    try {
      setAiScanLoading(prev => ({ ...prev, [user?.id]: true }));
      const result = await detectFakeUser({
        full_name: user?.full_name,
        username: user?.username,
        email: user?.email,
        userId: user?.id,
      });
      setAiResults(prev => ({ ...prev, [user?.id]: result }));

      // Persist AI flag to DB
      if (result?.isSuspicious) {
        await supabase?.from('user_profiles')?.update({
          ai_flagged: true,
          ai_flag_label: result?.flagLabel,
          ai_flag_reasons: result?.reasons,
          ai_flag_confidence: result?.confidence,
          ai_flagged_at: new Date()?.toISOString(),
        })?.eq('id', user?.id);
        await loadUsers();
      }
    } catch (err) {
      console.error('AI scan error:', err);
    } finally {
      setAiScanLoading(prev => ({ ...prev, [user?.id]: false }));
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds?.length === filteredUsers?.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredUsers?.map(u => u?.id));
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev?.includes(id) ? prev?.filter(x => x !== id) : [...prev, id]
    );
  };

  const getUserDisplayStatus = (user) => {
    if (user?.ai_flagged) return 'flagged';
    if (user?.account_status === 'rejected') return 'rejected';
    if (user?.account_status === 'pending' || (!user?.account_status && !user?.is_active)) return 'pending';
    return user?.account_status || 'approved';
  };

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Pending Review', value: stats?.pending, color: 'yellow', icon: Clock, filter: 'pending' },
          { label: 'AI Flagged', value: stats?.flagged, color: 'orange', icon: Flag, filter: 'flagged' },
          { label: 'Rejected', value: stats?.rejected, color: 'red', icon: XCircle, filter: 'rejected' },
          { label: 'Total Users', value: stats?.total, color: 'blue', icon: User, filter: 'all' },
        ]?.map(stat => {
          const StatIcon = stat?.icon;
          return (
            <button
              key={stat?.filter}
              onClick={() => setFilterStatus(stat?.filter)}
              className={`bg-white rounded-lg border p-3 sm:p-4 text-left transition-all hover:shadow-md ${
                filterStatus === stat?.filter ? 'ring-2 ring-primary border-primary' : 'border-gray-200'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <StatIcon size={16} className={`text-${stat?.color}-500`} />
                <span className="text-xs text-gray-500 font-medium">{stat?.label}</span>
              </div>
              <p className={`text-xl sm:text-2xl font-bold text-${stat?.color}-600`}>{stat?.value}</p>
            </button>
          );
        })}
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-lg text-green-800 text-sm">
          <CheckCircle size={16} />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <XCircle size={16} />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-2 flex-1 w-full sm:w-auto">
            {/* Search */}
            <div className="relative flex-1 max-w-sm">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, email..."
                value={searchQuery}
                onChange={e => setSearchQuery(e?.target?.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
              />
            </div>
            {/* Filter */}
            <div className="relative">
              <Filter size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <select
                value={filterStatus}
                onChange={e => setFilterStatus(e?.target?.value)}
                className="pl-8 pr-8 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white appearance-none"
              >
                <option value="all">All Users</option>
                <option value="all_review">Needs Review</option>
                <option value="pending">Pending</option>
                <option value="flagged">AI Flagged</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadUsers}
              disabled={loading}
              className="p-2 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 transition-colors"
              title="Refresh"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedIds?.length > 0 && (
          <div className="mt-3 pt-3 border-t border-gray-100 flex flex-wrap items-center gap-2">
            <span className="text-sm font-medium text-gray-700">
              {selectedIds?.length} selected:
            </span>
            <button
              onClick={() => handleBulkAction('approve')}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
            >
              <CheckCircle size={13} />
              Bulk Approve
            </button>
            <button
              onClick={() => handleBulkAction('reject')}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
            >
              <XCircle size={13} />
              Bulk Reject
            </button>
            <button
              onClick={() => handleBulkAction('request_verification')}
              disabled={bulkLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500 text-white text-xs font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
            >
              <Shield size={13} />
              Request Verification
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="text-xs text-gray-500 hover:text-gray-700 underline ml-1"
            >
              Clear
            </button>
            {bulkLoading && <Icon name="Loader2" size={14} className="animate-spin text-gray-400" />}
          </div>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {/* Table Header */}
        <div className="hidden sm:grid grid-cols-12 gap-2 px-4 py-3 bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase tracking-wider">
          <div className="col-span-1 flex items-center">
            <input
              type="checkbox"
              checked={selectedIds?.length === filteredUsers?.length && filteredUsers?.length > 0}
              onChange={toggleSelectAll}
              className="rounded border-gray-300 text-primary focus:ring-primary"
            />
          </div>
          <div
            className="col-span-3 flex items-center gap-1 cursor-pointer hover:text-gray-700"
            onClick={() => handleSort('full_name')}
          >
            User
            {sortField === 'full_name' ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
          </div>
          <div className="col-span-3">Email</div>
          <div
            className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-700"
            onClick={() => handleSort('created_at')}
          >
            Joined
            {sortField === 'created_at' ? (sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
          </div>
          <div className="col-span-2">Status</div>
          <div className="col-span-1 text-right">Actions</div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <Icon name="Loader2" size={24} className="animate-spin text-gray-400" />
            <span className="ml-2 text-sm text-gray-500">Loading users...</span>
          </div>
        )}

        {/* Empty State */}
        {!loading && filteredUsers?.length === 0 && (
          <div className="text-center py-12">
            <User size={40} className="mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500 text-sm">No users found matching your filters</p>
          </div>
        )}

        {/* User Rows */}
        {!loading && filteredUsers?.map(user => {
          const displayStatus = getUserDisplayStatus(user);
          const StatusIcon = STATUS_ICONS?.[displayStatus] || CheckCircle;
          const isExpanded = expandedUser === user?.id;
          const isActioning = actionLoading?.[user?.id];
          const aiResult = aiResults?.[user?.id];
          const isAiScanning = aiScanLoading?.[user?.id];

          return (
            <div key={user?.id} className="border-b border-gray-100 last:border-0">
              {/* Main Row */}
              <div className="grid grid-cols-2 sm:grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-50 transition-colors items-center">
                {/* Checkbox */}
                <div className="hidden sm:flex col-span-1 items-center">
                  <input
                    type="checkbox"
                    checked={selectedIds?.includes(user?.id)}
                    onChange={() => toggleSelect(user?.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary"
                  />
                </div>

                {/* Name + Role */}
                <div className="col-span-1 sm:col-span-3 flex items-center gap-2 min-w-0">
                  <input
                    type="checkbox"
                    checked={selectedIds?.includes(user?.id)}
                    onChange={() => toggleSelect(user?.id)}
                    className="sm:hidden rounded border-gray-300 text-primary focus:ring-primary flex-shrink-0"
                  />
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-xs font-semibold text-primary">
                      {user?.full_name?.charAt(0)?.toUpperCase() || '?'}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{user?.full_name || '—'}</p>
                    <p className="text-xs text-gray-400 capitalize">{user?.role || 'customer'}</p>
                  </div>
                </div>

                {/* Email */}
                <div className="col-span-1 sm:col-span-3 min-w-0">
                  <p className="text-sm text-gray-600 truncate">{user?.email}</p>
                  {user?.username && <p className="text-xs text-gray-400">@{user?.username}</p>}
                </div>

                {/* Joined */}
                <div className="hidden sm:block col-span-2">
                  <p className="text-xs text-gray-500">
                    {user?.created_at ? new Date(user?.created_at)?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                  </p>
                </div>

                {/* Status */}
                <div className="hidden sm:block col-span-2">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS?.[displayStatus] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                    <StatusIcon size={11} />
                    {displayStatus?.charAt(0)?.toUpperCase() + displayStatus?.slice(1)}
                  </span>
                  {user?.ai_flagged && (
                    <span className="ml-1 inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">
                      <Flag size={10} />
                      AI
                    </span>
                  )}
                </div>

                {/* Actions Toggle */}
                <div className="col-span-1 sm:col-span-1 flex justify-end">
                  <button
                    onClick={() => setExpandedUser(isExpanded ? null : user?.id)}
                    className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
                    title="Expand actions"
                  >
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>

              {/* Expanded Panel */}
              {isExpanded && (
                <div className="px-4 pb-4 bg-gray-50 border-t border-gray-100">
                  <div className="pt-3 space-y-3">
                    {/* User Details */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-gray-600">
                      <div>
                        <span className="font-medium text-gray-500 block mb-0.5">Account Status</span>
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_COLORS?.[displayStatus] || 'bg-gray-100 text-gray-700 border-gray-200'}`}>
                          <StatusIcon size={11} />
                          {displayStatus?.charAt(0)?.toUpperCase() + displayStatus?.slice(1)}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500 block mb-0.5">Active</span>
                        <span className={`font-medium ${user?.is_active ? 'text-green-600' : 'text-red-500'}`}>
                          {user?.is_active ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500 block mb-0.5">Suspended</span>
                        <span className={`font-medium ${user?.is_suspended ? 'text-red-500' : 'text-green-600'}`}>
                          {user?.is_suspended ? 'Yes' : 'No'}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-500 block mb-0.5">Trusted</span>
                        <span className={`font-medium ${user?.is_trusted ? 'text-blue-600' : 'text-gray-500'}`}>
                          {user?.is_trusted ? 'Yes' : 'No'}
                        </span>
                      </div>
                    </div>

                    {/* AI Flag Info */}
                    {(user?.ai_flagged || aiResult) && (
                      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                        <div className="flex items-center gap-2 mb-1">
                          <Flag size={14} className="text-orange-600" />
                          <span className="text-xs font-semibold text-orange-800">
                            AI Flag: {user?.ai_flag_label || aiResult?.flagLabel || 'Suspicious'}
                            {(user?.ai_flag_confidence || aiResult?.confidence) && (
                              <span className="ml-1 font-normal text-orange-600">
                                ({user?.ai_flag_confidence || aiResult?.confidence} confidence)
                              </span>
                            )}
                          </span>
                        </div>
                        {(user?.ai_flag_reasons || aiResult?.reasons)?.length > 0 && (
                          <ul className="text-xs text-orange-700 space-y-0.5 ml-4 list-disc">
                            {(user?.ai_flag_reasons || aiResult?.reasons)?.map((r, i) => (
                              <li key={i}>{r}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {/* Status Note */}
                    {user?.account_status_note && (
                      <div className="p-2 bg-blue-50 border border-blue-200 rounded text-xs text-blue-800">
                        <span className="font-medium">Note: </span>{user?.account_status_note}
                      </div>
                    )}

                    {/* Note Input */}
                    <div>
                      <label className="text-xs font-medium text-gray-600 block mb-1">
                        Action Note (optional)
                      </label>
                      <input
                        type="text"
                        placeholder="Add a reason or note for this action..."
                        value={noteInputs?.[user?.id] || ''}
                        onChange={e => setNoteInputs(prev => ({ ...prev, [user?.id]: e?.target?.value }))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                      />
                    </div>

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        onClick={() => handleAction(user?.id, 'approve', noteInputs?.[user?.id])}
                        disabled={!!isActioning}
                        className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-medium rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {isActioning === 'approve' ? (
                          <Icon name="Loader2" size={13} className="animate-spin" />
                        ) : (
                          <CheckCircle size={13} />
                        )}
                        Approve
                      </button>
                      <button
                        onClick={() => handleAction(user?.id, 'reject', noteInputs?.[user?.id])}
                        disabled={!!isActioning}
                        className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white text-xs font-medium rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isActioning === 'reject' ? (
                          <Icon name="Loader2" size={13} className="animate-spin" />
                        ) : (
                          <XCircle size={13} />
                        )}
                        Reject
                      </button>
                      <button
                        onClick={() => handleAction(user?.id, 'request_verification', noteInputs?.[user?.id])}
                        disabled={!!isActioning}
                        className="flex items-center gap-1.5 px-3 py-2 bg-yellow-500 text-white text-xs font-medium rounded-lg hover:bg-yellow-600 transition-colors disabled:opacity-50"
                      >
                        {isActioning === 'request_verification' ? (
                          <Icon name="Loader2" size={13} className="animate-spin" />
                        ) : (
                          <Shield size={13} />
                        )}
                        Request Verification
                      </button>
                      <button
                        onClick={() => handleAiScan(user)}
                        disabled={isAiScanning}
                        className="flex items-center gap-1.5 px-3 py-2 bg-orange-500 text-white text-xs font-medium rounded-lg hover:bg-orange-600 transition-colors disabled:opacity-50"
                      >
                        {isAiScanning ? (
                          <Icon name="Loader2" size={13} className="animate-spin" />
                        ) : (
                          <Flag size={13} />
                        )}
                        AI Scan
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer count */}
      {!loading && filteredUsers?.length > 0 && (
        <p className="text-xs text-gray-400 text-center">
          Showing {filteredUsers?.length} of {users?.length} users
        </p>
      )}
    </div>
  );
};

export default PendingUserReview;
