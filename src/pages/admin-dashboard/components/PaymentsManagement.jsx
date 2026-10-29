import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../../lib/supabase';
import { Search, RefreshCw, CreditCard, Smartphone, DollarSign, CheckCircle, XCircle, Clock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import paymongoService from '../../../services/paymongoService';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-blue-100 text-blue-800',
  paid: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
  refunded: 'bg-purple-100 text-purple-800',
  cancelled: 'bg-gray-100 text-gray-700',
};

const METHOD_ICONS = {
  gcash: <Smartphone size={14} className="text-blue-500" />,
  paymaya: <Smartphone size={14} className="text-green-500" />,
  maya: <Smartphone size={14} className="text-green-500" />,
  card: <CreditCard size={14} className="text-gray-600" />,
  grab_pay: <Smartphone size={14} className="text-green-600" />,
  cash: <DollarSign size={14} className="text-yellow-600" />,
};

const formatMethod = (method) => {
  if (!method) return 'N/A';
  const map = { gcash: 'GCash', paymaya: 'Maya', maya: 'Maya', card: 'Card', grab_pay: 'GrabPay', cash: 'Cash', qrph: 'QR Ph', dob: 'Online Banking', billease: 'BillEase' };
  return map?.[method?.toLowerCase()] || method;
};

const formatCurrency = (amount) => {
  if (!amount && amount !== 0) return '—';
  return `₱${parseFloat(amount)?.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const PaymentsManagement = () => {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [methodFilter, setMethodFilter] = useState('all');
  const [refundingId, setRefundingId] = useState(null);
  const [refundError, setRefundError] = useState({});
  const [refundSuccess, setRefundSuccess] = useState({});
  const [expandedId, setExpandedId] = useState(null);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  const loadPayments = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        ?.from('bookings')
        ?.select(`
          id, booking_code, total_cost, payment_method, payment_status, payment_reference,
          status, created_at, cancelled_at, cancel_reason,
          guest_name, guest_email, is_guest_booking,
          primary_passenger_first_name, primary_passenger_last_name, primary_passenger_email,
          user_profiles!bookings_user_id_fkey(full_name, email),
          vehicles!bookings_vehicle_id_fkey(name, vehicle_type),
          pickup_location, dropoff_location
        `)
        ?.order('created_at', { ascending: false });

      if (error) throw error;
      setPayments(data || []);
    } catch (err) {
      console.error('Error loading payments:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadPayments(); }, [loadPayments]);

  const getPassengerName = (p) => {
    if (p?.user_profiles?.full_name) return p?.user_profiles?.full_name;
    if (p?.guest_name) return p?.guest_name;
    if (p?.primary_passenger_first_name) return `${p?.primary_passenger_first_name} ${p?.primary_passenger_last_name || ''}`?.trim();
    return 'Guest';
  };

  const getDisplayStatus = (p) => {
    if (p?.status === 'cancelled') return 'cancelled';
    if (p?.payment_status) return p?.payment_status;
    return p?.status || 'pending';
  };

  const handleRefund = async (booking) => {
    if (!window.confirm(`Process refund for booking ${booking?.booking_code || booking?.id?.substring(0, 8)?.toUpperCase()}?\n\nAmount: ${formatCurrency(booking?.total_cost)}\n\nThis will call PayMongo's refund API and mark the booking as cancelled.`)) return;

    setRefundingId(booking?.id);
    setRefundError(prev => ({ ...prev, [booking?.id]: null }));
    setRefundSuccess(prev => ({ ...prev, [booking?.id]: null }));

    try {
      const secretKey = await paymongoService?.getSecretKey();
      let refundResult = null;

      // Attempt PayMongo refund if there's a payment reference
      if (secretKey && booking?.payment_reference) {
        try {
          const amountInCentavos = Math.round(parseFloat(booking?.total_cost || 0) * 100);
          const response = await fetch('https://api.paymongo.com/v1/refunds', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': 'Basic ' + btoa(secretKey + ':'),
            },
            body: JSON.stringify({
              data: {
                attributes: {
                  amount: amountInCentavos,
                  payment_id: booking?.payment_reference,
                  reason: 'requested_by_customer',
                  notes: `Admin refund for booking ${booking?.booking_code || booking?.id}`,
                },
              },
            }),
          });
          const result = await response?.json();
          if (!response?.ok) {
            const errMsg = result?.errors?.[0]?.detail || 'PayMongo refund API error';
            throw new Error(errMsg);
          }
          refundResult = result?.data?.id;
        } catch (paymongoErr) {
          // If PayMongo refund fails, still update booking status but note the error
          console.warn('PayMongo refund API error (continuing with status update):', paymongoErr?.message);
          setRefundError(prev => ({ ...prev, [booking?.id]: `PayMongo: ${paymongoErr?.message}. Booking status updated to cancelled.` }));
        }
      }

      // Update booking status in Supabase
      const { error: updateError } = await supabase
        ?.from('bookings')
        ?.update({
          status: 'cancelled',
          payment_status: 'refunded',
          cancelled_at: new Date()?.toISOString(),
          cancel_reason: 'Admin initiated refund/reversal',
          ...(refundResult ? { payment_reference: refundResult } : {}),
        })
        ?.eq('id', booking?.id);

      if (updateError) throw updateError;

      // Send refund notice email to customer
      try {
        const customerEmail =
          booking?.user_profiles?.email ||
          booking?.primary_passenger_email ||
          booking?.guest_email ||
          null;
        if (customerEmail) {
          const vehicle = booking?.vehicles;
          const customerName =
            booking?.user_profiles?.full_name ||
            booking?.guest_name ||
            (booking?.primary_passenger_first_name
              ? `${booking?.primary_passenger_first_name} ${booking?.primary_passenger_last_name || ''}`?.trim()
              : 'Valued Customer');

          const { data: { session } } = await supabase?.auth?.getSession();
          const accessToken = session?.access_token;

          await fetch(`${import.meta.env?.VITE_SUPABASE_URL}/functions/v1/send-booking-confirmation`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${accessToken || import.meta.env?.VITE_SUPABASE_ANON_KEY}`,
            },
            body: JSON.stringify({
              type: 'refund_notice',
              customer_email: customerEmail,
              booking_data: {
                booking_id: booking?.booking_code || booking?.id?.substring(0, 8)?.toUpperCase(),
                booking_code: booking?.booking_code,
                customer_name: customerName,
                customer_email: customerEmail,
                pickup_location: booking?.pickup_location,
                dropoff_location: booking?.dropoff_location,
                pickup_date: booking?.pickup_date,
                pickup_time: booking?.pickup_time,
                vehicle_name: vehicle?.name,
                vehicle_type: vehicle?.vehicle_type,
                total_cost: booking?.total_cost,
                payment_reference: refundResult || booking?.payment_reference,
                refund_reference: refundResult || null,
                cancel_reason: 'Admin initiated refund/reversal',
                refunded_at: new Date()?.toISOString(),
              },
            }),
          });
        }
      } catch (emailErr) {
        console.warn('Refund notice email failed (non-blocking):', emailErr);
      }

      setRefundSuccess(prev => ({ ...prev, [booking?.id]: refundResult ? `Refunded via PayMongo (${refundResult})` : 'Booking cancelled & marked as refunded' }));
      await loadPayments();
    } catch (err) {
      setRefundError(prev => ({ ...prev, [booking?.id]: err?.message || 'Refund failed' }));
    } finally {
      setRefundingId(null);
    }
  };

  const filtered = payments?.filter(p => {
    const name = getPassengerName(p)?.toLowerCase();
    const code = (p?.booking_code || p?.id || '')?.toLowerCase();
    const q = search?.toLowerCase();
    const matchSearch = !q || name?.includes(q) || code?.includes(q) || p?.payment_reference?.toLowerCase()?.includes(q);
    const displayStatus = getDisplayStatus(p);
    const matchStatus = statusFilter === 'all' || displayStatus === statusFilter;
    const matchMethod = methodFilter === 'all' || (p?.payment_method || '')?.toLowerCase() === methodFilter;
    return matchSearch && matchStatus && matchMethod;
  });

  const sorted = [...(filtered || [])]?.sort((a, b) => {
    let av = a?.[sortField], bv = b?.[sortField];
    if (sortField === 'total_cost') { av = parseFloat(av || 0); bv = parseFloat(bv || 0); }
    if (sortField === 'created_at') { av = new Date(av); bv = new Date(bv); }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown size={12} className="text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp size={12} className="text-gray-600" /> : <ChevronDown size={12} className="text-gray-600" />;
  };

  const canRefund = (p) => {
    const s = getDisplayStatus(p);
    return s !== 'cancelled' && s !== 'refunded';
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by passenger, booking code, reference..."
              value={search}
              onChange={e => setSearch(e?.target?.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e?.target?.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="paid">Paid</option>
            <option value="failed">Failed</option>
            <option value="refunded">Refunded</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <select
            value={methodFilter}
            onChange={e => setMethodFilter(e?.target?.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="all">All Methods</option>
            <option value="gcash">GCash</option>
            <option value="paymaya">Maya</option>
            <option value="card">Card</option>
            <option value="grab_pay">GrabPay</option>
            <option value="cash">Cash</option>
          </select>
          <button
            onClick={loadPayments}
            className="flex items-center gap-2 px-3 py-2 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        </div>
      </div>
      {/* Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => toggleSort('booking_code')}>
                  <div className="flex items-center gap-1">Booking ID <SortIcon field="booking_code" /></div>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Passenger</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => toggleSort('total_cost')}>
                  <div className="flex items-center gap-1">Amount <SortIcon field="total_cost" /></div>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Method</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600 cursor-pointer hover:text-gray-900" onClick={() => toggleSort('created_at')}>
                  <div className="flex items-center gap-1">Date <SortIcon field="created_at" /></div>
                </th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">Loading payments...</td></tr>
              ) : sorted?.length === 0 ? (
                <tr><td colSpan={7} className="text-center py-12 text-gray-400">No payments found</td></tr>
              ) : sorted?.map(p => {
                const displayStatus = getDisplayStatus(p);
                const isExpanded = expandedId === p?.id;
                return (
                  <React.Fragment key={p?.id}>
                    <tr className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : p?.id)}
                          className="font-mono text-xs font-semibold text-primary hover:underline"
                        >
                          {p?.booking_code || p?.id?.substring(0, 8)?.toUpperCase()}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-gray-900">{getPassengerName(p)}</div>
                        <div className="text-xs text-gray-400">{p?.user_profiles?.email || p?.guest_email || p?.primary_passenger_email || ''}</div>
                      </td>
                      <td className="px-4 py-3 font-semibold text-gray-900">{formatCurrency(p?.total_cost)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {METHOD_ICONS?.[p?.payment_method?.toLowerCase()] || <DollarSign size={14} className="text-gray-400" />}
                          <span className="text-gray-700">{formatMethod(p?.payment_method)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600 text-xs">
                        {p?.created_at ? new Date(p.created_at)?.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }) : '—'}
                        <div className="text-gray-400">{p?.created_at ? new Date(p.created_at)?.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : ''}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS?.[displayStatus] || 'bg-gray-100 text-gray-600'}`}>
                          {displayStatus === 'paid' && <CheckCircle size={10} />}
                          {displayStatus === 'failed' && <XCircle size={10} />}
                          {displayStatus === 'pending' && <Clock size={10} />}
                          {displayStatus === 'refunded' && <AlertCircle size={10} />}
                          {displayStatus?.charAt(0)?.toUpperCase() + displayStatus?.slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {canRefund(p) && (
                          <button
                            onClick={() => handleRefund(p)}
                            disabled={refundingId === p?.id}
                            className="text-xs px-3 py-1.5 bg-red-50 text-red-600 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                          >
                            {refundingId === p?.id ? 'Processing...' : 'Refund'}
                          </button>
                        )}
                      </td>
                    </tr>
                    {/* Feedback rows */}
                    {refundError?.[p?.id] && (
                      <tr className="bg-red-50">
                        <td colSpan={7} className="px-4 py-2 text-xs text-red-700 flex items-center gap-1">
                          <XCircle size={12} /> {refundError?.[p?.id]}
                        </td>
                      </tr>
                    )}
                    {refundSuccess?.[p?.id] && (
                      <tr className="bg-green-50">
                        <td colSpan={7} className="px-4 py-2 text-xs text-green-700 flex items-center gap-1">
                          <CheckCircle size={12} /> {refundSuccess?.[p?.id]}
                        </td>
                      </tr>
                    )}
                    {/* Expanded detail row */}
                    {isExpanded && (
                      <tr className="bg-blue-50/40">
                        <td colSpan={7} className="px-4 py-3">
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                            <div>
                              <p className="text-gray-400 font-medium mb-0.5">Route</p>
                              <p className="text-gray-700">{p?.pickup_location} → {p?.dropoff_location}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 font-medium mb-0.5">Vehicle</p>
                              <p className="text-gray-700">{p?.vehicles?.name || '—'} ({p?.vehicles?.vehicle_type || '—'})</p>
                            </div>
                            <div>
                              <p className="text-gray-400 font-medium mb-0.5">Payment Reference</p>
                              <p className="text-gray-700 font-mono">{p?.payment_reference || '—'}</p>
                            </div>
                            <div>
                              <p className="text-gray-400 font-medium mb-0.5">Booking Status</p>
                              <p className="text-gray-700 capitalize">{p?.status || '—'}</p>
                            </div>
                            {p?.cancel_reason && (
                              <div className="col-span-2 sm:col-span-4">
                                <p className="text-gray-400 font-medium mb-0.5">Cancel Reason</p>
                                <p className="text-gray-700">{p?.cancel_reason}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        {sorted?.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-400">
            Showing {sorted?.length} of {payments?.length} payments
          </div>
        )}
      </div>
    </div>
  );
};

export default PaymentsManagement;
