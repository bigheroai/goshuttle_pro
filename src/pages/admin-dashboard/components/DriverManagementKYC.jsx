import React, { useState, useEffect } from 'react';
import Button from '../../../components/ui/Button';
import Icon from '../../../components/AppIcon';
import { supabase } from '../../../lib/supabase';
import { logAdminAction, AUDIT_ACTIONS } from '../../../utils/adminAuditLogger';
import { useAuth } from '../../../contexts/AuthContext';

const STATUS_COLORS = {
  pending: 'bg-yellow-100 text-yellow-800',
  approved: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  under_review: 'bg-blue-100 text-blue-800',
  verified: 'bg-green-100 text-green-800',
  failed: 'bg-red-100 text-red-800',
};

const DOCUMENT_LABELS = {
  drivers_license: "Driver\'s License",
  nbi_clearance: 'NBI/Police Clearance',
  medical_certificate: 'Medical Certificate',
  vehicle_insurance: 'Vehicle Insurance',
  vehicle_registration: 'Vehicle Registration',
};

const DriverManagementKYC = () => {
  const { userProfile } = useAuth();
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [docUrls, setDocUrls] = useState({});
  const [loadingDocs, setLoadingDocs] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [actionLoading, setActionLoading] = useState(false);
  const [kycNotes, setKycNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [docNotes, setDocNotes] = useState({});

  useEffect(() => {
    loadApplications();
  }, [filterStatus]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      let query = supabase
        ?.from('driver_applications')
        ?.select(`
          *,
          user_profiles!driver_applications_user_id_fkey(full_name, email, phone),
          partners(name, company_name)
        `)
        ?.order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query?.eq('application_status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Error loading driver applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadDocumentUrls = async (app) => {
    if (!app?.documents_uploaded?.length) return;
    setLoadingDocs(true);
    const urls = {};
    try {
      for (const doc of app?.documents_uploaded) {
        if (doc?.path) {
          const { data } = await supabase?.storage
            ?.from('driver-documents')
            ?.createSignedUrl(doc?.path, 3600);
          if (data?.signedUrl) urls[doc.documentType || doc.document_type] = data?.signedUrl;
        }
      }
    } catch (err) {
      console.error('Error loading document URLs:', err);
    } finally {
      setDocUrls(urls);
      setLoadingDocs(false);
    }
  };

  const openApplication = async (app) => {
    setSelectedApp(app);
    setKycNotes(app?.kyc_notes || '');
    setRejectionReason(app?.rejection_reason || '');
    setDocNotes(app?.document_verification_notes || {});
    setDocUrls({});
    await loadDocumentUrls(app);
  };

  const handleUpdateStatus = async (appId, newStatus) => {
    try {
      setActionLoading(true);
      const { data: { user } } = await supabase?.auth?.getUser();
      const updateData = {
        application_status: newStatus,
        updated_at: new Date()?.toISOString(),
      };
      if (newStatus === 'approved') {
        updateData.approved_at = new Date()?.toISOString();
        updateData.approved_by = user?.id;
        updateData.kyc_status = 'verified';
        updateData.kyc_verified_at = new Date()?.toISOString();
        updateData.kyc_verified_by = user?.id;
        updateData.kyc_notes = kycNotes;
      } else if (newStatus === 'rejected') {
        updateData.rejection_reason = rejectionReason;
        updateData.kyc_status = 'failed';
      } else if (newStatus === 'under_review') {
        updateData.kyc_status = 'under_review';
        updateData.kyc_notes = kycNotes;
      }
      updateData.document_verification_notes = docNotes;

      const { error } = await supabase
        ?.from('driver_applications')
        ?.update(updateData)
        ?.eq('id', appId);

      if (error) throw error;

      const applicantName = selectedApp?.user_profiles?.full_name || selectedApp?.user_profiles?.email || 'Unknown';
      const applicantEmail = selectedApp?.user_profiles?.email;

      const actionMap = {
        approved: AUDIT_ACTIONS?.KYC_APPROVED,
        rejected: AUDIT_ACTIONS?.KYC_REJECTED,
        under_review: AUDIT_ACTIONS?.KYC_UNDER_REVIEW,
      };
      await logAdminAction({
        actionType: actionMap?.[newStatus] || AUDIT_ACTIONS?.OTHER,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: appId,
        targetType: 'driver_application',
        targetName: applicantName,
        description: `${newStatus === 'approved' ? 'Approved' : newStatus === 'rejected' ? 'Rejected' : 'Moved to review'} KYC for driver application - ${applicantName}`,
        metadata: {
          application_id: appId,
          new_status: newStatus,
          kyc_notes: kycNotes || null,
          rejection_reason: rejectionReason || null,
        },
      });

      // Send KYC email notification to driver
      if (applicantEmail && (newStatus === 'approved' || newStatus === 'rejected')) {
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
              type: newStatus === 'approved' ? 'kyc_approved' : 'kyc_rejected',
              to_email: applicantEmail,
              driver_data: {
                full_name: applicantName,
                email: applicantEmail,
                license_number: selectedApp?.license_number || 'N/A',
                fleet_type: selectedApp?.fleet_type || 'N/A',
                rejection_reason: rejectionReason || 'Documents could not be verified. Please resubmit.',
                approved_date: new Date()?.toLocaleDateString('en-PH'),
              },
            }),
          });
        } catch (emailErr) {
          console.warn('KYC email notification failed (non-blocking):', emailErr?.message);
        }
      }

      alert(`Application ${newStatus === 'approved' ? 'approved' : newStatus === 'rejected' ? 'rejected' : 'updated'} successfully`);
      setSelectedApp(null);
      loadApplications();
    } catch (err) {
      console.error('Error updating application:', err);
      alert('Error updating application: ' + err?.message);
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBackgroundCheck = async (appId, status) => {
    try {
      setActionLoading(true);
      const { error } = await supabase
        ?.from('driver_applications')
        ?.update({ background_check_status: status, updated_at: new Date()?.toISOString() })
        ?.eq('id', appId);
      if (error) throw error;
      setSelectedApp(prev => prev ? { ...prev, background_check_status: status } : prev);
      loadApplications();
    } catch (err) {
      alert('Error: ' + err?.message);
    } finally {
      setActionLoading(false);
    }
  };

  const getStatusBadge = (status, type = 'application') => {
    const color = STATUS_COLORS?.[status] || 'bg-gray-100 text-gray-800';
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${color}`}>
        {status?.replace(/_/g, ' ')}
      </span>
    );
  };

  const stats = {
    total: applications?.length,
    pending: applications?.filter(a => a?.application_status === 'pending')?.length,
    under_review: applications?.filter(a => a?.application_status === 'under_review')?.length,
    approved: applications?.filter(a => a?.application_status === 'approved')?.length,
    rejected: applications?.filter(a => a?.application_status === 'rejected')?.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Driver Management & KYC</h2>
          <p className="text-sm text-gray-600">Verify driver documents and complete KYC for driver applications</p>
        </div>
        <Button variant="outline" size="sm" onClick={loadApplications} iconName="RefreshCw">
          Refresh
        </Button>
      </div>
      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats?.total, color: 'bg-gray-50 border-gray-200', text: 'text-gray-900' },
          { label: 'Pending', value: stats?.pending, color: 'bg-yellow-50 border-yellow-200', text: 'text-yellow-800' },
          { label: 'Under Review', value: stats?.under_review, color: 'bg-blue-50 border-blue-200', text: 'text-blue-800' },
          { label: 'Approved', value: stats?.approved, color: 'bg-green-50 border-green-200', text: 'text-green-800' },
          { label: 'Rejected', value: stats?.rejected, color: 'bg-red-50 border-red-200', text: 'text-red-800' },
        ]?.map(stat => (
          <div key={stat?.label} className={`rounded-lg border p-3 ${stat?.color}`}>
            <p className={`text-xl font-bold ${stat?.text}`}>{stat?.value}</p>
            <p className="text-xs text-gray-600">{stat?.label}</p>
          </div>
        ))}
      </div>
      {/* Filter */}
      <div className="flex flex-wrap gap-2">
        {['all', 'pending', 'under_review', 'approved', 'rejected']?.map(status => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
              filterStatus === status
                ? 'bg-primary text-white' :'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status === 'all' ? 'All' : status?.replace(/_/g, ' ')}
          </button>
        ))}
      </div>
      {/* Applications Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Icon name="Loader2" className="animate-spin text-primary" size={24} />
        </div>
      ) : applications?.length === 0 ? (
        <div className="text-center py-12 bg-white rounded-lg border border-gray-200">
          <Icon name="UserCheck" size={48} className="text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No driver applications found</p>
          <p className="text-sm text-gray-400 mt-1">Applications will appear here once drivers register</p>
        </div>
      ) : (
        <>
          {/* Desktop Table */}
          <div className="hidden lg:block bg-white rounded-lg border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {['Driver', 'License', 'Documents', 'App Status', 'KYC Status', 'BG Check', 'Applied', 'Actions']?.map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {applications?.map(app => (
                  <tr key={app?.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm font-medium text-gray-900">{app?.full_name}</p>
                        <p className="text-xs text-gray-500">{app?.user_profiles?.email}</p>
                        <p className="text-xs text-gray-500">{app?.phone}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-900">{app?.license_number}</p>
                      <p className="text-xs text-gray-500">Exp: {app?.license_expiry}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        app?.documents_uploaded?.length > 0 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {app?.documents_uploaded?.length || 0} docs
                      </span>
                    </td>
                    <td className="px-4 py-3">{getStatusBadge(app?.application_status)}</td>
                    <td className="px-4 py-3">{getStatusBadge(app?.kyc_status || 'pending')}</td>
                    <td className="px-4 py-3">{getStatusBadge(app?.background_check_status || 'pending')}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">
                      {new Date(app?.created_at)?.toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <Button variant="outline" size="sm" onClick={() => openApplication(app)}>
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden space-y-3">
            {applications?.map(app => (
              <div key={app?.id} className="bg-white rounded-lg border border-gray-200 p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{app?.full_name}</p>
                    <p className="text-xs text-gray-500">{app?.user_profiles?.email}</p>
                  </div>
                  {getStatusBadge(app?.application_status)}
                </div>
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div>
                    <span className="text-gray-500">License: </span>
                    <span className="text-gray-900">{app?.license_number}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Docs: </span>
                    <span className="text-gray-900">{app?.documents_uploaded?.length || 0}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">KYC: </span>
                    {getStatusBadge(app?.kyc_status || 'pending')}
                  </div>
                  <div>
                    <span className="text-gray-500">BG: </span>
                    {getStatusBadge(app?.background_check_status || 'pending')}
                  </div>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => openApplication(app)}>
                  Review Application
                </Button>
              </div>
            ))}
          </div>
        </>
      )}
      {/* Detail Panel / Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl my-4">
            <div className="flex items-center justify-between p-5 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Driver KYC Review</h3>
                <p className="text-sm text-gray-500">{selectedApp?.full_name}</p>
              </div>
              <button onClick={() => setSelectedApp(null)} className="p-2 rounded-lg hover:bg-gray-100">
                <Icon name="X" size={20} className="text-gray-500" />
              </button>
            </div>

            <div className="p-5 space-y-5 max-h-[75vh] overflow-y-auto">
              {/* Driver Info */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-xs text-gray-500">Full Name</p>
                  <p className="text-sm font-medium text-gray-900">{selectedApp?.full_name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Phone</p>
                  <p className="text-sm text-gray-900">{selectedApp?.phone}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Email</p>
                  <p className="text-sm text-gray-900">{selectedApp?.user_profiles?.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">License Number</p>
                  <p className="text-sm text-gray-900">{selectedApp?.license_number}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">License Expiry</p>
                  <p className="text-sm text-gray-900">{selectedApp?.license_expiry}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Fleet Type</p>
                  <p className="text-sm text-gray-900">{selectedApp?.preferred_fleet_type || 'GoShuttle'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Vehicle Owned</p>
                  <p className="text-sm text-gray-900">{selectedApp?.vehicle_owned ? 'Yes' : 'No'}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Partner</p>
                  <p className="text-sm text-gray-900">{selectedApp?.partners?.company_name || selectedApp?.partners?.name || 'None'}</p>
                </div>
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 border border-gray-200 rounded-lg text-center">
                  <p className="text-xs text-gray-500 mb-1">Application</p>
                  {getStatusBadge(selectedApp?.application_status)}
                </div>
                <div className="p-3 border border-gray-200 rounded-lg text-center">
                  <p className="text-xs text-gray-500 mb-1">KYC</p>
                  {getStatusBadge(selectedApp?.kyc_status || 'pending')}
                </div>
                <div className="p-3 border border-gray-200 rounded-lg text-center">
                  <p className="text-xs text-gray-500 mb-1">Background Check</p>
                  {getStatusBadge(selectedApp?.background_check_status || 'pending')}
                </div>
              </div>

              {/* Background Check Update */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Update Background Check</p>
                <div className="flex gap-2">
                  {['pending', 'in_progress', 'passed', 'failed']?.map(s => (
                    <button
                      key={s}
                      onClick={() => handleUpdateBackgroundCheck(selectedApp?.id, s)}
                      disabled={actionLoading || selectedApp?.background_check_status === s}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        selectedApp?.background_check_status === s
                          ? 'bg-primary text-white border-primary' :'border-gray-200 text-gray-700 hover:bg-gray-50'
                      } disabled:opacity-50`}
                    >
                      {s?.replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Documents */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">
                  Uploaded Documents ({selectedApp?.documents_uploaded?.length || 0})
                </p>
                {loadingDocs ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Icon name="Loader2" size={16} className="animate-spin" />
                    Loading documents...
                  </div>
                ) : selectedApp?.documents_uploaded?.length > 0 ? (
                  <div className="space-y-3">
                    {selectedApp?.documents_uploaded?.map((doc, idx) => {
                      const docType = doc?.documentType || doc?.document_type || `doc_${idx}`;
                      const url = docUrls?.[docType];
                      return (
                        <div key={idx} className="border border-gray-200 rounded-lg p-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Icon name="FileText" size={16} className="text-gray-500" />
                              <span className="text-sm font-medium text-gray-900">
                                {DOCUMENT_LABELS?.[docType] || docType?.replace(/_/g, ' ')}
                              </span>
                            </div>
                            {url && (
                              <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline flex items-center gap-1"
                              >
                                <Icon name="ExternalLink" size={12} />
                                View
                              </a>
                            )}
                          </div>
                          <div>
                            <label className="text-xs text-gray-500">Verification Note</label>
                            <input
                              type="text"
                              value={docNotes?.[docType] || ''}
                              onChange={e => setDocNotes(prev => ({ ...prev, [docType]: e?.target?.value }))}
                              placeholder="Add note for this document..."
                              className="mt-1 w-full text-xs border border-gray-200 rounded px-2 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                    <Icon name="Upload" size={24} className="text-gray-400 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No documents uploaded yet</p>
                  </div>
                )}
              </div>

              {/* KYC Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">KYC Notes</label>
                <textarea
                  value={kycNotes}
                  onChange={e => setKycNotes(e?.target?.value)}
                  rows={3}
                  placeholder="Add KYC verification notes..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Rejection Reason */}
              {selectedApp?.application_status !== 'approved' && (
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-1">Rejection Reason (if rejecting)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={e => setRejectionReason(e?.target?.value)}
                    rows={2}
                    placeholder="Reason for rejection..."
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3 pt-2 border-t border-gray-200">
                {selectedApp?.application_status !== 'under_review' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedApp?.id, 'under_review')}
                    disabled={actionLoading}
                    className="text-blue-600 border-blue-200 hover:bg-blue-50"
                  >
                    <Icon name="Eye" size={14} className="mr-1" />
                    Mark Under Review
                  </Button>
                )}
                {selectedApp?.application_status !== 'approved' && (
                  <Button
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedApp?.id, 'approved')}
                    disabled={actionLoading}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Icon name="CheckCircle" size={14} className="mr-1" />
                    Approve & Verify KYC
                  </Button>
                )}
                {selectedApp?.application_status !== 'rejected' && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleUpdateStatus(selectedApp?.id, 'rejected')}
                    disabled={actionLoading || !rejectionReason}
                    className="text-red-600 border-red-200 hover:bg-red-50"
                  >
                    <Icon name="XCircle" size={14} className="mr-1" />
                    Reject
                  </Button>
                )}
                <Button variant="outline" size="sm" onClick={() => setSelectedApp(null)} className="ml-auto">
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DriverManagementKYC;
