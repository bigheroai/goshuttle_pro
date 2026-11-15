import React, { useState, useEffect, useCallback, useMemo } from 'react';
import Icon from '../../../components/AppIcon';
import Button from '../../../components/ui/Button';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import reportService from '../../../utils/reportService';
import InvoiceReceiptModal from './InvoiceReceiptModal';

const PAGE_SIZE_OPTIONS = [10, 25, 50];

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const DATE_RANGE_OPTIONS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
  { value: '365', label: 'Last year' },
  { value: '', label: 'All time' },
];

const getStatusConfig = (status) => {
  switch (status?.toLowerCase()) {
    case 'completed':
      return { color: 'bg-green-100 text-green-700', icon: 'CheckCircle2', label: 'Completed' };
    case 'in_progress': case'in progress':
      return { color: 'bg-blue-100 text-blue-700', icon: 'Navigation', label: 'In Progress' };
    case 'confirmed':
      return { color: 'bg-indigo-100 text-indigo-700', icon: 'CheckCheck', label: 'Confirmed' };
    case 'pending':
      return { color: 'bg-amber-100 text-amber-700', icon: 'Clock', label: 'Pending' };
    case 'cancelled':
      return { color: 'bg-red-100 text-red-700', icon: 'XCircle', label: 'Cancelled' };
    default:
      return { color: 'bg-gray-100 text-gray-600', icon: 'Circle', label: status || 'Unknown' };
  }
};

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr)?.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return dateStr;
  }
};

const truncate = (str, n = 30) => str && str?.length > n ? str?.slice(0, n) + '…' : str;

const RecentBookingsTable = ({ onRefresh }) => {
  const { userProfile } = useAuth();

  // Data state
  const [bookings, setBookings] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filter state
  const [statusFilter, setStatusFilter] = useState('');
  const [dateRange, setDateRange] = useState('30');
  const [searchQuery, setSearchQuery] = useState('');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Selection state
  const [selectedIds, setSelectedIds] = useState(new Set());

  // Export state
  const [exporting, setExporting] = useState(false);
  const [invoiceBooking, setInvoiceBooking] = useState(null);
  const [showInvoice, setShowInvoice] = useState(false);

  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));

  const fetchBookings = useCallback(async () => {
    if (!userProfile?.company_id) return;
    try {
      setLoading(true);
      setError(null);

      // Get company user IDs
      const { data: companyUsers } = await supabase
        ?.from('user_profiles')
        ?.select('id')
        ?.eq('company_id', userProfile?.company_id);

      const companyUserIds = companyUsers?.map(u => u?.id) || [];
      if (companyUserIds?.length === 0) {
        setBookings([]);
        setTotalCount(0);
        return;
      }

      // Build query
      let query = supabase
        ?.from('bookings')
        ?.select(`
          id,
          status,
          pickup_location,
          dropoff_location,
          pickup_date,
          total_cost,
          created_at,
          passenger_count,
          user_profiles!bookings_user_id_fkey(full_name, email),
          vehicles(name, vehicle_type)
        `, { count: 'exact' })
        ?.in('user_id', companyUserIds);

      // Apply status filter
      if (statusFilter) {
        query = query?.eq('status', statusFilter);
      }

      // Apply date range filter
      if (dateRange) {
        const startDate = new Date();
        startDate?.setDate(startDate?.getDate() - parseInt(dateRange));
        query = query?.gte('created_at', startDate?.toISOString());
      }

      // Apply search filter (by employee name via pickup/dropoff location)
      // We'll filter client-side for name search since it's a join field

      // Apply ordering and pagination
      const from = (currentPage - 1) * pageSize;
      const to = from + pageSize - 1;

      query = query?.order('created_at', { ascending: false })?.range(from, to);

      const { data, error: fetchError, count } = await query;

      if (fetchError) throw fetchError;

      const mapped = data?.map(b => ({
        id: b?.id,
        employeeName: b?.user_profiles?.full_name || '—',
        employeeEmail: b?.user_profiles?.email || '',
        vehicleName: b?.vehicles?.name || '—',
        vehicleType: b?.vehicles?.vehicle_type || '',
        pickupLocation: b?.pickup_location,
        dropoffLocation: b?.dropoff_location,
        pickupDate: b?.pickup_date,
        status: b?.status,
        totalCost: b?.total_cost,
        passengerCount: b?.passenger_count,
        createdAt: b?.created_at,
      })) || [];

      setBookings(mapped);
      setTotalCount(count || 0);
      setSelectedIds(new Set()); // clear selection on data change
    } catch (err) {
      console.error('Error fetching bookings:', err);
      setError('Failed to load bookings. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [userProfile?.company_id, statusFilter, dateRange, currentPage, pageSize]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, dateRange, searchQuery]);

  // Client-side search filter on loaded data
  const filteredBookings = useMemo(() => {
    if (!searchQuery?.trim()) return bookings;
    const q = searchQuery?.toLowerCase();
    return bookings?.filter(b =>
      b?.employeeName?.toLowerCase()?.includes(q) ||
      b?.pickupLocation?.toLowerCase()?.includes(q) ||
      b?.dropoffLocation?.toLowerCase()?.includes(q) ||
      b?.vehicleName?.toLowerCase()?.includes(q) ||
      String(b?.id)?.toLowerCase()?.includes(q)
    );
  }, [bookings, searchQuery]);

  // Selection handlers
  const allPageSelected = filteredBookings?.length > 0 && filteredBookings?.every(b => selectedIds?.has(b?.id));
  const someSelected = selectedIds?.size > 0;

  const handleSelectAll = () => {
    if (allPageSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredBookings?.map(b => b?.id)));
    }
  };

  const handleSelectRow = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next?.has(id)) next?.delete(id);
      else next?.add(id);
      return next;
    });
  };

  // Export handler
  const handleExport = async () => {
    try {
      setExporting(true);
      const selectedBookings = filteredBookings?.filter(b => selectedIds?.has(b?.id));
      const dataToExport = someSelected ? selectedBookings : filteredBookings;

      const csvRows = dataToExport?.map(b => ({
        'Booking ID': b?.id,
        'Employee': b?.employeeName,
        'Email': b?.employeeEmail,
        'Vehicle': b?.vehicleName,
        'Vehicle Type': b?.vehicleType,
        'Pickup Location': b?.pickupLocation,
        'Dropoff Location': b?.dropoffLocation,
        'Date': formatDate(b?.pickupDate || b?.createdAt),
        'Status': b?.status,
        'Total Cost (₱)': b?.totalCost || '',
        'Passengers': b?.passengerCount || '',
      }));

      reportService?.downloadReport(csvRows, `bookings-export-${new Date()?.toISOString()?.slice(0, 10)}`, 'csv');
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setExporting(false);
    }
  };

  const handleRefresh = () => {
    fetchBookings();
    onRefresh?.();
  };

  const handleViewInvoice = (booking) => {
    setInvoiceBooking(booking);
    setShowInvoice(true);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Recent Bookings</h3>
            <p className="text-xs text-gray-400 mt-0.5">Latest trips booked for your team</p>
          </div>
          <div className="flex items-center space-x-2">
            {someSelected && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
                className="text-green-600 border-green-200 hover:bg-green-50 text-xs"
              >
                <Icon name="Download" size={13} className="mr-1.5" />
                {exporting ? 'Exporting…' : `Export (${selectedIds?.size})`}
              </Button>
            )}
            {!someSelected && filteredBookings?.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleExport}
                disabled={exporting}
                className="text-gray-500 border-gray-200 hover:bg-gray-50 text-xs"
              >
                <Icon name="Download" size={13} className="mr-1.5" />
                {exporting ? 'Exporting…' : 'Export CSV'}
              </Button>
            )}
            <Button variant="ghost" size="sm" onClick={handleRefresh} className="text-gray-500 hover:text-primary">
              <Icon name="RefreshCw" size={15} className="mr-1.5" />
              Refresh
            </Button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[160px] max-w-xs">
            <Icon name="Search" size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search bookings…"
              value={searchQuery}
              onChange={e => setSearchQuery(e?.target?.value)}
              className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-gray-50"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e?.target?.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-700"
          >
            {STATUS_OPTIONS?.map(opt => (
              <option key={opt?.value} value={opt?.value}>{opt?.label}</option>
            ))}
          </select>

          {/* Date Range Filter */}
          <select
            value={dateRange}
            onChange={e => setDateRange(e?.target?.value)}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-700"
          >
            {DATE_RANGE_OPTIONS?.map(opt => (
              <option key={opt?.value} value={opt?.value}>{opt?.label}</option>
            ))}
          </select>

          {/* Page size */}
          <select
            value={pageSize}
            onChange={e => { setPageSize(Number(e?.target?.value)); setCurrentPage(1); }}
            className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary text-gray-700"
          >
            {PAGE_SIZE_OPTIONS?.map(s => (
              <option key={s} value={s}>Show {s}</option>
            ))}
          </select>

          {/* Result count */}
          <span className="text-xs text-gray-400 ml-auto whitespace-nowrap">
            {totalCount} booking{totalCount !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs text-gray-400">Loading bookings…</p>
        </div>
      ) : error ? (
        <div className="py-12 flex flex-col items-center justify-center text-center px-6">
          <div className="w-12 h-12 bg-red-50 rounded-full flex items-center justify-center mb-3">
            <Icon name="AlertCircle" size={20} className="text-red-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">Failed to load bookings</p>
          <p className="text-xs text-gray-400 mb-4">{error}</p>
          <Button variant="outline" size="sm" onClick={handleRefresh}>Try Again</Button>
        </div>
      ) : filteredBookings?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
          <div className="w-14 h-14 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <Icon name="CalendarX2" size={24} className="text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-700 mb-1">No bookings found</p>
          <p className="text-xs text-gray-400">
            {searchQuery || statusFilter ? 'Try adjusting your filters.' : "Your team's ride history will appear here once bookings are made."}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                {/* Select All Checkbox */}
                <th className="pl-5 pr-2 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={handleSelectAll}
                    className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer"
                    title={allPageSelected ? 'Deselect all' : 'Select all on this page'}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Booking</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Passenger</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Route</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-4 py-3 text-center text-xs font-semibold text-gray-500 uppercase tracking-wider">Invoice</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredBookings?.map((booking) => {
                const statusConfig = getStatusConfig(booking?.status);
                const isSelected = selectedIds?.has(booking?.id);
                return (
                  <tr
                    key={booking?.id}
                    className={`hover:bg-gray-50/70 transition-colors ${isSelected ? 'bg-primary/5' : ''}`}
                  >
                    <td className="pl-5 pr-2 py-3.5 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => handleSelectRow(booking?.id)}
                        className="w-3.5 h-3.5 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer"
                      />
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className="text-xs font-mono text-gray-400">#{String(booking?.id)?.slice(0, 8)}</span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <div className="flex items-center space-x-2.5">
                        <div className="w-7 h-7 bg-primary/10 rounded-full flex items-center justify-center shrink-0">
                          <Icon name="User" size={13} className="text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-800">{booking?.employeeName}</p>
                          {booking?.vehicleName && booking?.vehicleName !== '—' && (
                            <p className="text-xs text-gray-400">{booking?.vehicleName}</p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex flex-col">
                        <div className="flex items-center space-x-1 text-xs text-gray-700">
                          <Icon name="MapPin" size={11} className="text-green-500 shrink-0" />
                          <span>{truncate(booking?.pickupLocation)}</span>
                        </div>
                        <div className="flex items-center space-x-1 text-xs text-gray-500 mt-0.5">
                          <Icon name="Flag" size={11} className="text-red-400 shrink-0" />
                          <span>{truncate(booking?.dropoffLocation)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-sm text-gray-600">
                      {formatDate(booking?.pickupDate || booking?.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap">
                      <span className={`inline-flex items-center space-x-1 px-2.5 py-1 text-xs font-semibold rounded-full ${statusConfig?.color}`}>
                        <Icon name={statusConfig?.icon} size={11} />
                        <span>{statusConfig?.label}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-right">
                      <span className="text-sm font-semibold text-gray-900">
                        {booking?.totalCost ? `₱${Number(booking?.totalCost)?.toLocaleString()}` : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 whitespace-nowrap text-center">
                      <button
                        onClick={() => handleViewInvoice(booking)}
                        title="Download Invoice"
                        className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                      >
                        <Icon name="FileText" size={13} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer: Pagination */}
      {!loading && !error && totalCount > 0 && (
        <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center space-x-1 text-xs text-gray-500">
            {someSelected && (
              <span className="font-medium text-primary mr-2">{selectedIds?.size} selected</span>
            )}
            <span>
              Page {currentPage} of {totalPages} · {totalCount} total
            </span>
          </div>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => setCurrentPage(1)}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="First page"
            >
              <Icon name="ChevronsLeft" size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Previous page"
            >
              <Icon name="ChevronLeft" size={14} />
            </button>

            {/* Page number pills */}
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let page;
              if (totalPages <= 5) {
                page = i + 1;
              } else if (currentPage <= 3) {
                page = i + 1;
              } else if (currentPage >= totalPages - 2) {
                page = totalPages - 4 + i;
              } else {
                page = currentPage - 2 + i;
              }
              return (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-7 h-7 text-xs rounded-lg font-medium transition-colors ${
                    page === currentPage
                      ? 'bg-primary text-white' :'text-gray-500 hover:bg-gray-100 hover:text-gray-700'
                  }`}
                >
                  {page}
                </button>
              );
            })}

            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Next page"
            >
              <Icon name="ChevronRight" size={14} />
            </button>
            <button
              onClick={() => setCurrentPage(totalPages)}
              disabled={currentPage === totalPages}
              className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              title="Last page"
            >
              <Icon name="ChevronsRight" size={14} />
            </button>
          </div>
        </div>
      )}

      <InvoiceReceiptModal
        isOpen={showInvoice}
        onClose={() => { setShowInvoice(false); setInvoiceBooking(null); }}
        booking={invoiceBooking}
        userProfile={userProfile}
      />
    </div>
  );
};

export default RecentBookingsTable;