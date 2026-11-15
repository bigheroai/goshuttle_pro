import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, ChevronDown, ChevronUp, User, MapPin, Calendar, Car, DollarSign, FileText } from 'lucide-react';
import corporateBillingService from '../../../services/corporateBillingService';
import { useAuth } from '../../../contexts/AuthContext';

const ApprovalQueuePanel = ({ companyId, onApprovalAction }) => {
  const { userProfile } = useAuth();
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [noteInputs, setNoteInputs] = useState({});

  const loadApprovals = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const data = await corporateBillingService?.getPendingApprovals(companyId);
      setPendingApprovals(data);
    } catch (err) {
      console.error('Error loading approvals:', err);
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadApprovals();
  }, [loadApprovals]);

  const handleApprove = async (approval) => {
    setActionLoading(approval?.id + '_approve');
    try {
      await corporateBillingService?.approveBooking(
        approval?.id,
        approval?.booking_id,
        userProfile?.id,
        noteInputs?.[approval?.id] || ''
      );
      await loadApprovals();
      onApprovalAction?.();
    } catch (err) {
      console.error('Error approving:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (approval) => {
    setActionLoading(approval?.id + '_reject');
    try {
      await corporateBillingService?.rejectBooking(
        approval?.id,
        approval?.booking_id,
        userProfile?.id,
        noteInputs?.[approval?.id] || ''
      );
      await loadApprovals();
      onApprovalAction?.();
    } catch (err) {
      console.error('Error rejecting:', err);
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d) => d ? new Date(d)?.toLocaleString('en-PH', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'N/A';
  const formatCurrency = (v) => `₱${parseFloat(v || 0)?.toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;

  if (loading) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center space-x-2 mb-4">
          <div className="w-5 h-5 bg-amber-100 rounded animate-pulse" />
          <div className="h-5 bg-gray-200 rounded animate-pulse w-40" />
        </div>
        {[1, 2]?.map(i => (
          <div key={i} className="h-20 bg-gray-100 rounded-lg animate-pulse mb-3" />
        ))}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
            <Clock size={16} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-gray-900">Pending Approvals</h3>
            <p className="text-xs text-gray-500">{pendingApprovals?.length} booking{pendingApprovals?.length !== 1 ? 's' : ''} awaiting decision</p>
          </div>
        </div>
        <button onClick={loadApprovals} className="text-xs text-primary hover:underline">Refresh</button>
      </div>
      {pendingApprovals?.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center px-4">
          <CheckCircle size={32} className="text-green-400 mb-2" />
          <p className="text-sm font-medium text-gray-600">All caught up!</p>
          <p className="text-xs text-gray-400 mt-1">No bookings pending approval</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {pendingApprovals?.map((approval) => {
            const booking = approval?.bookings;
            const maker = approval?.user_profiles;
            const isExpanded = expandedId === approval?.id;
            return (
              <div key={approval?.id} className="p-4">
                <div
                  className="flex items-start justify-between cursor-pointer"
                  onClick={() => setExpandedId(isExpanded ? null : approval?.id)}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                        <Clock size={10} className="mr-1" /> Pending
                      </span>
                      <span className="text-xs text-gray-400">{formatDate(approval?.submitted_at)}</span>
                    </div>
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {booking?.pickup_location || 'N/A'} → {booking?.dropoff_location || 'N/A'}
                    </p>
                    <div className="flex items-center space-x-3 mt-1">
                      <span className="flex items-center text-xs text-gray-500">
                        <User size={11} className="mr-1" />{maker?.full_name || 'Unknown'}
                      </span>
                      <span className="flex items-center text-xs font-semibold text-primary">
                        <DollarSign size={11} className="mr-0.5" />{formatCurrency(booking?.total_cost)}
                      </span>
                    </div>
                  </div>
                  <div className="ml-2 flex-shrink-0">
                    {isExpanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                  </div>
                </div>
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-gray-100">
                    <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                      <div className="flex items-start space-x-1.5">
                        <MapPin size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-500">Pickup</p>
                          <p className="font-medium text-gray-800">{booking?.pickup_location || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-1.5">
                        <Calendar size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-500">Date</p>
                          <p className="font-medium text-gray-800">{formatDate(booking?.pickup_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-1.5">
                        <Car size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-500">Vehicle</p>
                          <p className="font-medium text-gray-800">{booking?.vehicles?.name || 'N/A'}</p>
                        </div>
                      </div>
                      <div className="flex items-start space-x-1.5">
                        <FileText size={12} className="text-gray-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-gray-500">Ref</p>
                          <p className="font-medium text-gray-800">{booking?.booking_code || booking?.id?.slice(0, 8)}</p>
                        </div>
                      </div>
                    </div>

                    {approval?.maker_notes && (
                      <div className="bg-blue-50 rounded-lg p-2.5 mb-3">
                        <p className="text-xs text-blue-700"><span className="font-semibold">Maker note:</span> {approval?.maker_notes}</p>
                      </div>
                    )}

                    <textarea
                      placeholder="Add approval/rejection note (optional)..."
                      value={noteInputs?.[approval?.id] || ''}
                      onChange={(e) => setNoteInputs(prev => ({ ...prev, [approval?.id]: e?.target?.value }))}
                      className="w-full text-xs border border-gray-200 rounded-lg p-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary mb-3"
                      rows={2}
                    />

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleApprove(approval)}
                        disabled={actionLoading === approval?.id + '_approve'}
                        className="flex-1 flex items-center justify-center space-x-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                      >
                        <CheckCircle size={13} />
                        <span>{actionLoading === approval?.id + '_approve' ? 'Approving...' : 'Approve'}</span>
                      </button>
                      <button
                        onClick={() => handleReject(approval)}
                        disabled={actionLoading === approval?.id + '_reject'}
                        className="flex-1 flex items-center justify-center space-x-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-xs font-semibold py-2 rounded-lg transition-colors"
                      >
                        <XCircle size={13} />
                        <span>{actionLoading === approval?.id + '_reject' ? 'Rejecting...' : 'Reject'}</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ApprovalQueuePanel;
