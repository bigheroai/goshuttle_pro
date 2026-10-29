import React, { useState } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';

const STATUS_CONFIG = {
  pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', dot: 'bg-yellow-400', label: 'Pending' },
  confirmed: { color: 'bg-blue-100 text-blue-800 border-blue-200', dot: 'bg-blue-400', label: 'Confirmed' },
  in_progress: { color: 'bg-purple-100 text-purple-800 border-purple-200', dot: 'bg-purple-400', label: 'In Progress' },
  completed: { color: 'bg-green-100 text-green-800 border-green-200', dot: 'bg-green-400', label: 'Completed' },
  cancelled: { color: 'bg-red-100 text-red-800 border-red-200', dot: 'bg-red-400', label: 'Cancelled' },
  flagged: { color: 'bg-orange-100 text-orange-800 border-orange-200', dot: 'bg-orange-400', label: 'Flagged' },
};

const FLAG_REASONS = [
  'Payment issue',
  'Customer complaint',
  'Driver no-show',
  'Route problem',
  'Suspicious activity',
  'Requires manual review',
  'Other',
];

const OpsBookingTable = ({ bookings, onUpdate, loading }) => {
  const [actionLoading, setActionLoading] = useState(null);
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showInterventionModal, setShowInterventionModal] = useState(false);
  const [flagReason, setFlagReason] = useState('');
  const [flagNote, setFlagNote] = useState('');
  const [interventionNote, setInterventionNote] = useState('');
  const [interventionStatus, setInterventionStatus] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const filteredBookings = (bookings || [])?.filter(b => {
    const code = (b?.booking_code || b?.bookingCode || '')?.toLowerCase();
    const pickup = (b?.pickup_location || b?.pickupLocation || '')?.toLowerCase();
    const dropoff = (b?.dropoff_location || b?.dropoffLocation || '')?.toLowerCase();
    const email = (b?.primary_passenger_email || b?.guest_email || b?.user_profiles?.email || '')?.toLowerCase();
    const name = (b?.user_profiles?.full_name || b?.primary_passenger_first_name || '')?.toLowerCase();
    const q = searchQuery?.toLowerCase();
    const matchesSearch = !q || code?.includes(q) || pickup?.includes(q) || dropoff?.includes(q) || email?.includes(q) || name?.includes(q);
    const matchesStatus = statusFilter === 'all' || b?.status === statusFilter || (statusFilter === 'flagged' && b?.is_flagged);
    return matchesSearch && matchesStatus;
  });

  const handleFlagBooking = async () => {
    if (!selectedBooking || !flagReason) return;
    setActionLoading(selectedBooking?.id);
    try {
      const { error } = await supabase?.from('bookings')?.update({
          is_flagged: true,
          flag_reason: flagReason,
          flag_note: flagNote,
          flagged_at: new Date()?.toISOString(),
          updated_at: new Date()?.toISOString(),
        })?.eq('id', selectedBooking?.id);
      if (error) throw error;
      setShowFlagModal(false);
      setFlagReason('');
      setFlagNote('');
      setSelectedBooking(null);
      onUpdate?.();
    } catch (err) {
      console.error('Flag error:', err);
      alert('Failed to flag booking: ' + err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleUnflagBooking = async (booking) => {
    setActionLoading(booking?.id);
    try {
      const { error } = await supabase?.from('bookings')?.update({
          is_flagged: false,
          flag_reason: null,
          flag_note: null,
          flagged_at: null,
          updated_at: new Date()?.toISOString(),
        })?.eq('id', booking?.id);
      if (error) throw error;
      onUpdate?.();
    } catch (err) {
      console.error('Unflag error:', err);
      alert('Failed to unflag booking: ' + err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const handleIntervene = async () => {
    if (!selectedBooking || !interventionStatus) return;
    setActionLoading(selectedBooking?.id);
    try {
      const updatePayload = {
        status: interventionStatus,
        ops_intervention_note: interventionNote,
        ops_intervened_at: new Date()?.toISOString(),
        updated_at: new Date()?.toISOString(),
      };
      if (interventionStatus !== 'flagged') {
        updatePayload.is_flagged = false;
      }
      const { error } = await supabase?.from('bookings')?.update(updatePayload)?.eq('id', selectedBooking?.id);
      if (error) throw error;
      setShowInterventionModal(false);
      setInterventionNote('');
      setInterventionStatus('');
      setSelectedBooking(null);
      onUpdate?.();
    } catch (err) {
      console.error('Intervention error:', err);
      alert('Failed to update booking: ' + err?.message);
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (booking) => {
    const status = booking?.is_flagged ? 'flagged' : (booking?.status || 'pending');
    const cfg = STATUS_CONFIG?.[status] || STATUS_CONFIG?.pending;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${cfg?.color}`}>
        <span className={`w-1.5 h-1.5 rounded-full ${cfg?.dot}`}></span>
        {cfg?.label}
      </span>
    );
  };

  const getCustomerInfo = (booking) => {
    const isGuest = booking?.is_guest_booking || booking?.isGuestBooking;
    if (isGuest) {
      const fn = booking?.primary_passenger_first_name || booking?.primaryPassengerFirstName || '';
      const ln = booking?.primary_passenger_last_name || booking?.primaryPassengerLastName || '';
      const name = `${fn} ${ln}`?.trim() || booking?.guest_name || 'Guest';
      const email = booking?.primary_passenger_email || booking?.guest_email || '';
      return { name, email, isGuest: true };
    }
    return {
      name: booking?.user_profiles?.full_name || 'User',
      email: booking?.user_profiles?.email || '',
      isGuest: false,
    };
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Icon name="Search" size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by code, route, email, name..."
            value={searchQuery}
            onChange={e => setSearchQuery(e?.target?.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
          />
        </div>
        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e?.target?.value)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 bg-white"
        >
          <option value="all">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="in_progress">In Progress</option>
          <option value="completed">Completed</option>
          <option value="cancelled">Cancelled</option>
          <option value="flagged">Flagged</option>
        </select>
        <div className="text-sm text-gray-500 flex items-center whitespace-nowrap">
          {filteredBookings?.length} of {bookings?.length || 0} bookings
        </div>
      </div>
      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Icon name="Loader2" size={24} className="animate-spin text-primary mr-2" />
            <span className="text-gray-500 text-sm">Loading bookings...</span>
          </div>
        ) : filteredBookings?.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <Icon name="CalendarX" size={40} className="mb-3 opacity-40" />
            <p className="text-sm font-medium">No bookings found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Booking</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Route</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filteredBookings?.map(booking => {
                  const customer = getCustomerInfo(booking);
                  const code = booking?.booking_code || booking?.bookingCode || booking?.id?.slice(0, 8);
                  const pickup = booking?.pickup_location || booking?.pickupLocation || '—';
                  const dropoff = booking?.dropoff_location || booking?.dropoffLocation || '—';
                  const date = booking?.pickup_date || booking?.pickupDate;
                  const isLoading = actionLoading === booking?.id;

                  return (
                    <tr key={booking?.id} className={`hover:bg-gray-50 transition-colors ${booking?.is_flagged ? 'bg-orange-50/40' : ''}`}>
                      <td className="px-4 py-3">
                        <div className="font-mono text-xs font-semibold text-gray-800">{code}</div>
                        {booking?.ops_intervention_note && (
                          <div className="text-xs text-blue-600 mt-0.5 flex items-center gap-1">
                            <Icon name="MessageSquare" size={10} />
                            <span className="truncate max-w-[120px]">{booking?.ops_intervention_note}</span>
                          </div>
                        )}
                        {booking?.flag_reason && (
                          <div className="text-xs text-orange-600 mt-0.5 flex items-center gap-1">
                            <Icon name="Flag" size={10} />
                            <span>{booking?.flag_reason}</span>
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-800 text-xs">{customer?.name}</div>
                        <div className="text-gray-400 text-xs truncate max-w-[140px]">{customer?.email}</div>
                        {customer?.isGuest && (
                          <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded mt-0.5 inline-block">Guest</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-700 max-w-[160px]">
                          <span className="block truncate">{pickup}</span>
                          <span className="text-gray-400">→</span>
                          <span className="block truncate">{dropoff}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                        {date ? new Date(date)?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(booking)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {/* Flag / Unflag */}
                          {booking?.is_flagged ? (
                            <button
                              onClick={() => handleUnflagBooking(booking)}
                              disabled={isLoading}
                              title="Remove flag"
                              className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
                            >
                              {isLoading ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="FlagOff" size={14} />}
                            </button>
                          ) : (
                            <button
                              onClick={() => { setSelectedBooking(booking); setShowFlagModal(true); }}
                              disabled={isLoading}
                              title="Flag issue"
                              className="p-1.5 rounded-lg text-gray-400 hover:text-orange-600 hover:bg-orange-50 transition-colors disabled:opacity-50"
                            >
                              <Icon name="Flag" size={14} />
                            </button>
                          )}
                          {/* Intervene */}
                          <button
                            onClick={() => { setSelectedBooking(booking); setInterventionStatus(booking?.status || 'pending'); setShowInterventionModal(true); }}
                            disabled={isLoading}
                            title="Manual intervention"
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors disabled:opacity-50"
                          >
                            <Icon name="Wrench" size={14} />
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
      </div>
      {/* Flag Modal */}
      {showFlagModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                  <Icon name="Flag" size={16} className="text-orange-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Flag Booking Issue</h3>
              </div>
              <button onClick={() => { setShowFlagModal(false); setFlagReason(''); setFlagNote(''); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <Icon name="X" size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Booking: <span className="font-mono font-semibold text-gray-700">{selectedBooking?.booking_code || selectedBooking?.bookingCode || selectedBooking?.id?.slice(0, 8)}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Reason <span className="text-red-500">*</span></label>
                <select
                  value={flagReason}
                  onChange={e => setFlagReason(e?.target?.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white"
                >
                  <option value="">Select a reason...</option>
                  {FLAG_REASONS?.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Additional Notes</label>
                <textarea
                  value={flagNote}
                  onChange={e => setFlagNote(e?.target?.value)}
                  rows={3}
                  placeholder="Describe the issue in detail..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-300 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <Button variant="outline" className="flex-1" onClick={() => { setShowFlagModal(false); setFlagReason(''); setFlagNote(''); }}>Cancel</Button>
              <button
                onClick={handleFlagBooking}
                disabled={!flagReason || actionLoading === selectedBooking?.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === selectedBooking?.id ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Flag" size={14} />}
                Flag Booking
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Intervention Modal */}
      {showInterventionModal && selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                  <Icon name="Wrench" size={16} className="text-blue-600" />
                </div>
                <h3 className="font-semibold text-gray-900">Manual Intervention</h3>
              </div>
              <button onClick={() => { setShowInterventionModal(false); setInterventionNote(''); setInterventionStatus(''); }} className="p-1 hover:bg-gray-100 rounded-lg">
                <Icon name="X" size={18} className="text-gray-500" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Booking: <span className="font-mono font-semibold text-gray-700">{selectedBooking?.booking_code || selectedBooking?.bookingCode || selectedBooking?.id?.slice(0, 8)}</span></p>
                <p className="text-xs text-gray-500">Current status: <span className="font-medium text-gray-700 capitalize">{selectedBooking?.status}</span></p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Update Status <span className="text-red-500">*</span></label>
                <select
                  value={interventionStatus}
                  onChange={e => setInterventionStatus(e?.target?.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="">Select new status...</option>
                  <option value="pending">Pending</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Ops Note</label>
                <textarea
                  value={interventionNote}
                  onChange={e => setInterventionNote(e?.target?.value)}
                  rows={3}
                  placeholder="Reason for manual intervention..."
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 resize-none"
                />
              </div>
            </div>
            <div className="flex gap-3 p-5 pt-0">
              <Button variant="outline" className="flex-1" onClick={() => { setShowInterventionModal(false); setInterventionNote(''); setInterventionStatus(''); }}>Cancel</Button>
              <button
                onClick={handleIntervene}
                disabled={!interventionStatus || actionLoading === selectedBooking?.id}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {actionLoading === selectedBooking?.id ? <Icon name="Loader2" size={14} className="animate-spin" /> : <Icon name="Wrench" size={14} />}
                Apply Intervention
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpsBookingTable;
