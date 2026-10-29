import React, { useState, useEffect, useCallback } from 'react';
import { Shield, Search, Filter, RefreshCw, User, Clock, ChevronDown, ChevronUp, Download, AlertCircle } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';

const ACTION_LABELS = {
  user_created: 'User Created',
  user_updated: 'User Updated',
  user_deactivated: 'User Deactivated',
  user_activated: 'User Activated',
  user_role_changed: 'Role Changed',
  driver_created: 'Driver Created',
  kyc_approved: 'KYC Approved',
  kyc_rejected: 'KYC Rejected',
  kyc_under_review: 'KYC Under Review',
  dispute_created: 'Dispute Created',
  dispute_resolved: 'Dispute Resolved',
  dispute_rejected: 'Dispute Rejected',
  booking_created: 'Booking Created',
  booking_cancelled: 'Booking Cancelled',
  booking_assigned: 'Booking Assigned',
  booking_updated: 'Booking Updated',
  role_created: 'Role Created',
  role_updated: 'Role Updated',
  role_deleted: 'Role Deleted',
  staff_role_assigned: 'Staff Role Assigned',
  payment_refunded: 'Payment Refunded',
  vehicle_created: 'Vehicle Created',
  vehicle_updated: 'Vehicle Updated',
  vehicle_deactivated: 'Vehicle Deactivated',
  partner_created: 'Partner Created',
  partner_updated: 'Partner Updated',
  settings_updated: 'Settings Updated',
  other: 'Other',
};

const ACTION_COLORS = {
  user_created: 'bg-green-100 text-green-800',
  user_updated: 'bg-blue-100 text-blue-800',
  user_deactivated: 'bg-red-100 text-red-800',
  user_activated: 'bg-green-100 text-green-800',
  user_role_changed: 'bg-purple-100 text-purple-800',
  driver_created: 'bg-teal-100 text-teal-800',
  kyc_approved: 'bg-green-100 text-green-800',
  kyc_rejected: 'bg-red-100 text-red-800',
  kyc_under_review: 'bg-yellow-100 text-yellow-800',
  dispute_created: 'bg-orange-100 text-orange-800',
  dispute_resolved: 'bg-green-100 text-green-800',
  dispute_rejected: 'bg-red-100 text-red-800',
  booking_created: 'bg-blue-100 text-blue-800',
  booking_cancelled: 'bg-red-100 text-red-800',
  booking_assigned: 'bg-indigo-100 text-indigo-800',
  booking_updated: 'bg-blue-100 text-blue-800',
  role_created: 'bg-purple-100 text-purple-800',
  role_updated: 'bg-purple-100 text-purple-800',
  role_deleted: 'bg-red-100 text-red-800',
  staff_role_assigned: 'bg-purple-100 text-purple-800',
  payment_refunded: 'bg-orange-100 text-orange-800',
  vehicle_created: 'bg-cyan-100 text-cyan-800',
  vehicle_updated: 'bg-cyan-100 text-cyan-800',
  vehicle_deactivated: 'bg-red-100 text-red-800',
  partner_created: 'bg-teal-100 text-teal-800',
  partner_updated: 'bg-teal-100 text-teal-800',
  settings_updated: 'bg-gray-100 text-gray-800',
  other: 'bg-gray-100 text-gray-800',
};

const ACTION_ICONS = {
  user_created: '👤',
  user_updated: '✏️',
  user_deactivated: '🚫',
  user_activated: '✅',
  user_role_changed: '🔄',
  driver_created: '🚗',
  kyc_approved: '✅',
  kyc_rejected: '❌',
  kyc_under_review: '🔍',
  dispute_created: '⚠️',
  dispute_resolved: '✅',
  dispute_rejected: '❌',
  booking_created: '📋',
  booking_cancelled: '🚫',
  booking_assigned: '📌',
  booking_updated: '✏️',
  role_created: '🛡️',
  role_updated: '🛡️',
  role_deleted: '🗑️',
  staff_role_assigned: '🛡️',
  payment_refunded: '💰',
  vehicle_created: '🚐',
  vehicle_updated: '🚐',
  vehicle_deactivated: '🚫',
  partner_created: '🤝',
  partner_updated: '🤝',
  settings_updated: '⚙️',
  other: '📝',
};

const ACTION_CATEGORIES = {
  'User Management': ['user_created', 'user_updated', 'user_deactivated', 'user_activated', 'user_role_changed'],
  'Driver & KYC': ['driver_created', 'kyc_approved', 'kyc_rejected', 'kyc_under_review'],
  'Disputes': ['dispute_created', 'dispute_resolved', 'dispute_rejected'],
  'Bookings': ['booking_created', 'booking_cancelled', 'booking_assigned', 'booking_updated'],
  'Roles & Privileges': ['role_created', 'role_updated', 'role_deleted', 'staff_role_assigned'],
  'Payments': ['payment_refunded'],
  'Fleet': ['vehicle_created', 'vehicle_updated', 'vehicle_deactivated'],
  'Partners': ['partner_created', 'partner_updated'],
  'Settings': ['settings_updated'],
};

const TIMEFRAME_OPTIONS = [
  { label: 'Last 24 hours', value: '1' },
  { label: 'Last 7 days', value: '7' },
  { label: 'Last 30 days', value: '30' },
  { label: 'Last 90 days', value: '90' },
  { label: 'All time', value: 'all' },
];

const AdminAuditPanel = () => {
  const { user, userProfile } = useAuth();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');
  const [selectedActor, setSelectedActor] = useState('all');
  const [actors, setActors] = useState([]);
  const [expandedLog, setExpandedLog] = useState(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 25;

  const loadLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase
        ?.from('admin_audit_logs')
        ?.select('*', { count: 'exact' })
        ?.order('created_at', { ascending: false });

      // Timeframe filter
      if (selectedTimeframe !== 'all') {
        const cutoff = new Date(Date.now() - parseInt(selectedTimeframe) * 24 * 60 * 60 * 1000)?.toISOString();
        query = query?.gte('created_at', cutoff);
      }

      // Category filter
      if (selectedCategory !== 'all') {
        const categoryActions = ACTION_CATEGORIES?.[selectedCategory] || [];
        if (categoryActions?.length > 0) {
          query = query?.in('action_type', categoryActions);
        }
      }

      // Actor filter
      if (selectedActor !== 'all') {
        query = query?.eq('actor_id', selectedActor);
      }

      // Search filter
      if (searchTerm?.trim()) {
        query = query?.or(`description.ilike.%${searchTerm}%,actor_name.ilike.%${searchTerm}%,target_name.ilike.%${searchTerm}%`);
      }

      // Pagination
      query = query?.range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      setLogs(data || []);
      setTotalCount(count || 0);

      // Extract unique actors for filter dropdown
      if (page === 0) {
        const { data: actorData } = await supabase
          ?.from('admin_audit_logs')
          ?.select('actor_id, actor_name, actor_role')
          ?.not('actor_id', 'is', null)
          ?.order('actor_name');

        if (actorData) {
          const uniqueActors = Array.from(
            new Map(actorData?.map(a => [a?.actor_id, a]))?.values()
          );
          setActors(uniqueActors);
        }
      }
    } catch (err) {
      setError('Failed to load audit logs: ' + (err?.message || 'Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [selectedTimeframe, selectedCategory, selectedActor, searchTerm, page]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [selectedTimeframe, selectedCategory, selectedActor, searchTerm]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date?.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  const getRelativeTime = (dateString) => {
    if (!dateString) return '';
    const now = Date.now();
    const then = new Date(dateString)?.getTime();
    const diff = now - then;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return formatDate(dateString);
  };

  const exportCSV = () => {
    const headers = ['Timestamp', 'Action', 'Actor', 'Actor Role', 'Target', 'Description'];
    const rows = logs?.map(log => [
      formatDate(log?.created_at),
      ACTION_LABELS?.[log?.action_type] || log?.action_type,
      log?.actor_name || 'Unknown',
      log?.actor_role || '',
      log?.target_name || log?.target_type || '',
      log?.description || '',
    ]);
    const csvContent = [headers, ...rows]?.map(r => r?.map(c => `"${String(c)?.replace(/"/g, '""')}"`)?.join(','))?.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL?.createObjectURL(blob);
    const a = document?.createElement('a');
    a.href = url;
    a.download = `audit-log-${new Date()?.toISOString()?.slice(0, 10)}.csv`;
    a?.click();
    URL?.revokeObjectURL(url);
  };

  // Summary stats
  const categoryCounts = Object.entries(ACTION_CATEGORIES)?.map(([cat, actions]) => ({
    category: cat,
    count: logs?.filter(l => actions?.includes(l?.action_type))?.length,
  }))?.filter(c => c?.count > 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            Admin Audit Panel
          </h2>
          <p className="text-gray-500 text-sm mt-1">
            Track all admin and staff actions — user creation, KYC approvals, dispute resolutions, role changes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadLogs}
            className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={exportCSV}
            className="flex items-center gap-2 px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {categoryCounts?.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {categoryCounts?.slice(0, 8)?.map(({ category, count }) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(selectedCategory === category ? 'all' : category)}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedCategory === category
                  ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-300' :'bg-white border-gray-200 hover:border-blue-200 hover:bg-blue-50'
              }`}
            >
              <p className="text-xs text-gray-500 font-medium truncate">{category}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{count}</p>
            </button>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search */}
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search by description, actor, or target..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e?.target?.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e?.target?.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Categories</option>
            {Object.keys(ACTION_CATEGORIES)?.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Timeframe Filter */}
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e?.target?.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {TIMEFRAME_OPTIONS?.map(opt => (
              <option key={opt?.value} value={opt?.value}>{opt?.label}</option>
            ))}
          </select>

          {/* Actor Filter */}
          {actors?.length > 0 && (
            <select
              value={selectedActor}
              onChange={(e) => setSelectedActor(e?.target?.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Actors</option>
              {actors?.map(actor => (
                <option key={actor?.actor_id} value={actor?.actor_id}>
                  {actor?.actor_name} ({actor?.actor_role})
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          {error}
        </div>
      )}

      {/* Logs Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">
            Action Log
            <span className="ml-2 text-sm font-normal text-gray-500">
              {totalCount > 0 ? `${totalCount} total entries` : ''}
            </span>
          </h3>
          {(selectedCategory !== 'all' || selectedActor !== 'all' || searchTerm) && (
            <button
              onClick={() => { setSelectedCategory('all'); setSelectedActor('all'); setSearchTerm(''); }}
              className="text-xs text-blue-600 hover:text-blue-800"
            >
              Clear filters
            </button>
          )}
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-3 text-gray-500 text-sm">Loading audit logs...</p>
          </div>
        ) : logs?.length === 0 ? (
          <div className="p-12 text-center">
            <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No audit logs found</p>
            <p className="text-gray-400 text-sm mt-1">
              {searchTerm || selectedCategory !== 'all' ? 'Try adjusting your filters' : 'Actions will appear here as admins and staff perform operations'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {logs?.map((log) => (
              <div key={log?.id} className="hover:bg-gray-50 transition-colors">
                <div
                  className="px-6 py-4 cursor-pointer"
                  onClick={() => setExpandedLog(expandedLog === log?.id ? null : log?.id)}
                >
                  <div className="flex items-start gap-4">
                    {/* Icon */}
                    <div className="text-xl flex-shrink-0 mt-0.5">
                      {ACTION_ICONS?.[log?.action_type] || '📝'}
                    </div>

                    {/* Main Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS?.[log?.action_type] || 'bg-gray-100 text-gray-800'}`}>
                          {ACTION_LABELS?.[log?.action_type] || log?.action_type}
                        </span>
                        {log?.target_type && (
                          <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
                            {log?.target_type}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-900 font-medium truncate">{log?.description}</p>
                      <div className="flex flex-wrap items-center gap-3 mt-1.5">
                        <span className="flex items-center gap-1 text-xs text-gray-500">
                          <User className="w-3 h-3" />
                          <span className="font-medium text-gray-700">{log?.actor_name || 'Unknown'}</span>
                          {log?.actor_role && (
                            <span className="text-gray-400">({log?.actor_role})</span>
                          )}
                        </span>
                        {log?.target_name && (
                          <span className="text-xs text-gray-500">
                            → <span className="font-medium text-gray-700">{log?.target_name}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Timestamp + Expand */}
                    <div className="flex-shrink-0 flex flex-col items-end gap-1">
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {getRelativeTime(log?.created_at)}
                      </span>
                      <span className="text-xs text-gray-300">
                        {new Date(log?.created_at)?.toLocaleDateString()}
                      </span>
                      {expandedLog === log?.id
                        ? <ChevronUp className="w-4 h-4 text-gray-400 mt-1" />
                        : <ChevronDown className="w-4 h-4 text-gray-400 mt-1" />
                      }
                    </div>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedLog === log?.id && (
                  <div className="px-6 pb-4 bg-gray-50 border-t border-gray-100">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Actor Details</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex gap-2">
                            <span className="text-gray-500 w-20 flex-shrink-0">Name:</span>
                            <span className="text-gray-900 font-medium">{log?.actor_name || 'Unknown'}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-gray-500 w-20 flex-shrink-0">Role:</span>
                            <span className="text-gray-900">{log?.actor_role || 'N/A'}</span>
                          </div>
                          <div className="flex gap-2">
                            <span className="text-gray-500 w-20 flex-shrink-0">Actor ID:</span>
                            <span className="text-gray-400 text-xs font-mono truncate">{log?.actor_id || 'N/A'}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Action Details</p>
                        <div className="space-y-1 text-sm">
                          <div className="flex gap-2">
                            <span className="text-gray-500 w-20 flex-shrink-0">Timestamp:</span>
                            <span className="text-gray-900">{formatDate(log?.created_at)}</span>
                          </div>
                          {log?.target_type && (
                            <div className="flex gap-2">
                              <span className="text-gray-500 w-20 flex-shrink-0">Target:</span>
                              <span className="text-gray-900">{log?.target_name || log?.target_id || 'N/A'} <span className="text-gray-400">({log?.target_type})</span></span>
                            </div>
                          )}
                          <div className="flex gap-2">
                            <span className="text-gray-500 w-20 flex-shrink-0">Log ID:</span>
                            <span className="text-gray-400 text-xs font-mono truncate">{log?.id}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Metadata */}
                    {log?.metadata && Object.keys(log?.metadata)?.length > 0 && (
                      <div className="mt-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Additional Data</p>
                        <div className="bg-white rounded border border-gray-200 p-3">
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {Object.entries(log?.metadata)?.map(([key, value]) => (
                              <div key={key} className="text-xs">
                                <span className="text-gray-500 capitalize">{key?.replace(/_/g, ' ')}: </span>
                                <span className="text-gray-800 font-medium">
                                  {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, totalCount)} of {totalCount}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Previous
              </button>
              <button
                onClick={() => setPage(p => p + 1)}
                disabled={(page + 1) * PAGE_SIZE >= totalCount}
                className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminAuditPanel;
