import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { AlertTriangle, RefreshCw, Plus, Search, MessageSquare, ChevronDown, ChevronUp, Clock, CheckCircle, XCircle, DollarSign, Eye, Send, Lock, User, FileText } from 'lucide-react';
import { logAdminAction, AUDIT_ACTIONS } from '../../../utils/adminAuditLogger';
import { useAuth } from '../../../contexts/AuthContext';

const DISPUTE_TYPE_LABELS = {
  chargeback: 'Chargeback',
  dispute: 'Dispute',
  failed_reversal: 'Failed Reversal',
};

const DISPUTE_TYPE_COLORS = {
  chargeback: 'bg-red-100 text-red-800 border-red-200',
  dispute: 'bg-orange-100 text-orange-800 border-orange-200',
  failed_reversal: 'bg-purple-100 text-purple-800 border-purple-200',
};

const STATUS_COLORS = {
  open: 'bg-yellow-100 text-yellow-800',
  under_review: 'bg-blue-100 text-blue-800',
  awaiting_response: 'bg-indigo-100 text-indigo-800',
  resolved_won: 'bg-green-100 text-green-800',
  resolved_lost: 'bg-red-100 text-red-800',
  resolved_partial: 'bg-teal-100 text-teal-800',
  closed: 'bg-gray-100 text-gray-700',
};

const STATUS_LABELS = {
  open: 'Open',
  under_review: 'Under Review',
  awaiting_response: 'Awaiting Response',
  resolved_won: 'Resolved (Won)',
  resolved_lost: 'Resolved (Lost)',
  resolved_partial: 'Resolved (Partial)',
  closed: 'Closed',
};

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-yellow-100 text-yellow-700',
  high: 'bg-orange-100 text-orange-700',
  critical: 'bg-red-100 text-red-700',
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return `₱${parseFloat(amount)?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr)?.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const formatDateTime = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr)?.toLocaleString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

const isOverdue = (dueDate, status) => {
  if (!dueDate || ['resolved_won', 'resolved_lost', 'resolved_partial', 'closed']?.includes(status)) return false;
  return new Date(dueDate) < new Date();
};

// ─── Create/Edit Modal ────────────────────────────────────────────────────────
const DisputeFormModal = ({ dispute, onClose, onSaved }) => {
  const [form, setForm] = useState({
    title: dispute?.title || '',
    dispute_type: dispute?.dispute_type || 'dispute',
    dispute_status: dispute?.dispute_status || 'open',
    priority: dispute?.priority || 'medium',
    description: dispute?.description || '',
    amount: dispute?.amount || '',
    payment_reference: dispute?.payment_reference || '',
    payment_method: dispute?.payment_method || '',
    customer_name: dispute?.customer_name || '',
    customer_email: dispute?.customer_email || '',
    due_date: dispute?.due_date || '',
    external_reference: dispute?.external_reference || '',
    resolution_notes: dispute?.resolution_notes || '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (field, value) => setForm(prev => ({ ...prev, [field]: value }));

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!form?.title?.trim()) { setError('Title is required'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        amount: form?.amount ? parseFloat(form?.amount) : null,
        due_date: form?.due_date || null,
      };
      let result;
      if (dispute?.id) {
        result = await supabase?.from('payment_disputes')?.update(payload)?.eq('id', dispute?.id)?.select()?.single();
      } else {
        result = await supabase?.from('payment_disputes')?.insert(payload)?.select()?.single();
      }
      if (result?.error) throw result?.error;
      onSaved();
      onClose();
    } catch (err) {
      setError(err?.message || 'Failed to save dispute');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">{dispute?.id ? 'Edit Dispute' : 'New Dispute / Chargeback'}</h2>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            <XCircle size={20} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={form?.title}
              onChange={e => handleChange('title', e?.target?.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
              placeholder="Brief description of the dispute"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select value={form?.dispute_type} onChange={e => handleChange('dispute_type', e?.target?.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="chargeback">Chargeback</option>
                <option value="dispute">Dispute</option>
                <option value="failed_reversal">Failed Reversal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={form?.dispute_status} onChange={e => handleChange('dispute_status', e?.target?.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                {Object.entries(STATUS_LABELS)?.map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={form?.priority} onChange={e => handleChange('priority', e?.target?.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={form?.description}
              onChange={e => handleChange('description', e?.target?.value)}
              rows={3}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Detailed description of the issue..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (PHP)</label>
              <input type="number" step="0.01" value={form?.amount} onChange={e => handleChange('amount', e?.target?.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="0.00" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
              <select value={form?.payment_method} onChange={e => handleChange('payment_method', e?.target?.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30">
                <option value="">Select method</option>
                <option value="gcash">GCash</option>
                <option value="maya">Maya</option>
                <option value="grab_pay">GrabPay</option>
                <option value="card">Card</option>
                <option value="qr_ph">QR Ph</option>
                <option value="online_banking">Online Banking</option>
                <option value="billease">BillEase</option>
                <option value="cash">Cash</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Payment Reference</label>
              <input type="text" value={form?.payment_reference} onChange={e => handleChange('payment_reference', e?.target?.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="PAY-REF-XXXXX" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">External Reference</label>
              <input type="text" value={form?.external_reference} onChange={e => handleChange('external_reference', e?.target?.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Bank/gateway case number" />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name</label>
              <input type="text" value={form?.customer_name} onChange={e => handleChange('customer_name', e?.target?.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="Full name" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Email</label>
              <input type="email" value={form?.customer_email} onChange={e => handleChange('customer_email', e?.target?.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="customer@email.com" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
            <input type="date" value={form?.due_date} onChange={e => handleChange('due_date', e?.target?.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Notes</label>
            <textarea value={form?.resolution_notes} onChange={e => handleChange('resolution_notes', e?.target?.value)}
              rows={2}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
              placeholder="Notes on how this was resolved..." />
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
              {saving && <RefreshCw size={14} className="animate-spin" />}
              {dispute?.id ? 'Save Changes' : 'Create Dispute'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ─── Detail / Communication Panel ────────────────────────────────────────────
const DisputeDetailPanel = ({ dispute, onClose, onUpdated }) => {
  const { userProfile } = useAuth();
  const [communications, setCommunications] = useState([]);
  const [loadingComms, setLoadingComms] = useState(true);
  const [newMessage, setNewMessage] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [sendingMsg, setSendingMsg] = useState(false);
  const [statusUpdating, setStatusUpdating] = useState(false);

  const loadCommunications = useCallback(async () => {
    setLoadingComms(true);
    try {
      const { data, error } = await supabase
        ?.from('dispute_communications')
        ?.select('*')
        ?.eq('dispute_id', dispute?.id)
        ?.order('created_at', { ascending: true });
      if (error) throw error;
      setCommunications(data || []);
    } catch (err) {
      console.error('Error loading communications:', err);
    } finally {
      setLoadingComms(false);
    }
  }, [dispute?.id]);

  useEffect(() => { loadCommunications(); }, [loadCommunications]);

  const handleSendMessage = async () => {
    if (!newMessage?.trim()) return;
    setSendingMsg(true);
    try {
      const { error } = await supabase?.from('dispute_communications')?.insert({
        dispute_id: dispute?.id,
        author_name: 'Admin',
        author_role: 'admin',
        message: newMessage?.trim(),
        is_internal: isInternal,
      });
      if (error) throw error;
      setNewMessage('');
      loadCommunications();
    } catch (err) {
      console.error('Error sending message:', err);
    } finally {
      setSendingMsg(false);
    }
  };

  const handleStatusChange = async (newStatus) => {
    setStatusUpdating(true);
    try {
      const updates = { dispute_status: newStatus };
      if (['resolved_won', 'resolved_lost', 'resolved_partial', 'closed']?.includes(newStatus)) {
        updates.resolved_at = new Date()?.toISOString();
      }
      const { error } = await supabase?.from('payment_disputes')?.update(updates)?.eq('id', dispute?.id);
      if (error) throw error;

      const isResolved = ['resolved_won', 'resolved_lost', 'resolved_partial']?.includes(newStatus);
      await logAdminAction({
        actionType: isResolved ? AUDIT_ACTIONS?.DISPUTE_RESOLVED : AUDIT_ACTIONS?.DISPUTE_CREATED,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: dispute?.id,
        targetType: 'dispute',
        targetName: dispute?.title,
        description: `Updated dispute status to "${STATUS_LABELS?.[newStatus] || newStatus}" for: ${dispute?.title}`,
        metadata: {
          old_status: dispute?.dispute_status,
          new_status: newStatus,
          dispute_type: dispute?.dispute_type,
          amount: dispute?.amount,
          customer_name: dispute?.customer_name,
        },
      });

      onUpdated();
    } catch (err) {
      console.error('Error updating status:', err);
    } finally {
      setStatusUpdating(false);
    }
  };

  const overdue = isOverdue(dispute?.due_date, dispute?.dispute_status);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex-1 min-w-0 pr-4">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${DISPUTE_TYPE_COLORS?.[dispute?.dispute_type]}`}>
                {DISPUTE_TYPE_LABELS?.[dispute?.dispute_type]}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS?.[dispute?.dispute_status]}`}>
                {STATUS_LABELS?.[dispute?.dispute_status]}
              </span>
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS?.[dispute?.priority]}`}>
                {dispute?.priority?.charAt(0)?.toUpperCase() + dispute?.priority?.slice(1)} Priority
              </span>
              {overdue && (
                <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-600 text-white flex items-center gap-1">
                  <AlertTriangle size={10} /> Overdue
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-gray-900 truncate">{dispute?.title}</h2>
            <p className="text-xs text-gray-500 mt-0.5">Created {formatDateTime(dispute?.created_at)}</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 flex-shrink-0">
            <XCircle size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Details Grid */}
          <div className="p-6 border-b border-gray-100">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Amount</p>
                <p className="text-sm font-bold text-gray-900">{formatCurrency(dispute?.amount)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Payment Method</p>
                <p className="text-sm font-semibold text-gray-900 capitalize">{dispute?.payment_method || '—'}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Due Date</p>
                <p className={`text-sm font-semibold ${overdue ? 'text-red-600' : 'text-gray-900'}`}>{formatDate(dispute?.due_date)}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="text-xs text-gray-500 mb-1">Payment Ref</p>
                <p className="text-sm font-mono text-gray-900 truncate">{dispute?.payment_reference || '—'}</p>
              </div>
            </div>

            {(dispute?.customer_name || dispute?.customer_email) && (
              <div className="flex items-center gap-2 text-sm text-gray-600 mb-3">
                <User size={14} className="text-gray-400" />
                <span className="font-medium">{dispute?.customer_name}</span>
                {dispute?.customer_email && <span className="text-gray-400">·</span>}
                <span className="text-gray-500">{dispute?.customer_email}</span>
              </div>
            )}

            {dispute?.description && (
              <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{dispute?.description}</p>
            )}

            {dispute?.resolution_notes && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1"><CheckCircle size={12} /> Resolution Notes</p>
                <p className="text-sm text-green-800">{dispute?.resolution_notes}</p>
              </div>
            )}

            {/* Quick Status Update */}
            <div className="mt-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Update Status</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(STATUS_LABELS)?.filter(([val]) => val !== dispute?.dispute_status)?.map(([val, label]) => (
                  <button key={val} onClick={() => handleStatusChange(val)} disabled={statusUpdating}
                    className={`text-xs px-3 py-1.5 rounded-full border font-medium transition-colors disabled:opacity-50 ${STATUS_COLORS?.[val]} hover:opacity-80`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Communication Log */}
          <div className="p-6">
            <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <MessageSquare size={16} className="text-gray-500" />
              Communication Log
              <span className="text-xs font-normal text-gray-400">({communications?.length} entries)</span>
            </h3>

            {loadingComms ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw size={18} className="animate-spin text-gray-400" />
              </div>
            ) : communications?.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">No communications yet</p>
              </div>
            ) : (
              <div className="space-y-3 mb-4">
                {communications?.map((comm) => (
                  <div key={comm?.id} className={`rounded-lg p-3 ${comm?.is_internal ? 'bg-amber-50 border border-amber-200' : 'bg-gray-50 border border-gray-200'}`}>
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-gray-800">{comm?.author_name}</span>
                        <span className="text-xs text-gray-400 capitalize">{comm?.author_role}</span>
                        {comm?.is_internal && (
                          <span className="text-xs bg-amber-200 text-amber-800 px-1.5 py-0.5 rounded font-medium flex items-center gap-1">
                            <Lock size={9} /> Internal
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-gray-400">{formatDateTime(comm?.created_at)}</span>
                    </div>
                    <p className="text-sm text-gray-700">{comm?.message}</p>
                  </div>
                ))}
              </div>
            )}

            {/* New Message */}
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <textarea
                value={newMessage}
                onChange={e => setNewMessage(e?.target?.value)}
                rows={3}
                className="w-full px-3 py-2 text-sm focus:outline-none resize-none"
                placeholder="Add a communication log entry..."
              />
              <div className="flex items-center justify-between px-3 py-2 bg-gray-50 border-t border-gray-200">
                <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer select-none">
                  <input type="checkbox" checked={isInternal} onChange={e => setIsInternal(e?.target?.checked)}
                    className="rounded border-gray-300 text-primary focus:ring-primary" />
                  <Lock size={12} /> Internal note (not visible to customer)
                </label>
                <button onClick={handleSendMessage} disabled={sendingMsg || !newMessage?.trim()}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-primary rounded-lg hover:bg-primary/90 disabled:opacity-50">
                  {sendingMsg ? <RefreshCw size={12} className="animate-spin" /> : <Send size={12} />}
                  Add Entry
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const ChargebacksDisputes = () => {
  const [disputes, setDisputes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [showFormModal, setShowFormModal] = useState(false);
  const [editingDispute, setEditingDispute] = useState(null);
  const [viewingDispute, setViewingDispute] = useState(null);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const loadDisputes = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        ?.from('payment_disputes')
        ?.select('*')
        ?.order(sortField, { ascending: sortDir === 'asc' });
      if (error) throw error;
      setDisputes(data || []);
    } catch (err) {
      console.error('Error loading disputes:', err);
    } finally {
      setLoading(false);
    }
  }, [sortField, sortDir]);

  useEffect(() => { loadDisputes(); }, [loadDisputes]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={14} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={14} className="text-gray-600" /> : <ChevronDown size={14} className="text-gray-600" />;
  };

  const filtered = disputes?.filter(d => {
    const matchSearch = !search ||
      d?.title?.toLowerCase()?.includes(search?.toLowerCase()) ||
      d?.customer_name?.toLowerCase()?.includes(search?.toLowerCase()) ||
      d?.customer_email?.toLowerCase()?.includes(search?.toLowerCase()) ||
      d?.payment_reference?.toLowerCase()?.includes(search?.toLowerCase());
    const matchType = typeFilter === 'all' || d?.dispute_type === typeFilter;
    const matchStatus = statusFilter === 'all' || d?.dispute_status === statusFilter;
    const matchPriority = priorityFilter === 'all' || d?.priority === priorityFilter;
    return matchSearch && matchType && matchStatus && matchPriority;
  });

  // Stats
  const stats = {
    total: disputes?.length,
    open: disputes?.filter(d => d?.dispute_status === 'open')?.length,
    underReview: disputes?.filter(d => d?.dispute_status === 'under_review')?.length,
    overdue: disputes?.filter(d => isOverdue(d?.due_date, d?.dispute_status))?.length,
    totalAmount: disputes?.reduce((sum, d) => sum + (parseFloat(d?.amount) || 0), 0),
  };

  const handleViewDetail = async (dispute) => {
    setViewingDispute(dispute);
  };

  const handleDetailUpdated = () => {
    loadDisputes();
    // Refresh the viewing dispute data
    setViewingDispute(prev => {
      if (!prev) return null;
      return disputes?.find(d => d?.id === prev?.id) || prev;
    });
  };

  return (
    <div className="space-y-6">
      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <FileText size={16} className="text-gray-500" />
            <span className="text-xs text-gray-500">Total Cases</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.total}</p>
        </div>
        <div className="bg-white rounded-lg border border-yellow-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock size={16} className="text-yellow-500" />
            <span className="text-xs text-gray-500">Open</span>
          </div>
          <p className="text-2xl font-bold text-yellow-600">{stats?.open}</p>
        </div>
        <div className="bg-white rounded-lg border border-blue-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Eye size={16} className="text-blue-500" />
            <span className="text-xs text-gray-500">Under Review</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats?.underReview}</p>
        </div>
        <div className="bg-white rounded-lg border border-red-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-xs text-gray-500">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats?.overdue}</p>
        </div>
        <div className="bg-white rounded-lg border border-gray-200 p-4 col-span-2 sm:col-span-1">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={16} className="text-gray-500" />
            <span className="text-xs text-gray-500">Total Disputed</span>
          </div>
          <p className="text-lg font-bold text-gray-900">{formatCurrency(stats?.totalAmount)}</p>
        </div>
      </div>
      {/* Toolbar */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e?.target?.value)}
              placeholder="Search by title, customer, or reference..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <div className="flex gap-2 flex-wrap">
            <select value={typeFilter} onChange={e => setTypeFilter(e?.target?.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="all">All Types</option>
              <option value="chargeback">Chargeback</option>
              <option value="dispute">Dispute</option>
              <option value="failed_reversal">Failed Reversal</option>
            </select>
            <select value={statusFilter} onChange={e => setStatusFilter(e?.target?.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="all">All Statuses</option>
              {Object.entries(STATUS_LABELS)?.map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
            <select value={priorityFilter} onChange={e => setPriorityFilter(e?.target?.value)}
              className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30">
              <option value="all">All Priorities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
            <button onClick={loadDisputes} className="p-2 border border-gray-300 rounded-lg text-gray-500 hover:bg-gray-50">
              <RefreshCw size={16} />
            </button>
            <button onClick={() => { setEditingDispute(null); setShowFormModal(true); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-primary rounded-lg hover:bg-primary/90">
              <Plus size={16} /> New Case
            </button>
          </div>
        </div>
      </div>
      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <RefreshCw size={24} className="animate-spin text-gray-400" />
          </div>
        ) : filtered?.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <AlertTriangle size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No disputes found</p>
            <p className="text-xs mt-1">Try adjusting your filters or create a new case</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('title')} className="flex items-center gap-1 hover:text-gray-700">
                      Case <SortIcon field="title" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Type</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Priority</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('amount')} className="flex items-center gap-1 hover:text-gray-700">
                      Amount <SortIcon field="amount" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('due_date')} className="flex items-center gap-1 hover:text-gray-700">
                      Due Date <SortIcon field="due_date" />
                    </button>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    <button onClick={() => handleSort('created_at')} className="flex items-center gap-1 hover:text-gray-700">
                      Created <SortIcon field="created_at" />
                    </button>
                  </th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered?.map((dispute) => {
                  const overdue = isOverdue(dispute?.due_date, dispute?.dispute_status);
                  return (
                    <tr key={dispute?.id} className={`hover:bg-gray-50 transition-colors ${overdue ? 'bg-red-50/30' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="max-w-xs">
                          <p className="font-medium text-gray-900 truncate">{dispute?.title}</p>
                          {dispute?.payment_reference && (
                            <p className="text-xs text-gray-400 font-mono truncate">{dispute?.payment_reference}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${DISPUTE_TYPE_COLORS?.[dispute?.dispute_type]}`}>
                          {DISPUTE_TYPE_LABELS?.[dispute?.dispute_type]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS?.[dispute?.dispute_status]}`}>
                          {STATUS_LABELS?.[dispute?.dispute_status]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${PRIORITY_COLORS?.[dispute?.priority]}`}>
                          {dispute?.priority?.charAt(0)?.toUpperCase() + dispute?.priority?.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(dispute?.amount)}</td>
                      <td className="px-4 py-3">
                        <div>
                          <p className="text-gray-800 font-medium truncate max-w-[120px]">{dispute?.customer_name || '—'}</p>
                          <p className="text-xs text-gray-400 truncate max-w-[120px]">{dispute?.customer_email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                          {overdue && <AlertTriangle size={12} />}
                          <span className="text-xs">{formatDate(dispute?.due_date)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-400">{formatDate(dispute?.created_at)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button onClick={() => handleViewDetail(dispute)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors" title="View Details">
                            <MessageSquare size={15} />
                          </button>
                          <button onClick={() => { setEditingDispute(dispute); setShowFormModal(true); }}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors" title="Edit">
                            <FileText size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && filtered?.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
            Showing {filtered?.length} of {disputes?.length} cases
          </div>
        )}
      </div>
      {/* Modals */}
      {showFormModal && (
        <DisputeFormModal
          dispute={editingDispute}
          onClose={() => { setShowFormModal(false); setEditingDispute(null); }}
          onSaved={loadDisputes}
        />
      )}
      {viewingDispute && (
        <DisputeDetailPanel
          dispute={viewingDispute}
          onClose={() => setViewingDispute(null)}
          onUpdated={() => { loadDisputes(); }}
        />
      )}
    </div>
  );
};

export default ChargebacksDisputes;
