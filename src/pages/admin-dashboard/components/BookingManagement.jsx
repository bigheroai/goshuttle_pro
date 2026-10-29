import React, { useState, useMemo } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';

const BookingManagement = ({ bookings, onUpdate }) => {
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resendingEmail, setResendingEmail] = useState(false);
  const [resendEmailStatus, setResendEmailStatus] = useState(null);

  // Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [customerNameFilter, setCustomerNameFilter] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  // Sort state
  const [sortOrder, setSortOrder] = useState('newest'); // 'newest' | 'oldest' | 'pickup_asc' | 'pickup_desc'

  // Bulk selection state
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [bulkLoading, setBulkLoading] = useState(false);
  const [bulkAction, setBulkAction] = useState(''); // 'delete' | 'flag'

  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'completed', label: 'Completed' },
    { value: 'cancelled', label: 'Cancelled' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First' },
    { value: 'oldest', label: 'Oldest First' },
    { value: 'pickup_asc', label: 'Pickup Date ↑' },
    { value: 'pickup_desc', label: 'Pickup Date ↓' },
  ];

  const filteredBookings = useMemo(() => {
    let list = (bookings || [])?.filter(booking => {
      const isGuest = booking?.is_guest_booking || booking?.isGuestBooking;
      const guestFirstName = booking?.primaryPassengerFirstName || booking?.primary_passenger_first_name || '';
      const guestLastName = booking?.primaryPassengerLastName || booking?.primary_passenger_last_name || '';
      const guestFullName = isGuest && (guestFirstName || guestLastName)
        ? `${guestFirstName} ${guestLastName}`?.trim()
        : (booking?.guest_name || booking?.guestName || '');
      const customerName = booking?.user_profiles?.full_name || guestFullName || '';
      const guestEmail = booking?.primaryPassengerEmail || booking?.primary_passenger_email || booking?.guest_email || booking?.guestEmail || '';
      const customerEmail = booking?.user_profiles?.email || guestEmail || '';
      const bookingCode = booking?.bookingCode || booking?.booking_code || '';
      const pickup = booking?.pickupLocation || booking?.pickup_location || '';
      const dropoff = booking?.dropoffLocation || booking?.dropoff_location || '';

      if (searchQuery) {
        const q = searchQuery?.toLowerCase();
        const matchesSearch =
          bookingCode?.toLowerCase()?.includes(q) ||
          pickup?.toLowerCase()?.includes(q) ||
          dropoff?.toLowerCase()?.includes(q) ||
          customerEmail?.toLowerCase()?.includes(q);
        if (!matchesSearch) return false;
      }

      if (customerNameFilter) {
        if (!customerName?.toLowerCase()?.includes(customerNameFilter?.toLowerCase())) return false;
      }

      if (statusFilter !== 'all' && booking?.status !== statusFilter) return false;

      const pickupDate = booking?.pickupDate || booking?.pickup_date;
      if (dateFrom && pickupDate) {
        if (new Date(pickupDate) < new Date(dateFrom)) return false;
      }
      if (dateTo && pickupDate) {
        const endOfDay = new Date(dateTo);
        endOfDay?.setHours(23, 59, 59, 999);
        if (new Date(pickupDate) > endOfDay) return false;
      }

      return true;
    });

    // Apply sort
    list = [...list]?.sort((a, b) => {
      if (sortOrder === 'newest') {
        return new Date(b?.created_at || b?.createdAt || 0) - new Date(a?.created_at || a?.createdAt || 0);
      } else if (sortOrder === 'oldest') {
        return new Date(a?.created_at || a?.createdAt || 0) - new Date(b?.created_at || b?.createdAt || 0);
      } else if (sortOrder === 'pickup_asc') {
        return new Date(a?.pickupDate || a?.pickup_date || 0) - new Date(b?.pickupDate || b?.pickup_date || 0);
      } else if (sortOrder === 'pickup_desc') {
        return new Date(b?.pickupDate || b?.pickup_date || 0) - new Date(a?.pickupDate || a?.pickup_date || 0);
      }
      return 0;
    });

    return list;
  }, [bookings, searchQuery, customerNameFilter, statusFilter, dateFrom, dateTo, sortOrder]);

  // Select all / deselect all
  const allSelected = filteredBookings?.length > 0 && filteredBookings?.every(b => selectedIds?.has(b?.id));
  const someSelected = filteredBookings?.some(b => selectedIds?.has(b?.id));

  const handleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBookings?.map(b => b?.id)));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next?.has(id)) {
        next?.delete(id);
      } else {
        next?.add(id);
      }
      return next;
    });
  };

  // Bulk delete
  const handleBulkDelete = async () => {
    if (selectedIds?.size === 0) return;
    if (!window.confirm(`Delete ${selectedIds?.size} booking(s)? This cannot be undone.`)) return;
    try {
      setBulkLoading(true);
      const ids = Array.from(selectedIds);
      const { error } = await supabase?.from('bookings')?.delete()?.in('id', ids);
      if (error) throw error;
      setSelectedIds(new Set());
      onUpdate?.();
    } catch (err) {
      alert('Error deleting bookings: ' + err?.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Bulk flag (set status to 'cancelled' as a flag action, or use a dedicated flag)
  const handleBulkFlag = async () => {
    if (selectedIds?.size === 0) return;
    if (!window.confirm(`Flag ${selectedIds?.size} booking(s) as cancelled?`)) return;
    try {
      setBulkLoading(true);
      const ids = Array.from(selectedIds);
      const { error } = await supabase
        ?.from('bookings')
        ?.update({ status: 'cancelled', updated_at: new Date()?.toISOString() })
        ?.in('id', ids);
      if (error) throw error;
      setSelectedIds(new Set());
      onUpdate?.();
    } catch (err) {
      alert('Error flagging bookings: ' + err?.message);
    } finally {
      setBulkLoading(false);
    }
  };

  // Export to CSV
  const handleExport = () => {
    const toExport = selectedIds?.size > 0
      ? filteredBookings?.filter(b => selectedIds?.has(b?.id))
      : filteredBookings;

    if (toExport?.length === 0) {
      alert('No bookings to export.');
      return;
    }

    const headers = [
      'Booking Code', 'Customer Name', 'Email', 'Phone',
      'Pickup Location', 'Dropoff Location', 'Pickup Date', 'Pickup Time',
      'Vehicle', 'Passengers', 'Status', 'Total Cost (PHP)',
      'Payment Method', 'Created At', 'Booking Type'
    ];

    const rows = toExport?.map(b => {
      const isGuest = b?.is_guest_booking || b?.isGuestBooking;
      const firstName = b?.primaryPassengerFirstName || b?.primary_passenger_first_name || '';
      const lastName = b?.primaryPassengerLastName || b?.primary_passenger_last_name || '';
      const guestFullName = isGuest && (firstName || lastName)
        ? `${firstName} ${lastName}`?.trim()
        : (b?.guest_name || b?.guestName || '');
      const customerName = b?.user_profiles?.full_name || guestFullName || '';
      const email = b?.user_profiles?.email || b?.primaryPassengerEmail || b?.primary_passenger_email || b?.guest_email || b?.guestEmail || '';
      const phone = b?.primaryPassengerPhone || b?.primary_passenger_phone || b?.user_profiles?.phone || '';
      const pickupDate = b?.pickupDate || b?.pickup_date;
      const createdAt = b?.created_at || b?.createdAt;

      return [
        b?.bookingCode || b?.booking_code || b?.id?.substring(0, 8)?.toUpperCase() || '',
        customerName,
        email,
        phone,
        b?.pickupLocation || b?.pickup_location || '',
        b?.dropoffLocation || b?.dropoff_location || '',
        pickupDate ? new Date(pickupDate)?.toLocaleDateString() : '',
        pickupDate ? new Date(pickupDate)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '',
        b?.vehicles?.name || '',
        b?.passengerCount || b?.passenger_count || '',
        b?.status || '',
        b?.totalCost || b?.total_cost || '',
        b?.payment_method || b?.paymentMethod || '',
        createdAt ? new Date(createdAt)?.toLocaleString() : '',
        isGuest ? 'Guest' : 'Registered'
      ];
    });

    const csvContent = [headers, ...rows]
      ?.map(row => row?.map(cell => `"${String(cell)?.replace(/"/g, '""')}"`)?.join(','))
      ?.join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL?.createObjectURL(blob);
    const link = document?.createElement('a');
    link.href = url;
    link.download = `bookings_export_${new Date()?.toISOString()?.slice(0, 10)}.csv`;
    link?.click();
    URL?.revokeObjectURL(url);
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCustomerNameFilter('');
    setDateFrom('');
    setDateTo('');
  };

  const hasActiveFilters = searchQuery || statusFilter !== 'all' || customerNameFilter || dateFrom || dateTo;

  const handleStatusUpdate = async (bookingId, newStatus) => {
    try {
      setLoading(true);
      const { error } = await supabase
        ?.from('bookings')
        ?.update({ 
          status: newStatus,
          updated_at: new Date()?.toISOString()
        })
        ?.eq('id', bookingId);

      if (error) {
        alert('Error updating booking status: ' + error?.message);
        return;
      }

      setSelectedBooking(null);
      onUpdate?.();
    } catch (error) {
      console.error('Status update error:', error);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleResendEmail = async () => {
    if (!selectedBooking) return;
    try {
      setResendingEmail(true);
      setResendEmailStatus(null);

      const isGuest = selectedBooking?.is_guest_booking || selectedBooking?.isGuestBooking;
      const customerEmail =
        selectedBooking?.primaryPassengerEmail ||
        selectedBooking?.primary_passenger_email ||
        selectedBooking?.guest_email ||
        selectedBooking?.guestEmail ||
        selectedBooking?.user_profiles?.email ||
        '';

      if (!customerEmail) {
        setResendEmailStatus('error');
        setTimeout(() => setResendEmailStatus(null), 4000);
        return;
      }

      // Fetch from_email from app settings — use correct key: booking_form_email_settings
      let fromEmail = null;
      try {
        const { data: settingsData } = await supabase
          ?.from('app_settings')
          ?.select('setting_value')
          ?.eq('setting_key', 'booking_form_email_settings')
          ?.single();
        fromEmail = settingsData?.setting_value?.from_email || null;
      } catch (settingsErr) {
        console.warn('Could not fetch email settings:', settingsErr);
      }

      // Note: fromEmail may be null — the edge function falls back to onboarding@resend.dev automatically
      // No longer blocking here; we let the edge function handle sender resolution

      const customerName =
        (selectedBooking?.primaryPassengerFirstName || selectedBooking?.primary_passenger_first_name)
          ? `${selectedBooking?.primaryPassengerFirstName || selectedBooking?.primary_passenger_first_name} ${selectedBooking?.primaryPassengerLastName || selectedBooking?.primary_passenger_last_name || ''}`?.trim()
          : selectedBooking?.guest_name ||
            selectedBooking?.guestName ||
            selectedBooking?.user_profiles?.full_name ||
            'Valued Customer';

      const pickupDate = selectedBooking?.pickupDate || selectedBooking?.pickup_date;
      const bookingCode = selectedBooking?.bookingCode || selectedBooking?.booking_code || selectedBooking?.id?.substring(0, 8)?.toUpperCase();
      const confirmUrl = `https://goshuttle.ph/booking-lookup?code=${bookingCode}&action=confirm`;

      const bookingData = {
        booking_id: bookingCode,
        customer_name: customerName,
        guest_name: customerName,
        pickup_location: selectedBooking?.pickupLocation || selectedBooking?.pickup_location || '',
        dropoff_location: selectedBooking?.dropoffLocation || selectedBooking?.dropoff_location || '',
        vehicle_name: selectedBooking?.vehicles?.name || '',
        vehicle_type: selectedBooking?.vehicles?.vehicle_type || '',
        passenger_count: selectedBooking?.passengerCount || selectedBooking?.passenger_count || '',
        pickup_date: pickupDate ? new Date(pickupDate)?.toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) : '',
        pickup_time: pickupDate ? new Date(pickupDate)?.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : '',
        total_cost: (selectedBooking?.totalCost || selectedBooking?.total_cost)?.toLocaleString() || '',
        special_requirements: selectedBooking?.notes || '',
        confirm_url: confirmUrl,
      };

      const { data: fnData, error } = await supabase?.functions?.invoke('send-booking-confirmation', {
        body: {
          type: isGuest ? 'guest_booking_confirmation' : 'customer_confirmation',
          to_email: customerEmail,
          customer_email: customerEmail,
          ...(fromEmail ? { from_email: fromEmail } : {}),
          resend_api_key: import.meta.env?.VITE_RESEND_API_KEY || '',
          booking_data: bookingData,
          resend: true,
        },
      });

      if (error) throw error;
      if (fnData && fnData?.success === false) throw new Error(fnData?.error || 'Email send failed');

      // Update email confirmation tracking in bookings table
      await supabase?.from('bookings')?.update({
        email_confirmation_status: 'sent',
        email_confirmation_sent_at: new Date()?.toISOString(),
        email_confirmation_recipient: customerEmail,
        email_confirmation_error: null,
        email_confirmation_failed_at: null,
      })?.eq('id', selectedBooking?.id);

      setResendEmailStatus('success');
      setTimeout(() => setResendEmailStatus(null), 4000);
    } catch (err) {
      console.error('Resend email error:', err);
      // Log failure to bookings table
      try {
        await supabase?.from('bookings')?.update({
          email_confirmation_status: 'failed',
          email_confirmation_failed_at: new Date()?.toISOString(),
          email_confirmation_error: err?.message || 'Unknown error',
        })?.eq('id', selectedBooking?.id);
      } catch (_) {}
      setResendEmailStatus('error');
      setTimeout(() => setResendEmailStatus(null), 4000);
    } finally {
      setResendingEmail(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800', label: 'Pending' },
      confirmed: { color: 'bg-blue-100 text-blue-800', label: 'Confirmed' },
      in_progress: { color: 'bg-purple-100 text-purple-800', label: 'In Progress' },
      completed: { color: 'bg-green-100 text-green-800', label: 'Completed' },
      cancelled: { color: 'bg-red-100 text-red-800', label: 'Cancelled' }
    };
    const config = statusConfig?.[status] || statusConfig?.pending;
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config?.color}`}>
        {config?.label}
      </span>
    );
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-semibold text-gray-900">Booking Management</h2>
          <p className="text-sm sm:text-base text-gray-600">Monitor and manage all customer bookings</p>
        </div>
        <div className="text-xs sm:text-sm text-gray-500">
          Showing {filteredBookings?.length || 0} of {bookings?.length || 0} bookings
        </div>
      </div>

      {/* Filters Panel */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search bar */}
          <div className="relative">
            <Icon name="Search" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search booking code, route..."
              value={searchQuery}
              onChange={e => setSearchQuery(e?.target?.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Customer name filter */}
          <div className="relative">
            <Icon name="User" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Filter by customer name..."
              value={customerNameFilter}
              onChange={e => setCustomerNameFilter(e?.target?.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>

          {/* Status filter */}
          <div className="relative">
            <Icon name="Filter" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e?.target?.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none bg-white"
            >
              {statusOptions?.map(opt => (
                <option key={opt?.value} value={opt?.value}>{opt?.label}</option>
              ))}
            </select>
          </div>

          {/* Sort order */}
          <div className="relative">
            <Icon name="ArrowUpDown" size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <select
              value={sortOrder}
              onChange={e => setSortOrder(e?.target?.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary appearance-none bg-white"
            >
              {sortOptions?.map(opt => (
                <option key={opt?.value} value={opt?.value}>{opt?.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Date range row */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pickup Date From</label>
            <input
              type="date"
              value={dateFrom}
              onChange={e => setDateFrom(e?.target?.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pickup Date To</label>
            <input
              type="date"
              value={dateTo}
              onChange={e => setDateTo(e?.target?.value)}
              min={dateFrom}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
            />
          </div>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-blue-50 text-blue-700 text-xs rounded-full">
                Search: "{searchQuery}"
                <button onClick={() => setSearchQuery('')}><Icon name="X" size={10} /></button>
              </span>
            )}
            {customerNameFilter && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-purple-50 text-purple-700 text-xs rounded-full">
                Customer: "{customerNameFilter}"
                <button onClick={() => setCustomerNameFilter('')}><Icon name="X" size={10} /></button>
              </span>
            )}
            {statusFilter !== 'all' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-700 text-xs rounded-full">
                Status: {statusOptions?.find(o => o?.value === statusFilter)?.label}
                <button onClick={() => setStatusFilter('all')}><Icon name="X" size={10} /></button>
              </span>
            )}
            {(dateFrom || dateTo) && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-green-50 text-green-700 text-xs rounded-full">
                Date: {dateFrom || '…'} → {dateTo || '…'}
                <button onClick={() => { setDateFrom(''); setDateTo(''); }}><Icon name="X" size={10} /></button>
              </span>
            )}
            <button
              onClick={clearFilters}
              className="flex items-center gap-1.5 px-3 py-1 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
            >
              <Icon name="X" size={10} />
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {someSelected && (
            <>
              <span className="text-sm text-gray-600 font-medium">
                {selectedIds?.size} selected
              </span>
              <button
                onClick={handleBulkDelete}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-700 bg-red-50 border border-red-200 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
              >
                <Icon name="Trash2" size={13} />
                Delete Selected
              </button>
              <button
                onClick={handleBulkFlag}
                disabled={bulkLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <Icon name="Flag" size={13} />
                Flag as Cancelled
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="flex items-center gap-1 px-2 py-1.5 text-xs text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <Icon name="X" size={12} />
                Clear
              </button>
            </>
          )}
        </div>
        <button
          onClick={handleExport}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-green-700 bg-green-50 border border-green-200 rounded-lg hover:bg-green-100 transition-colors"
        >
          <Icon name="Download" size={13} />
          {selectedIds?.size > 0 ? `Export ${selectedIds?.size} Selected` : 'Export CSV'}
        </button>
      </div>

      {/* Bookings Table - Desktop */}
      <div className="hidden lg:block bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                    title="Select all"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredBookings?.map((booking) => {
                const isGuestRow = booking?.is_guest_booking || booking?.isGuestBooking;
                const rowFirstName = booking?.primaryPassengerFirstName || booking?.primary_passenger_first_name || '';
                const rowLastName = booking?.primaryPassengerLastName || booking?.primary_passenger_last_name || '';
                const rowGuestFullName = isGuestRow && (rowFirstName || rowLastName)
                  ? `${rowFirstName} ${rowLastName}`?.trim()
                  : (booking?.guest_name || booking?.guestName || '');
                const rowCustomerName = booking?.user_profiles?.full_name || rowGuestFullName || 'N/A';
                const rowCustomerEmail = booking?.user_profiles?.email
                  || booking?.primaryPassengerEmail || booking?.primary_passenger_email
                  || booking?.guest_email || booking?.guestEmail || '';
                const isSelected = selectedIds?.has(booking?.id);
                return (
                  <tr key={booking?.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-blue-50' : ''}`}>
                    <td className="px-4 py-4">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(booking?.id)}
                        className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-8 w-8">
                          <div className="h-8 w-8 bg-gray-300 rounded-full flex items-center justify-center">
                            <Icon name="User" size={16} className="text-gray-600" />
                          </div>
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">{rowCustomerName}</div>
                          <div className="text-sm text-gray-500">{rowCustomerEmail}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900">
                        <div className="flex items-center">
                          <Icon name="MapPin" size={14} className="text-green-500 mr-1" />
                          {booking?.pickupLocation || booking?.pickup_location}
                        </div>
                        <div className="flex items-center mt-1">
                          <Icon name="Navigation" size={14} className="text-red-500 mr-1" />
                          {booking?.dropoffLocation || booking?.dropoff_location}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">{booking?.vehicles?.name}</div>
                      <div className="text-sm text-gray-500">
                        {booking?.passengerCount || booking?.passenger_count} passenger{(booking?.passengerCount || booking?.passenger_count) !== 1 ? 's' : ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {new Date(booking?.pickupDate || booking?.pickup_date)?.toLocaleDateString()}
                      </div>
                      <div className="text-sm text-gray-500">
                        {new Date(booking?.pickupDate || booking?.pickup_date)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900">
                        {(booking?.created_at || booking?.createdAt) ? new Date(booking?.created_at || booking?.createdAt)?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {(booking?.created_at || booking?.createdAt) ? new Date(booking?.created_at || booking?.createdAt)?.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </div>
                      <div className="text-xs text-gray-400 max-w-[140px] truncate" title={booking?.pickupLocation || booking?.pickup_location}>
                        <Icon name="MapPin" size={10} className="inline text-green-500 mr-0.5" />
                        {booking?.pickupLocation || booking?.pickup_location || '—'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(booking?.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      ₱{(booking?.totalCost || booking?.total_cost)?.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setSelectedBooking(booking)}
                        iconName="Edit"
                      >
                        Manage
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bookings Cards - Mobile */}
      <div className="lg:hidden space-y-4">
        {/* Mobile select all */}
        {filteredBookings?.length > 0 && (
          <div className="flex items-center gap-2 px-1">
            <input
              type="checkbox"
              checked={allSelected}
              ref={el => { if (el) el.indeterminate = someSelected && !allSelected; }}
              onChange={handleSelectAll}
              className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer"
            />
            <span className="text-sm text-gray-600">Select All</span>
          </div>
        )}
        {filteredBookings?.map((booking) => {
          const isGuestCard = booking?.is_guest_booking || booking?.isGuestBooking;
          const cardFirstName = booking?.primaryPassengerFirstName || booking?.primary_passenger_first_name || '';
          const cardLastName = booking?.primaryPassengerLastName || booking?.primary_passenger_last_name || '';
          const cardGuestFullName = isGuestCard && (cardFirstName || cardLastName)
            ? `${cardFirstName} ${cardLastName}`?.trim()
            : (booking?.guest_name || booking?.guestName || '');
          const cardCustomerName = booking?.user_profiles?.full_name || cardGuestFullName || 'N/A';
          const cardCustomerEmail = booking?.user_profiles?.email
            || booking?.primaryPassengerEmail || booking?.primary_passenger_email
            || booking?.guest_email || booking?.guestEmail || '';
          const isSelected = selectedIds?.has(booking?.id);
          return (
            <div key={booking?.id} className={`bg-white rounded-lg shadow-sm border p-4 ${isSelected ? 'border-primary bg-blue-50' : 'border-gray-200'}`}>
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3 min-w-0 flex-1">
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => handleSelectRow(booking?.id)}
                    className="rounded border-gray-300 text-primary focus:ring-primary cursor-pointer flex-shrink-0"
                  />
                  <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center flex-shrink-0">
                    <Icon name="User" size={16} className="text-gray-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-medium text-gray-900 truncate">{cardCustomerName}</h3>
                    <p className="text-xs text-gray-500 truncate">{cardCustomerEmail}</p>
                  </div>
                </div>
                {getStatusBadge(booking?.status)}
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Route</p>
                  <div className="space-y-1">
                    <div className="flex items-center text-xs text-gray-900">
                      <Icon name="MapPin" size={12} className="text-green-500 mr-1 flex-shrink-0" />
                      <span className="truncate">{booking?.pickupLocation || booking?.pickup_location}</span>
                    </div>
                    <div className="flex items-center text-xs text-gray-900">
                      <Icon name="Navigation" size={12} className="text-red-500 mr-1 flex-shrink-0" />
                      <span className="truncate">{booking?.dropoffLocation || booking?.dropoff_location}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Vehicle</p>
                    <p className="text-xs text-gray-900 mt-1">{booking?.vehicles?.name}</p>
                    <p className="text-xs text-gray-500">{booking?.passengerCount || booking?.passenger_count} passenger{(booking?.passengerCount || booking?.passenger_count) !== 1 ? 's' : ''}</p>
                  </div>
                  <div>
                    <p className="text-xs font-medium text-gray-500">Date & Time</p>
                    <p className="text-xs text-gray-900 mt-1">{new Date(booking?.pickupDate || booking?.pickup_date)?.toLocaleDateString()}</p>
                    <p className="text-xs text-gray-500">{new Date(booking?.pickupDate || booking?.pickup_date)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-gray-100">
                  <div>
                    <p className="text-xs font-medium text-gray-500">Cost</p>
                    <p className="text-sm font-medium text-gray-900">₱{(booking?.totalCost || booking?.total_cost)?.toLocaleString()}</p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedBooking(booking)}
                    className="text-xs"
                  >
                    <Icon name="Edit" size={14} className="mr-1" />
                    Manage
                  </Button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredBookings?.length === 0 && (
        <div className="text-center py-8 sm:py-12">
          <Icon name="Calendar" size={48} className="text-gray-400 mx-auto mb-4" />
          <h3 className="text-base sm:text-lg font-medium text-gray-900 mb-2">
            {hasActiveFilters ? 'No bookings match your filters' : 'No bookings found'}
          </h3>
          <p className="text-sm sm:text-base text-gray-600">
            {hasActiveFilters ? 'Try adjusting or clearing your filters' : 'Customer bookings will appear here'}
          </p>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-sm text-primary hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      )}

      {/* Booking Details Modal */}
      {selectedBooking && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4 sm:mb-6">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900">Manage Booking</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectedBooking(null)}
                  iconName="X"
                />
              </div>

              <div className="space-y-4 sm:space-y-6">
                {/* Customer Info */}
                <div>
                  <h4 className="text-sm sm:text-md font-medium text-gray-900 mb-2 sm:mb-3">Customer Information</h4>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4">
                    {selectedBooking?.is_guest_booking || selectedBooking?.isGuestBooking ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500">First Name</p>
                          <p className="text-sm text-gray-900">
                            {selectedBooking?.primaryPassengerFirstName || selectedBooking?.primary_passenger_first_name || selectedBooking?.guest_name?.split(' ')?.[0] || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Last Name</p>
                          <p className="text-sm text-gray-900">
                            {selectedBooking?.primaryPassengerLastName || selectedBooking?.primary_passenger_last_name || selectedBooking?.guest_name?.split(' ')?.slice(1)?.join(' ') || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Email Address</p>
                          <p className="text-sm text-gray-900 truncate">
                            {selectedBooking?.primaryPassengerEmail || selectedBooking?.primary_passenger_email || selectedBooking?.guest_email || selectedBooking?.guestEmail || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Booking Type</p>
                          <p className="text-sm text-blue-600 font-medium">Guest Booking</p>
                        </div>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500">First Name</p>
                          <p className="text-sm text-gray-900">
                            {selectedBooking?.primaryPassengerFirstName || selectedBooking?.primary_passenger_first_name || selectedBooking?.user_profiles?.full_name?.split(' ')?.[0] || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Last Name</p>
                          <p className="text-sm text-gray-900">
                            {selectedBooking?.primaryPassengerLastName || selectedBooking?.primary_passenger_last_name || selectedBooking?.user_profiles?.full_name?.split(' ')?.slice(1)?.join(' ') || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Email</p>
                          <p className="text-sm text-gray-900 truncate">
                            {selectedBooking?.primaryPassengerEmail || selectedBooking?.primary_passenger_email || selectedBooking?.guest_email || selectedBooking?.guestEmail || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Phone</p>
                          <p className="text-sm text-gray-900">
                            {selectedBooking?.primaryPassengerPhone || selectedBooking?.primary_passenger_phone || selectedBooking?.user_profiles?.phone || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs font-medium text-gray-500">Booking Type</p>
                          <p className="text-sm text-green-600 font-medium">Registered User</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Booking Details */}
                <div>
                  <h4 className="text-sm sm:text-md font-medium text-gray-900 mb-2 sm:mb-3">Booking Details</h4>
                  <div className="bg-gray-50 rounded-lg p-3 sm:p-4 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                      <div>
                        <p className="text-xs font-medium text-gray-500">Booking Code</p>
                        <p className="text-sm text-gray-900 font-mono">
                          {selectedBooking?.bookingCode || selectedBooking?.booking_code || selectedBooking?.id?.substring(0, 8)?.toUpperCase()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Vehicle</p>
                        <p className="text-sm text-gray-900">{selectedBooking?.vehicles?.name || 'N/A'}</p>
                        <p className="text-xs text-gray-500">{selectedBooking?.vehicles?.vehicle_type || ''}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Passengers</p>
                        <p className="text-sm text-gray-900">{selectedBooking?.passengerCount || selectedBooking?.passenger_count || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Pickup Date & Time</p>
                        <p className="text-sm text-gray-900">
                          {(selectedBooking?.pickupDate || selectedBooking?.pickup_date) ? (
                            <>
                              {new Date(selectedBooking?.pickupDate || selectedBooking?.pickup_date)?.toLocaleDateString()} at{' '}
                              {new Date(selectedBooking?.pickupDate || selectedBooking?.pickup_date)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </>
                          ) : 'Not specified'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Total Cost</p>
                        <p className="text-sm text-gray-900 font-semibold">
                          ₱{(selectedBooking?.totalCost || selectedBooking?.total_cost) ? parseFloat(selectedBooking?.totalCost || selectedBooking?.total_cost)?.toLocaleString() : '0'}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs font-medium text-gray-500">Payment Method</p>
                        <p className="text-sm text-gray-900">{selectedBooking?.payment_method || selectedBooking?.paymentMethod || 'To be determined'}</p>
                      </div>
                      {selectedBooking?.payment_reference && (
                        <div>
                          <p className="text-xs font-medium text-gray-500">Payment Reference</p>
                          <p className="text-sm text-gray-900 font-mono">{selectedBooking?.payment_reference}</p>
                        </div>
                      )}
                    </div>

                    {/* Primary Passenger Contact Information - Enhanced with better fallback */}
                    {(selectedBooking?.primaryPassengerFirstName || selectedBooking?.primary_passenger_first_name || 
                      selectedBooking?.primaryPassengerEmail || selectedBooking?.primary_passenger_email) && (
                      <div className="pt-3 border-t border-gray-200">
                        <p className="text-xs font-medium text-gray-500 mb-2">Primary Passenger Contact</p>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <p className="text-xs font-medium text-gray-500">First Name</p>
                            <p className="text-sm text-gray-900">
                              {selectedBooking?.primaryPassengerFirstName || selectedBooking?.primary_passenger_first_name || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">Last Name</p>
                            <p className="text-sm text-gray-900">
                              {selectedBooking?.primaryPassengerLastName || selectedBooking?.primary_passenger_last_name || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">Email Address</p>
                            <p className="text-sm text-gray-900 truncate">
                              {selectedBooking?.primaryPassengerEmail || selectedBooking?.primary_passenger_email || 'N/A'}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-500">Phone Number</p>
                            <p className="text-sm text-gray-900">
                              {selectedBooking?.primaryPassengerPhone || selectedBooking?.primary_passenger_phone || 'N/A'}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <p className="text-xs font-medium text-gray-500">Route</p>
                      <p className="text-sm text-gray-900 break-words">
                        <span className="inline-flex items-center">
                          <Icon name="MapPin" size={12} className="text-green-500 mr-1" />
                          {selectedBooking?.pickupLocation || selectedBooking?.pickup_location || 'N/A'}
                        </span>
                        {' → '}
                        <span className="inline-flex items-center">
                          <Icon name="Navigation" size={12} className="text-red-500 mr-1" />
                          {selectedBooking?.dropoffLocation || selectedBooking?.dropoff_location || 'N/A'}
                        </span>
                      </p>
                    </div>
                    
                    {selectedBooking?.notes && (
                      <div>
                        <p className="text-xs font-medium text-gray-500">Special Requirements</p>
                        <p className="text-sm text-gray-900">{selectedBooking?.notes}</p>
                      </div>
                    )}
                    
                    <div className="pt-2 border-t border-gray-200">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        <div>
                          <p className="text-xs font-medium text-gray-500">Created</p>
                          <p className="text-sm text-gray-900">
                            {(selectedBooking?.created_at || selectedBooking?.createdAt) ? new Date(selectedBooking?.created_at || selectedBooking?.createdAt)?.toLocaleString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A'}
                          </p>
                          {(selectedBooking?.pickupLocation || selectedBooking?.pickup_location) && (
                            <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                              <Icon name="MapPin" size={11} className="text-green-500 flex-shrink-0" />
                              {selectedBooking?.pickupLocation || selectedBooking?.pickup_location}
                            </p>
                          )}
                        </div>
                        {(selectedBooking?.updated_at || selectedBooking?.updatedAt) && (selectedBooking?.updated_at || selectedBooking?.updatedAt) !== (selectedBooking?.created_at || selectedBooking?.createdAt) && (
                          <div>
                            <p className="text-xs font-medium text-gray-500">Last Updated</p>
                            <p className="text-sm text-gray-900">
                              {new Date(selectedBooking?.updated_at || selectedBooking?.updatedAt)?.toLocaleString('en-PH', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Status Management */}
                <div>
                  <h4 className="text-sm sm:text-md font-medium text-gray-900 mb-2 sm:mb-3">Update Status</h4>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
                    {['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']?.map((status) => (
                      <button
                        key={status}
                        onClick={() => handleStatusUpdate(selectedBooking?.id, status)}
                        disabled={loading || selectedBooking?.status === status}
                        className={`px-3 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
                          selectedBooking?.status === status
                            ? 'bg-primary text-white' :'bg-gray-100 text-gray-700 hover:bg-gray-200'
                        } ${loading ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                      >
                        {status?.replace('_', ' ')?.toUpperCase()}
                      </button>
                    ))}
                  </div>
                  <div className="mt-2">
                    <span className="text-xs text-gray-500">Current status: </span>
                    {getStatusBadge(selectedBooking?.status)}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 mt-6">
                  <Button
                    variant="outline"
                    onClick={() => setSelectedBooking(null)}
                    size="sm"
                  >
                    Close
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleResendEmail}
                    disabled={resendingEmail}
                    className={`flex items-center gap-1.5 ${
                      resendEmailStatus === 'success' ?'border-green-500 text-green-700 bg-green-50'
                        : resendEmailStatus === 'error' ?'border-red-400 text-red-600 bg-red-50' :'border-blue-400 text-blue-700 hover:bg-blue-50'
                    }`}
                  >
                    {resendingEmail ? (
                      <>
                        <Icon name="Loader" size={14} className="animate-spin" />
                        Sending...
                      </>
                    ) : resendEmailStatus === 'success' ? (
                      <>
                        <Icon name="CheckCircle" size={14} />
                        Email Sent!
                      </>
                    ) : resendEmailStatus === 'error' ? (
                      <>
                        <Icon name="XCircle" size={14} />
                        {(() => {
                          const email =
                            selectedBooking?.primaryPassengerEmail ||
                            selectedBooking?.primary_passenger_email ||
                            selectedBooking?.guest_email ||
                            selectedBooking?.user_profiles?.email;
                          return email ? 'Send Failed – Check Email Settings' : 'No Email Found';
                        })()}
                      </>
                    ) : (
                      <>
                        <Icon name="Mail" size={14} />
                        Resend Confirmation
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingManagement;