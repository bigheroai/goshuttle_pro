import React, { useState, useEffect } from 'react';
import { XCircle, FileText, Eye, User, ChevronDown, ChevronUp, RefreshCw, Search, Filter } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { logAdminAction, AUDIT_ACTIONS } from '../../../utils/adminAuditLogger';
import { useAuth } from '../../../contexts/AuthContext';
import { sendDriverEmail } from '../../../services/driverEmailService';

const DOC_LABELS = {
  driverLicense: "Driver\'s License",
  clearance: 'Police/NBI Clearance',
  medicalCert: 'Medical Certificate',
  insurance: 'Vehicle Insurance',
  registration: 'Vehicle Registration',
};

const STATUS_COLORS = {
  pending: 'bg-amber-100 text-amber-800',
  under_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-red-100 text-red-800',
};

const DocReviewRow = ({ doc, docType, reviewStatus, reviewNote, onStatusChange, onNoteChange, signedUrl }) => {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden">
      <div className="flex items-center justify-between p-3 bg-gray-50">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="text-sm font-medium text-gray-800 truncate">
            {DOC_LABELS?.[docType] || docType}
          </span>
          {signedUrl && (
            <a
              href={signedUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-blue-600 hover:underline ml-1"
            >
              <Eye className="w-3 h-3" />
              View
            </a>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <select
            value={reviewStatus || 'pending'}
            onChange={(e) => onStatusChange(docType, e?.target?.value)}
            className={`text-xs font-medium px-2 py-1 rounded border-0 cursor-pointer focus:ring-1 focus:ring-blue-500 ${
              STATUS_COLORS?.[reviewStatus || 'pending'] || 'bg-gray-100 text-gray-700'
            }`}
          >
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1 text-gray-400 hover:text-gray-600 rounded"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {expanded && (
        <div className="p-3 border-t border-gray-100">
          <label className="block text-xs font-medium text-gray-600 mb-1">Note for driver (optional)</label>
          <textarea
            value={reviewNote || ''}
            onChange={(e) => onNoteChange(docType, e?.target?.value)}
            placeholder="e.g. Document is blurry, please re-upload..."
            rows={2}
            className="w-full text-sm border border-gray-200 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          />
        </div>
      )}
    </div>
  );
};

const ApplicationReviewPanel = ({ app, onClose, onUpdated }) => {
  const { userProfile } = useAuth();
  const [docReviewStatuses, setDocReviewStatuses] = useState(app?.doc_review_statuses || {});
  const [docNotes, setDocNotes] = useState(app?.document_verification_notes || {});
  const [adminFeedback, setAdminFeedback] = useState(app?.admin_feedback || app?.kyc_notes || '');
  const [nextAction, setNextAction] = useState(app?.next_action || '');
  const [overallStatus, setOverallStatus] = useState(app?.application_status || 'pending');
  const [saving, setSaving] = useState(false);
  const [docUrls, setDocUrls] = useState({});

  useEffect(() => {
    loadDocUrls();
  }, []);

  const loadDocUrls = async () => {
    const urls = {};
    for (const doc of app?.documents_uploaded || []) {
      const path = doc?.filePath || doc?.path;
      if (path) {
        try {
          const { data } = await supabase?.storage?.from('driver-documents')?.createSignedUrl(path, 3600);
          if (data?.signedUrl) urls[doc?.documentType] = data?.signedUrl;
        } catch (_) {}
      }
    }
    setDocUrls(urls);
  };

  const handleDocStatusChange = (docType, status) => {
    setDocReviewStatuses(prev => ({ ...prev, [docType]: status }));
  };

  const handleDocNoteChange = (docType, note) => {
    setDocNotes(prev => ({ ...prev, [docType]: note }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { user } } = await supabase?.auth?.getUser();

      const updateData = {
        doc_review_statuses: docReviewStatuses,
        document_verification_notes: docNotes,
        admin_feedback: adminFeedback,
        next_action: nextAction,
        application_status: overallStatus,
        updated_at: new Date()?.toISOString(),
      };

      if (overallStatus === 'approved') {
        updateData.approved_at = new Date()?.toISOString();
        updateData.approved_by = user?.id;
        updateData.kyc_status = 'verified';
        updateData.kyc_verified_at = new Date()?.toISOString();
        updateData.kyc_verified_by = user?.id;
        updateData.kyc_notes = adminFeedback;
      } else if (overallStatus === 'rejected') {
        updateData.rejection_reason = adminFeedback;
        updateData.kyc_status = 'failed';
      } else if (overallStatus === 'under_review') {
        updateData.kyc_status = 'under_review';
      }

      const { error } = await supabase
        ?.from('driver_applications')
        ?.update(updateData)
        ?.eq('id', app?.id);

      if (error) throw error;

      // Send email notification
      const driverEmail = app?.email || app?.user_profiles?.email;
      const driverName = app?.full_name || app?.user_profiles?.full_name || 'Driver';
      if (driverEmail) {
        if (overallStatus === 'approved') {
          await sendDriverEmail('kyc_approved', driverEmail, { full_name: driverName, approved_date: new Date()?.toLocaleDateString('en-PH') });
        } else if (overallStatus === 'rejected') {
          await sendDriverEmail('kyc_rejected', driverEmail, { full_name: driverName, rejection_reason: adminFeedback || 'Documents could not be verified.' });
        } else if (overallStatus === 'under_review') {
          await sendDriverEmail('driver_pending_approval', driverEmail, { full_name: driverName, feedback: adminFeedback });
        }
      }

      await logAdminAction({
        actionType: overallStatus === 'approved' ? AUDIT_ACTIONS?.KYC_APPROVED :
                    overallStatus === 'rejected' ? AUDIT_ACTIONS?.KYC_REJECTED : AUDIT_ACTIONS?.KYC_UNDER_REVIEW,
        actorId: userProfile?.id,
        actorName: userProfile?.full_name,
        actorRole: userProfile?.role,
        targetId: app?.id,
        targetType: 'driver_application',
        targetName: app?.full_name,
        description: `Updated driver application for ${app?.full_name} — status: ${overallStatus}`,
        metadata: { application_id: app?.id, new_status: overallStatus },
      });

      onUpdated?.();
      onClose?.();
    } catch (err) {
      alert('Error saving: ' + err?.message);
    } finally {
      setSaving(false);
    }
  };

  const docs = app?.documents_uploaded || [];

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-xl">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Review Application</h2>
            <p className="text-sm text-gray-500">{app?.full_name} · {app?.email}</p>
          </div>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <XCircle className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* Overall Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Overall Application Status</label>
            <div className="flex flex-wrap gap-2">
              {['pending', 'under_review', 'approved', 'rejected']?.map(s => (
                <button
                  key={s}
                  onClick={() => setOverallStatus(s)}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                    overallStatus === s
                      ? s === 'approved' ? 'bg-emerald-600 text-white border-emerald-600' :
                        s === 'rejected' ? 'bg-red-600 text-white border-red-600' :
                        s === 'under_review'? 'bg-blue-600 text-white border-blue-600' : 'bg-amber-500 text-white border-amber-500' :'bg-white text-gray-600 border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {s?.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>

          {/* Document Review */}
          {docs?.length > 0 ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Document Review</label>
              <div className="space-y-2">
                {docs?.map((doc, idx) => {
                  const docType = doc?.documentType || doc?.document_type;
                  return (
                    <DocReviewRow
                      key={idx}
                      doc={doc}
                      docType={docType}
                      reviewStatus={docReviewStatuses?.[docType]}
                      reviewNote={docNotes?.[docType]}
                      onStatusChange={handleDocStatusChange}
                      onNoteChange={handleDocNoteChange}
                      signedUrl={docUrls?.[docType]}
                    />
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm text-amber-700">
              No documents uploaded yet by this applicant.
            </div>
          )}

          {/* Admin Feedback */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Admin Feedback <span className="text-gray-400 font-normal">(visible to driver)</span>
            </label>
            <textarea
              value={adminFeedback}
              onChange={(e) => setAdminFeedback(e?.target?.value)}
              placeholder="Provide feedback or reason for decision..."
              rows={3}
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Next Action */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Next Action for Driver <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="text"
              value={nextAction}
              onChange={(e) => setNextAction(e?.target?.value)}
              placeholder="e.g. Please re-upload a clearer copy of your license"
              className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2.5 px-4 border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex-1 py-2.5 px-4 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {saving ? 'Saving...' : 'Save & Notify Driver'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function AdminDriverDocumentReview() {
  const [applications, setApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedApp, setSelectedApp] = useState(null);
  const [filterStatus, setFilterStatus] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    loadApplications();
  }, [filterStatus]);

  const loadApplications = async () => {
    try {
      setLoading(true);
      let query = supabase
        ?.from('driver_applications')
        ?.select('*, user_profiles!driver_applications_user_id_fkey(full_name, email, phone)')
        ?.order('created_at', { ascending: false });

      if (filterStatus !== 'all') {
        query = query?.eq('application_status', filterStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      setApplications(data || []);
    } catch (err) {
      console.error('Error loading applications:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = applications?.filter(app => {
    if (!searchQuery) return true;
    const q = searchQuery?.toLowerCase();
    return (
      app?.full_name?.toLowerCase()?.includes(q) ||
      app?.email?.toLowerCase()?.includes(q) ||
      app?.phone?.includes(q)
    );
  });

  const stats = {
    total: applications?.length,
    pending: applications?.filter(a => a?.application_status === 'pending')?.length,
    under_review: applications?.filter(a => a?.application_status === 'under_review')?.length,
    approved: applications?.filter(a => a?.application_status === 'approved')?.length,
    rejected: applications?.filter(a => a?.application_status === 'rejected')?.length,
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold text-gray-900">Driver Document Review</h2>
          <p className="text-sm text-gray-500">Review and approve/reject driver applications and documents</p>
        </div>
        <button
          onClick={loadApplications}
          className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats?.total, color: 'bg-gray-50 border-gray-200 text-gray-900' },
          { label: 'Pending', value: stats?.pending, color: 'bg-amber-50 border-amber-200 text-amber-800' },
          { label: 'Under Review', value: stats?.under_review, color: 'bg-blue-50 border-blue-200 text-blue-800' },
          { label: 'Approved', value: stats?.approved, color: 'bg-emerald-50 border-emerald-200 text-emerald-800' },
          { label: 'Rejected', value: stats?.rejected, color: 'bg-red-50 border-red-200 text-red-800' },
        ]?.map(stat => (
          <div key={stat?.label} className={`rounded-lg border p-3 ${stat?.color}`}>
            <p className="text-xl font-bold">{stat?.value}</p>
            <p className="text-xs font-medium mt-0.5 opacity-70">{stat?.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search by name, email, or phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e?.target?.value)}
            className="w-full pl-9 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e?.target?.value)}
            className="text-sm border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="under_review">Under Review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
        </div>
      ) : filtered?.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <User className="mx-auto w-10 h-10 mb-3 opacity-40" />
          <p className="text-sm">No applications found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applicant</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Docs</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Applied</th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {filtered?.map(app => {
                  const docCount = app?.documents_uploaded?.length || 0;
                  const approvedDocs = Object.values(app?.doc_review_statuses || {})?.filter(s => s === 'approved')?.length;
                  return (
                    <tr key={app?.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3">
                        <div>
                          <p className="font-medium text-gray-900">{app?.full_name}</p>
                          <p className="text-xs text-gray-500">{app?.email}</p>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS?.[app?.application_status] || 'bg-gray-100 text-gray-700'}`}>
                          {app?.application_status?.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {docCount > 0 ? (
                          <span className="text-xs text-gray-600">
                            {approvedDocs}/{docCount} approved
                          </span>
                        ) : (
                          <span className="text-xs text-amber-600">No docs</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500">
                        {new Date(app?.created_at)?.toLocaleDateString('en-PH')}
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedApp(app)}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Review
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Panel Modal */}
      {selectedApp && (
        <ApplicationReviewPanel
          app={selectedApp}
          onClose={() => setSelectedApp(null)}
          onUpdated={loadApplications}
        />
      )}
    </div>
  );
}
