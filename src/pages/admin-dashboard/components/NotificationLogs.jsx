import React, { useState, useEffect, useCallback } from 'react';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';

const STATUS_COLORS = {
  sent: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  bounced: 'bg-orange-100 text-orange-700 border-orange-200',
  pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
};

const STATUS_ICONS = {
  sent: 'CheckCircle',
  failed: 'XCircle',
  bounced: 'AlertCircle',
  pending: 'Clock',
};

const NOTIFICATION_TYPE_LABELS = {
  booking_confirmed: 'Booking Confirmed',
  booking_cancelled: 'Booking Cancelled',
  payment_received: 'Payment Received',
  driver_signup: 'Driver Sign-up',
  new_booking: 'New Booking',
  multi_role_notification: 'Multi-Role Notification',
  admin_notification: 'Admin Notification',
  customer_confirmation: 'Customer Confirmation',
  guest_booking_confirmation: 'Guest Booking Confirmation',
  driver_signup_notification: 'Driver Sign-up Notification',
};

const NOTIFICATION_TYPE_COLORS = {
  booking_confirmed: 'bg-green-50 text-green-700',
  booking_cancelled: 'bg-red-50 text-red-700',
  payment_received: 'bg-blue-50 text-blue-700',
  driver_signup: 'bg-purple-50 text-purple-700',
  new_booking: 'bg-sky-50 text-sky-700',
  multi_role_notification: 'bg-indigo-50 text-indigo-700',
  admin_notification: 'bg-gray-50 text-gray-700',
  customer_confirmation: 'bg-teal-50 text-teal-700',
  guest_booking_confirmation: 'bg-cyan-50 text-cyan-700',
  driver_signup_notification: 'bg-violet-50 text-violet-700',
};

const NotificationLogs = () => {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resendingId, setResendingId] = useState(null);
  const [resendSuccess, setResendSuccess] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [activeTab, setActiveTab] = useState('bookings');
  const ITEMS_PER_PAGE = 10;

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);

      if (activeTab === 'bookings') {
        // Load email confirmation status from bookings table
        const { data, error } = await supabase
          ?.from('bookings')
          ?.select(`
            id,
            booking_code,
            email_confirmation_status,
            email_confirmation_sent_at,
            email_confirmation_delivered_at,
            email_confirmation_failed_at,
            email_confirmation_error,
            email_confirmation_resend_id,
            email_confirmation_recipient,
            is_guest_booking,
            guest_name,
            guest_email,
            primary_passenger_email,
            primary_passenger_first_name,
            primary_passenger_last_name,
            created_at,
            user_profiles!bookings_user_id_fkey(full_name, email)
          `)
          ?.not('email_confirmation_status', 'is', null)
          ?.order('created_at', { ascending: false })
          ?.limit(200);

        if (error) {
          console.error('Error loading booking email logs:', error);
          setLogs([]);
        } else {
          // Normalize to log format
          const normalized = (data || [])?.map(b => ({
            id: b?.id,
            recipient_email: b?.email_confirmation_recipient
              || b?.guest_email
              || b?.primary_passenger_email
              || b?.user_profiles?.email
              || '—',
            notification_type: b?.is_guest_booking ? 'guest_booking_confirmation' : 'customer_confirmation',
            status: b?.email_confirmation_status,
            booking_id: b?.booking_code || b?.id?.substring(0, 8)?.toUpperCase(),
            error_message: b?.email_confirmation_error || null,
            resend_id: b?.email_confirmation_resend_id || null,
            sent_at: b?.email_confirmation_sent_at,
            failed_at: b?.email_confirmation_failed_at,
            created_at: b?.email_confirmation_sent_at || b?.email_confirmation_failed_at || b?.created_at,
            resend_count: 0,
            customer_name: b?.guest_name
              || (b?.primary_passenger_first_name ? `${b?.primary_passenger_first_name} ${b?.primary_passenger_last_name || ''}`?.trim() : null)
              || b?.user_profiles?.full_name
              || null,
          }));
          setLogs(normalized);
        }
      } else {
        // Try notification_logs table
        const { data, error } = await supabase
          ?.from('notification_logs')
          ?.select('*')
          ?.order('created_at', { ascending: false })
          ?.limit(200);

        if (error || !data) {
          setLogs([]);
        } else {
          setLogs(data || []);
        }
      }
    } catch (err) {
      console.error('Error loading logs:', err);
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const handleResend = async (log) => {
    try {
      setResendingId(log?.id);
      setResendSuccess(null);

      const { error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          type: log?.notification_type || 'admin_notification',
          to_email: log?.recipient_email,
          booking_id: log?.booking_id,
          resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '',
          resend: true,
          original_log_id: log?.id,
        },
      });

      if (error) throw error;

      // Update status in bookings table if this is a booking log
      if (activeTab === 'bookings') {
        await supabase?.from('bookings')?.update({
          email_confirmation_status: 'sent',
          email_confirmation_sent_at: new Date()?.toISOString(),
          email_confirmation_error: null,
          email_confirmation_failed_at: null,
        })?.eq('id', log?.id);
      }

      setLogs(prev =>
        prev?.map(l =>
          l?.id === log?.id
            ? { ...l, status: 'sent', resend_count: (l?.resend_count || 0) + 1 }
            : l
        )
      );
      setResendSuccess(log?.id);
      setTimeout(() => setResendSuccess(null), 3000);
    } catch (err) {
      console.error('Resend failed:', err);
    } finally {
      setResendingId(null);
    }
  };

  // Filter and search
  const filteredLogs = logs?.filter(log => {
    const matchesStatus = filterStatus === 'all' || log?.status === filterStatus;
    const matchesType = filterType === 'all' || log?.notification_type === filterType;
    const matchesSearch =
      !searchQuery ||
      log?.recipient_email?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
      log?.booking_id?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
      log?.customer_name?.toLowerCase()?.includes(searchQuery?.toLowerCase()) ||
      log?.subject?.toLowerCase()?.includes(searchQuery?.toLowerCase());
    return matchesStatus && matchesType && matchesSearch;
  });

  const totalPages = Math.ceil(filteredLogs?.length / ITEMS_PER_PAGE);
  const paginatedLogs = filteredLogs?.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const statusCounts = {
    all: logs?.length,
    sent: logs?.filter(l => l?.status === 'sent')?.length,
    failed: logs?.filter(l => l?.status === 'failed')?.length,
    bounced: logs?.filter(l => l?.status === 'bounced')?.length,
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d?.toLocaleDateString('en-PH', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Icon name="Mail" size={20} className="text-blue-600" />
            Notification Logs
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">Track all sent email notifications and retry failed deliveries</p>
        </div>
        <button
          onClick={loadLogs}
          className="flex items-center gap-1.5 px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-600 transition-colors"
        >
          <Icon name="RefreshCw" size={14} />
          Refresh
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit">
        <button
          onClick={() => { setActiveTab('bookings'); setCurrentPage(1); }}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'bookings' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Icon name="BookOpen" size={13} />
            Booking Confirmations
          </span>
        </button>
        <button
          onClick={() => { setActiveTab('system'); setCurrentPage(1); }}
          className={`px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
            activeTab === 'system' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-600 hover:text-gray-800'
          }`}
        >
          <span className="flex items-center gap-1.5">
            <Icon name="Bell" size={13} />
            System Logs
          </span>
        </button>
      </div>

      {/* Status Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { key: 'all', label: 'Total', icon: 'Mail', color: 'blue' },
          { key: 'sent', label: 'Delivered', icon: 'CheckCircle', color: 'green' },
          { key: 'failed', label: 'Failed', icon: 'XCircle', color: 'red' },
          { key: 'bounced', label: 'Bounced', icon: 'AlertCircle', color: 'orange' },
        ]?.map(stat => (
          <button
            key={stat?.key}
            onClick={() => { setFilterStatus(stat?.key); setCurrentPage(1); }}
            className={`bg-white border rounded-lg p-3 text-left transition-all ${
              filterStatus === stat?.key ? 'border-blue-400 ring-1 ring-blue-300' : 'border-gray-200 hover:border-gray-300'
            }`}
          >
            <div className={`flex items-center gap-1.5 text-${stat?.color}-600 mb-1`}>
              <Icon name={stat?.icon} size={14} />
              <span className="text-xs font-medium">{stat?.label}</span>
            </div>
            <div className="text-xl font-bold text-gray-900">{statusCounts?.[stat?.key] || 0}</div>
          </button>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-3 flex flex-col sm:flex-row gap-3">
        {/* Search */}
        <div className="relative flex-1">
          <Icon name="Search" size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => { setSearchQuery(e?.target?.value); setCurrentPage(1); }}
            placeholder="Search by email, booking ID, or name..."
            className="w-full pl-8 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Type filter */}
        <select
          value={filterType}
          onChange={e => { setFilterType(e?.target?.value); setCurrentPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="all">All Types</option>
          {Object.entries(NOTIFICATION_TYPE_LABELS)?.map(([key, label]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>

        {/* Status filter */}
        <select
          value={filterStatus}
          onChange={e => { setFilterStatus(e?.target?.value); setCurrentPage(1); }}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
          <option value="bounced">Bounced</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Icon name="Loader2" size={24} className="animate-spin text-blue-500 mr-2" />
            <span className="text-gray-500 text-sm">Loading notification logs...</span>
          </div>
        ) : paginatedLogs?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Icon name="MailX" size={40} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No notification logs found</p>
            <p className="text-xs mt-1">
              {activeTab === 'bookings' ?'Email confirmation status will appear here after bookings are created' :'Try adjusting your filters or search query'}
            </p>
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Recipient</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking ID</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Timestamp</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                    <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {paginatedLogs?.map(log => (
                    <tr key={log?.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                            <Icon name="User" size={12} className="text-blue-600" />
                          </div>
                          <div className="min-w-0">
                            <span className="text-gray-800 font-medium truncate max-w-[180px] block">{log?.recipient_email}</span>
                            {log?.customer_name && (
                              <span className="text-xs text-gray-400 truncate max-w-[180px] block">{log?.customer_name}</span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${NOTIFICATION_TYPE_COLORS?.[log?.notification_type] || 'bg-gray-50 text-gray-700'}`}>
                          {NOTIFICATION_TYPE_LABELS?.[log?.notification_type] || log?.notification_type || '—'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-600 font-mono text-xs">{log?.booking_id || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-gray-500 text-xs">{formatDate(log?.created_at)}</span>
                        {log?.resend_id && (
                          <div className="text-xs text-blue-400 mt-0.5 font-mono truncate max-w-[120px]" title={log?.resend_id}>
                            ID: {log?.resend_id?.substring(0, 12)}…
                          </div>
                        )}
                        {log?.resend_count > 0 && (
                          <div className="text-xs text-blue-500 mt-0.5">Resent {log?.resend_count}×</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_COLORS?.[log?.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                            <Icon name={STATUS_ICONS?.[log?.status] || 'Circle'} size={10} />
                            {log?.status?.charAt(0)?.toUpperCase() + log?.status?.slice(1)}
                          </span>
                          {log?.error_message && (
                            <div className="text-xs text-red-500 mt-0.5 max-w-[200px] truncate" title={log?.error_message}>
                              {log?.error_message}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {(log?.status === 'failed' || log?.status === 'bounced') && (
                          <button
                            onClick={() => handleResend(log)}
                            disabled={resendingId === log?.id}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                              resendSuccess === log?.id
                                ? 'bg-green-100 text-green-700' :'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                          >
                            {resendingId === log?.id ? (
                              <><Icon name="Loader2" size={12} className="animate-spin" /> Sending...</>
                            ) : resendSuccess === log?.id ? (
                              <><Icon name="Check" size={12} /> Sent!</>
                            ) : (
                              <><Icon name="RotateCcw" size={12} /> Retry</>
                            )}
                          </button>
                        )}
                        {log?.status === 'sent' && (
                          <button
                            onClick={() => handleResend(log)}
                            disabled={resendingId === log?.id}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200 transition-colors disabled:opacity-50"
                          >
                            {resendingId === log?.id ? (
                              <><Icon name="Loader2" size={12} className="animate-spin" /> Sending...</>
                            ) : resendSuccess === log?.id ? (
                              <><Icon name="Check" size={12} /> Sent!</>
                            ) : (
                              <><Icon name="Send" size={12} /> Resend</>
                            )}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-100">
              {paginatedLogs?.map(log => (
                <div key={log?.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{log?.recipient_email}</p>
                      {log?.customer_name && (
                        <p className="text-xs text-gray-400 truncate">{log?.customer_name}</p>
                      )}
                      <p className="text-xs text-gray-500 mt-0.5">{formatDate(log?.created_at)}</p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border flex-shrink-0 ${STATUS_COLORS?.[log?.status] || 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                      <Icon name={STATUS_ICONS?.[log?.status] || 'Circle'} size={10} />
                      {log?.status?.charAt(0)?.toUpperCase() + log?.status?.slice(1)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${NOTIFICATION_TYPE_COLORS?.[log?.notification_type] || 'bg-gray-50 text-gray-700'}`}>
                      {NOTIFICATION_TYPE_LABELS?.[log?.notification_type] || log?.notification_type || '—'}
                    </span>
                    {log?.booking_id && (
                      <span className="text-xs text-gray-500 font-mono">{log?.booking_id}</span>
                    )}
                  </div>
                  {log?.error_message && (
                    <p className="text-xs text-red-500">{log?.error_message}</p>
                  )}
                  {(log?.status === 'failed' || log?.status === 'bounced' || log?.status === 'sent') && (
                    <button
                      onClick={() => handleResend(log)}
                      disabled={resendingId === log?.id}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 transition-colors disabled:opacity-50"
                    >
                      {resendingId === log?.id ? (
                        <><Icon name="Loader2" size={12} className="animate-spin" /> Sending...</>
                      ) : resendSuccess === log?.id ? (
                        <><Icon name="Check" size={12} /> Sent!</>
                      ) : (
                        <><Icon name="RotateCcw" size={12} /> {log?.status === 'sent' ? 'Resend' : 'Retry'}</>
                      )}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="border-t border-gray-200 px-4 py-3 flex items-center justify-between">
            <p className="text-xs text-gray-500">
              Showing {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, filteredLogs?.length)} of {filteredLogs?.length}
            </p>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
              >
                <Icon name="ChevronLeft" size={16} />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                const page = currentPage <= 3 ? i + 1 : currentPage - 2 + i;
                if (page > totalPages) return null;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-7 h-7 text-xs rounded-lg transition-colors ${
                      currentPage === page ? 'bg-blue-600 text-white' : 'hover:bg-gray-100 text-gray-600'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600"
              >
                <Icon name="ChevronRight" size={16} />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default NotificationLogs;
